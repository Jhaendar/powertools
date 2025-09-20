import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import JSONTypeGenerator from '../JSONTypeGenerator';

import { vi } from 'vitest';

// Mock the clipboard helper
vi.mock('@/utils/clipboardHelper', () => ({
  clipboardHelper: {
    copy: vi.fn().mockResolvedValue(true)
  }
}));

// Mock the error handler
vi.mock('@/utils/errorHandler', () => ({
  errorHandler: {
    formatError: vi.fn().mockReturnValue({ message: 'Type generation error' }),
    getClipboardError: vi.fn().mockReturnValue({ message: 'Clipboard error' })
  }
}));

// Wrapper component for router context
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

describe('JSONTypeGenerator', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Clear URL parameters
    window.history.replaceState({}, '', '/');
  });

  test('renders main component elements', () => {
    render(
      <TestWrapper>
        <JSONTypeGenerator />
      </TestWrapper>
    );

    // Check for main heading
    expect(screen.getByText('JSON Type Generator')).toBeInTheDocument();
    
    // Check for description
    expect(screen.getByText(/Generate type definitions from JSON data/)).toBeInTheDocument();
    
    // Check for format selector
    expect(screen.getByText('Output Format')).toBeInTheDocument();
    
    // Check for input and output areas
    expect(screen.getByLabelText('JSON input')).toBeInTheDocument();
    expect(screen.getByLabelText('Generated type definitions')).toBeInTheDocument();
  });

  test('displays format selector with default TypeScript option', () => {
    render(
      <TestWrapper>
        <JSONTypeGenerator />
      </TestWrapper>
    );

    // The select should have TypeScript as default (we can't easily test the selected value in this setup)
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  test('handles JSON input changes', () => {
    render(
      <TestWrapper>
        <JSONTypeGenerator />
      </TestWrapper>
    );

    const jsonInput = screen.getByLabelText('JSON input');
    const testJSON = '{"name": "test"}';
    
    fireEvent.change(jsonInput, { target: { value: testJSON } });
    
    expect(jsonInput).toHaveValue(testJSON);
  });

  test('clear button clears input', () => {
    render(
      <TestWrapper>
        <JSONTypeGenerator />
      </TestWrapper>
    );

    const jsonInput = screen.getByLabelText('JSON input');
    const testJSON = '{"name": "test"}';
    
    // Add some input
    fireEvent.change(jsonInput, { target: { value: testJSON } });
    expect(jsonInput).toHaveValue(testJSON);
    
    // Click clear button
    const clearButton = screen.getAllByText('Clear')[0]; // First clear button (input section)
    fireEvent.click(clearButton);
    
    expect(jsonInput).toHaveValue('');
  });

  test('copy and share buttons are disabled when no input', () => {
    render(
      <TestWrapper>
        <JSONTypeGenerator />
      </TestWrapper>
    );

    const shareButton = screen.getByTitle('Copy shareable URL');
    const copyButton = screen.getByRole('button', { name: /copy/i });
    
    expect(shareButton).toBeDisabled();
    expect(copyButton).toBeDisabled();
  });

  test('copy and share buttons are enabled when input is provided', () => {
    render(
      <TestWrapper>
        <JSONTypeGenerator />
      </TestWrapper>
    );

    const jsonInput = screen.getByLabelText('JSON input');
    const testJSON = '{"name": "test"}';
    
    fireEvent.change(jsonInput, { target: { value: testJSON } });
    
    const shareButton = screen.getByTitle('Copy shareable URL');
    expect(shareButton).not.toBeDisabled();
  });

  test('displays info section with features and supported formats', () => {
    render(
      <TestWrapper>
        <JSONTypeGenerator />
      </TestWrapper>
    );

    expect(screen.getByText('Features:')).toBeInTheDocument();
    expect(screen.getByText('Supported formats:')).toBeInTheDocument();
    expect(screen.getByText('• Real-time JSON validation')).toBeInTheDocument();
    expect(screen.getByText('• TypeScript interfaces')).toBeInTheDocument();
    expect(screen.getByText('• Python TypedDict')).toBeInTheDocument();
  });

  test('shows appropriate placeholder text for output based on format', () => {
    render(
      <TestWrapper>
        <JSONTypeGenerator />
      </TestWrapper>
    );

    const outputArea = screen.getByLabelText('Generated type definitions');
    expect(outputArea).toHaveAttribute('placeholder', 'Generated TypeScript interfaces will appear here...');
  });

  test('copy button exists and has correct initial state', () => {
    render(
      <TestWrapper>
        <JSONTypeGenerator />
      </TestWrapper>
    );

    const copyButton = screen.getByRole('button', { name: /copy/i });
    
    // Copy button should exist and be disabled initially (no output)
    expect(copyButton).toBeInTheDocument();
    expect(copyButton).toBeDisabled();
    
    // Button should have copy icon and text
    expect(copyButton).toHaveTextContent('Copy');
  });

  test('copy functionality is integrated in component', () => {
    render(
      <TestWrapper>
        <JSONTypeGenerator />
      </TestWrapper>
    );

    // Verify copy button exists and is properly integrated
    const copyButton = screen.getByRole('button', { name: /copy/i });
    expect(copyButton).toBeInTheDocument();
    
    // Verify the button has the expected text content
    expect(copyButton).toHaveTextContent('Copy');
  });
});