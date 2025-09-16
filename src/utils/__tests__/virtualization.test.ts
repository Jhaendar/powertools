import { virtualizationManager } from '../virtualization';
import { vi } from 'vitest';

describe('VirtualizationManager', () => {
  describe('calculateVisibleRange', () => {
    const items = Array.from({ length: 1000 }, (_, i) => `Item ${i}`);
    const config = {
      itemHeight: 50,
      containerHeight: 400,
      overscan: 5,
      threshold: 100
    };

    it('should calculate visible range correctly', () => {
      const scrollTop = 250; // Scrolled down
      const range = virtualizationManager.calculateVisibleRange(items, scrollTop, config);
      
      expect(range.startIndex).toBeGreaterThanOrEqual(0);
      expect(range.endIndex).toBeLessThan(items.length);
      expect(range.visibleItems.length).toBeGreaterThan(0);
      expect(range.totalHeight).toBe(items.length * config.itemHeight);
      expect(range.offsetY).toBeGreaterThanOrEqual(0);
    });

    it('should not virtualize small lists', () => {
      const smallItems = Array.from({ length: 50 }, (_, i) => `Item ${i}`);
      const range = virtualizationManager.calculateVisibleRange(smallItems, 0, config);
      
      expect(range.startIndex).toBe(0);
      expect(range.endIndex).toBe(smallItems.length - 1);
      expect(range.visibleItems).toEqual(smallItems);
    });

    it('should handle overscan correctly', () => {
      const range = virtualizationManager.calculateVisibleRange(items, 0, config);
      
      // Should include overscan items
      expect(range.visibleItems.length).toBeGreaterThan(Math.ceil(config.containerHeight / config.itemHeight));
    });
  });

  describe('processInChunks', () => {
    it('should process items in chunks', async () => {
      const items = Array.from({ length: 100 }, (_, i) => i);
      const processor = (item: number) => item * 2;
      const config = {
        chunkSize: 10,
        delayMs: 1
      };

      const results = await virtualizationManager.processInChunks(items, processor, config);
      
      expect(results).toHaveLength(100);
      expect(results[0]).toBe(0);
      expect(results[50]).toBe(100);
      expect(results[99]).toBe(198);
    });

    it('should call progress callback', async () => {
      const items = Array.from({ length: 50 }, (_, i) => i);
      const processor = (item: number) => item;
      const progressCallback = vi.fn();
      
      const config = {
        chunkSize: 10,
        onProgress: progressCallback
      };

      await virtualizationManager.processInChunks(items, processor, config);
      
      expect(progressCallback).toHaveBeenCalled();
      expect(progressCallback).toHaveBeenLastCalledWith(50, 50);
    });

    it('should call complete callback', async () => {
      const items = Array.from({ length: 20 }, (_, i) => i);
      const processor = (item: number) => item;
      const completeCallback = vi.fn();
      
      const config = {
        chunkSize: 10,
        onComplete: completeCallback
      };

      await virtualizationManager.processInChunks(items, processor, config);
      
      expect(completeCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe('calculateOptimalChunkSize', () => {
    it('should return appropriate chunk sizes for different complexities', () => {
      const lowComplexity = virtualizationManager.calculateOptimalChunkSize(5000, 'low');
      const mediumComplexity = virtualizationManager.calculateOptimalChunkSize(5000, 'medium');
      const highComplexity = virtualizationManager.calculateOptimalChunkSize(5000, 'high');
      
      expect(lowComplexity).toBeGreaterThanOrEqual(mediumComplexity);
      expect(mediumComplexity).toBeGreaterThanOrEqual(highComplexity);
      expect(highComplexity).toBeLessThanOrEqual(200); // Should be capped for large datasets
    });

    it('should adjust for small datasets', () => {
      const chunkSize = virtualizationManager.calculateOptimalChunkSize(50, 'medium');
      expect(chunkSize).toBeLessThanOrEqual(50);
    });
  });

  describe('efficientSlice', () => {
    it('should slice arrays efficiently', () => {
      const items = Array.from({ length: 1000 }, (_, i) => i);
      const sliced = virtualizationManager.efficientSlice(items, 100, 200);
      
      expect(sliced).toHaveLength(100);
      expect(sliced[0]).toBe(100);
      expect(sliced[99]).toBe(199);
    });

    it('should handle large slices', () => {
      const items = Array.from({ length: 20000 }, (_, i) => i);
      const sliced = virtualizationManager.efficientSlice(items, 0, 15000, 1000);
      
      expect(sliced).toHaveLength(15000);
      expect(sliced[0]).toBe(0);
      expect(sliced[14999]).toBe(14999);
    });
  });

  describe('shouldVirtualize', () => {
    it('should recommend virtualization for large datasets', () => {
      expect(virtualizationManager.shouldVirtualize(1000, 'low')).toBe(true);
      expect(virtualizationManager.shouldVirtualize(300, 'medium')).toBe(true);
      expect(virtualizationManager.shouldVirtualize(150, 'high')).toBe(true);
    });

    it('should not recommend virtualization for small datasets', () => {
      expect(virtualizationManager.shouldVirtualize(100, 'low')).toBe(false);
      expect(virtualizationManager.shouldVirtualize(50, 'medium')).toBe(false);
      expect(virtualizationManager.shouldVirtualize(25, 'high')).toBe(false);
    });
  });

  describe('debounce', () => {
    it('should debounce function calls', async () => {
      const mockFn = vi.fn();
      const debouncedFn = virtualizationManager.debounce(mockFn, 50);
      
      debouncedFn('test1');
      debouncedFn('test2');
      debouncedFn('test3');
      
      expect(mockFn).not.toHaveBeenCalled();
      
      await new Promise(resolve => setTimeout(resolve, 60));
      
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('test3');
    });
  });

  describe('throttle', () => {
    it('should throttle function calls', async () => {
      const mockFn = vi.fn();
      const throttledFn = virtualizationManager.throttle(mockFn, 50);
      
      throttledFn('test1');
      throttledFn('test2');
      throttledFn('test3');
      
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('test1');
      
      await new Promise(resolve => setTimeout(resolve, 60));
      
      throttledFn('test4');
      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(mockFn).toHaveBeenLastCalledWith('test4');
    });
  });
});