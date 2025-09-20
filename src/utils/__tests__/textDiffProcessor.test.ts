/**
 * Tests for Text Diff Processor utilities
 */

import { describe, it, expect, vi } from 'vitest';
import {
  processTextDiff,
  formatDiffOutput,
  formatDiffOutputHTML,
  generateLineNumbers,
  formatSideBySideDiff,
  handleEmptyDiff,
  getDiffStyleClasses,
  formatDiffForClipboard,
  createDiffHeader,
  formatUnifiedDiff,
  calculateDiffComplexity,
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

describe('formatDiffOutputHTML', () => {
  it('should format diff as HTML with proper classes', () => {
    const diffResults = [
      { type: 'unchanged' as const, value: 'line 1', lineNumber: 1 },
      { type: 'added' as const, value: 'line 2', lineNumber: 2 },
      { type: 'removed' as const, value: 'line 3', lineNumber: 3 }
    ];
    
    const result = formatDiffOutputHTML(diffResults, true);
    
    expect(result).toContain('class="diff-output"');
    expect(result).toContain('class="diff-line diff-unchanged"');
    expect(result).toContain('class="diff-line diff-added"');
    expect(result).toContain('class="diff-line diff-removed"');
    expect(result).toContain('class="diff-line-number"');
    expect(result).toContain('class="diff-marker"');
    expect(result).toContain('class="diff-content"');
  });

  it('should format diff as HTML without line numbers', () => {
    const diffResults = [
      { type: 'added' as const, value: 'line 1', lineNumber: 1 }
    ];
    
    const result = formatDiffOutputHTML(diffResults, false);
    
    expect(result).toContain('class="diff-output"');
    expect(result).not.toContain('class="diff-line-number"');
    expect(result).toContain('<span class="diff-marker">+</span>');
  });

  it('should handle empty diff results in HTML format', () => {
    const result = formatDiffOutputHTML([]);
    expect(result).toContain('class="diff-empty"');
    expect(result).toContain('No differences found - texts are identical.');
  });

  it('should escape HTML characters', () => {
    const diffResults = [
      { type: 'added' as const, value: '<script>alert("xss")</script>', lineNumber: 1 }
    ];
    
    const result = formatDiffOutputHTML(diffResults);
    
    expect(result).toContain('&lt;script&gt;');
    expect(result).toContain('&lt;/script&gt;');
    expect(result).not.toContain('<script>alert("xss")</script>');
  });
});

describe('generateLineNumbers', () => {
  it('should generate correct line numbers for mixed diff', () => {
    const diffResults = [
      { type: 'unchanged' as const, value: 'line 1', lineNumber: 1 },
      { type: 'removed' as const, value: 'line 2', lineNumber: 2 },
      { type: 'added' as const, value: 'line 2 modified', lineNumber: 3 },
      { type: 'unchanged' as const, value: 'line 3', lineNumber: 4 }
    ];
    
    const result = generateLineNumbers(diffResults);
    
    expect(result.originalLines).toEqual([1, 2, null, 3]);
    expect(result.modifiedLines).toEqual([1, null, 2, 3]);
  });

  it('should handle only additions', () => {
    const diffResults = [
      { type: 'added' as const, value: 'line 1', lineNumber: 1 },
      { type: 'added' as const, value: 'line 2', lineNumber: 2 }
    ];
    
    const result = generateLineNumbers(diffResults);
    
    expect(result.originalLines).toEqual([null, null]);
    expect(result.modifiedLines).toEqual([1, 2]);
  });

  it('should handle only removals', () => {
    const diffResults = [
      { type: 'removed' as const, value: 'line 1', lineNumber: 1 },
      { type: 'removed' as const, value: 'line 2', lineNumber: 2 }
    ];
    
    const result = generateLineNumbers(diffResults);
    
    expect(result.originalLines).toEqual([1, 2]);
    expect(result.modifiedLines).toEqual([null, null]);
  });
});

describe('formatSideBySideDiff', () => {
  it('should format side-by-side diff correctly', () => {
    const diffResults = [
      { type: 'unchanged' as const, value: 'line 1', lineNumber: 1 },
      { type: 'removed' as const, value: 'line 2', lineNumber: 2 },
      { type: 'added' as const, value: 'line 2 modified', lineNumber: 3 }
    ];
    
    const result = formatSideBySideDiff(diffResults, true);
    
    expect(result.leftSide).toHaveLength(3);
    expect(result.rightSide).toHaveLength(3);
    expect(result.leftSide[0]).toContain('  line 1');
    expect(result.leftSide[1]).toContain('- line 2');
    expect(result.leftSide[2]).toContain('   '); // Empty line for addition
    expect(result.rightSide[0]).toContain('  line 1');
    expect(result.rightSide[1]).toContain('   '); // Empty line for removal
    expect(result.rightSide[2]).toContain('+ line 2 modified');
  });

  it('should format side-by-side diff without line numbers', () => {
    const diffResults = [
      { type: 'added' as const, value: 'line 1', lineNumber: 1 }
    ];
    
    const result = formatSideBySideDiff(diffResults, false);
    
    expect(result.leftSide[0]).toBe('   ');
    expect(result.rightSide[0]).toBe('+ line 1');
  });

  it('should handle empty diff in side-by-side format', () => {
    const result = formatSideBySideDiff([]);
    
    expect(result.leftSide).toEqual(['No differences found - texts are identical.']);
    expect(result.rightSide).toEqual(['No differences found - texts are identical.']);
    expect(result.lineNumbers.originalLines).toEqual([null]);
    expect(result.lineNumbers.modifiedLines).toEqual([null]);
  });
});

describe('handleEmptyDiff', () => {
  it('should handle both texts empty', () => {
    const result = handleEmptyDiff('', '');
    expect(result).toBe('Both texts are empty.');
  });

  it('should handle original text empty', () => {
    const result = handleEmptyDiff('', 'some text');
    expect(result).toBe('Original text is empty. All content is new.');
  });

  it('should handle modified text empty', () => {
    const result = handleEmptyDiff('some text', '');
    expect(result).toBe('Modified text is empty. All content was removed.');
  });

  it('should handle identical texts', () => {
    const result = handleEmptyDiff('same text', 'same text');
    expect(result).toBe('No differences found - texts are identical.');
  });

  it('should handle different texts', () => {
    const result = handleEmptyDiff('text 1', 'text 2');
    expect(result).toBe('Processing diff...');
  });
});

describe('getDiffStyleClasses', () => {
  it('should return all required CSS classes', () => {
    const classes = getDiffStyleClasses();
    
    expect(classes).toHaveProperty('diffOutput', 'diff-output');
    expect(classes).toHaveProperty('diffLine', 'diff-line');
    expect(classes).toHaveProperty('diffAdded', 'diff-added');
    expect(classes).toHaveProperty('diffRemoved', 'diff-removed');
    expect(classes).toHaveProperty('diffUnchanged', 'diff-unchanged');
    expect(classes).toHaveProperty('diffLineNumber', 'diff-line-number');
    expect(classes).toHaveProperty('diffMarker', 'diff-marker');
    expect(classes).toHaveProperty('diffContent', 'diff-content');
    expect(classes).toHaveProperty('diffEmpty', 'diff-empty');
  });
});

describe('formatDiffForClipboard', () => {
  it('should format diff for clipboard with stats', () => {
    const diffResults = [
      { type: 'unchanged' as const, value: 'line 1', lineNumber: 1 },
      { type: 'added' as const, value: 'line 2', lineNumber: 2 },
      { type: 'removed' as const, value: 'line 3', lineNumber: 3 }
    ];
    
    const result = formatDiffForClipboard(diffResults, true);
    
    expect(result).toContain('Diff Summary: +1 -1 (3 lines)');
    expect(result).toContain('─'.repeat(50));
    expect(result).toContain('   1   line 1');
    expect(result).toContain('   2 + line 2');
    expect(result).toContain('   3 - line 3');
  });

  it('should format diff for clipboard without stats', () => {
    const diffResults = [
      { type: 'added' as const, value: 'line 1', lineNumber: 1 }
    ];
    
    const result = formatDiffForClipboard(diffResults, false);
    
    expect(result).not.toContain('Diff Summary:');
    expect(result).toContain('   1 + line 1');
  });

  it('should handle empty diff for clipboard', () => {
    const result = formatDiffForClipboard([]);
    expect(result).toBe('No differences found - texts are identical.');
  });
});

describe('createDiffHeader', () => {
  it('should create diff header with default labels', () => {
    const result = createDiffHeader();
    
    expect(result).toContain('--- Original');
    expect(result).toContain('+++ Modified');
    expect(result).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/); // ISO timestamp
  });

  it('should create diff header with custom labels', () => {
    const result = createDiffHeader('file1.txt', 'file2.txt');
    
    expect(result).toContain('--- file1.txt');
    expect(result).toContain('+++ file2.txt');
  });

  it('should create diff header with custom timestamp', () => {
    const timestamp = new Date('2023-01-01T12:00:00Z');
    const result = createDiffHeader('file1.txt', 'file2.txt', timestamp);
    
    expect(result).toContain('2023-01-01T12:00:00.000Z');
  });
});

