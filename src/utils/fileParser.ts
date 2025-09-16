/**
 * File parser utilities for JSON and CSV processing
 * Provides robust parsing with error handling and validation
 */

import { ParsedCSV, ParsedJSON, ValidationResult } from '../types';

export interface FileParser {
  parseCSV: (content: string, hasHeaders?: boolean) => ParsedCSV;
  parseJSON: (content: string) => ParsedJSON;
  validateJSON: (content: string) => ValidationResult;
  detectCSVHeaders: (content: string) => boolean;
}

class FileParserImpl implements FileParser {
  /**
   * Parse CSV content into structured data
   * @param content - Raw CSV string
   * @param hasHeaders - Whether the first row contains headers (auto-detected if not specified)
   * @returns ParsedCSV object with headers, rows, and metadata
   */
  parseCSV(content: string, hasHeaders?: boolean): ParsedCSV {
    try {
      if (!content.trim()) {
        return {
          headers: [],
          rows: [],
          totalRows: 0,
          hasHeaders: false
        };
      }

      // Split content into lines and filter out empty lines
      const lines = content
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.length > 0);

      if (lines.length === 0) {
        return {
          headers: [],
          rows: [],
          totalRows: 0,
          hasHeaders: false
        };
      }

      // Parse CSV rows using a simple but effective CSV parser
      const parsedRows = lines.map(line => this.parseCSVLine(line));
      
      // Auto-detect headers if not specified
      const detectedHeaders = hasHeaders ?? this.detectCSVHeaders(content);
      
      let headers: string[] = [];
      let dataRows: string[][] = [];

      if (detectedHeaders && parsedRows.length > 0) {
        headers = parsedRows[0];
        dataRows = parsedRows.slice(1);
      } else {
        // Generate generic column headers
        const maxColumns = Math.max(...parsedRows.map(row => row.length));
        headers = Array.from({ length: maxColumns }, (_, i) => `Column ${i + 1}`);
        dataRows = parsedRows;
      }

      return {
        headers,
        rows: dataRows,
        totalRows: dataRows.length,
        hasHeaders: detectedHeaders
      };
    } catch (error) {
      throw new Error(`CSV parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse a single CSV line handling quoted values and commas
   * @param line - CSV line to parse
   * @returns Array of field values
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i += 2;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator
        result.push(current.trim());
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }

    // Add the last field
    result.push(current.trim());
    return result;
  }

  /**
   * Detect if CSV has headers by analyzing the first row
   * @param content - Raw CSV content
   * @returns boolean indicating if headers are likely present
   */
  detectCSVHeaders(content: string): boolean {
    try {
      const lines = content.split(/\r?\n/).filter(line => line.trim());
      if (lines.length < 2) return false;

      const firstRow = this.parseCSVLine(lines[0]);
      const secondRow = this.parseCSVLine(lines[1]);

      // Simple heuristic: if first row contains text and second row has at least one number
      const firstRowHasText = firstRow.some(cell => 
        isNaN(Number(cell)) && cell.trim() !== ''
      );
      const secondRowHasNumbers = secondRow.some(cell => 
        !isNaN(Number(cell)) && cell.trim() !== ''
      );

      // Return true if first row has text and second row has numbers
      return firstRowHasText && secondRowHasNumbers;
    } catch {
      return false;
    }
  }

  /**
   * Parse JSON content with error handling
   * @param content - Raw JSON string
   * @returns ParsedJSON object with data and validation info
   */
  parseJSON(content: string): ParsedJSON {
    try {
      if (!content.trim()) {
        return {
          data: null,
          isValid: false,
          error: 'Empty input'
        };
      }

      const data = JSON.parse(content);
      return {
        data,
        isValid: true
      };
    } catch (error) {
      return {
        data: null,
        isValid: false,
        error: error instanceof Error ? error.message : 'Invalid JSON format'
      };
    }
  }

  /**
   * Validate JSON content without parsing
   * @param content - Raw JSON string
   * @returns ValidationResult with validity and error info
   */
  validateJSON(content: string): ValidationResult {
    try {
      if (!content.trim()) {
        return {
          isValid: false,
          error: 'Empty input'
        };
      }

      JSON.parse(content);
      return {
        isValid: true
      };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Invalid JSON format'
      };
    }
  }
}

// Export singleton instance
export const fileParser = new FileParserImpl();