/**
 * Input validation utilities
 * Provides validation functions for various input types and formats
 */

export interface ValidationRule {
  validate: (value: string) => boolean;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface InputValidator {
  validateJSON: (input: string) => ValidationResult;
  validateCSV: (input: string) => ValidationResult;
  validateFileSize: (content: string, maxSizeKB?: number) => ValidationResult;
  validateRequired: (input: string) => ValidationResult;
  validateCustom: (input: string, rules: ValidationRule[]) => ValidationResult;
}

class InputValidatorImpl implements InputValidator {
  private readonly DEFAULT_MAX_SIZE_KB = 1024; // 1MB default

  /**
   * Validate JSON input
   * @param input - JSON string to validate
   * @returns ValidationResult with errors if any
   */
  validateJSON(input: string): ValidationResult {
    const errors: string[] = [];

    // Check if input is empty
    if (!input.trim()) {
      errors.push('JSON input cannot be empty');
      return { isValid: false, errors };
    }

    // Check for basic JSON structure
    const trimmed = input.trim();
    if (!((trimmed.startsWith('{') && trimmed.endsWith('}')) || 
          (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
          trimmed.startsWith('"') ||
          /^(true|false|null|\d+)$/.test(trimmed))) {
      errors.push('Input must be valid JSON (object, array, string, number, boolean, or null)');
    }

    // Try to parse JSON
    try {
      JSON.parse(input);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid JSON format';
      errors.push(`JSON parsing error: ${message}`);
    }

    // Check for common issues
    if (input.includes("'")) {
      errors.push('JSON strings must use double quotes ("), not single quotes (\')');
    }

    // Check for trailing commas (common mistake)
    if (/,\s*[}\]]/.test(input)) {
      errors.push('Remove trailing commas before closing brackets');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate CSV input
   * @param input - CSV string to validate
   * @returns ValidationResult with errors if any
   */
  validateCSV(input: string): ValidationResult {
    const errors: string[] = [];

    // Check if input is empty
    if (!input.trim()) {
      errors.push('CSV input cannot be empty');
      return { isValid: false, errors };
    }

    // Split into lines and check basic structure
    const lines = input.split(/\r?\n/).filter(line => line.trim());
    
    if (lines.length === 0) {
      errors.push('CSV must contain at least one row of data');
      return { isValid: false, errors };
    }

    // Check for consistent column count
    const columnCounts = lines.map(line => this.countCSVColumns(line));
    const firstRowColumns = columnCounts[0];
    const inconsistentRows = columnCounts.findIndex((count, index) => 
      index > 0 && count !== firstRowColumns
    );

    if (inconsistentRows !== -1) {
      errors.push(`Row ${inconsistentRows + 1} has ${columnCounts[inconsistentRows]} columns, but expected ${firstRowColumns}`);
    }

    // Check for unclosed quotes
    let inQuotes = false;
    for (let i = 0; i < input.length; i++) {
      if (input[i] === '"') {
        if (i + 1 < input.length && input[i + 1] === '"') {
          i++; // Skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      }
    }

    if (inQuotes) {
      errors.push('CSV contains unclosed quotes');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Count columns in a CSV line
   * @param line - CSV line
   * @returns Number of columns
   */
  private countCSVColumns(line: string): number {
    let count = 1;
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          i++; // Skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        count++;
      }
    }

    return count;
  }

  /**
   * Validate file size
   * @param content - File content
   * @param maxSizeKB - Maximum size in KB (default: 1MB)
   * @returns ValidationResult
   */
  validateFileSize(content: string, maxSizeKB = this.DEFAULT_MAX_SIZE_KB): ValidationResult {
    const errors: string[] = [];
    const sizeKB = new Blob([content]).size / 1024;

    if (sizeKB > maxSizeKB) {
      errors.push(`File size (${sizeKB.toFixed(1)}KB) exceeds maximum allowed size (${maxSizeKB}KB)`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate required input
   * @param input - Input to validate
   * @returns ValidationResult
   */
  validateRequired(input: string): ValidationResult {
    const errors: string[] = [];

    if (!input || !input.trim()) {
      errors.push('This field is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate input against custom rules
   * @param input - Input to validate
   * @param rules - Array of validation rules
   * @returns ValidationResult
   */
  validateCustom(input: string, rules: ValidationRule[]): ValidationResult {
    const errors: string[] = [];

    for (const rule of rules) {
      if (!rule.validate(input)) {
        errors.push(rule.message);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Common validation rules
export const commonValidationRules = {
  minLength: (min: number): ValidationRule => ({
    validate: (value: string) => value.length >= min,
    message: `Must be at least ${min} characters long`
  }),

  maxLength: (max: number): ValidationRule => ({
    validate: (value: string) => value.length <= max,
    message: `Must be no more than ${max} characters long`
  }),

  pattern: (regex: RegExp, message: string): ValidationRule => ({
    validate: (value: string) => regex.test(value),
    message
  }),

  numeric: (): ValidationRule => ({
    validate: (value: string) => !isNaN(Number(value)) && value.trim() !== '',
    message: 'Must be a valid number'
  }),

  email: (): ValidationRule => ({
    validate: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    message: 'Must be a valid email address'
  }),

  url: (): ValidationRule => ({
    validate: (value: string) => {
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    message: 'Must be a valid URL'
  })
};

// Export singleton instance
export const inputValidator = new InputValidatorImpl();