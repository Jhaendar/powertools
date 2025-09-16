import { performanceMonitor, usePerformanceMonitor } from '../performanceMonitor';
import { renderHook } from '@testing-library/react';

describe('PerformanceMonitor', () => {
  beforeEach(() => {
    performanceMonitor.clearMetrics();
  });

  describe('startMeasurement', () => {
    it('should measure render time correctly', async () => {
      const endMeasurement = performanceMonitor.startMeasurement('test-component');
      
      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const metrics = endMeasurement(100, 1024);
      
      expect(metrics.renderTime).toBeGreaterThan(0);
      expect(metrics.nodeCount).toBe(100);
      expect(metrics.dataSize).toBe(1024);
      expect(metrics.timestamp).toBeGreaterThan(0);
    });

    it('should record metrics in history', () => {
      const endMeasurement = performanceMonitor.startMeasurement('test-component');
      endMeasurement(50, 512);
      
      const averageMetrics = performanceMonitor.getAverageMetrics();
      expect(averageMetrics).not.toBeNull();
      expect(averageMetrics!.nodeCount).toBe(50);
      expect(averageMetrics!.dataSize).toBe(512);
    });
  });

  describe('getPerformanceRecommendations', () => {
    it('should provide recommendations for slow render times', () => {
      const metrics = {
        renderTime: 600, // Above critical threshold
        nodeCount: 100,
        dataSize: 1024,
        timestamp: Date.now()
      };
      
      const recommendations = performanceMonitor.getPerformanceRecommendations(metrics);
      expect(recommendations).toContain('Consider implementing virtualization for large datasets');
      expect(recommendations).toContain('Use React.memo for expensive components');
    });

    it('should provide recommendations for high node count', () => {
      const metrics = {
        renderTime: 50,
        nodeCount: 1500, // Above critical threshold
        dataSize: 1024,
        timestamp: Date.now()
      };
      
      const recommendations = performanceMonitor.getPerformanceRecommendations(metrics);
      expect(recommendations).toContain('Implement lazy loading for tree nodes');
      expect(recommendations).toContain('Consider pagination or chunked rendering');
    });

    it('should provide recommendations for large data size', () => {
      const metrics = {
        renderTime: 50,
        nodeCount: 100,
        dataSize: 2 * 1024 * 1024, // Above critical threshold
        timestamp: Date.now()
      };
      
      const recommendations = performanceMonitor.getPerformanceRecommendations(metrics);
      expect(recommendations).toContain('Consider streaming large JSON files');
      expect(recommendations).toContain('Implement data compression or chunking');
    });
  });

  describe('isPerformanceDegraded', () => {
    it('should detect performance degradation', () => {
      const goodMetrics = {
        renderTime: 50,
        nodeCount: 100,
        dataSize: 1024,
        timestamp: Date.now()
      };
      
      const badMetrics = {
        renderTime: 600,
        nodeCount: 1500,
        dataSize: 2 * 1024 * 1024,
        timestamp: Date.now()
      };
      
      expect(performanceMonitor.isPerformanceDegraded(goodMetrics)).toBe(false);
      expect(performanceMonitor.isPerformanceDegraded(badMetrics)).toBe(true);
    });
  });
});

describe('usePerformanceMonitor hook', () => {
  it('should provide performance monitoring functions', () => {
    const { result } = renderHook(() => usePerformanceMonitor('test-component'));
    
    expect(typeof result.current.startMeasurement).toBe('function');
    expect(typeof result.current.getRecommendations).toBe('function');
    expect(typeof result.current.isPerformanceDegraded).toBe('function');
    expect(typeof result.current.getAverageMetrics).toBe('function');
  });
});