import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Button } from '../ui/button';
import { AlertTriangle, X, RefreshCw } from 'lucide-react';
import { ErrorInfo } from '../../utils/errorHandler';

interface ErrorDisplayProps {
  error: ErrorInfo;
  onDismiss?: () => void;
  onRetry?: () => void;
  showTitle?: boolean;
  className?: string;
}

/**
 * Reusable component for displaying errors with consistent styling
 * Uses shadcn/ui Alert components for consistent appearance
 */
export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onDismiss,
  onRetry,
  showTitle = true,
  className
}) => {
  const getAlertVariant = (type: ErrorInfo['type']) => {
    switch (type) {
      case 'error':
        return 'destructive';
      case 'warning':
        return 'default';
      case 'info':
        return 'default';
      default:
        return 'default';
    }
  };

  const getIcon = (type: ErrorInfo['type']) => {
    switch (type) {
      case 'error':
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      case 'info':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getTitle = (type: ErrorInfo['type']) => {
    switch (type) {
      case 'error':
        return 'Error';
      case 'warning':
        return 'Warning';
      case 'info':
        return 'Information';
      default:
        return 'Notice';
    }
  };

  return (
    <Alert variant={getAlertVariant(error.type)} className={className}>
      {getIcon(error.type)}
      {showTitle && (
        <AlertTitle className="flex items-center justify-between">
          {getTitle(error.type)}
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="h-auto p-1 hover:bg-transparent"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </AlertTitle>
      )}
      <AlertDescription className="space-y-3">
        <p>{error.message}</p>
        
        {error.code && process.env.NODE_ENV === 'development' && (
          <p className="text-xs font-mono opacity-75">
            Error Code: {error.code}
          </p>
        )}

        {(onRetry || onDismiss) && (
          <div className="flex gap-2 pt-1">
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-3 w-3" />
                Try Again
              </Button>
            )}
            {onDismiss && !showTitle && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                className="flex items-center gap-2"
              >
                <X className="h-3 w-3" />
                Dismiss
              </Button>
            )}
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
};