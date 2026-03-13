/**
 * Performance Monitoring for Atlas Settings Panel
 *
 * Tracks render performance and provides optimization insights
 */

import React from "react";

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

class AtlasSettingsPerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private startTimes: Map<string, number> = new Map();

  start(name: string, metadata?: Record<string, any>) {
    this.startTimes.set(name, performance.now());
    return () => this.end(name, metadata);
  }

  end(name: string, metadata?: Record<string, any>) {
    const startTime = this.startTimes.get(name);
    if (!startTime) return;

    const duration = performance.now() - startTime;
    this.startTimes.delete(name);

    this.metrics.push({
      name,
      duration,
      timestamp: Date.now(),
      metadata,
    });

    // Log slow operations in development
    if (process.env.NODE_ENV === "development" && duration > 16.67) {
      console.warn(
        `🐌 Slow Atlas Settings operation: ${name} took ${duration.toFixed(2)}ms`,
        metadata
      );
    }
  }

  measure<T>(name: string, fn: () => T, metadata?: Record<string, any>): T {
    const endTimer = this.start(name, metadata);
    try {
      return fn();
    } finally {
      endTimer();
    }
  }

  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  getAverageTime(name: string): number {
    const matching = this.metrics.filter((m) => m.name === name);
    if (matching.length === 0) return 0;
    return matching.reduce((sum, m) => sum + m.duration, 0) / matching.length;
  }

  clear() {
    this.metrics = [];
    this.startTimes.clear();
  }

  getSummary() {
    const grouped = this.metrics.reduce(
      (acc, metric) => {
        if (!acc[metric.name]) {
          acc[metric.name] = { count: 0, totalTime: 0, avgTime: 0 };
        }
        acc[metric.name].count++;
        acc[metric.name].totalTime += metric.duration;
        acc[metric.name].avgTime =
          acc[metric.name].totalTime / acc[metric.name].count;
        return acc;
      },
      {} as Record<
        string,
        { count: number; totalTime: number; avgTime: number }
      >
    );

    return grouped;
  }
}

// Global instance for Atlas Settings
export const atlasSettingsPerformanceMonitor =
  new AtlasSettingsPerformanceMonitor();

// React hook for component performance monitoring
export function usePerformanceMonitor() {
  const startMeasurement = (name: string, metadata?: Record<string, any>) => {
    return atlasSettingsPerformanceMonitor.start(name, metadata);
  };

  const measureRender = (
    componentName: string,
    metadata?: Record<string, any>
  ) => {
    return atlasSettingsPerformanceMonitor.measure(
      `${componentName}-render`,
      () => {},
      metadata
    );
  };

  return {
    startMeasurement,
    measureRender,
    getMetrics: () => atlasSettingsPerformanceMonitor.getMetrics(),
    getSummary: () => atlasSettingsPerformanceMonitor.getSummary(),
    clear: () => atlasSettingsPerformanceMonitor.clear(),
  };
}

// HOC for component performance monitoring
export function withPerformanceMonitoring<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  componentName: string
) {
  const WrappedComponent = React.memo((props: T) => {
    const endTimer = React.useRef<(() => void) | null>(null);

    React.useLayoutEffect(() => {
      endTimer.current = atlasSettingsPerformanceMonitor.start(
        `${componentName}-render`,
        { propsCount: Object.keys(props).length }
      );

      return () => {
        endTimer.current?.();
      };
    });

    return React.createElement(Component, props);
  });

  WrappedComponent.displayName = `withPerformanceMonitoring(${componentName})`;
  return WrappedComponent;
}
