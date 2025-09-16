/**
 * Error handler utility for user-friendly error messages
 * Provides centralized error handling and message formatting
 */

export interface ErrorInfo {
  message: string;
  type: 'error' | 'warning' | 'info';
  code?: string;
  details?: string;
}

export interface ErrorHandler {
  formatError: (error: unknown) => ErrorInfo;
  getJSONError: (error: unknown) => ErrorInfo;
  getCSVError: (error: unknown) => ErrorInfo;
  getClipboardError: (error: unknown) => ErrorInfo;
  getGenericError: (error: unknown) => ErrorInfo;
}

class ErrorHandlerImpl implements ErrorHandler {
  /**
   * Format any error into a user-friendly ErrorInfo object
   * @param error - Error to format
   * @returns ErrorInfo with user-friendly message
   */
  formatError(error: unknown): ErrorInfo {
    if (error instanceof Error) {
      // Check for specific error types
      if (error.message.includes('JSON')) {
        return this.getJSONError(error);
      }
      if (error.message.includes('CSV')) {
        return this.getCSVError(error);
      }
      if (error.message.includes('clipboard') || error.message.includes('Clipboard')) {
        return this.getClipboardError(error);
      }
    }

    return this.getGenericError(error);
  }

  /**
   * Format JSON-related errors
   * @param error - JSON parsing error
   * @returns ErrorInfo with JSON-specific message
   */
  getJSONError(error: unknown): ErrorInfo {
    const message = error instanceof Error ? error.message : String(error);
    
    // Common JSON error patterns and user-friendly messages
    if (message.includes('Unexpected token')) {
      const tokenMatch = message.match(/Unexpected token (.+?) in JSON/);
      const token = tokenMatch ? tokenMatch[1] : 'character';
      return {
        message: `Invalid JSON: Unexpected ${token}. Check for missing quotes, commas, or brackets.`,
        type: 'error',
        code: 'JSON_SYNTAX_ERROR',
        details: message
      };
    }

    if (message.includes('Unexpected end of JSON input')) {
      return {
        message: 'Invalid JSON: The input appears to be incomplete. Check for missing closing brackets or quotes.',
        type: 'error',
        code: 'JSON_INCOMPLETE',
        details: message
      };
    }

    if (message.includes('Expected property name')) {
      return {
        message: 'Invalid JSON: Property names must be enclosed in double quotes.',
        type: 'error',
        code: 'JSON_PROPERTY_NAME',
        details: message
      };
    }

    if (message.includes('Duplicate key')) {
      return {
        message: 'Invalid JSON: Duplicate property names are not allowed.',
        type: 'error',
        code: 'JSON_DUPLICATE_KEY',
        details: message
      };
    }

    return {
      message: 'Invalid JSON format. Please check your syntax and try again.',
      type: 'error',
      code: 'JSON_PARSE_ERROR',
      details: message
    };
  }

  /**
   * Format CSV-related errors
   * @param error - CSV parsing error
   * @returns ErrorInfo with CSV-specific message
   */
  getCSVError(error: unknown): ErrorInfo {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes('Empty')) {
      return {
        message: 'No CSV data provided. Please paste or upload CSV content.',
        type: 'warning',
        code: 'CSV_EMPTY',
        details: message
      };
    }

    if (message.includes('parsing failed')) {
      return {
        message: 'Unable to parse CSV data. Please check the format and try again.',
        type: 'error',
        code: 'CSV_PARSE_ERROR',
        details: message
      };
    }

    if (message.includes('too large')) {
      return {
        message: 'CSV file is too large to process. Try reducing the file size or number of rows.',
        type: 'error',
        code: 'CSV_TOO_LARGE',
        details: message
      };
    }

    return {
      message: 'Error processing CSV data. Please check the format and try again.',
      type: 'error',
      code: 'CSV_ERROR',
      details: message
    };
  }

  /**
   * Format clipboard-related errors
   * @param error - Clipboard operation error
   * @returns ErrorInfo with clipboard-specific message
   */
  getClipboardError(error: unknown): ErrorInfo {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes('not supported') || message.includes('NotSupportedError')) {
      return {
        message: 'Clipboard access is not supported in this browser or context. Try using a secure (HTTPS) connection.',
        type: 'warning',
        code: 'CLIPBOARD_NOT_SUPPORTED',
        details: message
      };
    }

    if (message.includes('permission') || message.includes('NotAllowedError')) {
      return {
        message: 'Clipboard access was denied. Please allow clipboard permissions and try again.',
        type: 'warning',
        code: 'CLIPBOARD_PERMISSION_DENIED',
        details: message
      };
    }

    if (message.includes('failed')) {
      return {
        message: 'Failed to copy to clipboard. You can manually select and copy the text.',
        type: 'warning',
        code: 'CLIPBOARD_COPY_FAILED',
        details: message
      };
    }

    return {
      message: 'Clipboard operation failed. Please try copying manually.',
      type: 'warning',
      code: 'CLIPBOARD_ERROR',
      details: message
    };
  }

  /**
   * Format generic errors
   * @param error - Generic error
   * @returns ErrorInfo with generic message
   */
  getGenericError(error: unknown): ErrorInfo {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes('Network')) {
      return {
        message: 'Network error occurred. Please check your connection and try again.',
        type: 'error',
        code: 'NETWORK_ERROR',
        details: message
      };
    }

    if (message.includes('timeout')) {
      return {
        message: 'Operation timed out. Please try again.',
        type: 'error',
        code: 'TIMEOUT_ERROR',
        details: message
      };
    }

    if (message.includes('Memory') || message.includes('memory')) {
      return {
        message: 'Not enough memory to complete the operation. Try with smaller data.',
        type: 'error',
        code: 'MEMORY_ERROR',
        details: message
      };
    }

    return {
      message: 'An unexpected error occurred. Please try again.',
      type: 'error',
      code: 'UNKNOWN_ERROR',
      details: message
    };
  }
}

// Export singleton instance
export const errorHandler = new ErrorHandlerImpl();