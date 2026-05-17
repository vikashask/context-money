import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[ErrorBoundary] Caught error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-cream dark:bg-dark p-6">
          <div className="max-w-md w-full text-center">
            <div className="text-6xl mb-4">😵</div>
            <h1 className="text-2xl font-heading font-bold text-navy dark:text-white mb-2">
              Something went wrong
            </h1>
            <p className="text-sm text-gray-500 dark:text-dark-muted mb-6">
              An unexpected error occurred. Your data is safe — try reloading
              the app.
            </p>
            {this.state.error && (
              <details className="mb-6 text-left">
                <summary className="text-xs text-gray-400 dark:text-dark-muted cursor-pointer hover:text-gray-600">
                  Error details
                </summary>
                <pre className="mt-2 text-xs text-red-500 bg-red-50 dark:bg-red-950/20 rounded-xl p-3 overflow-x-auto">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="px-5 py-2.5 border border-gray-200 dark:border-dark-border rounded-xl text-sm font-medium text-navy dark:text-dark-text hover:bg-gray-50 dark:hover:bg-dark-border transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="px-5 py-2.5 bg-coral text-white rounded-xl text-sm font-medium hover:bg-coral-light transition-colors"
              >
                Reload App
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
