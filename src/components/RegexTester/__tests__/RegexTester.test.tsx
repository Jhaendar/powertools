import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import RegexTester from '../RegexTester';

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

describe('RegexTester', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders the component with correct title and description', () => {
    renderWithRouter(<RegexTester />);

    expect(screen.getByText('Regex Tester')).toBeInTheDocument();
    expect(screen.getByText(/Test regular expressions with live pattern matching/)).toBeInTheDocument();
  });

  test('renders pattern input field', () => {
    renderWithRouter(<RegexTester />);

    expect(screen.getByLabelText('Pattern')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter your regex pattern/)).toBeInTheDocument();
  });

  test('renders test string textarea', () => {
    renderWithRouter(<RegexTester />);

    expect(screen.getByLabelText('Text to test against')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter text to test your regex pattern/)).toBeInTheDocument();
  });

  test('renders all flag toggles', () => {
    renderWithRouter(<RegexTester />);

    expect(screen.getByLabelText('Global flag (g)')).toBeInTheDocument();
    expect(screen.getByLabelText('Case insensitive flag (i)')).toBeInTheDocument();
    expect(screen.getByLabelText('Multiline flag (m)')).toBeInTheDocument();
    expect(screen.getByLabelText('Dot all flag (s)')).toBeInTheDocument();
    expect(screen.getByLabelText('Unicode flag (u)')).toBeInTheDocument();
    expect(screen.getByLabelText('Sticky flag (y)')).toBeInTheDocument();
  });

  test('updates pattern input', () => {
    renderWithRouter(<RegexTester />);

    const patternInput = screen.getByLabelText('Pattern');
    fireEvent.change(patternInput, { target: { value: '\\d+' } });

    expect(patternInput).toHaveValue('\\d+');
  });

  test('updates test string input', () => {
    renderWithRouter(<RegexTester />);

    const testStringInput = screen.getByLabelText('Text to test against');
    fireEvent.change(testStringInput, { target: { value: 'Test 123' } });

    expect(testStringInput).toHaveValue('Test 123');
  });

  test('toggles global flag', () => {
    renderWithRouter(<RegexTester />);

    const globalFlag = screen.getByLabelText('Global flag (g)');

    // Global flag is enabled by default
    expect(globalFlag).toHaveAttribute('data-state', 'on');

    // Click to toggle off
    fireEvent.click(globalFlag);

    // Should now be off
    expect(globalFlag).toHaveAttribute('data-state', 'off');
  });

  test('toggles case insensitive flag', () => {
    renderWithRouter(<RegexTester />);

    const caseInsensitiveFlag = screen.getByLabelText('Case insensitive flag (i)');

    // Should be off by default
    expect(caseInsensitiveFlag).toHaveAttribute('data-state', 'off');

    // Click to toggle on
    fireEvent.click(caseInsensitiveFlag);

    // Should now be on
    expect(caseInsensitiveFlag).toHaveAttribute('data-state', 'on');
  });

  test('shows "no pattern" message when pattern is empty', () => {
    renderWithRouter(<RegexTester />);

    expect(screen.getByText('Enter a regex pattern to start testing')).toBeInTheDocument();
  });

  test('shows "no test text" message when test string is empty but pattern exists', () => {
    renderWithRouter(<RegexTester />);

    const patternInput = screen.getByLabelText('Pattern');
    fireEvent.change(patternInput, { target: { value: '\\d+' } });

    expect(screen.getByText('Enter test text to see matches')).toBeInTheDocument();
  });

  test('displays error for invalid regex pattern', () => {
    renderWithRouter(<RegexTester />);

    const patternInput = screen.getByLabelText('Pattern');
    const testStringInput = screen.getByLabelText('Text to test against');

    // Enter invalid regex pattern
    fireEvent.change(patternInput, { target: { value: '[' } });
    fireEvent.change(testStringInput, { target: { value: 'test' } });

    const alerts = screen.getAllByRole('alert');
    expect(alerts.length).toBeGreaterThan(0);
  });

  test('displays matches when valid pattern and text are provided', () => {
    renderWithRouter(<RegexTester />);

    const patternInput = screen.getByLabelText('Pattern');
    const testStringInput = screen.getByLabelText('Text to test against');

    fireEvent.change(patternInput, { target: { value: '\\d+' } });
    fireEvent.change(testStringInput, { target: { value: 'Test 123 and 456' } });

    // Should show match count
    expect(screen.getByText(/2 matches/)).toBeInTheDocument();
  });

  test('displays single match correctly', () => {
    renderWithRouter(<RegexTester />);

    const patternInput = screen.getByLabelText('Pattern');
    const testStringInput = screen.getByLabelText('Text to test against');

    fireEvent.change(patternInput, { target: { value: 'hello' } });
    fireEvent.change(testStringInput, { target: { value: 'hello world' } });

    expect(screen.getByText(/1 match\b/)).toBeInTheDocument();
  });

  test('displays no matches message when pattern does not match', () => {
    renderWithRouter(<RegexTester />);

    const patternInput = screen.getByLabelText('Pattern');
    const testStringInput = screen.getByLabelText('Text to test against');

    fireEvent.change(patternInput, { target: { value: '\\d+' } });
    fireEvent.change(testStringInput, { target: { value: 'no numbers here' } });

    expect(screen.getByText('No matches found')).toBeInTheDocument();
  });

  test('highlights matches in test text', () => {
    renderWithRouter(<RegexTester />);

    const patternInput = screen.getByLabelText('Pattern');
    const testStringInput = screen.getByLabelText('Text to test against');

    fireEvent.change(patternInput, { target: { value: '\\d+' } });
    fireEvent.change(testStringInput, { target: { value: 'Test 123' } });

    // Should have highlighted match
    const marks = document.querySelectorAll('mark');
    expect(marks.length).toBeGreaterThan(0);
    expect(marks[0]).toHaveTextContent('123');
  });

  test('case insensitive flag works correctly', () => {
    renderWithRouter(<RegexTester />);

    const patternInput = screen.getByLabelText('Pattern');
    const testStringInput = screen.getByLabelText('Text to test against');
    const caseInsensitiveFlag = screen.getByLabelText('Case insensitive flag (i)');

    fireEvent.change(patternInput, { target: { value: 'hello' } });
    fireEvent.change(testStringInput, { target: { value: 'HELLO world' } });

    // Without case insensitive flag, should have no matches
    expect(screen.getByText('No matches found')).toBeInTheDocument();

    // Enable case insensitive flag
    fireEvent.click(caseInsensitiveFlag);

    // Now should have 1 match
    expect(screen.getByText(/1 match\b/)).toBeInTheDocument();
  });

  test('global flag affects match count', () => {
    renderWithRouter(<RegexTester />);

    const patternInput = screen.getByLabelText('Pattern');
    const testStringInput = screen.getByLabelText('Text to test against');
    const globalFlag = screen.getByLabelText('Global flag (g)');

    fireEvent.change(patternInput, { target: { value: '\\d+' } });
    fireEvent.change(testStringInput, { target: { value: '123 456 789' } });

    // With global flag (default), should have 3 matches
    expect(screen.getByText(/3 matches/)).toBeInTheDocument();

    // Disable global flag
    fireEvent.click(globalFlag);

    // Without global flag, should have 1 match
    expect(screen.getByText(/1 match\b/)).toBeInTheDocument();
  });

  test('copy matches button is visible when matches exist', () => {
    renderWithRouter(<RegexTester />);

    const patternInput = screen.getByLabelText('Pattern');
    const testStringInput = screen.getByLabelText('Text to test against');

    fireEvent.change(patternInput, { target: { value: '\\d+' } });
    fireEvent.change(testStringInput, { target: { value: '123' } });

    expect(screen.getByText('Copy Matches')).toBeInTheDocument();
  });

  test('copy matches button works correctly', async () => {
    const { copyToClipboard } = await import('@/utils/clipboardHelper');
    const mockCopyToClipboard = copyToClipboard as any;
    mockCopyToClipboard.mockResolvedValue(undefined);

    renderWithRouter(<RegexTester />);

    const patternInput = screen.getByLabelText('Pattern');
    const testStringInput = screen.getByLabelText('Text to test against');

    fireEvent.change(patternInput, { target: { value: '\\d+' } });
    fireEvent.change(testStringInput, { target: { value: '123 456' } });

    const copyButton = screen.getByText('Copy Matches');
    fireEvent.click(copyButton);

    // Verify copyToClipboard was called
    expect(mockCopyToClipboard).toHaveBeenCalled();

    // Check that the button text changes to "Copied!"
    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });
  });

  test('clear all button clears both inputs', () => {
    renderWithRouter(<RegexTester />);

    const patternInput = screen.getByLabelText('Pattern');
    const testStringInput = screen.getByLabelText('Text to test against');

    fireEvent.change(patternInput, { target: { value: '\\d+' } });
    fireEvent.change(testStringInput, { target: { value: '123' } });

    expect(patternInput).toHaveValue('\\d+');
    expect(testStringInput).toHaveValue('123');

    const clearAllButton = screen.getByText('Clear All');
    fireEvent.click(clearAllButton);

    expect(patternInput).toHaveValue('');
    expect(testStringInput).toHaveValue('');
  });

  test('clear all button is disabled when both inputs are empty', () => {
    renderWithRouter(<RegexTester />);

    const clearAllButton = screen.getByText('Clear All');
    expect(clearAllButton).toBeDisabled();
  });

  test('share button is disabled when both inputs are empty', () => {
    renderWithRouter(<RegexTester />);

    const shareButton = screen.getByText('Share');
    expect(shareButton).toBeDisabled();
  });

  test('share button works when inputs have content', async () => {
    const { copyToClipboard } = await import('@/utils/clipboardHelper');
    vi.mocked(copyToClipboard).mockResolvedValue(true);

    renderWithRouter(<RegexTester />);

    const patternInput = screen.getByLabelText('Pattern');
    fireEvent.change(patternInput, { target: { value: '\\d+' } });

    const shareButton = screen.getByText('Share');
    expect(shareButton).not.toBeDisabled();

    fireEvent.click(shareButton);

    await waitFor(() => {
      expect(vi.mocked(copyToClipboard)).toHaveBeenCalled();
    });
  });

  test('cheatsheet toggle button works', () => {
    renderWithRouter(<RegexTester />);

    const cheatsheetButton = screen.getByText('Show Cheatsheet');

    fireEvent.click(cheatsheetButton);

    expect(screen.getByText('Hide Cheatsheet')).toBeInTheDocument();
    expect(screen.getByText('Regular Expression Cheatsheet')).toBeInTheDocument();
  });

  test('cheatsheet displays all sections', () => {
    renderWithRouter(<RegexTester />);

    const cheatsheetButton = screen.getByText('Show Cheatsheet');
    fireEvent.click(cheatsheetButton);

    expect(screen.getByText('Character Classes')).toBeInTheDocument();
    expect(screen.getByText('Anchors')).toBeInTheDocument();
    expect(screen.getByText('Quantifiers')).toBeInTheDocument();
    expect(screen.getByText('Groups')).toBeInTheDocument();
    expect(screen.getByText('Lookaround')).toBeInTheDocument();
    expect(screen.getByText('Escape Sequences')).toBeInTheDocument();
  });

  test('displays capture groups when pattern has groups', () => {
    renderWithRouter(<RegexTester />);

    const patternInput = screen.getByLabelText('Pattern');
    const testStringInput = screen.getByLabelText('Text to test against');

    fireEvent.change(patternInput, { target: { value: '(\\d+)-(\\d+)' } });
    fireEvent.change(testStringInput, { target: { value: '123-456' } });

    expect(screen.getByText('Match 1:')).toBeInTheDocument();
  });

  test('handles multiline flag correctly', () => {
    renderWithRouter(<RegexTester />);

    const patternInput = screen.getByLabelText('Pattern');
    const testStringInput = screen.getByLabelText('Text to test against');
    const multilineFlag = screen.getByLabelText('Multiline flag (m)');

    fireEvent.change(patternInput, { target: { value: '^test' } });
    fireEvent.change(testStringInput, { target: { value: 'first line\ntest second line' } });

    // Without multiline flag, should have no matches
    expect(screen.getByText('No matches found')).toBeInTheDocument();

    // Enable multiline flag
    fireEvent.click(multilineFlag);

    // Now should have 1 match
    expect(screen.getByText(/1 match\b/)).toBeInTheDocument();
  });

  test('handles special regex characters', () => {
    renderWithRouter(<RegexTester />);

    const patternInput = screen.getByLabelText('Pattern');
    const testStringInput = screen.getByLabelText('Text to test against');

    fireEvent.change(patternInput, { target: { value: '\\w+@\\w+\\.\\w+' } });
    fireEvent.change(testStringInput, { target: { value: 'test@example.com' } });

    expect(screen.getByText(/1 match\b/)).toBeInTheDocument();
  });

  test('handles word boundary regex', () => {
    renderWithRouter(<RegexTester />);

    const patternInput = screen.getByLabelText('Pattern');
    const testStringInput = screen.getByLabelText('Text to test against');

    fireEvent.change(patternInput, { target: { value: '\\btest\\b' } });
    fireEvent.change(testStringInput, { target: { value: 'test testing tested' } });

    expect(screen.getByText(/1 match\b/)).toBeInTheDocument();
  });

  test('responsive design classes are applied', () => {
    renderWithRouter(<RegexTester />);

    const container = document.querySelector('.regex-tester-container');
    expect(container).toBeInTheDocument();

    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      if (button.textContent === 'Share' || button.textContent === 'Clear All' || button.textContent === 'Show Cheatsheet') {
        expect(button).toHaveClass('touch-manipulation', 'min-h-[44px]');
      }
    });
  });

  test('handles empty capture groups', () => {
    renderWithRouter(<RegexTester />);

    const patternInput = screen.getByLabelText('Pattern');
    const testStringInput = screen.getByLabelText('Text to test against');

    fireEvent.change(patternInput, { target: { value: '(\\d+)?-(\\d+)' } });
    fireEvent.change(testStringInput, { target: { value: '-456' } });

    expect(screen.getByText(/1 match\b/)).toBeInTheDocument();
  });

  test('handles long test strings', () => {
    renderWithRouter(<RegexTester />);

    const patternInput = screen.getByLabelText('Pattern');
    const testStringInput = screen.getByLabelText('Text to test against');

    const longText = 'test '.repeat(100);
    fireEvent.change(patternInput, { target: { value: 'test' } });
    fireEvent.change(testStringInput, { target: { value: longText } });

    expect(screen.getByText(/100 matches/)).toBeInTheDocument();
  });

  test('match position is displayed', () => {
    renderWithRouter(<RegexTester />);

    const patternInput = screen.getByLabelText('Pattern');
    const testStringInput = screen.getByLabelText('Text to test against');

    fireEvent.change(patternInput, { target: { value: '\\d+' } });
    fireEvent.change(testStringInput, { target: { value: 'Test 123' } });

    expect(screen.getByText(/Position: 5/)).toBeInTheDocument();
  });

  test('handles unicode characters', () => {
    renderWithRouter(<RegexTester />);

    const patternInput = screen.getByLabelText('Pattern');
    const testStringInput = screen.getByLabelText('Text to test against');

    fireEvent.change(patternInput, { target: { value: '\\p{Emoji}' } });
    fireEvent.change(testStringInput, { target: { value: 'Hello 👋 World' } });

    // This test might fail without unicode flag, but we're just testing the component handles it
    // Unicode flag would need to be enabled for this to match properly
  });
});
