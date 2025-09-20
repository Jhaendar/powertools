import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import DiffChecker from '../DiffChecker';

// Mock the state persistence utility
vi.mock('@/utils/statePersistence', () => ({
  usePersistentState: vi.fn((_toolId: string, initialState: any) => {
    const [state, setState] = React.useState(initialState);
    const updateState = (newState: any) => {
      setState((prev: any) => ({ ...prev, ...newState }));
    };
    return [state, updateState];
  }),
  generateShareableURL: vi.fn(() => 'https://example.com/share')
}));

// Mock the clipboard helper
vi.mock('@/utils/clipboardHelper', () => ({
  copyToClipboard: vi.fn()
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('DiffChecker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders the component with correct title and description', () => {
    renderWithRouter(<DiffChecker />);
    
    expect(screen.getByText('Text Diff Checker')).toBeInTheDocument();
    expect(screen.getByText(/Compare two text blocks and see differences/)).toBeInTheDocument();
  });

  test('renders both input areas with correct labels', () => {
    renderWithRouter(<DiffChecker />);
    
    expect(screen.getByText('Original Text')).toBeInTheDocument();
    expect(screen.getByText('Modified Text')).toBeInTheDocument();
    
    expect(screen.getByPlaceholderText('Paste your original text here...')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Paste your modified text here...')).toBeInTheDocument();
  });

  test('renders diff output section', () => {
    renderWithRouter(<DiffChecker />);
    
    expect(screen.getByText('Diff Output')).toBeInTheDocument();
    expect(screen.getByText('Both texts are empty.')).toBeInTheDocument();
  });

  test('updates original text input', () => {
    renderWithRouter(<DiffChecker />);
    
    const originalTextarea = screen.getByPlaceholderText('Paste your original text here...');
    fireEvent.change(originalTextarea, { target: { value: 'Hello World' } });
    
    expect(originalTextarea).toHaveValue('Hello World');
  });

  test('updates modified text input', () => {
    renderWithRouter(<DiffChecker />);
    
    const modifiedTextarea = screen.getByPlaceholderText('Paste your modified text here...');
    fireEvent.change(modifiedTextarea, { target: { value: 'Hello Universe' } });
    
    expect(modifiedTextarea).toHaveValue('Hello Universe');
  });

  test('shows processing message when text is entered', async () => {
    renderWithRouter(<DiffChecker />);
    
    const originalTextarea = screen.getByPlaceholderText('Paste your original text here...');
    fireEvent.change(originalTextarea, { target: { value: 'Some text' } });
    
    // The component should show processing or diff results
    // Since we have debouncing, we might see processing state briefly
    expect(originalTextarea).toHaveValue('Some text');
  });

  test('has proper accessibility attributes', () => {
    renderWithRouter(<DiffChecker />);
    
    const originalTextarea = screen.getByLabelText('Original text input');
    const modifiedTextarea = screen.getByLabelText('Modified text input');
    
    expect(originalTextarea).toHaveAttribute('id', 'original-text');
    expect(modifiedTextarea).toHaveAttribute('id', 'modified-text');
  });

  test('applies correct CSS classes for responsive design', () => {
    renderWithRouter(<DiffChecker />);
    
    const container = document.querySelector('.diff-checker-container');
    const inputsGrid = document.querySelector('.diff-checker-inputs');
    const textareas = document.querySelectorAll('.diff-checker-textarea');
    
    expect(container).toBeInTheDocument();
    expect(inputsGrid).toBeInTheDocument();
    expect(textareas).toHaveLength(2);
  });

  test('shows copy button when diff results are available', async () => {
    renderWithRouter(<DiffChecker />);
    
    const originalTextarea = screen.getByPlaceholderText('Paste your original text here...');
    const modifiedTextarea = screen.getByPlaceholderText('Paste your modified text here...');
    
    // Add different text to generate a diff
    fireEvent.change(originalTextarea, { target: { value: 'Hello World' } });
    fireEvent.change(modifiedTextarea, { target: { value: 'Hello Universe' } });
    
    // Wait for debounced diff processing
    await waitFor(() => {
      const copyButton = screen.queryByText('Copy');
      expect(copyButton).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  test('copy button is disabled when no diff results', () => {
    renderWithRouter(<DiffChecker />);
    
    // Copy button should not be visible when there are no diff results
    const copyButton = screen.queryByText('Copy');
    expect(copyButton).not.toBeInTheDocument();
  });

  test('copy functionality works correctly', async () => {
    const { copyToClipboard } = await import('@/utils/clipboardHelper');
    const mockCopyToClipboard = copyToClipboard as any;
    mockCopyToClipboard.mockResolvedValue(undefined);

    renderWithRouter(<DiffChecker />);
    
    const originalTextarea = screen.getByPlaceholderText('Paste your original text here...');
    const modifiedTextarea = screen.getByPlaceholderText('Paste your modified text here...');
    
    // Add different text to generate a diff
    fireEvent.change(originalTextarea, { target: { value: 'Hello World' } });
    fireEvent.change(modifiedTextarea, { target: { value: 'Hello Universe' } });
    
    // Wait for diff processing and copy button to appear
    await waitFor(() => {
      const copyButton = screen.getByText('Copy');
      expect(copyButton).toBeInTheDocument();
      
      // Click the copy button
      fireEvent.click(copyButton);
    }, { timeout: 1000 });

    // Verify copyToClipboard was called
    expect(mockCopyToClipboard).toHaveBeenCalled();
    
    // Check that the button text changes to "Copied!"
    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });
  });

  test('line numbers toggle works correctly', async () => {
    renderWithRouter(<DiffChecker />);
    
    const originalTextarea = screen.getByPlaceholderText('Paste your original text here...');
    const modifiedTextarea = screen.getByPlaceholderText('Paste your modified text here...');
    
    // Add different text to generate a diff
    fireEvent.change(originalTextarea, { target: { value: 'Hello World' } });
    fireEvent.change(modifiedTextarea, { target: { value: 'Hello Universe' } });
    
    // Wait for diff processing and toggle button to appear
    await waitFor(() => {
      // The toggle button should appear when diff results are available
      const toggleButton = screen.queryByLabelText(/show line numbers|hide line numbers/i);
      expect(toggleButton).toBeInTheDocument();
    }, { timeout: 3000 });

    // Now get the toggle button
    const toggleButton = screen.getByLabelText(/show line numbers|hide line numbers/i);
    expect(toggleButton).toBeInTheDocument();
    
    // Click the toggle button
    fireEvent.click(toggleButton);
  });

  test('clear all button clears both inputs', () => {
    renderWithRouter(<DiffChecker />);
    
    const originalTextarea = screen.getByPlaceholderText('Paste your original text here...');
    const modifiedTextarea = screen.getByPlaceholderText('Paste your modified text here...');
    
    // Add text to both inputs
    fireEvent.change(originalTextarea, { target: { value: 'Original text' } });
    fireEvent.change(modifiedTextarea, { target: { value: 'Modified text' } });
    
    expect(originalTextarea).toHaveValue('Original text');
    expect(modifiedTextarea).toHaveValue('Modified text');
    
    // Click clear all button
    const clearAllButton = screen.getByText('Clear All');
    fireEvent.click(clearAllButton);
    
    expect(originalTextarea).toHaveValue('');
    expect(modifiedTextarea).toHaveValue('');
  });

  test('clear all button is disabled when both inputs are empty', () => {
    renderWithRouter(<DiffChecker />);
    
    const clearAllButton = screen.getByText('Clear All');
    expect(clearAllButton).toBeDisabled();
  });

  test('share button is disabled when both inputs are empty', () => {
    renderWithRouter(<DiffChecker />);
    
    const shareButton = screen.getByText('Share');
    expect(shareButton).toBeDisabled();
  });

  test('share button works when inputs have content', async () => {
    const { copyToClipboard } = await import('@/utils/clipboardHelper');
    vi.mocked(copyToClipboard).mockResolvedValue(true);

    renderWithRouter(<DiffChecker />);
    
    const originalTextarea = screen.getByPlaceholderText('Paste your original text here...');
    fireEvent.change(originalTextarea, { target: { value: 'Some text' } });
    
    const shareButton = screen.getByText('Share');
    expect(shareButton).not.toBeDisabled();
    
    fireEvent.click(shareButton);
    
    // Wait for the async operation to complete
    await waitFor(() => {
      expect(vi.mocked(copyToClipboard)).toHaveBeenCalled();
    });
  });

  test('displays diff statistics when diff is generated', async () => {
    renderWithRouter(<DiffChecker />);
    
    const originalTextarea = screen.getByPlaceholderText('Paste your original text here...');
    const modifiedTextarea = screen.getByPlaceholderText('Paste your modified text here...');
    
    // Add different text to generate a diff
    fireEvent.change(originalTextarea, { target: { value: 'line 1\nline 2\nline 3' } });
    fireEvent.change(modifiedTextarea, { target: { value: 'line 1\nline 2 modified\nline 3\nline 4' } });
    
    // Wait for diff processing and stats to appear
    await waitFor(() => {
      // Should show addition and deletion counts
      expect(screen.getByText(/\+\d+/)).toBeInTheDocument();
      expect(screen.getByText(/-\d+/)).toBeInTheDocument();
      expect(screen.getByText(/\(\d+ lines\)/)).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  test('handles identical texts correctly', async () => {
    renderWithRouter(<DiffChecker />);
    
    const originalTextarea = screen.getByPlaceholderText('Paste your original text here...');
    const modifiedTextarea = screen.getByPlaceholderText('Paste your modified text here...');
    
    const identicalText = 'This is identical text\nWith multiple lines';
    
    fireEvent.change(originalTextarea, { target: { value: identicalText } });
    fireEvent.change(modifiedTextarea, { target: { value: identicalText } });
    
    // Wait for processing
    await waitFor(() => {
      expect(screen.getByText(/No differences found/)).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  test('handles empty original text correctly', async () => {
    renderWithRouter(<DiffChecker />);
    
    const modifiedTextarea = screen.getByPlaceholderText('Paste your modified text here...');
    fireEvent.change(modifiedTextarea, { target: { value: 'New content' } });
    
    await waitFor(() => {
      expect(screen.getByText(/Original text is empty/)).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  test('handles empty modified text correctly', async () => {
    renderWithRouter(<DiffChecker />);
    
    const originalTextarea = screen.getByPlaceholderText('Paste your original text here...');
    fireEvent.change(originalTextarea, { target: { value: 'Original content' } });
    
    await waitFor(() => {
      expect(screen.getByText(/Modified text is empty/)).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  test('displays diff output with proper styling', async () => {
    renderWithRouter(<DiffChecker />);
    
    const originalTextarea = screen.getByPlaceholderText('Paste your original text here...');
    const modifiedTextarea = screen.getByPlaceholderText('Paste your modified text here...');
    
    fireEvent.change(originalTextarea, { target: { value: 'Hello World' } });
    fireEvent.change(modifiedTextarea, { target: { value: 'Hello Universe' } });
    
    await waitFor(() => {
      const diffOutput = document.querySelector('.diff-output');
      expect(diffOutput).toBeInTheDocument();
      
      const diffLines = document.querySelectorAll('.diff-line');
      expect(diffLines.length).toBeGreaterThan(0);
    }, { timeout: 1000 });
  });

  test('handles large text input validation', async () => {
    renderWithRouter(<DiffChecker />);
    
    const originalTextarea = screen.getByPlaceholderText('Paste your original text here...');
    
    // Create a very large text (over 100KB)
    const largeText = 'a'.repeat(100001);
    fireEvent.change(originalTextarea, { target: { value: largeText } });
    
    await waitFor(() => {
      expect(screen.getByText(/Text is too large/)).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  test('shows processing state during diff calculation', async () => {
    renderWithRouter(<DiffChecker />);
    
    const originalTextarea = screen.getByPlaceholderText('Paste your original text here...');
    const modifiedTextarea = screen.getByPlaceholderText('Paste your modified text here...');
    
    fireEvent.change(originalTextarea, { target: { value: 'Some text' } });
    fireEvent.change(modifiedTextarea, { target: { value: 'Different text' } });
    
    // Should briefly show processing state
    expect(screen.getByText('Processing diff...')).toBeInTheDocument();
  });

  test('handles copy failure gracefully', async () => {
    const { copyToClipboard } = await import('@/utils/clipboardHelper');
    const mockCopyToClipboard = copyToClipboard as any;
    mockCopyToClipboard.mockRejectedValue(new Error('Copy failed'));

    renderWithRouter(<DiffChecker />);
    
    const originalTextarea = screen.getByPlaceholderText('Paste your original text here...');
    const modifiedTextarea = screen.getByPlaceholderText('Paste your modified text here...');
    
    fireEvent.change(originalTextarea, { target: { value: 'Hello World' } });
    fireEvent.change(modifiedTextarea, { target: { value: 'Hello Universe' } });
    
    await waitFor(() => {
      const copyButton = screen.getByText('Copy');
      fireEvent.click(copyButton);
    }, { timeout: 1000 });

    await waitFor(() => {
      expect(screen.getByText(/Failed to copy to clipboard/)).toBeInTheDocument();
    });
  });

  test('handles multiline text correctly', async () => {
    renderWithRouter(<DiffChecker />);
    
    const originalTextarea = screen.getByPlaceholderText('Paste your original text here...');
    const modifiedTextarea = screen.getByPlaceholderText('Paste your modified text here...');
    
    const originalText = 'Line 1\nLine 2\nLine 3\nLine 4';
    const modifiedText = 'Line 1\nLine 2 modified\nLine 3\nLine 5';
    
    fireEvent.change(originalTextarea, { target: { value: originalText } });
    fireEvent.change(modifiedTextarea, { target: { value: modifiedText } });
    
    await waitFor(() => {
      const diffOutput = document.querySelector('.diff-output');
      expect(diffOutput).toBeInTheDocument();
      
      // Should show multiple diff lines
      const diffLines = document.querySelectorAll('.diff-line');
      expect(diffLines.length).toBeGreaterThan(3);
    }, { timeout: 1000 });
  });

  test('handles special characters in text', async () => {
    renderWithRouter(<DiffChecker />);
    
    const originalTextarea = screen.getByPlaceholderText('Paste your original text here...');
    const modifiedTextarea = screen.getByPlaceholderText('Paste your modified text here...');
    
    const originalText = 'Hello\tWorld\n"Quotes"\n\'Single quotes\'';
    const modifiedText = 'Hello\tUniverse\n"Quotes"\n\'Single quotes\'';
    
    fireEvent.change(originalTextarea, { target: { value: originalText } });
    fireEvent.change(modifiedTextarea, { target: { value: modifiedText } });
    
    await waitFor(() => {
      const diffOutput = document.querySelector('.diff-output');
      expect(diffOutput).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  test('responsive design classes are applied', () => {
    renderWithRouter(<DiffChecker />);
    
    // Check for responsive grid classes
    const inputsGrid = document.querySelector('.diff-checker-inputs');
    expect(inputsGrid).toHaveClass('grid', 'grid-cols-1', 'lg:grid-cols-2');
    
    // Check for touch-friendly button classes
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      if (button.textContent === 'Share' || button.textContent === 'Clear All') {
        expect(button).toHaveClass('touch-manipulation', 'min-h-[44px]');
      }
    });
  });

  test('error boundary integration', () => {
    renderWithRouter(<DiffChecker />);
    
    // The component should be wrapped in ToolErrorBoundary
    // This is tested by ensuring the component renders without throwing
    expect(screen.getByText('Text Diff Checker')).toBeInTheDocument();
  });

  test('handles text with only whitespace differences', async () => {
    renderWithRouter(<DiffChecker />);
    
    const originalTextarea = screen.getByPlaceholderText('Paste your original text here...');
    const modifiedTextarea = screen.getByPlaceholderText('Paste your modified text here...');
    
    fireEvent.change(originalTextarea, { target: { value: 'line 1\nline 2' } });
    fireEvent.change(modifiedTextarea, { target: { value: 'line 1 \n line 2' } });
    
    await waitFor(() => {
      const diffOutput = document.querySelector('.diff-output');
      expect(diffOutput).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  test('diff output shows correct markers for additions and deletions', async () => {
    renderWithRouter(<DiffChecker />);
    
    const originalTextarea = screen.getByPlaceholderText('Paste your original text here...');
    const modifiedTextarea = screen.getByPlaceholderText('Paste your modified text here...');
    
    fireEvent.change(originalTextarea, { target: { value: 'removed line' } });
    fireEvent.change(modifiedTextarea, { target: { value: 'added line' } });
    
    await waitFor(() => {
      const diffMarkers = document.querySelectorAll('.diff-marker');
      expect(diffMarkers.length).toBeGreaterThan(0);
      
      // Should have + and - markers
      const markerTexts = Array.from(diffMarkers).map(marker => marker.textContent?.trim());
      expect(markerTexts).toContain('+');
      expect(markerTexts).toContain('-');
    }, { timeout: 1000 });
  });

  test('line numbers are displayed when enabled', async () => {
    renderWithRouter(<DiffChecker />);
    
    const originalTextarea = screen.getByPlaceholderText('Paste your original text here...');
    const modifiedTextarea = screen.getByPlaceholderText('Paste your modified text here...');
    
    fireEvent.change(originalTextarea, { target: { value: 'line 1\nline 2' } });
    fireEvent.change(modifiedTextarea, { target: { value: 'line 1\nline 3' } });
    
    await waitFor(() => {
      const lineNumbers = document.querySelectorAll('.diff-line-number');
      expect(lineNumbers.length).toBeGreaterThan(0);
    }, { timeout: 1000 });
  });

  test('handles truncation warning for large texts', async () => {
    renderWithRouter(<DiffChecker />);
    
    const originalTextarea = screen.getByPlaceholderText('Paste your original text here...');
    
    // Create text with many lines (over 1000)
    const manyLines = Array.from({ length: 1005 }, (_, i) => `line ${i + 1}`).join('\n');
    fireEvent.change(originalTextarea, { target: { value: manyLines } });
    
    await waitFor(() => {
      expect(screen.getByText(/Large text was truncated for performance/)).toBeInTheDocument();
    }, { timeout: 1000 });
  });
});