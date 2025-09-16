/**
 * Unit tests for input validator utility
 */

import { inputValidator, commonValidationRules } from '../inputValidator';

describe('InputValidator', () => {
  describe('validateJSON', () => {
    it('should validate correct JSON object', () => {
      const result = inputValidator.validateJSON('{"name": "test", "value": 123}');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate correct JSON array', () => {
      const result = inputValidator.validateJSON('[1, 2, 3]');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate primitive JSON values', () => {
      expect(inputValidator.validateJSON('true').isValid).toBe(true);
      expect(inputValidator.validateJSON('false').isValid).toBe(true);
      expect(inputValidator.validateJSON('null').isValid).toBe(true);
      expect(inputValidator.validateJSON('42').isValid).toBe(true);
      expect(inputValidator.validateJSON('"string"').isValid).toBe(true);
    });

    it('should reject empty input', () => {
      const result = inputValidator.validateJSON('');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('JSON input cannot be empty');
    });

    it('should reject invalid JSON structure', () => {
      const result = inputValidator.validateJSON('invalid json');
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('valid JSON'))).toBe(true);
    });

    it('should detect single quotes issue', () => {
      const result = inputValidator.validateJSON("{'name': 'test'}");
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('double quotes'))).toBe(true);
    });

    it('should detect trailing commas', () => {
      const result = inputValidator.validateJSON('{"name": "test",}');
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('trailing commas'))).toBe(true);
    });

    it('should provide parsing error details', () => {
      const result = inputValidator.validateJSON('{"name": }');
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('JSON parsing error'))).toBe(true);
    });
  });

  describe('validateCSV', () => {
    it('should validate correct CSV', () => {
      const result = inputValidator.validateCSV('Name,Age\nJohn,25\nJane,30');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty input', () => {
      const result = inputValidator.validateCSV('');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('CSV input cannot be empty');
    });

    it('should reject CSV with no data rows', () => {
      const result = inputValidator.validateCSV('\n\n\n');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('CSV input cannot be empty');
    });

    it('should detect inconsistent column counts', () => {
      const result = inputValidator.validateCSV('Name,Age\nJohn,25,Extra\nJane,30');
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Row 2 has 3 columns'))).toBe(true);
    });

    it('should detect unclosed quotes', () => {
      const result = inputValidator.validateCSV('Name,Description\n"John,Unclosed quote');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('CSV contains unclosed quotes');
    });

    it('should handle escaped quotes correctly', () => {
      const result = inputValidator.validateCSV('Name,Quote\n"John","He said ""Hello"""');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateFileSize', () => {
    it('should validate small content', () => {
      const result = inputValidator.validateFileSize('small content');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject content exceeding size limit', () => {
      const largeContent = 'x'.repeat(2000000); // ~2MB
      const result = inputValidator.validateFileSize(largeContent, 1024); // 1MB limit
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('exceeds maximum'))).toBe(true);
    });

    it('should use custom size limit', () => {
      const content = 'x'.repeat(600000); // ~600KB
      const result = inputValidator.validateFileSize(content, 500); // 500KB limit
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('500KB'))).toBe(true);
    });
  });

  describe('validateRequired', () => {
    it('should validate non-empty input', () => {
      const result = inputValidator.validateRequired('some value');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty string', () => {
      const result = inputValidator.validateRequired('');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('This field is required');
    });

    it('should reject whitespace-only string', () => {
      const result = inputValidator.validateRequired('   ');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('This field is required');
    });
  });

  describe('validateCustom', () => {
    it('should validate against custom rules', () => {
      const rules = [
        commonValidationRules.minLength(5),
        commonValidationRules.maxLength(10)
      ];
      
      const result = inputValidator.validateCustom('hello', rules);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should collect all validation errors', () => {
      const rules = [
        commonValidationRules.minLength(10),
        commonValidationRules.numeric()
      ];
      
      const result = inputValidator.validateCustom('abc', rules);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors).toContain('Must be at least 10 characters long');
      expect(result.errors).toContain('Must be a valid number');
    });
  });
});

describe('commonValidationRules', () => {
  describe('minLength', () => {
    it('should validate minimum length', () => {
      const rule = commonValidationRules.minLength(5);
      
      expect(rule.validate('hello')).toBe(true);
      expect(rule.validate('hi')).toBe(false);
      expect(rule.message).toBe('Must be at least 5 characters long');
    });
  });

  describe('maxLength', () => {
    it('should validate maximum length', () => {
      const rule = commonValidationRules.maxLength(5);
      
      expect(rule.validate('hello')).toBe(true);
      expect(rule.validate('hello world')).toBe(false);
      expect(rule.message).toBe('Must be no more than 5 characters long');
    });
  });

  describe('pattern', () => {
    it('should validate against regex pattern', () => {
      const rule = commonValidationRules.pattern(/^\d+$/, 'Must be digits only');
      
      expect(rule.validate('123')).toBe(true);
      expect(rule.validate('abc')).toBe(false);
      expect(rule.message).toBe('Must be digits only');
    });
  });

  describe('numeric', () => {
    it('should validate numeric values', () => {
      const rule = commonValidationRules.numeric();
      
      expect(rule.validate('123')).toBe(true);
      expect(rule.validate('123.45')).toBe(true);
      expect(rule.validate('-123')).toBe(true);
      expect(rule.validate('abc')).toBe(false);
      expect(rule.validate('')).toBe(false);
    });
  });

  describe('email', () => {
    it('should validate email addresses', () => {
      const rule = commonValidationRules.email();
      
      expect(rule.validate('test@example.com')).toBe(true);
      expect(rule.validate('user.name+tag@domain.co.uk')).toBe(true);
      expect(rule.validate('invalid-email')).toBe(false);
      expect(rule.validate('test@')).toBe(false);
    });
  });

  describe('url', () => {
    it('should validate URLs', () => {
      const rule = commonValidationRules.url();
      
      expect(rule.validate('https://example.com')).toBe(true);
      expect(rule.validate('http://localhost:3000')).toBe(true);
      expect(rule.validate('ftp://files.example.com')).toBe(true);
      expect(rule.validate('not-a-url')).toBe(false);
      expect(rule.validate('http://')).toBe(false);
    });
  });
});