import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { ToolErrorBoundary } from './ToolErrorBoundary';
import { ErrorDisplay, useErrorHandler } from './index';

// Component that can throw errors on demand
const ErrorProneComponent: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('This is a demonstration error thrown by the component');
  }
  
  return (
    <div className="p-4 bg-green-50 border border-green-200 rounded-md">
      <p className="text-green-800">✅ Component is working correctly!</p>
    </div>
  );
};

// Component demonstrating useErrorHandler hook
const ErrorHandlerDemo: React.FC = () => {
  const { error, setError, clearError } = useErrorHandler();
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>useErrorHandler Hook Demo</CardTitle>
        <CardDescription>
          Demonstrates programmatic error handling with the useErrorHandler hook
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={() => setError(new Error('JSON parsing failed'))}
            variant="destructive"
            size="sm"
          >
            Simulate JSON Error
          </Button>
          <Button 
            onClick={() => setError(new Error('CSV file too large'))}
            variant="destructive"
            size="sm"
          >
            Simulate CSV Error
          </Button>
          <Button 
            onClick={() => setError(new Error('Clipboard access denied'))}
            variant="destructive"
            size="sm"
          >
            Simulate Clipboard Error
          </Button>
          <Button 
            onClick={clearError}
            variant="outline"
            size="sm"
          >
            Clear Error
          </Button>
        </div>
        
        {error && (
          <ErrorDisplay 
            error={error} 
            onDismiss={clearError}
            onRetry={() => {
              clearError();
              // Simulate retry logic
            }}
          />
        )}
      </CardContent>
    </Card>
  );
};

// Main demo component
export const ErrorBoundaryDemo: React.FC = () => {
  const [shouldThrow, setShouldThrow] = useState(false);
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Error Boundary Demo</h2>
        <p className="text-muted-foreground mt-2">
          Demonstration of error boundaries and error handling components
        </p>
      </div>

      <Alert>
        <AlertDescription>
          This page demonstrates the error boundary system. The error boundaries catch JavaScript errors 
          anywhere in the component tree and display user-friendly error messages with recovery options.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Tool Error Boundary Demo</CardTitle>
          <CardDescription>
            This component is wrapped in a ToolErrorBoundary that will catch any errors
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button 
              onClick={() => setShouldThrow(true)}
              variant="destructive"
            >
              Throw Error
            </Button>
            <Button 
              onClick={() => setShouldThrow(false)}
              variant="outline"
            >
              Fix Component
            </Button>
          </div>
          
          <ToolErrorBoundary 
            toolName="Demo Component"
            onRetry={() => setShouldThrow(false)}
            onGoBack={() => setShouldThrow(false)}
          >
            <ErrorProneComponent shouldThrow={shouldThrow} />
          </ToolErrorBoundary>
        </CardContent>
      </Card>

      <ErrorHandlerDemo />

      <Card>
        <CardHeader>
          <CardTitle>Error Boundary Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-foreground mb-2">Global Error Boundary:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Catches all unhandled errors in the app</li>
                <li>• Shows user-friendly error messages</li>
                <li>• Provides retry and go home buttons</li>
                <li>• Shows technical details in development</li>
                <li>• Generates unique error IDs for debugging</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-2">Tool Error Boundary:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Isolates errors to specific tools</li>
                <li>• Tracks retry attempts (max 3)</li>
                <li>• Tool-specific error messages</li>
                <li>• Custom retry and go back handlers</li>
                <li>• Graceful degradation for repeated errors</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};