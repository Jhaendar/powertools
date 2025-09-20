import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import JSONTypeGenerator from '../JSONTypeGenerator';

// Mock the state persistence utilities
const mockSetPersistentState = vi.fn();
const mockPersistentState = {
  selectedFormat: 'typescript' as const,
  generatedOutput: '',
  error: null
};

vi.mock('@/utils/statePersistence', () => ({
  usePersistentState: vi.fn(() => [mockPersistentState, mockSetPersistentState]),
  generateShareableURL: vi.fn(() => 'http://localhost:3000/test-url'),
}));

// Mock other utilities
vi.mock('@/utils/errorHandler', () => ({
  errorHandler: {
    formatError: vi.fn(() => ({ message: 'Test error' })),
    getClipboardError: vi.fn(() => ({ message: 'Clipboard error' })),
  },
}));

vi.mock('@/utils/clipboardHelper', () => ({
  clipboardHelper: {
    copy: vi.fn(() => Promise.resolve(true)),
  },
}));

vi.mock('@/utils/jsonTypeGenerator', () => ({
  parseJSONSafely: vi.fn(() => ({ data: { test: 'value' }, error: null })),
  analyzeJSONStructure: vi.fn(() => ({ type: 'object', properties: {} })),
  generateTypeScriptInterface: vi.fn(() => ({ content: 'interface Test { test: string; }' })),
  generateJSDocTypes: vi.fn(() => ({ content: '/** @typedef {Object} Test */' })),
  generatePythonTypedDict: vi.fn(() => ({ content: 'class Test(TypedDict): pass' })),
  generatePythonDataclass: vi.fn(() => ({ content: '@dataclass\nclass Test: pass' })),
  generatePydanticModel: vi.fn(() => ({ content: 'class Test(BaseModel): pass' })),
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('JSONTypeGenerator State Persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock state
    Object.assign(mockPersistentState, {
      selectedFormat: 'typescript' as const,
      generatedOutput: '',
      error: null
    });
  });

  it('should initialize with persistent state', () => {
    renderWithRouter(<JSONTypeGenerator />);
    
    expect(screen.getByText('TypeScript Interfaces')).toBeInTheDocument();
  });

  it('should persist format selection changes', async () => {
    renderWithRouter(<JSONTypeGenerator />);
    
    const formatSelector = screen.getByRole('combobox');
    fireEvent.click(formatSelector);
    
    const pythonOption = screen.getByText('Python TypedDict');
    fireEvent.click(pythonOption);
    
    await waitFor(() => {
      expect(mockSetPersistentState).toHaveBeenCalledWith({
        selectedFormat: 'python-typeddict'
      });
    });
  });

  it('should persist generated output', async () => {
    const jsonInput = '{"name": "John", "age": 30}';
    
    renderWithRouter(<JSONTypeGenerator />);
    
    const inputTextarea = screen.getByLabelText('JSON input');
    fireEvent.change(inputTextarea, { target: { value: jsonInput } });
    
    // Wait for debounced processing
    await waitFor(() => {
      expect(mockSetPersistentState).toHaveBeenCalledWith({
        generatedOutput: 'interface Test { test: string; }',
        error: null
      });
    }, { timeout: 500 });
  });

  it('should clear persistent state when Clear All is clicked', async () => {
    // Set up some initial state
    Object.assign(mockPersistentState, {
      selectedFormat: 'python-dataclass' as const,
      generatedOutput: 'some output',
      error: null
    });
    
    renderWithRouter(<JSONTypeGenerator />);
    
    const clearAllButton = screen.getByText('Clear All');
    fireEvent.click(clearAllButton);
    
    expect(mockSetPersistentState).toHaveBeenCalledWith({
      selectedFormat: 'typescript',
      generatedOutput: '',
      error: null
    });
  });

  it('should handle share functionality with current state', async () => {
    const jsonInput = '{"test": "value"}';
    
    renderWithRouter(<JSONTypeGenerator />);
    
    const inputTextarea = screen.getByLabelText('JSON input');
    fireEvent.change(inputTextarea, { target: { value: jsonInput } });
    
    const shareButton = screen.getByText('Share');
    fireEvent.click(shareButton);
    
    // Should generate shareable URL with current state including jsonInput
    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });
  });

  it('should restore state from URL parameters on mount', () => {
    // Mock URL with state parameter
    const mockSearchParams = new URLSearchParams();
    mockSearchParams.set('state', encodeURIComponent('{"jsonInput":"{\\"test\\":\\"value\\"}"}'));
    
    Object.defineProperty(window, 'location', {
      value: {
        hash: '#/json-type-generator?' + mockSearchParams.toString()
      },
      writable: true
    });
    
    renderWithRouter(<JSONTypeGenerator />);
    
    // The component should initialize with the JSON input from URL
    const inputTextarea = screen.getByLabelText('JSON input');
    expect(inputTextarea).toHaveValue('{"test":"value"}');
  });

  it('should handle errors in persistent state', async () => {
    mockPersistentState.error = 'Test error message' as any;
    
    renderWithRouter(<JSONTypeGenerator />);
    
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('should persist error state', async () => {
    renderWithRouter(<JSONTypeGenerator />);
    
    const inputTextarea = screen.getByLabelText('JSON input');
    fireEvent.change(inputTextarea, { target: { value: 'invalid json' } });
    
    // Mock JSON parsing error
    const { parseJSONSafely } = await import('@/utils/jsonTypeGenerator');
    vi.mocked(parseJSONSafely).mockReturnValue({ data: null, error: 'Invalid JSON' });
    
    await waitFor(() => {
      expect(mockSetPersistentState).toHaveBeenCalledWith({
        generatedOutput: '',
        error: 'Invalid JSON'
      });
    }, { timeout: 500 });
  });
});