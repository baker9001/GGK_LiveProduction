/**
 * PapersSetupErrorBoundary Component
 * Specialized error boundary for Papers Setup system
 * Provides recovery options and detailed error reporting
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, FileText, XCircle } from 'lucide-react';
import { Button } from '../../../../../../components/shared/Button';

interface Props {
  children: ReactNode;
  fallbackUI?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
}

export class PapersSetupErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console
    console.error('Papers Setup Error Boundary caught an error:', error, errorInfo);

    // Update state with error details
    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to external error tracking service (if configured)
    this.logErrorToService(error, errorInfo);
  }

  logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    // Placeholder for error tracking service integration
    // Could integrate with Sentry, LogRocket, etc.
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    console.log('Error Report:', errorReport);
    // TODO: Send to error tracking service
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/system-admin/learning/practice-management/papers-setup';
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallbackUI) {
        return this.props.fallbackUI;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Header */}
            <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 p-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                    Something went wrong
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400">
                    The Papers Setup system encountered an unexpected error. Don't worry - your data is safe.
                  </p>
                </div>
              </div>
            </div>

            {/* Error Details */}
            <div className="p-6 space-y-4">
              {/* Error Message */}
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                <div className="flex items-start space-x-2 mb-2">
                  <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                      Error Message
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 font-mono bg-white dark:bg-gray-800 p-2 rounded">
                      {this.state.error?.message || 'Unknown error'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Technical Details (Collapsible) */}
              {this.props.showDetails && this.state.error?.stack && (
                <details className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                  <summary className="cursor-pointer font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Technical Details (for developers)
                  </summary>
                  <div className="mt-2 space-y-2">
                    <div>
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Stack Trace:
                      </p>
                      <pre className="text-xs text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 p-3 rounded overflow-x-auto">
                        {this.state.error.stack}
                      </pre>
                    </div>
                    {this.state.errorInfo?.componentStack && (
                      <div>
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                          Component Stack:
                        </p>
                        <pre className="text-xs text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 p-3 rounded overflow-x-auto">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}

              {/* Error Count Warning */}
              {this.state.errorCount > 1 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>Note:</strong> This error has occurred {this.state.errorCount} times.
                    {this.state.errorCount > 2 && ' Consider reloading the page or contacting support.'}
                  </p>
                </div>
              )}

              {/* Helpful Information */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                  What you can do:
                </p>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                  <li>Try continuing - the error might be temporary</li>
                  <li>Reload the page to start fresh</li>
                  <li>Return to the main Papers Setup page</li>
                  <li>If the problem persists, contact technical support</li>
                </ul>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 p-6">
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={this.handleReset}
                  variant="primary"
                  className="flex-1 sm:flex-none"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>

                <Button
                  onClick={this.handleReload}
                  variant="outline"
                  className="flex-1 sm:flex-none"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reload Page
                </Button>

                <Button
                  onClick={this.handleGoHome}
                  variant="ghost"
                  className="flex-1 sm:flex-none"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Go to Papers Setup
                </Button>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                Error ID: {Date.now().toString(36)} | Timestamp: {new Date().toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook version for functional components
 */
export const withPapersSetupErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    showDetails?: boolean;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
  }
) => {
  return (props: P) => (
    <PapersSetupErrorBoundary
      showDetails={options?.showDetails}
      onError={options?.onError}
    >
      <Component {...props} />
    </PapersSetupErrorBoundary>
  );
};

export default PapersSetupErrorBoundary;
