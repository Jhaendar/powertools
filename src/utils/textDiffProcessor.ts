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
 * Format diff results as HTML with proper styling classes
 * @param diffResults - Array of diff results
 * @param showLineNumbers - Whether to include line numbers
 * @returns HTML string with styled diff output
 */
export function formatDiffOutputHTML(diffResults: DiffResult[], showLineNumbers: boolean = true): string {
  if (diffResults.length === 0) {
    return '<div class="diff-empty">No differences found - texts are identical.</div>';
  }

  const lines = diffResults.map((result) => {
    const lineNum = showLineNumbers && result.lineNumber 
      ? `<span class="diff-line-number">${result.lineNumber.toString().padStart(4, ' ')}</span> ` 
      : '';
    
    const escapedValue = escapeHtml(result.value);
    
    switch (result.type) {
      case 'added':
        return `<div class="diff-line diff-added">${lineNum}<span class="diff-marker">+</span> <span class="diff-content">${escapedValue}</span></div>`;
      case 'removed':
        return `<div class="diff-line diff-removed">${lineNum}<span class="diff-marker">-</span> <span class="diff-content">${escapedValue}</span></div>`;
      case 'unchanged':
        return `<div class="diff-line diff-unchanged">${lineNum}<span class="diff-marker"> </span> <span class="diff-content">${escapedValue}</span></div>`;
      default:
        return `<div class="diff-line diff-unchanged">${lineNum}<span class="diff-marker"> </span> <span class="diff-content">${escapedValue}</span></div>`;
    }
  });

  return `<div class="diff-output">${lines.join('')}</div>`;
}

/**
 * Generate line numbers for diff display
 * @param diffResults - Array of diff results
 * @returns Object with original and modified line numbers
 */
export function generateLineNumbers(diffResults: DiffResult[]): {
  originalLines: (number | null)[];
  modifiedLines: (number | null)[];
} {
  const originalLines: (number | null)[] = [];
  const modifiedLines: (number | null)[] = [];
  
  let originalLineNum = 1;
  let modifiedLineNum = 1;

  diffResults.forEach((result) => {
    switch (result.type) {
      case 'added':
        originalLines.push(null);
        modifiedLines.push(modifiedLineNum++);
        break;
      case 'removed':
        originalLines.push(originalLineNum++);
        modifiedLines.push(null);
        break;
      case 'unchanged':
        originalLines.push(originalLineNum++);
        modifiedLines.push(modifiedLineNum++);
        break;
    }
  });

  return { originalLines, modifiedLines };
}

/**
 * Format diff results for side-by-side display
 * @param diffResults - Array of diff results
 * @param showLineNumbers - Whether to include line numbers
 * @returns Object with left and right side content
 */
export function formatSideBySideDiff(diffResults: DiffResult[], showLineNumbers: boolean = true): {
  leftSide: string[];
  rightSide: string[];
  lineNumbers: { originalLines: (number | null)[]; modifiedLines: (number | null)[] };
} {
  if (diffResults.length === 0) {
    return {
      leftSide: ['No differences found - texts are identical.'],
      rightSide: ['No differences found - texts are identical.'],
      lineNumbers: { originalLines: [null], modifiedLines: [null] }
    };
  }

  const leftSide: string[] = [];
  const rightSide: string[] = [];
  const lineNumbers = generateLineNumbers(diffResults);

  diffResults.forEach((result, index) => {
    const originalLineNum = lineNumbers.originalLines[index];
    const modifiedLineNum = lineNumbers.modifiedLines[index];
    
    const leftLineNum = showLineNumbers && originalLineNum 
      ? `${originalLineNum.toString().padStart(4, ' ')} ` 
      : showLineNumbers ? '     ' : '';
    
    const rightLineNum = showLineNumbers && modifiedLineNum 
      ? `${modifiedLineNum.toString().padStart(4, ' ')} ` 
      : showLineNumbers ? '     ' : '';

    switch (result.type) {
      case 'added':
        leftSide.push(`${leftLineNum}   `); // Empty line on left
        rightSide.push(`${rightLineNum}+ ${result.value}`);
        break;
      case 'removed':
        leftSide.push(`${leftLineNum}- ${result.value}`);
        rightSide.push(`${rightLineNum}   `); // Empty line on right
        break;
      case 'unchanged':
        leftSide.push(`${leftLineNum}  ${result.value}`);
        rightSide.push(`${rightLineNum}  ${result.value}`);
        break;
    }
  });

  return { leftSide, rightSide, lineNumbers };
}

/**
 * Handle empty diff cases with appropriate messaging
 * @param originalText - Original text
 * @param modifiedText - Modified text
 * @returns Appropriate message for empty diff cases
 */
export function handleEmptyDiff(originalText: string, modifiedText: string): string {
  if (!originalText && !modifiedText) {
    return 'Both texts are empty.';
  }
  
  if (!originalText) {
    return 'Original text is empty. All content is new.';
  }
  
  if (!modifiedText) {
    return 'Modified text is empty. All content was removed.';
  }
  
  if (areTextsIdentical(originalText, modifiedText)) {
    return 'No differences found - texts are identical.';
  }
  
  return 'Processing diff...';
}

/**
 * Escape HTML characters for safe display
 * @param text - Text to escape
 * @returns HTML-escaped text
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Get CSS classes for diff styling
 * @returns Object with CSS class definitions
 */