describe('formatUnifiedDiff', () => {
  it('should format unified diff with header', () => {
    const diffResults = [
      { type: 'unchanged' as const, value: 'line 1', lineNumber: 1 },
      { type: 'removed' as const, value: 'line 2', lineNumber: 2 },
      { type: 'added' as const, value: 'line 2 modified', lineNumber: 3 }
    ];
    
    const result = formatUnifiedDiff(diffResults, 'old.txt', 'new.txt');
    
    expect(result).toContain('--- old.txt');
    expect(result).toContain('+++ new.txt');
    expect(result).toContain('@@ -1,2 +1,2 @@');
    expect(result).toContain(' line 1');
    expect(result).toContain('-line 2');
    expect(result).toContain('+line 2 modified');
  });

  it('should handle empty diff in unified format', () => {
    const result = formatUnifiedDiff([]);
    expect(result).toBe('No differences found - texts are identical.');
  });
});

describe('calculateDiffComplexity', () => {
  it('should return 0 for empty diff', () => {
    const complexity = calculateDiffComplexity([]);
    expect(complexity).toBe(0);
  });

  it('should return low complexity for mostly unchanged text', () => {
    const diffResults = [
      { type: 'unchanged' as const, value: 'line 1', lineNumber: 1 },
      { type: 'unchanged' as const, value: 'line 2', lineNumber: 2 },
      { type: 'unchanged' as const, value: 'line 3', lineNumber: 3 },
      { type: 'added' as const, value: 'line 4', lineNumber: 4 }
    ];
    
    const complexity = calculateDiffComplexity(diffResults);
    expect(complexity).toBeLessThan(0.5);
  });

  it('should return high complexity for mostly changed text', () => {
    const diffResults = [
      { type: 'removed' as const, value: 'line 1', lineNumber: 1 },
      { type: 'added' as const, value: 'line 1 modified', lineNumber: 2 },
      { type: 'removed' as const, value: 'line 2', lineNumber: 3 },
      { type: 'added' as const, value: 'line 2 modified', lineNumber: 4 }
    ];
    
    const complexity = calculateDiffComplexity(diffResults);
    expect(complexity).toBeGreaterThan(0.5);
  });

  it('should never exceed 1.0', () => {
    const diffResults = Array.from({ length: 100 }, (_, i) => ({
      type: 'added' as const,
      value: `line ${i}`,
      lineNumber: i + 1
    }));
    
    const complexity = calculateDiffComplexity(diffResults);
    expect(complexity).toBeLessThanOrEqual(1.0);
  });
});

