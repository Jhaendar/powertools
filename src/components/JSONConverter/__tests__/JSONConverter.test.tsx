import { render, screen, fireEvent, waitFor } from '@/utils/test-utils';
import '@testing-library/jest-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import JSONConverter from '../JSONConverter';

// Mock the clipboard helper
vi.mock('@/utils/clipboardHelper', () => ({
  clipboardHelper: {
    copy: vi.fn(),
    isSupported: vi.fn(() => true),
  },
}));

describe('JSONConverter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the component with initial state', () => {
    render(<JSONConverter />);
    
    expect(screen.getByText('JSON Converter')).toBeInTheDocument();
    expect(screen.getByText('Convert JSON to formatted or minified string output with real-time validation')).toBeInTheDocument();
    expect(screen.getByLabelText('JSON input')).toBeInTheDocument();
    expect(screen.getByLabelText('JSON string output')).toBeInTheDocument();
    expect(screen.getByText('Pretty')).toBeInTheDocument();
    expect(screen.getByText('Double "')).toBeInTheDocument();
    expect(screen.getByText('Configuration')).toBeInTheDocument();
  });

  it('processes valid JSON input in real-time', async () => {
    render(<JSONConverter />);
    
    const input = screen.getByLabelText('JSON input');
    const output = screen.getByLabelText('JSON string output');
    
    fireEvent.change(input, { target: { value: '{"name": "John", "age": 30}' } });
    
    await waitFor(() => {
      // Component starts in formatted mode by default
      expect(output).toHaveValue('"{\n  \\"name\\": \\"John\\",\n  \\"age\\": 30\n}"');
    });
  });

  it('shows error for invalid JSON', async () => {
    render(<JSONConverter />);
    
    const input = screen.getByLabelText('JSON input');
    
    fireEvent.change(input, { target: { value: '{"name": "John", "age":}' } });
    
    await waitFor(() => {
      expect(screen.getByText('Invalid JSON')).toBeInTheDocument();
    });
  });

  it('toggles between formatted and minified output', async () => {
    render(<JSONConverter />);
    
    const input = screen.getByLabelText('JSON input');
    const output = screen.getByLabelText('JSON string output');
    const formatToggle = screen.getByRole('button', { name: /toggle formatted output/i });
    
    // Enter valid JSON
    fireEvent.change(input, { target: { value: '{"name": "John", "age": 30}' } });
    
    // Should be formatted by default (with outer quotes and escaping)
    await waitFor(() => {
      expect(output).toHaveValue('"{\n  \\"name\\": \\"John\\",\n  \\"age\\": 30\n}"');
    });
    
    // Toggle to minified
    fireEvent.click(formatToggle);
    
    await waitFor(() => {
      expect(output).toHaveValue('"{\\"name\\":\\"John\\",\\"age\\":30}"');
      expect(screen.getByText('Minified')).toBeInTheDocument();
    });
  });

  it('copies output to clipboard and shows visual feedback', async () => {
    const { clipboardHelper } = await import('@/utils/clipboardHelper');
    const mockCopy = clipboardHelper.copy as any;
    mockCopy.mockResolvedValue(true);
    
    render(<JSONConverter />);
    
    const input = screen.getByLabelText('JSON input');
    const output = screen.getByLabelText('JSON string output');
    const copyButton = screen.getByRole('button', { name: /copy/i });
    
    // Enter valid JSON
    fireEvent.change(input, { target: { value: '{"test": true}' } });
    
    // Wait for processing and get the actual output value
    await waitFor(() => {
      expect((output as HTMLTextAreaElement).value).toBeTruthy();
    });
    
    const actualOutput = (output as HTMLTextAreaElement).value;
    
    // Click copy
    fireEvent.click(copyButton);
    
    await waitFor(() => {
      expect(mockCopy).toHaveBeenCalledWith(actualOutput);
      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });
  });

  it('clears input and output', async () => {
    render(<JSONConverter />);
    
    const input = screen.getByLabelText('JSON input');
    const clearInputButton = screen.getAllByRole('button', { name: /clear/i })[0];
    
    // Enter some JSON
    fireEvent.change(input, { target: { value: '{"test": true}' } });
    
    // Wait for processing
    await waitFor(() => {
      expect(input).toHaveValue('{"test": true}');
    });
    
    // Clear input
    fireEvent.click(clearInputButton);
    
    expect(input).toHaveValue('');
    expect(screen.getByLabelText('JSON string output')).toHaveValue('');
  });

  it('handles empty input gracefully', async () => {
    render(<JSONConverter />);
    
    const input = screen.getByLabelText('JSON input');
    const output = screen.getByLabelText('JSON string output');
    
    // Type and then clear
    fireEvent.change(input, { target: { value: '{"test": true}' } });
    fireEvent.change(input, { target: { value: '' } });
    
    await waitFor(() => {
      expect(output).toHaveValue('');
    });
    
    // Should not show error for empty input
    expect(screen.queryByText('Invalid JSON')).not.toBeInTheDocument();
  });

  it('validates different JSON types', async () => {
    render(<JSONConverter />);
    
    const input = screen.getByLabelText('JSON input');
    const output = screen.getByLabelText('JSON string output');
    
    // Test array
    fireEvent.change(input, { target: { value: '[1, 2, 3]' } });
    
    await waitFor(() => {
      expect((output as HTMLTextAreaElement).value).toBeTruthy();
      // Should contain the array elements regardless of formatting
      expect((output as HTMLTextAreaElement).value).toContain('1');
      expect((output as HTMLTextAreaElement).value).toContain('2');
      expect((output as HTMLTextAreaElement).value).toContain('3');
    });
    
    // Test string
    fireEvent.change(input, { target: { value: '"hello world"' } });
    
    await waitFor(() => {
      expect(output).toHaveValue('"\\"hello world\\""');
    });
    
    // Test number
    fireEvent.change(input, { target: { value: '42' } });
    
    await waitFor(() => {
      expect(output).toHaveValue('"42"');
    });
    
    // Test boolean
    fireEvent.change(input, { target: { value: 'true' } });
    
    await waitFor(() => {
      expect(output).toHaveValue('"true"');
    });
    
    // Test null
    fireEvent.change(input, { target: { value: 'null' } });
    
    await waitFor(() => {
      expect(output).toHaveValue('"null"');
    });
  });

  it('toggles outer delimiter between double and single quotes', async () => {
    render(<JSONConverter />);
    
    const input = screen.getByLabelText('JSON input');
    const output = screen.getByLabelText('JSON string output');
    const delimiterToggle = screen.getByRole('button', { name: /toggle outer delimiter/i });
    
    // Enter valid JSON
    fireEvent.change(input, { target: { value: '{"name": "John"}' } });
    
    // Wait for initial processing
    await waitFor(() => {
      expect((output as HTMLTextAreaElement).value).toBeTruthy();
      expect((output as HTMLTextAreaElement).value).toContain('name');
      expect((output as HTMLTextAreaElement).value).toContain('John');
    });
    
    const initialOutput = (output as HTMLTextAreaElement).value;
    
    // Toggle to single quotes
    fireEvent.click(delimiterToggle);
    
    await waitFor(() => {
      expect((output as HTMLTextAreaElement).value).not.toBe(initialOutput);
      expect((output as HTMLTextAreaElement).value).toMatch(/^'/); // Should start with single quote
      expect(screen.getByText("Single '")).toBeInTheDocument();
    });
    
    // Toggle back to double quotes
    fireEvent.click(delimiterToggle);
    
    await waitFor(() => {
      expect((output as HTMLTextAreaElement).value).toBe(initialOutput);
      expect((output as HTMLTextAreaElement).value).toMatch(/^"/); // Should start with double quote
      expect(screen.getByText('Double "')).toBeInTheDocument();
    });
  });
});