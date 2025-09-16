import { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Button } from '../ui/button';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';
import { errorHandler } from '../../utils/errorHandler';

interface Props {
  children: ReactNode;
  toolName: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onRetry?: () => void;
  onGoBack?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

export class ToolErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`ToolErrorBoundary (${this.props.toolName}) caught an error:`, error, errorInfo);
    
    this.setState({
      errorInfo
    });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1
      }));

      if (this.props.onRetry) {
        this.props.onRetry();
      }
    }
  };

  handleGoBack = () => {
    if (this.props.onGoBack) {
      this.props.onGoBack();
    } else {
      window.history.back();
    }
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const formattedError = errorHandler.formatError(this.state.error);
      const canRetry = this.state.retryCount < this.maxRetries;
      const showDetails = process.env.NODE_ENV === 'development';

      return (
        <div className="space-y-6 p-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>
              Error in {this.props.toolName}
            </AlertTitle>
            <AlertDescription className="space-y-4">
              <p>
                {formattedError.message}
              </p>

              {this.state.retryCount > 0 && (
                <p className="text-sm">
                  Retry attempts: {this.state.retryCount}/{this.maxRetries}
                </p>
              )}

              {showDetails && this.state.error && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-medium hover:text-destructive/80">
                    Technical Details
                  </summary>
                  <div className="mt-2 p-3 bg-muted rounded-md text-sm font-mono">
                    <div className="space-y-2">
                      <div>
                        <strong>Error:</strong> {this.state.error.message}
                      </div>
                      <div>
                        <strong>Tool:</strong> {this.props.toolName}
                      </div>
                      {formattedError.code && (
                        <div>
                          <strong>Code:</strong> {formattedError.code}
                        </div>
                      )}
                      {this.state.errorInfo && (
                        <div>
                          <strong>Component Stack:</strong>
                          <pre className="mt-1 text-xs overflow-auto max-h-32">
                            {this.state.errorInfo.componentStack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </details>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                {canRetry && (
                  <Button 
                    onClick={this.handleRetry}
                    variant="default"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Try Again
                  </Button>
                )}
                
                {!canRetry && (
                  <Button 
                    onClick={this.handleReset}
                    variant="default"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Reset Tool
                  </Button>
                )}

                <Button 
                  onClick={this.handleGoBack}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Go Back
                </Button>
              </div>
            </AlertDescription>
          </Alert>

          {!canRetry && this.state.retryCount >= this.maxRetries && (
            <Alert>
              <AlertDescription>
                <p className="text-sm">
                  This tool has encountered repeated errors. You may want to:
                </p>
                <ul className="list-disc list-inside text-sm mt-2 space-y-1">
                  <li>Try refreshing the entire page</li>
                  <li>Check if your input data is valid</li>
                  <li>Try a different tool or smaller data set</li>
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}