export function getDiffStyleClasses(): Record<string, string> {
  return {
    diffOutput: 'diff-output',
    diffLine: 'diff-line',
    diffAdded: 'diff-added',
    diffRemoved: 'diff-removed',
    diffUnchanged: 'diff-unchanged',
    diffLineNumber: 'diff-line-number',
    diffMarker: 'diff-marker',
    diffContent: 'diff-content',
    diffEmpty: 'diff-empty'
  };
}

/**
 * Format diff results for copying to clipboard
 * @param diffResults - Array of diff results
 * @param includeStats - Whether to include diff statistics
 * @returns Plain text diff suitable for clipboard
 */
export function formatDiffForClipboard(diffResults: DiffResult[], includeStats: boolean = true): string {
  if (diffResults.length === 0) {
    return 'No differences found - texts are identical.';
  }

  let output = '';
  
  if (includeStats) {
    const stats = getDiffStats(diffResults);
    output += `Diff Summary: +${stats.additions} -${stats.deletions} (${stats.total} lines)\n`;
    output += '─'.repeat(50) + '\n';
  }

  output += formatDiffOutput(diffResults, true);
  
  return output;
}

/**
 * Create a unified diff header
 * @param originalLabel - Label for original text (e.g., filename)
 * @param modifiedLabel - Label for modified text (e.g., filename)
 * @param timestamp - Optional timestamp
 * @returns Formatted diff header
 */
export function createDiffHeader(
  originalLabel: string = 'Original',
  modifiedLabel: string = 'Modified',
  timestamp?: Date
): string {
  const timeStr = timestamp ? timestamp.toISOString() : new Date().toISOString();
  return `--- ${originalLabel}\t${timeStr}\n+++ ${modifiedLabel}\t${timeStr}`;
}

/**
 * Format diff results in unified diff format (similar to git diff)
 * @param diffResults - Array of diff results
 * @param originalLabel - Label for original text
 * @param modifiedLabel - Label for modified text
 * @param contextLines - Number of context lines to show around changes
 * @returns Unified diff format string
 */
export function formatUnifiedDiff(
  diffResults: DiffResult[],
  originalLabel: string = 'Original',
  modifiedLabel: string = 'Modified',
  contextLines: number = 3
): string {
  if (diffResults.length === 0) {
    return 'No differences found - texts are identical.';
  }

  const header = createDiffHeader(originalLabel, modifiedLabel);
  const stats = getDiffStats(diffResults);
  
  let output = header + '\n';
  output += `@@ -1,${stats.deletions + stats.unchanged} +1,${stats.additions + stats.unchanged} @@\n`;
  
  // Group changes with context
  const chunks = groupDiffChunks(diffResults, contextLines);
  
  chunks.forEach(chunk => {
    chunk.forEach(result => {
      switch (result.type) {
        case 'added':
          output += `+${result.value}\n`;
          break;
        case 'removed':
          output += `-${result.value}\n`;
          break;
        case 'unchanged':
          output += ` ${result.value}\n`;
          break;
      }
    });
  });

  return output;
}

/**
 * Group diff results into chunks with context lines
 * @param diffResults - Array of diff results
 * @param contextLines - Number of context lines around changes
 * @returns Array of diff chunks
 */
function groupDiffChunks(diffResults: DiffResult[], contextLines: number): DiffResult[][] {
  const chunks: DiffResult[][] = [];
  let currentChunk: DiffResult[] = [];
  let unchangedBuffer: DiffResult[] = [];

  diffResults.forEach((result) => {
    if (result.type === 'unchanged') {
      unchangedBuffer.push(result);
      
      // If buffer exceeds context size and we have a current chunk, close it
      if (unchangedBuffer.length > contextLines * 2 && currentChunk.length > 0) {
        // Add context lines to current chunk
        currentChunk.push(...unchangedBuffer.slice(0, contextLines));
        chunks.push([...currentChunk]);
        
        // Start new chunk with trailing context
        currentChunk = unchangedBuffer.slice(-contextLines);
        unchangedBuffer = [];
      }
    } else {
      // Add buffered unchanged lines as context
      if (unchangedBuffer.length > 0) {
        const contextStart = Math.max(0, unchangedBuffer.length - contextLines);
        currentChunk.push(...unchangedBuffer.slice(contextStart));
        unchangedBuffer = [];
      }
      
      currentChunk.push(result);
    }
  });

  // Handle remaining content
  if (currentChunk.length > 0) {
    if (unchangedBuffer.length > 0) {
      currentChunk.push(...unchangedBuffer.slice(0, contextLines));
    }
    chunks.push(currentChunk);
  }

  return chunks.filter(chunk => chunk.length > 0);
}

/**
 * Calculate diff complexity score
 * @param diffResults - Array of diff results
 * @returns Complexity score (0-1, where 1 is most complex)
 */
export function calculateDiffComplexity(diffResults: DiffResult[]): number {
  if (diffResults.length === 0) return 0;

  const stats = getDiffStats(diffResults);
  const changeRatio = (stats.additions + stats.deletions) / stats.total;
  
  // Factor in the number of change blocks
  let changeBlocks = 0;
  let inChangeBlock = false;
  
  diffResults.forEach(result => {
    const isChange = result.type !== 'unchanged';
    if (isChange && !inChangeBlock) {
      changeBlocks++;
      inChangeBlock = true;
    } else if (!isChange) {
      inChangeBlock = false;
    }
  });

  const blockComplexity = Math.min(changeBlocks / 10, 1); // Normalize to 0-1
  
  return Math.min((changeRatio * 0.7) + (blockComplexity * 0.3), 1);
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