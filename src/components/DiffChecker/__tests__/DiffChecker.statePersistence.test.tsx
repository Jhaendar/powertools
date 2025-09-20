import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import DiffChecker from '../DiffChecker';

// Mock the state persistence utilities
const mockSetPersistentState = vi.fn();
const mockPersistentState = {
  originalText: '',
  modifiedText: '',
  showLineNumbers: true
};

vi.mock('@/utils/statePersistence', () => ({
  usePersistentState: vi.fn(() => [mockPersistentState, mockSetPersistentState]),
  generateShareableURL: vi.fn(() => 'http://localhost:3000/test-url'),
}));

// Mock text diff processor utilities
vi.mock('@/utils/textDiffProcessor', () => ({
  processTextDiff: vi.fn(() => [
    { type: 'unchanged', value: 'line 1', lineNumber: 1 },
    { type: 'removed', value: 'line 2', lineNumber: 2 },
    { type: 'added', value: 'line 2 modified', lineNumber: 3 }
  ]),
  debounce: vi.fn((fn) => fn),
  validateTextInput: vi.fn(() => ({ isValid: true })),
  optimizeTextForDiff: vi.fn((text) => ({ text, truncated: false })),
  handleEmptyDiff: vi.fn(() => 'Enter text in both areas to see differences'),
  getDiffStats: vi.fn(() => ({ additions: 1, deletions: 1, total: 3 })),
  formatDiffForClipboard: vi.fn(() => 'diff output'),
}));

// Mock clipboard helper
vi.mock('@/utils/clipboardHelper', () => ({
  copyToClipboard: vi.fn(() => Promise.resolve()),
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('DiffChecker State Persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock state
    Object.assign(mockPersistentState, {
      originalText: '',
      modifiedText: '',
      showLineNumbers: true
    });
  });

  it('should initialize with persistent state', () => {
    renderWithRouter(<DiffChecker />);
    
    const originalTextarea = screen.getByLabelText('Original text input');
    const modifiedTextarea = screen.getByLabelText('Modified text input');
    
    expect(originalTextarea).toHaveValue('');
    expect(modifiedTextarea).toHaveValue('');
  });

  it('should persist original text changes', async () => {
    renderWithRouter(<DiffChecker />);
    
    const originalTextarea = screen.getByLabelText('Original text input');
    fireEvent.change(originalTextarea, { target: { value: 'original text' } });
    
    expect(mockSetPersistentState).toHaveBeenCalledWith({
      originalText: 'original text'
    });
  });

  it('should persist modified text changes', async () => {
    renderWithRouter(<DiffChecker />);
    
    const modifiedTextarea = screen.getByLabelText('Modified text input');
    fireEvent.change(modifiedTextarea, { target: { value: 'modified text' } });
    
    expect(mockSetPersistentState).toHaveBeenCalledWith({
      modifiedText: 'modified text'
    });
  });

  it('should persist line numbers toggle state', async () => {
    // Set up some text to show the diff output
    Object.assign(mockPersistentState, {
      originalText: 'line 1\nline 2',
      modifiedText: 'line 1\nline 2 modified'
    });
    
    renderWithRouter(<DiffChecker />);
    
    // Wait for diff to be processed and toggle to appear
    await waitFor(() => {
      // Look for diff output first
      const diffLines = screen.queryAllByText(/line/);
      expect(diffLines.length).toBeGreaterThan(0);
    }, { timeout: 3000 });

    const lineNumberToggle = screen.getByLabelText(/line numbers/i);
    expect(lineNumberToggle).toBeInTheDocument();
    
    fireEvent.click(lineNumberToggle);
    
    expect(mockSetPersistentState).toHaveBeenCalledWith({
      showLineNumbers: false
    });
  });

  it('should clear all persistent state when Clear All is clicked', async () => {
    // Set up some initial state
    Object.assign(mockPersistentState, {
      originalText: 'some original text',
      modifiedText: 'some modified text',
      showLineNumbers: false
    });
    
    renderWithRouter(<DiffChecker />);
    
    const clearAllButton = screen.getByText('Clear All');
    fireEvent.click(clearAllButton);
    
    expect(mockSetPersistentState).toHaveBeenCalledWith({
      originalText: '',
      modifiedText: ''
    });
  });

  it('should handle share functionality with current state', async () => {
    Object.assign(mockPersistentState, {
      originalText: 'original',
      modifiedText: 'modified',
      showLineNumbers: true
    });
    
    renderWithRouter(<DiffChecker />);
    
    const shareButton = screen.getByText('Share');
    fireEvent.click(shareButton);
    
    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });
  });

  it('should restore text content from persistent state', () => {
    Object.assign(mockPersistentState, {
      originalText: 'restored original text',
      modifiedText: 'restored modified text',
      showLineNumbers: false
    });
    
    renderWithRouter(<DiffChecker />);
    
    const originalTextarea = screen.getByLabelText('Original text input');
    const modifiedTextarea = screen.getByLabelText('Modified text input');
    
    expect(originalTextarea).toHaveValue('restored original text');
    expect(modifiedTextarea).toHaveValue('restored modified text');
  });

  it('should process diff when text is restored from persistent state', async () => {
    Object.assign(mockPersistentState, {
      originalText: 'line 1\nline 2',
      modifiedText: 'line 1\nline 2 modified',
      showLineNumbers: true
    });
    
    renderWithRouter(<DiffChecker />);
    
    // Should show diff output for restored text
    await waitFor(() => {
      expect(screen.getByText('line 1')).toBeInTheDocument();
      expect(screen.getByText('line 2')).toBeInTheDocument();
      expect(screen.getByText('line 2 modified')).toBeInTheDocument();
    });
  });

  it('should handle copy diff functionality', async () => {
    Object.assign(mockPersistentState, {
      originalText: 'original',
      modifiedText: 'modified'
    });
    
    renderWithRouter(<DiffChecker />);
    
    // Wait for diff to be processed
    await waitFor(() => {
      const copyButton = screen.getByText('Copy');
      expect(copyButton).toBeInTheDocument();
    });
    
    const copyButton = screen.getByText('Copy');
    fireEvent.click(copyButton);
    
    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });
  });

  it('should disable action buttons when no text is present', () => {
    renderWithRouter(<DiffChecker />);
    
    const shareButton = screen.getByText('Share');
    const clearAllButton = screen.getByText('Clear All');
    
    expect(shareButton).toBeDisabled();
    expect(clearAllButton).toBeDisabled();
  });

  it('should enable action buttons when text is present', () => {
    Object.assign(mockPersistentState, {
      originalText: 'some text',
      modifiedText: ''
    });
    
    renderWithRouter(<DiffChecker />);
    
    const shareButton = screen.getByText('Share');
    const clearAllButton = screen.getByText('Clear All');
    
    expect(shareButton).not.toBeDisabled();
    expect(clearAllButton).not.toBeDisabled();
  });
});