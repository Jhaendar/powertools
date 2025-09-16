/**
 * Virtualization utilities for efficiently rendering large datasets
 * by only rendering visible items and managing scroll performance
 */

export interface VirtualizationConfig {
  itemHeight: number;
  containerHeight: number;
  overscan?: number; // Number of items to render outside visible area
  threshold?: number; // Minimum items before virtualization kicks in
}

export interface VirtualizedRange {
  startIndex: number;
  endIndex: number;
  visibleItems: any[];
  totalHeight: number;
  offsetY: number;
}

export interface ChunkedProcessingConfig {
  chunkSize: number;
  delayMs?: number;
  onProgress?: (processed: number, total: number) => void;
  onComplete?: () => void;
}

class VirtualizationManager {
  /**
   * Calculate visible range for virtualization
   */
  calculateVisibleRange<T>(
    items: T[],
    scrollTop: number,
    config: VirtualizationConfig
  ): VirtualizedRange {
    const { itemHeight, containerHeight, overscan = 5, threshold = 100 } = config;

    // Don't virtualize small lists
    if (items.length < threshold) {
      return {
        startIndex: 0,
        endIndex: items.length - 1,
        visibleItems: items,
        totalHeight: items.length * itemHeight,
        offsetY: 0
      };
    }

    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const endIndex = Math.min(items.length - 1, startIndex + visibleCount + overscan * 2);

    const visibleItems = items.slice(startIndex, endIndex + 1);
    const totalHeight = items.length * itemHeight;
    const offsetY = startIndex * itemHeight;

    return {
      startIndex,
      endIndex,
      visibleItems,
      totalHeight,
      offsetY
    };
  }

  /**
   * Process large datasets in chunks to avoid blocking the UI
   */
  async processInChunks<T, R>(
    items: T[],
    processor: (item: T, index: number) => R,
    config: ChunkedProcessingConfig
  ): Promise<R[]> {
    const { chunkSize, delayMs = 0, onProgress, onComplete } = config;
    const results: R[] = [];
    
    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      
      // Process chunk
      const chunkResults = chunk.map((item, chunkIndex) => 
        processor(item, i + chunkIndex)
      );
      
      results.push(...chunkResults);
      
      // Report progress
      if (onProgress) {
        onProgress(Math.min(i + chunkSize, items.length), items.length);
      }
      
      // Yield control to browser if delay is specified
      if (delayMs > 0 && i + chunkSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    if (onComplete) {
      onComplete();
    }
    
    return results;
  }

  /**
   * Debounce function for scroll events
   */
  debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  /**
   * Throttle function for high-frequency events
   */
  throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  /**
   * Calculate optimal chunk size based on data characteristics
   */
  calculateOptimalChunkSize(
    totalItems: number,
    itemComplexity: 'low' | 'medium' | 'high' = 'medium'
  ): number {
    const baseChunkSize = {
      low: 1000,
      medium: 500,
      high: 100
    }[itemComplexity];

    // Adjust based on total items
    if (totalItems < 1000) return Math.min(totalItems, baseChunkSize);
    if (totalItems < 10000) return Math.min(baseChunkSize, 500);
    return Math.min(baseChunkSize, 200);
  }

  /**
   * Memory-efficient array slicing for large datasets
   */
  efficientSlice<T>(
    items: T[],
    start: number,
    end: number,
    maxSliceSize: number = 1000
  ): T[] {
    const sliceSize = end - start;
    
    // For small slices, use normal array slice
    if (sliceSize <= maxSliceSize) {
      return items.slice(start, end);
    }
    
    // For large slices, create a new array to avoid memory issues
    const result: T[] = new Array(sliceSize);
    for (let i = 0; i < sliceSize; i++) {
      result[i] = items[start + i];
    }
    
    return result;
  }

  /**
   * Check if virtualization should be enabled based on data size
   */
  shouldVirtualize(
    itemCount: number,
    itemComplexity: 'low' | 'medium' | 'high' = 'medium'
  ): boolean {
    const thresholds = {
      low: 500,
      medium: 200,
      high: 100
    };
    
    return itemCount > thresholds[itemComplexity];
  }
}

// Export singleton instance
export const virtualizationManager = new VirtualizationManager();

/**
 * React hook for virtualization
 */
export const useVirtualization = <T>(
  items: T[],
  config: VirtualizationConfig
) => {
  const [scrollTop, setScrollTop] = React.useState(0);
  
  const handleScroll = React.useCallback(
    virtualizationManager.throttle((e: React.UIEvent<HTMLDivElement>) => {
      setScrollTop(e.currentTarget.scrollTop);
    }, 16), // ~60fps
    []
  );
  
  const virtualizedRange = React.useMemo(() => {
    return virtualizationManager.calculateVisibleRange(items, scrollTop, config);
  }, [items, scrollTop, config]);
  
  return {
    virtualizedRange,
    handleScroll,
    shouldVirtualize: virtualizationManager.shouldVirtualize(items.length)
  };
};

// Re-export React for the hook
import React from 'react';