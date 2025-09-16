/**
 * Performance monitoring utilities for tracking component performance
 * and providing optimization insights
 */

export interface PerformanceMetrics {
  renderTime: number;
  memoryUsage?: number;
  nodeCount: number;
  dataSize: number;
  timestamp: number;
}

export interface PerformanceThresholds {
  renderTimeWarning: number; // ms
  renderTimeCritical: number; // ms
  nodeCritical: number; // node count
  dataSizeCritical: number; // bytes
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private readonly maxMetricsHistory = 50;
  
  private readonly thresholds: PerformanceThresholds = {
    renderTimeWarning: 100, // 100ms
    renderTimeCritical: 500, // 500ms
    nodeCritical: 1000, // 1000 nodes
    dataSizeCritical: 1024 * 1024 // 1MB
  };

  /**
   * Start performance measurement
   */
  startMeasurement(label: string): (nodeCount?: number, dataSize?: number) => PerformanceMetrics {
    const startTime = performance.now();
    const startMemory = this.getMemoryUsage();

    return (nodeCount: number = 0, dataSize: number = 0): PerformanceMetrics => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      const endMemory = this.getMemoryUsage();

      const metrics: PerformanceMetrics = {
        renderTime,
        memoryUsage: endMemory ? endMemory - (startMemory || 0) : undefined,
        nodeCount,
        dataSize,
        timestamp: Date.now()
      };

      this.recordMetrics(metrics);
      
      // Log performance warnings in development
      if (process.env.NODE_ENV === 'development') {
        this.logPerformanceWarnings(label, metrics);
      }

      return metrics;
    };
  }

  /**
   * Record performance metrics
   */
  private recordMetrics(metrics: PerformanceMetrics): void {
    this.metrics.push(metrics);
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }
  }

  /**
   * Get memory usage if available
   */
  private getMemoryUsage(): number | undefined {
    if ('memory' in performance && (performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return undefined;
  }

  /**
   * Log performance warnings
   */
  private logPerformanceWarnings(label: string, metrics: PerformanceMetrics): void {
    const { renderTime, nodeCount, dataSize } = metrics;
    const warnings: string[] = [];

    if (renderTime > this.thresholds.renderTimeCritical) {
      warnings.push(`Critical render time: ${renderTime.toFixed(2)}ms`);
    } else if (renderTime > this.thresholds.renderTimeWarning) {
      warnings.push(`Slow render time: ${renderTime.toFixed(2)}ms`);
    }

    if (nodeCount > this.thresholds.nodeCritical) {
      warnings.push(`High node count: ${nodeCount} nodes`);
    }

    if (dataSize > this.thresholds.dataSizeCritical) {
      warnings.push(`Large data size: ${(dataSize / 1024 / 1024).toFixed(2)}MB`);
    }

    if (warnings.length > 0) {
      console.warn(`[Performance] ${label}:`, warnings.join(', '));
      console.warn('Consider optimizing data size or implementing virtualization');
    }
  }

  /**
   * Get performance recommendations based on metrics
   */
  getPerformanceRecommendations(metrics: PerformanceMetrics): string[] {
    const recommendations: string[] = [];
    const { renderTime, nodeCount, dataSize } = metrics;

    if (renderTime > this.thresholds.renderTimeCritical) {
      recommendations.push('Consider implementing virtualization for large datasets');
      recommendations.push('Use React.memo for expensive components');
    }

    if (nodeCount > this.thresholds.nodeCritical) {
      recommendations.push('Implement lazy loading for tree nodes');
      recommendations.push('Consider pagination or chunked rendering');
    }

    if (dataSize > this.thresholds.dataSizeCritical) {
      recommendations.push('Consider streaming large JSON files');
      recommendations.push('Implement data compression or chunking');
    }

    return recommendations;
  }

  /**
   * Get average performance metrics
   */
  getAverageMetrics(): Partial<PerformanceMetrics> | null {
    if (this.metrics.length === 0) return null;

    const totals = this.metrics.reduce(
      (acc, metric) => ({
        renderTime: acc.renderTime + metric.renderTime,
        nodeCount: acc.nodeCount + metric.nodeCount,
        dataSize: acc.dataSize + metric.dataSize,
        memoryUsage: acc.memoryUsage + (metric.memoryUsage || 0)
      }),
      { renderTime: 0, nodeCount: 0, dataSize: 0, memoryUsage: 0 }
    );

    const count = this.metrics.length;
    return {
      renderTime: totals.renderTime / count,
      nodeCount: totals.nodeCount / count,
      dataSize: totals.dataSize / count,
      memoryUsage: totals.memoryUsage / count
    };
  }

  /**
   * Clear metrics history
   */
  clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Check if performance is degraded
   */
  isPerformanceDegraded(metrics: PerformanceMetrics): boolean {
    return (
      metrics.renderTime > this.thresholds.renderTimeWarning ||
      metrics.nodeCount > this.thresholds.nodeCritical ||
      metrics.dataSize > this.thresholds.dataSizeCritical
    );
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * React hook for performance monitoring
 */
export const usePerformanceMonitor = (componentName: string) => {
  const startMeasurement = () => {
    return performanceMonitor.startMeasurement(componentName);
  };

  const getRecommendations = (metrics: PerformanceMetrics) => {
    return performanceMonitor.getPerformanceRecommendations(metrics);
  };

  const isPerformanceDegraded = (metrics: PerformanceMetrics) => {
    return performanceMonitor.isPerformanceDegraded(metrics);
  };

  return {
    startMeasurement,
    getRecommendations,
    isPerformanceDegraded,
    getAverageMetrics: () => performanceMonitor.getAverageMetrics()
  };
};