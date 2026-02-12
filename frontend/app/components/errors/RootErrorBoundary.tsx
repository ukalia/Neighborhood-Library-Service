"use client";

import React, { ReactNode, ErrorInfo } from "react";
import ErrorBoundary from "./ErrorBoundary";

interface RootErrorBoundaryProps {
  children: ReactNode;
}

/**
 * Root Error Boundary Wrapper
 * Wraps the entire application with error handling
 */
function RootErrorBoundary({ children }: RootErrorBoundaryProps) {
  const handleError = (error: Error, errorInfo: ErrorInfo) => {
    console.error("Application Error:", error);
    console.error("Error Info:", errorInfo);

    if (process.env.NODE_ENV === "production") {
      // In production, you would send errors to a monitoring service
      // Example: Sentry, LogRocket, DataDog, etc.
      // sendToErrorMonitoring(error, errorInfo);
    }
  };

  return (
    <ErrorBoundary
      level="page"
      onError={handleError}
    >
      {children}
    </ErrorBoundary>
  );
}

export default RootErrorBoundary;
