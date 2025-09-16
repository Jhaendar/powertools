import { useCallback, useState } from 'react';
import { errorHandler, ErrorInfo } from '../../utils/errorHandler';

interface UseErrorHandlerReturn {
  error: ErrorInfo | null;
  setError: (error: unknown) => void;
  clearError: () => void;
  handleError: (error: unknown) => ErrorInfo;
}

/**
 * Hook for handling errors in functional components
 * Provides error state management and formatting
 */
export const useErrorHandler = (): UseErrorHandlerReturn => {
  const [error, setErrorState] = useState<ErrorInfo | null>(null);

  const setError = useCallback((error: unknown) => {
    const formattedError = errorHandler.formatError(error);
    setErrorState(formattedError);
  }, []);

  const clearError = useCallback(() => {
    setErrorState(null);
  }, []);

  const handleError = useCallback((error: unknown): ErrorInfo => {
    const formattedError = errorHandler.formatError(error);
    setErrorState(formattedError);
    return formattedError;
  }, []);

  return {
    error,
    setError,
    clearError,
    handleError
  };
};