// Additional edge case tests for text diff processing
describe('processTextDiff - Edge Cases', () => {
  it('should handle texts with only whitespace differences', () => {
    const original = 'line 1\nline 2\nline 3';
    const modified = 'line 1 \n line 2\nline 3\t';
    
    const result = processTextDiff(original, modified);
    
    expect(result.length).toBeGreaterThan(0);
    expect(result.some(r => r.type === 'removed' && r.value === 'line 1')).toBe(true);
    expect(result.some(r => r.type === 'added' && r.value === 'line 1 ')).toBe(true);
  });

  it('should handle very long lines', () => {
    const longLine = 'a'.repeat(10000);
    const original = `short line\n${longLine}\nend`;
    const modified = `short line\n${longLine}modified\nend`;
    
    const result = processTextDiff(original, modified);
    
    expect(result.some(r => r.type === 'removed' && r.value === longLine)).toBe(true);
    expect(result.some(r => r.type === 'added' && r.value === `${longLine}modified`)).toBe(true);
  });

  it('should handle texts with special characters', () => {
    const original = 'Hello\tWorld\n"Quotes"\n\'Single quotes\'';
    const modified = 'Hello\tUniverse\n"Quotes"\n\'Single quotes\'';
    
    const result = processTextDiff(original, modified);
    
    expect(result.some(r => r.type === 'removed' && r.value === 'Hello\tWorld')).toBe(true);
    expect(result.some(r => r.type === 'added' && r.value === 'Hello\tUniverse')).toBe(true);
  });

  it('should handle texts with unicode characters', () => {
    const original = '🚀 Rocket\n你好 World\n🎉 Party';
    const modified = '🚀 Rocket\n你好 Universe\n🎉 Party';
    
    const result = processTextDiff(original, modified);
    
    expect(result.some(r => r.type === 'removed' && r.value === '你好 World')).toBe(true);
    expect(result.some(r => r.type === 'added' && r.value === '你好 Universe')).toBe(true);
  });

  it('should handle texts with different line endings', () => {
    const original = 'line 1\nline 2\nline 3';
    const modified = 'line 1\r\nline 2\r\nline 3';
    
    const result = processTextDiff(original, modified);
    
    // The diff library should handle different line endings
    expect(result.length).toBeGreaterThan(0);
  });

  it('should handle completely different texts', () => {
    const original = 'Apple\nBanana\nCherry';
    const modified = 'Dog\nElephant\nFish';
    
    const result = processTextDiff(original, modified);
    
    expect(result.some(r => r.type === 'removed')).toBe(true);
    expect(result.some(r => r.type === 'added')).toBe(true);
    expect(result.every(r => r.type !== 'unchanged')).toBe(true);
  });

  it('should handle texts with repeated lines', () => {
    const original = 'line 1\nline 2\nline 1\nline 3';
    const modified = 'line 1\nline 2\nline 2\nline 3';
    
    const result = processTextDiff(original, modified);
    
    expect(result.length).toBeGreaterThan(0);
    expect(result.some(r => r.type === 'unchanged' && r.value === 'line 1')).toBe(true);
    expect(result.some(r => r.type === 'unchanged' && r.value === 'line 3')).toBe(true);
  });

  it('should handle single character differences', () => {
    const original = 'Hello World';
    const modified = 'Hello World!';
    
    const result = processTextDiff(original, modified);
    
    expect(result.some(r => r.type === 'removed' && r.value === 'Hello World')).toBe(true);
    expect(result.some(r => r.type === 'added' && r.value === 'Hello World!')).toBe(true);
  });
});

