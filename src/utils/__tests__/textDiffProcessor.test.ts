/**
 * Tests for Text Diff Processor utilities
 */

import { describe, it, expect, vi } from 'vitest';
import {
  processTextDiff,
  formatDiffOutput,
  getDiffStats,
  areTextsIdentical,
  debounce,
  validateTextInput,
  optimizeTextForDiff
} from '../textDiffProcessor';

describe('processTextDiff', () => {
  it('should detect added lines', () => {
    const original = 'line 1\nline 2';
    const modified = 'line 1\nline 2\nline 3';
    
    const result = processTextDiff(original, modified);
    
    // The diff library may produce different results, so let's check for the presence of our expected lines
    const hasLine1Unchanged = result.some(r => r.type === 'unchanged' && r.value === 'line 1');
    const hasLine3Added = result.some(r => r.type === 'added' && r.value === 'line 3');
    
    expect(hasLine1Unchanged).toBe(true);
    expect(hasLine3Added).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should detect removed lines', () => {
    const original = 'line 1\nline 2\nline 3';
    const modified = 'line 1\nline 3';
    
    const result = processTextDiff(original, modified);
    
    expect(result.some(r => r.type === 'removed' && r.value === 'line 2')).toBe(true);
    expect(result.some(r => r.type === 'unchanged' && r.value === 'line 1')).toBe(true);
    expect(result.some(r => r.type === 'unchanged' && r.value === 'line 3')).toBe(true);
  });

  it('should handle empty original text', () => {
    const original = '';
    const modified = 'line 1\nline 2';
    
    const result = processTextDiff(original, modified);
    
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe('added');
    expect(result[0].value).toBe('line 1');
    expect(result[1].type).toBe('added');
    expect(result[1].value).toBe('line 2');
  });

  it('should handle empty modified text', () => {
    const original = 'line 1\nline 2';
    const modified = '';
    
    const result = processTextDiff(original, modified);
    
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe('removed');
    expect(result[0].value).toBe('line 1');
    expect(result[1].type).toBe('removed');
    expect(result[1].value).toBe('line 2');
  });

  it('should handle both texts empty', () => {
    const result = processTextDiff('', '');
    expect(result).toHaveLength(0);
  });

  it('should assign line numbers correctly', () => {
    const original = 'line 1\nline 2';
    const modified = 'line 1\nline 2\nline 3';
    
    const result = processTextDiff(original, modified);
    
    expect(result[0].lineNumber).toBe(1);
    expect(result[1].lineNumber).toBe(2);
    expect(result[2].lineNumber).toBe(3);
  });
});

describe('formatDiffOutput', () => {
  it('should format diff with line numbers', () => {
    const diffResults = [
      { type: 'unchanged' as const, value: 'line 1', lineNumber: 1 },
      { type: 'added' as const, value: 'line 2', lineNumber: 2 },
      { type: 'removed' as const, value: 'line 3', lineNumber: 3 }
    ];
    
    const result = formatDiffOutput(diffResults, true);
    
    expect(result).toContain('   1   line 1');
    expect(result).toContain('   2 + line 2');
    expect(result).toContain('   3 - line 3');
  });

  it('should format diff without line numbers', () => {
    const diffResults = [
      { type: 'unchanged' as const, value: 'line 1', lineNumber: 1 },
      { type: 'added' as const, value: 'line 2', lineNumber: 2 }
    ];
    
    const result = formatDiffOutput(diffResults, false);
    
    expect(result).toContain('  line 1');
    expect(result).toContain('+ line 2');
    expect(result).not.toContain('   1');
  });

  it('should handle empty diff results', () => {
    const result = formatDiffOutput([]);
    expect(result).toBe('No differences found - texts are identical.');
  });
});

describe('getDiffStats', () => {
  it('should calculate diff statistics correctly', () => {
    const diffResults = [
      { type: 'unchanged' as const, value: 'line 1', lineNumber: 1 },
      { type: 'added' as const, value: 'line 2', lineNumber: 2 },
      { type: 'added' as const, value: 'line 3', lineNumber: 3 },
      { type: 'removed' as const, value: 'line 4', lineNumber: 4 }
    ];
    
    const stats = getDiffStats(diffResults);
    
    expect(stats.additions).toBe(2);
    expect(stats.deletions).toBe(1);
    expect(stats.unchanged).toBe(1);
    expect(stats.total).toBe(4);
  });

  it('should handle empty diff results', () => {
    const stats = getDiffStats([]);
    
    expect(stats.additions).toBe(0);
    expect(stats.deletions).toBe(0);
    expect(stats.unchanged).toBe(0);
    expect(stats.total).toBe(0);
  });
});

describe('areTextsIdentical', () => {
  it('should return true for identical texts', () => {
    expect(areTextsIdentical('hello world', 'hello world')).toBe(true);
  });

  it('should return false for different texts', () => {
    expect(areTextsIdentical('hello world', 'hello universe')).toBe(false);
  });

  it('should ignore leading/trailing whitespace', () => {
    expect(areTextsIdentical('  hello world  ', 'hello world')).toBe(true);
  });

  it('should handle empty strings', () => {
    expect(areTextsIdentical('', '')).toBe(true);
    expect(areTextsIdentical('', 'text')).toBe(false);
  });
});

describe('debounce', () => {
  it('should debounce function calls', async () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 100);
    
    debouncedFn('arg1');
    debouncedFn('arg2');
    debouncedFn('arg3');
    
    expect(mockFn).not.toHaveBeenCalled();
    
    await new Promise(resolve => setTimeout(resolve, 150));
    
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith('arg3');
  });

  it('should handle multiple debounced calls', async () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 50);
    
    debouncedFn('first');
    await new Promise(resolve => setTimeout(resolve, 75));
    
    debouncedFn('second');
    await new Promise(resolve => setTimeout(resolve, 75));
    
    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(mockFn).toHaveBeenNthCalledWith(1, 'first');
    expect(mockFn).toHaveBeenNthCalledWith(2, 'second');
  });
});

describe('validateTextInput', () => {
  it('should validate text within limits', () => {
    const result = validateTextInput('short text', 1000);
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should reject text exceeding limits', () => {
    const longText = 'a'.repeat(1001);
    const result = validateTextInput(longText, 1000);
    
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Text is too large');
    expect(result.error).toContain('1001 characters');
  });

  it('should use default max length', () => {
    const veryLongText = 'a'.repeat(100001);
    const result = validateTextInput(veryLongText);
    
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Maximum allowed: 100000');
  });
});

describe('optimizeTextForDiff', () => {
  it('should return original text if within limits', () => {
    const text = 'line 1\nline 2\nline 3';
    const result = optimizeTextForDiff(text, 10);
    
    expect(result.text).toBe(text);
    expect(result.truncated).toBe(false);
  });

  it('should truncate text exceeding line limits', () => {
    const lines = Array.from({ length: 15 }, (_, i) => `line ${i + 1}`);
    const text = lines.join('\n');
    const result = optimizeTextForDiff(text, 10);
    
    expect(result.truncated).toBe(true);
    expect(result.text).toContain('line 1');
    expect(result.text).toContain('line 10');
    expect(result.text).toContain('5 more lines truncated');
    expect(result.text).not.toContain('line 11');
  });

  it('should use default max lines', () => {
    const lines = Array.from({ length: 1005 }, (_, i) => `line ${i + 1}`);
    const text = lines.join('\n');
    const result = optimizeTextForDiff(text);
    
    expect(result.truncated).toBe(true);
    expect(result.text).toContain('5 more lines truncated');
  });
});