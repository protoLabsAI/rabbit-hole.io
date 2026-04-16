"use client";

/**
 * Lazy Feature Error Boundary
 *
 * Reusable error boundary for dynamically imported paid features.
 * Provides retry logic and graceful fallback UI.
 */

import { Component, ReactNode } from "react";

import { Icon } from "@protolabsai/icon-system";

interface LazyFeatureErrorBoundaryProps {
  children: ReactNode;
  featureName?: string;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface LazyFeatureErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

export class LazyFeatureErrorBoundary extends Component<
  LazyFeatureErrorBoundaryProps,
  LazyFeatureErrorBoundaryState
> {
  private maxRetries = 3;

  constructor(props: LazyFeatureErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): LazyFeatureErrorBoundaryState {
    return { hasError: true, error, retryCount: 0 };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(
      `[LazyFeature] Error loading ${this.props.featureName}:`,
      error
    );

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Auto-retry on first failure (network issues)
    if (this.state.retryCount < 1) {
      setTimeout(() => this.handleRetry(), 1000);
    }
  }

  handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState((prev) => ({
        hasError: false,
        error: null,
        retryCount: prev.retryCount + 1,
      }));
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const canRetry = this.state.retryCount < this.maxRetries;

      return (
        <div className="flex items-center justify-center h-full p-8 bg-background">
          <div className="text-center max-w-md space-y-4">
            <Icon
              name="alert-triangle"
              size={48}
              className="mx-auto text-destructive"
            />
            <h3 className="text-lg font-semibold">
              Failed to load {this.props.featureName || "feature"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {this.state.error?.message || "An unexpected error occurred"}
            </p>
            {canRetry && (
              <button
                onClick={this.handleRetry}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Try Again
              </button>
            )}
            {!canRetry && (
              <p className="text-xs text-muted-foreground">
                Please refresh the page or contact support
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
