import React from 'react';
import { render, screen, fireEvent, renderHook, act } from '@/utils/test-utils';
import { ErrorBoundary } from '../ErrorBoundary';
import { ToolErrorBoundary } from '../ToolErrorBoundary';
import { ErrorDisplay } from '../ErrorDisplay';
import { useErrorHandler } from '../useErrorHandler';
import { vi } from 'vitest';

// Mock component that throws an error
const ThrowError: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = true }) => {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>No error</div>;
};

// Mock component for testing useErrorHandler hook
const TestComponent: React.FC = () => {
  const { error, setError, clearError } = useErrorHandler();
  
  return (
    <div>
      <button onClick={() => setError(new Error('Test error'))}>
        Set Error
      </button>
      <button onClick={clearError}>
        Clear Error
      </button>
      {error && <div data-testid="error-message">{error.message}</div>}
    </div>
  );
};

describe('ErrorBoundary', () => {
  // Suppress console.error for these tests
  const originalError = console.error;
  beforeAll(() => {
    console.error = vi.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('renders error UI when child component throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/An unexpected error occurred/)).toBeInTheDocument();
  });

  it('provides retry functionality', () => {
    let shouldThrow = true;
    const TestComponent = () => {
      if (shouldThrow) {
        throw new Error('Test error');
      }
      return <div>No error</div>;
    };

    const { rerender } = render(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    
    const retryButton = screen.getByText('Try Again');
    
    // Change the error condition and click retry
    shouldThrow = false;
    fireEvent.click(retryButton);
    
    // Re-render with the same component but different error state
    rerender(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('provides go home functionality', () => {
    // Mock window.location.hash
    delete (window as any).location;
    window.location = { hash: '' } as any;
    
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );
    
    const homeButton = screen.getByText('Go Home');
    fireEvent.click(homeButton);
    
    expect(window.location.hash).toBe('#/home');
  });

  it('shows technical details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    
    render(
      <ErrorBoundary showDetails={true}>
        <ThrowError />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Technical Details')).toBeInTheDocument();
    
    process.env.NODE_ENV = originalEnv;
  });
});

describe('ToolErrorBoundary', () => {
  const originalError = console.error;
  beforeAll(() => {
    console.error = vi.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });

  it('renders children when there is no error', () => {
    render(
      <ToolErrorBoundary toolName="Test Tool">
        <ThrowError shouldThrow={false} />
      </ToolErrorBoundary>
    );
    
    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('renders tool-specific error UI when child component throws', () => {
    render(
      <ToolErrorBoundary toolName="Test Tool">
        <ThrowError />
      </ToolErrorBoundary>
    );
    
    expect(screen.getByText('Error in Test Tool')).toBeInTheDocument();
    expect(screen.getByText(/An unexpected error occurred/)).toBeInTheDocument();
  });

  it('tracks retry attempts', () => {
    const { rerender } = render(
      <ToolErrorBoundary toolName="Test Tool">
        <ThrowError />
      </ToolErrorBoundary>
    );
    
    const retryButton = screen.getByText('Try Again');
    fireEvent.click(retryButton);
    
    // Simulate another error after retry
    rerender(
      <ToolErrorBoundary toolName="Test Tool">
        <ThrowError />
      </ToolErrorBoundary>
    );
    
    expect(screen.getByText(/Retry attempts: 1\/3/)).toBeInTheDocument();
  });

  it('calls onRetry callback when retry button is clicked', () => {
    const onRetry = vi.fn();
    
    render(
      <ToolErrorBoundary toolName="Test Tool" onRetry={onRetry}>
        <ThrowError />
      </ToolErrorBoundary>
    );
    
    const retryButton = screen.getByText('Try Again');
    fireEvent.click(retryButton);
    
    expect(onRetry).toHaveBeenCalled();
  });

  it('calls onGoBack callback when go back button is clicked', () => {
    const onGoBack = vi.fn();
    
    render(
      <ToolErrorBoundary toolName="Test Tool" onGoBack={onGoBack}>
        <ThrowError />
      </ToolErrorBoundary>
    );
    
    const goBackButton = screen.getByText('Go Back');
    fireEvent.click(goBackButton);
    
    expect(onGoBack).toHaveBeenCalled();
  });
});

describe('ErrorDisplay', () => {
  const mockError = {
    message: 'Test error message',
    type: 'error' as const,
    code: 'TEST_ERROR'
  };

  it('renders error message', () => {
    render(<ErrorDisplay error={mockError} />);
    
    expect(screen.getByText('Test error message')).toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('renders without title when showTitle is false', () => {
    render(<ErrorDisplay error={mockError} showTitle={false} />);
    
    expect(screen.getByText('Test error message')).toBeInTheDocument();
    expect(screen.queryByText('Error')).not.toBeInTheDocument();
  });

  it('calls onDismiss when dismiss button is clicked', () => {
    const onDismiss = vi.fn();
    
    render(<ErrorDisplay error={mockError} onDismiss={onDismiss} />);
    
    const dismissButton = screen.getByRole('button');
    fireEvent.click(dismissButton);
    
    expect(onDismiss).toHaveBeenCalled();
  });

  it('calls onRetry when retry button is clicked', () => {
    const onRetry = vi.fn();
    
    render(<ErrorDisplay error={mockError} onRetry={onRetry} />);
    
    const retryButton = screen.getByText('Try Again');
    fireEvent.click(retryButton);
    
    expect(onRetry).toHaveBeenCalled();
  });

  it('shows error code in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    
    render(<ErrorDisplay error={mockError} />);
    
    expect(screen.getByText('Error Code: TEST_ERROR')).toBeInTheDocument();
    
    process.env.NODE_ENV = originalEnv;
  });
});

describe('useErrorHandler', () => {
  it('initializes with no error', () => {
    const { result } = renderHook(() => useErrorHandler());
    
    expect(result.current.error).toBeNull();
  });

  it('sets and formats error', () => {
    const { result } = renderHook(() => useErrorHandler());
    
    act(() => {
      result.current.setError(new Error('Test error'));
    });
    
    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.message).toBe('An unexpected error occurred. Please try again.');
  });

  it('clears error', () => {
    const { result } = renderHook(() => useErrorHandler());
    
    act(() => {
      result.current.setError(new Error('Test error'));
    });
    
    expect(result.current.error).not.toBeNull();
    
    act(() => {
      result.current.clearError();
    });
    
    expect(result.current.error).toBeNull();
  });

  it('handles and returns formatted error', () => {
    const { result } = renderHook(() => useErrorHandler());
    
    let formattedError: any;
    act(() => {
      formattedError = result.current.handleError(new Error('Test error'));
    });
    
    expect(formattedError.message).toBe('An unexpected error occurred. Please try again.');
    expect(result.current.error).not.toBeNull();
  });
});

describe('Error boundary integration with TestComponent', () => {
  it('integrates useErrorHandler hook correctly', () => {
    render(<TestComponent />);
    
    const setErrorButton = screen.getByText('Set Error');
    fireEvent.click(setErrorButton);
    
    expect(screen.getByTestId('error-message')).toBeInTheDocument();
    
    const clearErrorButton = screen.getByText('Clear Error');
    fireEvent.click(clearErrorButton);
    
    expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
  });
});