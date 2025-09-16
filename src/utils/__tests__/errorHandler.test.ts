/**
 * Unit tests for error handler utility
 */

import { errorHandler } from '../errorHandler';

describe('ErrorHandler', () => {
  describe('formatError', () => {
    it('should route JSON errors to getJSONError', () => {
      const error = new Error('JSON parsing failed');
      const result = errorHandler.formatError(error);
      
      expect(result.type).toBe('error');
      expect(result.code).toBe('JSON_PARSE_ERROR');
      expect(result.message).toContain('Invalid JSON format');
    });

    it('should route CSV errors to getCSVError', () => {
      const error = new Error('CSV parsing failed');
      const result = errorHandler.formatError(error);
      
      expect(result.type).toBe('error');
      expect(result.code).toBe('CSV_PARSE_ERROR');
      expect(result.message).toContain('Unable to parse CSV data');
    });

    it('should route clipboard errors to getClipboardError', () => {
      const error = new Error('Clipboard access failed');
      const result = errorHandler.formatError(error);
      
      expect(result.type).toBe('warning');
      expect(result.code).toBe('CLIPBOARD_COPY_FAILED');
      expect(result.message).toContain('Failed to copy to clipboard');
    });

    it('should route unknown errors to getGenericError', () => {
      const error = new Error('Something went wrong');
      const result = errorHandler.formatError(error);
      
      expect(result.type).toBe('error');
      expect(result.code).toBe('UNKNOWN_ERROR');
      expect(result.message).toBe('An unexpected error occurred. Please try again.');
    });
  });

  describe('getJSONError', () => {
    it('should handle unexpected token errors', () => {
      const error = new Error('Unexpected token } in JSON at position 10');
      const result = errorHandler.getJSONError(error);
      
      expect(result.message).toContain('Unexpected }');
      expect(result.code).toBe('JSON_SYNTAX_ERROR');
      expect(result.type).toBe('error');
    });

    it('should handle unexpected end of input', () => {
      const error = new Error('Unexpected end of JSON input');
      const result = errorHandler.getJSONError(error);
      
      expect(result.message).toContain('incomplete');
      expect(result.code).toBe('JSON_INCOMPLETE');
    });

    it('should handle property name errors', () => {
      const error = new Error('Expected property name or }');
      const result = errorHandler.getJSONError(error);
      
      expect(result.message).toContain('double quotes');
      expect(result.code).toBe('JSON_PROPERTY_NAME');
    });

    it('should handle duplicate key errors', () => {
      const error = new Error('Duplicate key "name"');
      const result = errorHandler.getJSONError(error);
      
      expect(result.message).toContain('Duplicate property names');
      expect(result.code).toBe('JSON_DUPLICATE_KEY');
    });

    it('should handle generic JSON errors', () => {
      const error = new Error('Some other JSON error');
      const result = errorHandler.getJSONError(error);
      
      expect(result.message).toBe('Invalid JSON format. Please check your syntax and try again.');
      expect(result.code).toBe('JSON_PARSE_ERROR');
    });

    it('should handle non-Error objects', () => {
      const result = errorHandler.getJSONError('String error');
      
      expect(result.message).toBe('Invalid JSON format. Please check your syntax and try again.');
      expect(result.details).toBe('String error');
    });
  });

  describe('getCSVError', () => {
    it('should handle empty CSV errors', () => {
      const error = new Error('Empty CSV data');
      const result = errorHandler.getCSVError(error);
      
      expect(result.message).toContain('No CSV data provided');
      expect(result.code).toBe('CSV_EMPTY');
      expect(result.type).toBe('warning');
    });

    it('should handle parsing errors', () => {
      const error = new Error('CSV parsing failed');
      const result = errorHandler.getCSVError(error);
      
      expect(result.message).toContain('Unable to parse CSV data');
      expect(result.code).toBe('CSV_PARSE_ERROR');
      expect(result.type).toBe('error');
    });

    it('should handle file size errors', () => {
      const error = new Error('File too large to process');
      const result = errorHandler.getCSVError(error);
      
      expect(result.message).toContain('too large to process');
      expect(result.code).toBe('CSV_TOO_LARGE');
    });

    it('should handle generic CSV errors', () => {
      const error = new Error('Some CSV error');
      const result = errorHandler.getCSVError(error);
      
      expect(result.message).toBe('Error processing CSV data. Please check the format and try again.');
      expect(result.code).toBe('CSV_ERROR');
    });
  });

  describe('getClipboardError', () => {
    it('should handle not supported errors', () => {
      const error = new Error('Clipboard not supported');
      const result = errorHandler.getClipboardError(error);
      
      expect(result.message).toContain('not supported');
      expect(result.code).toBe('CLIPBOARD_NOT_SUPPORTED');
      expect(result.type).toBe('warning');
    });

    it('should handle permission errors', () => {
      const error = new Error('Clipboard permission denied');
      const result = errorHandler.getClipboardError(error);
      
      expect(result.message).toContain('permission');
      expect(result.code).toBe('CLIPBOARD_PERMISSION_DENIED');
    });

    it('should handle copy failed errors', () => {
      const error = new Error('Copy operation failed');
      const result = errorHandler.getClipboardError(error);
      
      expect(result.message).toContain('Failed to copy');
      expect(result.code).toBe('CLIPBOARD_COPY_FAILED');
    });

    it('should handle generic clipboard errors', () => {
      const error = new Error('Some clipboard error');
      const result = errorHandler.getClipboardError(error);
      
      expect(result.message).toBe('Clipboard operation failed. Please try copying manually.');
      expect(result.code).toBe('CLIPBOARD_ERROR');
    });
  });

  describe('getGenericError', () => {
    it('should handle network errors', () => {
      const error = new Error('Network connection failed');
      const result = errorHandler.getGenericError(error);
      
      expect(result.message).toContain('Network error');
      expect(result.code).toBe('NETWORK_ERROR');
    });

    it('should handle timeout errors', () => {
      const error = new Error('Operation timeout');
      const result = errorHandler.getGenericError(error);
      
      expect(result.message).toContain('timed out');
      expect(result.code).toBe('TIMEOUT_ERROR');
    });

    it('should handle memory errors', () => {
      const error = new Error('Out of memory');
      const result = errorHandler.getGenericError(error);
      
      expect(result.message).toContain('memory');
      expect(result.code).toBe('MEMORY_ERROR');
    });

    it('should handle unknown errors', () => {
      const error = new Error('Unknown error');
      const result = errorHandler.getGenericError(error);
      
      expect(result.message).toBe('An unexpected error occurred. Please try again.');
      expect(result.code).toBe('UNKNOWN_ERROR');
    });

    it('should handle non-Error objects', () => {
      const result = errorHandler.getGenericError('String error');
      
      expect(result.message).toBe('An unexpected error occurred. Please try again.');
      expect(result.details).toBe('String error');
    });
  });
});