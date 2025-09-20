import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import JSONTypeGenerator from '@/components/JSONTypeGenerator/JSONTypeGenerator';
import DiffChecker from '@/components/DiffChecker/DiffChecker';

// Mock the error boundary to verify it's being used
vi.mock('@/components/ErrorBoundary', () => ({
  ToolErrorBoundary: ({ children, toolName }: { children: React.ReactNode; toolName: string }) => (
    <div data-testid={`error-boundary-${toolName.toLowerCase().replace(/\s+/g, '-')}`}>
      {children}
    </div>
  ),
}));

// Mock other dependencies to prevent errors
vi.mock('@/utils/statePersistence', () => ({
  usePersistentState: vi.fn(() => [{}, vi.fn()]),
  generateShareableURL: vi.fn(() => 'http://localhost:3000/test-url'),
}));

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
  copyToClipboard: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/utils/jsonTypeGenerator', () => ({
  parseJSONSafely: vi.fn(() => ({ data: null, error: null })),
  analyzeJSONStructure: vi.fn(() => ({ type: 'object', properties: {} })),
  generateTypeScriptInterface: vi.fn(() => ({ content: '' })),
  generateJSDocTypes: vi.fn(() => ({ content: '' })),
  generatePythonTypedDict: vi.fn(() => ({ content: '' })),
  generatePythonDataclass: vi.fn(() => ({ content: '' })),
  generatePydanticModel: vi.fn(() => ({ content: '' })),
}));

vi.mock('@/utils/textDiffProcessor', () => ({
  processTextDiff: vi.fn(() => []),
  debounce: vi.fn((fn) => fn),
  validateTextInput: vi.fn(() => ({ isValid: true })),
  optimizeTextForDiff: vi.fn((text) => ({ text, truncated: false })),
  handleEmptyDiff: vi.fn(() => 'Enter text in both areas to see differences'),
  getDiffStats: vi.fn(() => ({ additions: 0, deletions: 0, total: 0 })),
  formatDiffForClipboard: vi.fn(() => ''),
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('Error Boundary Integration', () => {
  it('should wrap JSONTypeGenerator with ToolErrorBoundary', () => {
    renderWithRouter(<JSONTypeGenerator />);
    
    expect(screen.getByTestId('error-boundary-json-type-generator')).toBeInTheDocument();
    expect(screen.getByText('JSON Type Generator')).toBeInTheDocument();
  });

  it('should wrap DiffChecker with ToolErrorBoundary', () => {
    renderWithRouter(<DiffChecker />);
    
    expect(screen.getByTestId('error-boundary-diff-checker')).toBeInTheDocument();
    expect(screen.getByText('Text Diff Checker')).toBeInTheDocument();
  });
});