describe('formatDiffOutput - Edge Cases', () => {
  it('should handle very long line numbers', () => {
    const diffResults = [
      { type: 'unchanged' as const, value: 'line', lineNumber: 9999 },
      { type: 'added' as const, value: 'new line', lineNumber: 10000 }
    ];
    
    const result = formatDiffOutput(diffResults, true);
    
    expect(result).toContain('9999   line');
    expect(result).toContain('10000 + new line');
  });

  it('should handle lines with only whitespace', () => {
    const diffResults = [
      { type: 'unchanged' as const, value: '   ', lineNumber: 1 },
      { type: 'added' as const, value: '\t\t', lineNumber: 2 },
      { type: 'removed' as const, value: '', lineNumber: 3 }
    ];
    
    const result = formatDiffOutput(diffResults, true);
    
    expect(result).toContain('   1      ');
    expect(result).toContain('   2 + \t\t');
    expect(result).toContain('   3 - ');
  });

  it('should handle lines with control characters', () => {
    const diffResults = [
      { type: 'added' as const, value: 'line\nwith\nnewlines', lineNumber: 1 },
      { type: 'removed' as const, value: 'line\twith\ttabs', lineNumber: 2 }
    ];
    
    const result = formatDiffOutput(diffResults, true);
    
    expect(result).toContain('+ line\nwith\nnewlines');
    expect(result).toContain('- line\twith\ttabs');
  });
});

