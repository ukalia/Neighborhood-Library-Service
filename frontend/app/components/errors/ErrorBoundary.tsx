"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
  level?: "page" | "section";
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Base Error Boundary Component
 * Catches runtime errors in child components and displays a fallback UI
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetError);
      }

      return <DefaultErrorFallback
        error={this.state.error}
        reset={this.resetError}
        level={this.props.level || "page"}
      />;
    }

    return this.props.children;
  }
}

interface DefaultErrorFallbackProps {
  error: Error;
  reset: () => void;
  level: "page" | "section";
}

function DefaultErrorFallback({ error, reset, level }: DefaultErrorFallbackProps) {
  const isPage = level === "page";

  return (
    <div
      className={`flex items-center justify-center ${isPage ? "min-h-screen" : "min-h-[300px]"} bg-gray-50`}
      role="alert"
    >
      <div className="max-w-md w-full mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-6 border border-red-200">
          <div className="flex items-center mb-4">
            <svg
              className="w-8 h-8 text-red-500 mr-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <h2 className="text-xl font-semibold text-gray-900">
              {isPage ? "Something went wrong" : "Error in this section"}
            </h2>
          </div>

          <div className="mb-4">
            <p className="text-gray-600 mb-2">
              {isPage
                ? "We encountered an unexpected error. Please try again."
                : "This section encountered an error. The rest of the page should work normally."}
            </p>
            {process.env.NODE_ENV === "development" && (
              <details className="mt-3 p-3 bg-red-50 rounded border border-red-200">
                <summary className="text-sm font-medium text-red-900 cursor-pointer">
                  Error Details (Development Only)
                </summary>
                <pre className="mt-2 text-xs text-red-800 overflow-auto max-h-40">
                  {error.message}
                  {error.stack && `\n\n${error.stack}`}
                </pre>
              </details>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={reset}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              Try Again
            </button>
            {isPage && (
              <button
                onClick={() => window.location.href = "/"}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors font-medium"
              >
                Go Home
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ErrorBoundary;
