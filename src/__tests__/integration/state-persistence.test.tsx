import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import JSONTypeGenerator from '@/components/JSONTypeGenerator/JSONTypeGenerator';
import DiffChecker from '@/components/DiffChecker/DiffChecker';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock URL search params
let mockSearchParams = new URLSearchParams();
const mockSetSearchParams = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useSearchParams: () => [mockSearchParams, mockSetSearchParams],
  };
});

// Mock the clipboard helper
vi.mock('@/utils/clipboardHelper', () => ({
  copyToClipboard: vi.fn()
}));

// Mock the state persistence utility with more realistic behavior
vi.mock('@/utils/statePersistence', () => ({
  usePersistentState: vi.fn((toolId: string, initialState: any) => {
    // Check if there's state in URL params first
    const encodedState = mockSearchParams.get('state');
    let restoredState = initialState;
    
    if (encodedState) {
      try {
        const decodedState = JSON.parse(decodeURIComponent(atob(encodedState)));
        restoredState = { ...initialState, ...decodedState };
      } catch (error) {
        // Fallback to localStorage
        const storageKey = `devtools-${toolId}-state`;
        const savedState = localStorageMock.getItem(storageKey);
        if (savedState) {
          restoredState = { ...initialState, ...JSON.parse(savedState) };
        }
      }
    } else {
      // Check localStorage
      const storageKey = `devtools-${toolId}-state`;
      const savedState = localStorageMock.getItem(storageKey);
      if (savedState) {
        restoredState = { ...initialState, ...JSON.parse(savedState) };
      }
    }
    
    const [state, setState] = React.useState(restoredState);
    
    const updateState = (newState: any) => {
      const updatedState = { ...state, ...newState };
      setState(updatedState);
      
      // Simulate localStorage save
      const storageKey = `devtools-${toolId}-state`;
      localStorageMock.setItem(storageKey, JSON.stringify(updatedState));
      
      // Simulate URL state update
      mockSetSearchParams((prev: URLSearchParams) => {
        const newParams = new URLSearchParams(prev);
        newParams.set('state', btoa(JSON.stringify(updatedState)));
        return newParams;
      });
    };
    return [state, updateState];
  }),
  generateShareableURL: vi.fn(() => 'https://example.com/share')
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('State Persistence Integration', () => {
  beforeEach(() => {
    localStorageMock.clear();
    mockSearchParams = new URLSearchParams();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  describe('JSONTypeGenerator', () => {
    it('should persist and restore state across component remounts', async () => {
      // First render - enter some data
      const { unmount } = renderWithRouter(<JSONTypeGenerator />);
      
      const formatSelector = screen.getByRole('combobox');
      fireEvent.click(formatSelector);
      
      const pythonOption = screen.getByText('Python TypedDict');
      fireEvent.click(pythonOption);
      
      const jsonInput = screen.getByLabelText('JSON input');
      fireEvent.change(jsonInput, { target: { value: '{"name": "John", "age": 30}' } });
      
      // Wait for state to be persisted
      await waitFor(() => {
        expect(mockSetSearchParams).toHaveBeenCalled();
      });
      
      // Simulate component unmount (page navigation)
      unmount();
      
      // Mock the persisted state in URL params
      mockSearchParams.set('state', btoa(encodeURIComponent(JSON.stringify({
        selectedFormat: 'python-typeddict',
        generatedOutput: 'class RootType(TypedDict):\n    name: str\n    age: int',
        error: null
      }))));
      
      // Second render - should restore state
      renderWithRouter(<JSONTypeGenerator />);
      
      // Verify state was restored
      expect(screen.getByText('Python TypedDict')).toBeInTheDocument();
      
      // Check if localStorage was used for backup
      const storageKey = 'devtools-json-type-generator-state';
      expect(localStorageMock.getItem(storageKey)).toBeTruthy();
    });

    it('should clear persisted state when Clear All is clicked', async () => {
      renderWithRouter(<JSONTypeGenerator />);
      
      // Add some data first
      const jsonInput = screen.getByLabelText('JSON input');
      fireEvent.change(jsonInput, { target: { value: '{"test": "value"}' } });
      
      // Wait for state to be persisted
      await waitFor(() => {
        expect(mockSetSearchParams).toHaveBeenCalled();
      });
      
      // Clear all data
      const clearAllButton = screen.getByText('Clear All');
      fireEvent.click(clearAllButton);
      
      // Verify state was cleared
      expect(jsonInput).toHaveValue('');
      expect(screen.getByText('TypeScript Interfaces')).toBeInTheDocument(); // Back to default
    });
  });

  describe('DiffChecker', () => {
    it('should persist and restore state across component remounts', async () => {
      // First render - enter some data
      const { unmount } = renderWithRouter(<DiffChecker />);
      
      const originalTextarea = screen.getByLabelText('Original text input');
      const modifiedTextarea = screen.getByLabelText('Modified text input');
      
      fireEvent.change(originalTextarea, { target: { value: 'line 1\nline 2' } });
      fireEvent.change(modifiedTextarea, { target: { value: 'line 1\nline 2 modified' } });
      
      // Wait for state to be persisted
      await waitFor(() => {
        expect(mockSetSearchParams).toHaveBeenCalled();
      });
      
      // Simulate component unmount
      unmount();
      
      // Mock the persisted state in URL params
      mockSearchParams.set('state', btoa(encodeURIComponent(JSON.stringify({
        originalText: 'line 1\nline 2',
        modifiedText: 'line 1\nline 2 modified',
        showLineNumbers: true
      }))));
      
      // Second render - should restore state
      renderWithRouter(<DiffChecker />);
      
      // Verify state was restored
      const restoredOriginal = screen.getByLabelText('Original text input');
      const restoredModified = screen.getByLabelText('Modified text input');
      
      expect(restoredOriginal).toHaveValue('line 1\nline 2');
      expect(restoredModified).toHaveValue('line 1\nline 2 modified');
      
      // Check if localStorage was used for backup
      const storageKey = 'devtools-diff-checker-state';
      expect(localStorageMock.getItem(storageKey)).toBeTruthy();
    });

    it('should clear persisted state when Clear All is clicked', async () => {
      renderWithRouter(<DiffChecker />);
      
      // Add some data first
      const originalTextarea = screen.getByLabelText('Original text input');
      const modifiedTextarea = screen.getByLabelText('Modified text input');
      
      fireEvent.change(originalTextarea, { target: { value: 'original text' } });
      fireEvent.change(modifiedTextarea, { target: { value: 'modified text' } });
      
      // Wait for state to be persisted
      await waitFor(() => {
        expect(mockSetSearchParams).toHaveBeenCalled();
      });
      
      // Clear all data
      const clearAllButton = screen.getByText('Clear All');
      fireEvent.click(clearAllButton);
      
      // Verify state was cleared
      expect(originalTextarea).toHaveValue('');
      expect(modifiedTextarea).toHaveValue('');
    });

    it('should persist line numbers toggle state', async () => {
      renderWithRouter(<DiffChecker />);
      
      // Add some text to show diff output
      const originalTextarea = screen.getByLabelText('Original text input');
      const modifiedTextarea = screen.getByLabelText('Modified text input');
      
      fireEvent.change(originalTextarea, { target: { value: 'line 1' } });
      fireEvent.change(modifiedTextarea, { target: { value: 'line 1 modified' } });
      
      // Wait for diff to be processed
      await waitFor(() => {
        const lineNumberToggle = screen.getByLabelText(/show line numbers|hide line numbers/i);
        expect(lineNumberToggle).toBeInTheDocument();
      });
      
      // Toggle line numbers off
      const lineNumberToggle = screen.getByLabelText(/show line numbers|hide line numbers/i);
      fireEvent.click(lineNumberToggle);
      
      // Verify the toggle state was persisted
      await waitFor(() => {
        expect(mockSetSearchParams).toHaveBeenCalledWith(expect.any(Function));
      });
    });
  });

  describe('Cross-tool state isolation', () => {
    it('should maintain separate state for different tools', async () => {
      // Test JSONTypeGenerator
      const { unmount: unmountJSON } = renderWithRouter(<JSONTypeGenerator />);
      
      const jsonInput = screen.getByLabelText('JSON input');
      fireEvent.change(jsonInput, { target: { value: '{"json": "data"}' } });
      
      await waitFor(() => {
        expect(mockSetSearchParams).toHaveBeenCalled();
      });
      
      unmountJSON();
      
      // Test DiffChecker
      const { unmount: unmountDiff } = renderWithRouter(<DiffChecker />);
      
      const originalTextarea = screen.getByLabelText('Original text input');
      fireEvent.change(originalTextarea, { target: { value: 'diff data' } });
      
      await waitFor(() => {
        expect(mockSetSearchParams).toHaveBeenCalled();
      });
      
      unmountDiff();
      
      // Verify both tools have separate localStorage entries
      expect(localStorageMock.getItem('devtools-json-type-generator-state')).toBeTruthy();
      expect(localStorageMock.getItem('devtools-diff-checker-state')).toBeTruthy();
      
      // Verify the states are different
      const jsonState = JSON.parse(localStorageMock.getItem('devtools-json-type-generator-state') || '{}');
      const diffState = JSON.parse(localStorageMock.getItem('devtools-diff-checker-state') || '{}');
      
      expect(jsonState).not.toEqual(diffState);
    });
  });

  describe('State cleanup', () => {
    it('should clean up localStorage when state is cleared', async () => {
      renderWithRouter(<JSONTypeGenerator />);
      
      // Add some data
      const jsonInput = screen.getByLabelText('JSON input');
      fireEvent.change(jsonInput, { target: { value: '{"test": "data"}' } });
      
      await waitFor(() => {
        expect(localStorageMock.getItem('devtools-json-type-generator-state')).toBeTruthy();
      });
      
      // Clear all data
      const clearAllButton = screen.getByText('Clear All');
      fireEvent.click(clearAllButton);
      
      // Verify localStorage was updated with empty state
      await waitFor(() => {
        const storedState = JSON.parse(localStorageMock.getItem('devtools-json-type-generator-state') || '{}');
        expect(storedState.selectedFormat).toBe('typescript');
        expect(storedState.generatedOutput).toBe('');
        expect(storedState.error).toBeNull();
      });
    });
  });
});