describe('Performance and Large Input Tests', () => {
  it('should handle large diffs efficiently', () => {
    const originalLines = Array.from({ length: 1000 }, (_, i) => `original line ${i}`);
    const modifiedLines = Array.from({ length: 1000 }, (_, i) => 
      i % 10 === 0 ? `modified line ${i}` : `original line ${i}`
    );
    
    const original = originalLines.join('\n');
    const modified = modifiedLines.join('\n');
    
    const startTime = Date.now();
    const result = processTextDiff(original, modified);
    const endTime = Date.now();
    
    expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    expect(result.length).toBeGreaterThan(0);
    expect(result.some(r => r.type === 'removed')).toBe(true);
    expect(result.some(r => r.type === 'added')).toBe(true);
  });

  it('should handle texts with many small changes', () => {
    const original = Array.from({ length: 100 }, (_, i) => `line ${i}`).join('\n');
    const modified = Array.from({ length: 100 }, (_, i) => `line ${i} modified`).join('\n');
    
    const result = processTextDiff(original, modified);
    
    expect(result.length).toBe(200); // 100 removed + 100 added
    expect(result.filter(r => r.type === 'removed')).toHaveLength(100);
    expect(result.filter(r => r.type === 'added')).toHaveLength(100);
  });

  it('should handle texts with no changes efficiently', () => {
    const text = Array.from({ length: 1000 }, (_, i) => `line ${i}`).join('\n');
    
    const startTime = Date.now();
    const result = processTextDiff(text, text);
    const endTime = Date.now();
    
    expect(endTime - startTime).toBeLessThan(500); // Should be very fast for identical texts
    expect(result.every(r => r.type === 'unchanged')).toBe(true);
  });
});

describe('Edge Cases for Utility Functions', () => {
  it('should handle malformed HTML in escapeHtml equivalent', () => {
    const diffResults = [
      { type: 'added' as const, value: '<img src="x" onerror="alert(1)">', lineNumber: 1 }
    ];
    
    const result = formatDiffOutputHTML(diffResults);
    
    expect(result).toContain('&lt;img');
    expect(result).toContain('&gt;');
    expect(result).not.toContain('<img src="x"');
  });

  it('should handle very complex unified diff formatting', () => {
    const diffResults = Array.from({ length: 50 }, (_, i) => ({
      type: (i % 3 === 0 ? 'added' : i % 3 === 1 ? 'removed' : 'unchanged') as 'added' | 'removed' | 'unchanged',
      value: `line ${i}`,
      lineNumber: i + 1
    }));
    
    const result = formatUnifiedDiff(diffResults, 'file1.txt', 'file2.txt', 2);
    
    expect(result).toContain('--- file1.txt');
    expect(result).toContain('+++ file2.txt');
    expect(result).toContain('@@');
    expect(result.split('\n').length).toBeGreaterThan(10);
  });

  it('should handle edge cases in side-by-side formatting', () => {
    const diffResults = [
      { type: 'added' as const, value: '', lineNumber: 1 }, // Empty added line
      { type: 'removed' as const, value: 'removed', lineNumber: 2 },
      { type: 'unchanged' as const, value: 'same', lineNumber: 3 },
      { type: 'added' as const, value: 'very long line that might cause formatting issues in side by side view', lineNumber: 4 }
    ];
    
    const result = formatSideBySideDiff(diffResults, true);
    
    expect(result.leftSide).toHaveLength(4);
    expect(result.rightSide).toHaveLength(4);
    expect(result.leftSide[0]).toContain('   '); // Empty line for addition
    expect(result.rightSide[1]).toContain('   '); // Empty line for removal
    expect(result.leftSide[3]).toContain('   '); // Empty line for addition
    expect(result.rightSide[3]).toContain('very long line');
  });
});