/**
 * Text Diff Processing Utilities
 * Provides functions to compare text and generate GitHub-style diff output
 */

import { diffLines, Change } from 'diff';
import { DiffResult } from '@/types';

/**
 * Process text differences and return formatted results
 * @param originalText - Original text content
 * @param modifiedText - Modified text content
 * @returns Array of diff results with line information
 */
export function processTextDiff(originalText: string, modifiedText: string): DiffResult[] {
  // Handle empty inputs
  if (!originalText && !modifiedText) {
    return [];
  }

  if (!originalText) {
    return modifiedText.split('\n').map((line, index) => ({
      type: 'added' as const,
      value: line,
      lineNumber: index + 1
    }));
  }

  if (!modifiedText) {
    return originalText.split('\n').map((line, index) => ({
      type: 'removed' as const,
      value: line,
      lineNumber: index + 1
    }));
  }

  // Use the diff library to compare line by line
  const changes = diffLines(originalText, modifiedText);
  const results: DiffResult[] = [];
  let lineNumber = 1;

  changes.forEach((change: Change) => {
    // Split by lines but be careful about trailing newlines
    const lines = change.value.split('\n');
    
    // The diff library often adds an extra empty line at the end
    // Remove it if it's the last element and empty
    if (lines.length > 1 && lines[lines.length - 1] === '') {
      lines.pop();
    }

    lines.forEach((line, index) => {
      // Only skip empty lines if they're not the only line in the change
      if (line === '' && lines.length > 1 && index === lines.length - 1) {
        return;
      }
      
      if (change.added) {
        results.push({
          type: 'added',
          value: line,
          lineNumber: lineNumber++
        });
      } else if (change.removed) {
        results.push({
          type: 'removed',
          value: line,
          lineNumber: lineNumber++
        });
      } else {
        results.push({
          type: 'unchanged',
          value: line,
          lineNumber: lineNumber++
        });
      }
    });
  });

  return results;
}

/**
 * Format diff results for display with GitHub-style formatting
 * @param diffResults - Array of diff results
 * @param showLineNumbers - Whether to include line numbers
 * @returns Formatted diff string
 */
export function formatDiffOutput(diffResults: DiffResult[], showLineNumbers: boolean = true): string {
  if (diffResults.length === 0) {
    return 'No differences found - texts are identical.';
  }

  return diffResults.map((result) => {
    const lineNum = showLineNumbers && result.lineNumber 
      ? `${result.lineNumber.toString().padStart(4, ' ')} ` 
      : '';
    
    switch (result.type) {
      case 'added':
        return `${lineNum}+ ${result.value}`;
      case 'removed':
        return `${lineNum}- ${result.value}`;
      case 'unchanged':
        return `${lineNum}  ${result.value}`;
      default:
        return `${lineNum}  ${result.value}`;
    }
  }).join('\n');
}

/**
 * Get diff statistics
 * @param diffResults - Array of diff results
 * @returns Statistics about the diff
 */
export function getDiffStats(diffResults: DiffResult[]): {
  additions: number;
  deletions: number;
  unchanged: number;
  total: number;
} {
  const stats = {
    additions: 0,
    deletions: 0,
    unchanged: 0,
    total: diffResults.length
  };

  diffResults.forEach((result) => {
    switch (result.type) {
      case 'added':
        stats.additions++;
        break;
      case 'removed':
        stats.deletions++;
        break;
      case 'unchanged':
        stats.unchanged++;
        break;
    }
  });

  return stats;
}

/**
 * Check if two texts are identical
 * @param text1 - First text
 * @param text2 - Second text
 * @returns True if texts are identical
 */
export function areTextsIdentical(text1: string, text2: string): boolean {
  return text1.trim() === text2.trim();
}

/**
 * Debounce function for performance optimization
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Validate text input for diff processing
 * @param text - Text to validate
 * @param maxLength - Maximum allowed length (default: 100KB)
 * @returns Validation result
 */
export function validateTextInput(text: string, maxLength: number = 100000): {
  isValid: boolean;
  error?: string;
} {
  if (text.length > maxLength) {
    return {
      isValid: false,
      error: `Text is too large (${text.length} characters). Maximum allowed: ${maxLength} characters.`
    };
  }

  return { isValid: true };
}

/**
 * Optimize large text for diff processing
 * @param text - Text to optimize
 * @param maxLines - Maximum number of lines to process
 * @returns Optimized text or original if within limits
 */
export function optimizeTextForDiff(text: string, maxLines: number = 1000): {
  text: string;
  truncated: boolean;
} {
  const lines = text.split('\n');
  
  if (lines.length <= maxLines) {
    return { text, truncated: false };
  }

  const truncatedLines = lines.slice(0, maxLines);
  const truncatedText = truncatedLines.join('\n') + 
    `\n\n... (${lines.length - maxLines} more lines truncated for performance)`;

  return { text: truncatedText, truncated: true };
}