import { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Button } from '../ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { errorHandler } from '../../utils/errorHandler';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      errorInfo
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    });
  };

  handleGoHome = () => {
    window.location.hash = '#/home';
    this.handleRetry();
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Format error using error handler
      const formattedError = errorHandler.formatError(this.state.error);
      const showDetails = this.props.showDetails ?? process.env.NODE_ENV === 'development';

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <div className="max-w-2xl w-full space-y-6">
            <Alert variant="destructive" className="border-destructive/50">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="text-lg font-semibold">
                Something went wrong
              </AlertTitle>
              <AlertDescription className="space-y-4">
                <p className="text-base">
                  {formattedError.message}
                </p>
                
                {showDetails && this.state.error && (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm font-medium hover:text-destructive/80">
                      Technical Details
                    </summary>
                    <div className="mt-2 p-3 bg-muted rounded-md text-sm font-mono">
                      <div className="space-y-2">
                        <div>
                          <strong>Error:</strong> {this.state.error.message}
                        </div>
                        <div>
                          <strong>Stack:</strong>
                          <pre className="mt-1 text-xs overflow-auto">
                            {this.state.error.stack}
                          </pre>
                        </div>
                        {this.state.errorInfo && (
                          <div>
                            <strong>Component Stack:</strong>
                            <pre className="mt-1 text-xs overflow-auto">
                              {this.state.errorInfo.componentStack}
                            </pre>
                          </div>
                        )}
                        <div>
                          <strong>Error ID:</strong> {this.state.errorId}
                        </div>
                      </div>
                    </div>
                  </details>
                )}

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button 
                    onClick={this.handleRetry}
                    variant="default"
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Try Again
                  </Button>
                  <Button 
                    onClick={this.handleGoHome}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Home className="h-4 w-4" />
                    Go Home
                  </Button>
                </div>
              </AlertDescription>
            </Alert>

            <div className="text-center text-sm text-muted-foreground">
              <p>
                If this problem persists, please try refreshing the page or 
                <a 
                  href="https://github.com/your-repo/issues" 
                  className="text-primary hover:underline ml-1"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  report an issue
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}