/**
 * Demo tests showing how the diff formatting functions work together
 * These tests serve as examples and documentation for the formatting capabilities
 */

import { describe, it, expect } from 'vitest';
import {
  processTextDiff,
  formatDiffOutput,
  formatDiffOutputHTML,
  formatSideBySideDiff,
  formatDiffForClipboard,
  formatUnifiedDiff,
  handleEmptyDiff,
  calculateDiffComplexity,
  getDiffStats
} from '../textDiffProcessor';

describe('Diff Formatting Demo', () => {
  const originalText = `function greet(name) {
  console.log("Hello, " + name);
  return "Hello, " + name;
}`;

  const modifiedText = `function greet(name) {
  console.log(\`Hello, \${name}!\`);
  return \`Hello, \${name}!\`;
}`;

  it('should demonstrate complete diff processing workflow', () => {
    // Step 1: Process the text diff
    const diffResults = processTextDiff(originalText, modifiedText);
    
    // Step 2: Get statistics
    const stats = getDiffStats(diffResults);
    console.log('Diff Statistics:', stats);
    
    // Step 3: Calculate complexity
    const complexity = calculateDiffComplexity(diffResults);
    console.log('Diff Complexity:', complexity);
    
    // Step 4: Format for different outputs
    const plainText = formatDiffOutput(diffResults, true);
    console.log('Plain Text Format:\n', plainText);
    
    const htmlFormat = formatDiffOutputHTML(diffResults, true);
    console.log('HTML Format:\n', htmlFormat);
    
    const clipboardFormat = formatDiffForClipboard(diffResults, true);
    console.log('Clipboard Format:\n', clipboardFormat);
    
    const unifiedFormat = formatUnifiedDiff(diffResults, 'original.js', 'modified.js');
    console.log('Unified Diff Format:\n', unifiedFormat);
    
    const sideBySide = formatSideBySideDiff(diffResults, true);
    console.log('Side-by-Side Left:\n', sideBySide.leftSide.join('\n'));
    console.log('Side-by-Side Right:\n', sideBySide.rightSide.join('\n'));
    
    // Verify all formats contain expected content
    expect(plainText).toContain('console.log("Hello, " + name);');
    expect(plainText).toContain('console.log(`Hello, ${name}!`);');
    expect(htmlFormat).toContain('diff-line diff-removed');
    expect(htmlFormat).toContain('diff-line diff-added');
    expect(clipboardFormat).toContain('Diff Summary:');
    expect(unifiedFormat).toContain('--- original.js');
    expect(unifiedFormat).toContain('+++ modified.js');
    expect(sideBySide.leftSide.some(line => line.includes('- '))).toBe(true);
    expect(sideBySide.rightSide.some(line => line.includes('+ '))).toBe(true);
  });

  it('should demonstrate empty diff handling', () => {
    const emptyMessage1 = handleEmptyDiff('', '');
    const emptyMessage2 = handleEmptyDiff('', 'some text');
    const emptyMessage3 = handleEmptyDiff('some text', '');
    const identicalMessage = handleEmptyDiff('same', 'same');
    
    console.log('Both empty:', emptyMessage1);
    console.log('Original empty:', emptyMessage2);
    console.log('Modified empty:', emptyMessage3);
    console.log('Identical texts:', identicalMessage);
    
    expect(emptyMessage1).toBe('Both texts are empty.');
    expect(emptyMessage2).toBe('Original text is empty. All content is new.');
    expect(emptyMessage3).toBe('Modified text is empty. All content was removed.');
    expect(identicalMessage).toBe('No differences found - texts are identical.');
  });

  it('should demonstrate different complexity scenarios', () => {
    // Low complexity: mostly unchanged
    const lowComplexityDiff = processTextDiff(
      'line 1\nline 2\nline 3\nline 4\nline 5',
      'line 1\nline 2\nline 3\nline 4\nline 5\nline 6'
    );
    const lowComplexity = calculateDiffComplexity(lowComplexityDiff);
    
    // High complexity: mostly changed
    const highComplexityDiff = processTextDiff(
      'old line 1\nold line 2\nold line 3',
      'new line 1\nnew line 2\nnew line 3'
    );
    const highComplexity = calculateDiffComplexity(highComplexityDiff);
    
    console.log('Low complexity score:', lowComplexity);
    console.log('High complexity score:', highComplexity);
    
    expect(lowComplexity).toBeLessThan(highComplexity);
    expect(lowComplexity).toBeLessThan(0.5);
    expect(highComplexity).toBeGreaterThan(0.5);
  });

  it('should demonstrate HTML escaping in diff output', () => {
    const originalWithHTML = '<script>alert("xss")</script>';
    const modifiedWithHTML = '<div>safe content</div>';
    
    const diffResults = processTextDiff(originalWithHTML, modifiedWithHTML);
    const htmlOutput = formatDiffOutputHTML(diffResults);
    
    console.log('HTML-escaped diff output:\n', htmlOutput);
    
    // Verify HTML is properly escaped
    expect(htmlOutput).toContain('&lt;script&gt;');
    expect(htmlOutput).toContain('&lt;div&gt;');
    expect(htmlOutput).not.toContain('<script>alert("xss")</script>');
  });
});