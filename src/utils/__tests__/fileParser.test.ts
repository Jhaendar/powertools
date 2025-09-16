/**
 * Unit tests for file parser utility
 */

import { fileParser } from '../fileParser';

describe('FileParser', () => {
  describe('parseJSON', () => {
    it('should parse valid JSON object', () => {
      const input = '{"name": "test", "value": 123}';
      const result = fileParser.parseJSON(input);
      
      expect(result.isValid).toBe(true);
      expect(result.data).toEqual({ name: 'test', value: 123 });
      expect(result.error).toBeUndefined();
    });

    it('should parse valid JSON array', () => {
      const input = '[1, 2, 3, "test"]';
      const result = fileParser.parseJSON(input);
      
      expect(result.isValid).toBe(true);
      expect(result.data).toEqual([1, 2, 3, 'test']);
    });

    it('should handle empty input', () => {
      const result = fileParser.parseJSON('');
      
      expect(result.isValid).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toBe('Empty input');
    });

    it('should handle invalid JSON', () => {
      const input = '{"name": "test", "value":}';
      const result = fileParser.parseJSON(input);
      
      expect(result.isValid).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toContain('Unexpected token');
    });

    it('should parse primitive values', () => {
      expect(fileParser.parseJSON('true').data).toBe(true);
      expect(fileParser.parseJSON('false').data).toBe(false);
      expect(fileParser.parseJSON('null').data).toBeNull();
      expect(fileParser.parseJSON('42').data).toBe(42);
      expect(fileParser.parseJSON('"string"').data).toBe('string');
    });
  });

  describe('validateJSON', () => {
    it('should validate correct JSON', () => {
      const result = fileParser.validateJSON('{"valid": true}');
      
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid JSON', () => {
      const result = fileParser.validateJSON('{"invalid": }');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject empty input', () => {
      const result = fileParser.validateJSON('');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Empty input');
    });
  });

  describe('parseCSV', () => {
    it('should parse simple CSV with headers', () => {
      const input = 'Name,Age,City\nJohn,25,NYC\nJane,30,LA';
      const result = fileParser.parseCSV(input);
      
      expect(result.headers).toEqual(['Name', 'Age', 'City']);
      expect(result.rows).toEqual([
        ['John', '25', 'NYC'],
        ['Jane', '30', 'LA']
      ]);
      expect(result.totalRows).toBe(2);
      expect(result.hasHeaders).toBe(true);
    });

    it('should parse CSV without headers', () => {
      const input = 'John,25,NYC\nJane,30,LA';
      const result = fileParser.parseCSV(input, false);
      
      expect(result.headers).toEqual(['Column 1', 'Column 2', 'Column 3']);
      expect(result.rows).toEqual([
        ['John', '25', 'NYC'],
        ['Jane', '30', 'LA']
      ]);
      expect(result.hasHeaders).toBe(false);
    });

    it('should handle quoted values with commas', () => {
      const input = 'Name,Description\n"John Doe","A person, who lives in NYC"\n"Jane Smith","Another person"';
      const result = fileParser.parseCSV(input, true); // Explicitly specify headers
      
      expect(result.headers).toEqual(['Name', 'Description']);
      expect(result.rows[0]).toEqual(['John Doe', 'A person, who lives in NYC']);
      expect(result.rows[1]).toEqual(['Jane Smith', 'Another person']);
    });

    it('should handle escaped quotes', () => {
      const input = 'Name,Quote\n"John","He said ""Hello"""\n"Jane","She said ""Hi"""';
      const result = fileParser.parseCSV(input, true); // Explicitly specify headers
      
      expect(result.headers).toEqual(['Name', 'Quote']);
      expect(result.rows[0]).toEqual(['John', 'He said "Hello"']);
      expect(result.rows[1]).toEqual(['Jane', 'She said "Hi"']);
    });

    it('should handle empty input', () => {
      const result = fileParser.parseCSV('');
      
      expect(result.headers).toEqual([]);
      expect(result.rows).toEqual([]);
      expect(result.totalRows).toBe(0);
      expect(result.hasHeaders).toBe(false);
    });

    it('should handle single row', () => {
      const input = 'Name,Age,City';
      const result = fileParser.parseCSV(input);
      
      // With only one row, it's treated as data, not headers
      expect(result.headers).toEqual(['Column 1', 'Column 2', 'Column 3']);
      expect(result.rows).toEqual([['Name', 'Age', 'City']]);
      expect(result.totalRows).toBe(1);
    });

    it('should filter out empty lines', () => {
      const input = 'Name,Age\n\nJohn,25\n\nJane,30\n';
      const result = fileParser.parseCSV(input);
      
      expect(result.rows).toEqual([
        ['John', '25'],
        ['Jane', '30']
      ]);
      expect(result.totalRows).toBe(2);
    });
  });

  describe('detectCSVHeaders', () => {
    it('should detect headers when first row has text and second has numbers', () => {
      const input = 'Name,Age,Score\nJohn,25,95.5\nJane,30,87.2';
      const result = fileParser.detectCSVHeaders(input);
      
      expect(result).toBe(true);
    });

    it('should not detect headers when all rows have similar data types', () => {
      const input = '1,2,3\n4,5,6\n7,8,9';
      const result = fileParser.detectCSVHeaders(input);
      
      expect(result).toBe(false);
    });

    it('should handle single row', () => {
      const input = 'Name,Age,City';
      const result = fileParser.detectCSVHeaders(input);
      
      expect(result).toBe(false);
    });

    it('should handle empty input', () => {
      const result = fileParser.detectCSVHeaders('');
      
      expect(result).toBe(false);
    });

    it('should handle malformed CSV gracefully', () => {
      const input = 'Name,Age\n"Unclosed quote,25';
      const result = fileParser.detectCSVHeaders(input);
      
      expect(result).toBe(false);
    });
  });
});