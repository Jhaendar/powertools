import { render, screen, fireEvent, waitFor } from '@/utils/test-utils';
import '@testing-library/jest-dom';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import JSONVisualizer from '../JSONVisualizer';

// Mock clipboard helper
vi.mock('../../../utils/clipboardHelper', () => ({
  clipboardHelper: {
    copy: vi.fn().mockResolvedValue(true),
    isSupported: vi.fn().mockReturnValue(true)
  }
}));

describe('JSONVisualizer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders initial state correctly', () => {
    render(<JSONVisualizer />);
    
    expect(screen.getByText('JSON Input')).toBeInTheDocument();
    expect(screen.getByText('JSON Tree Visualizer')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Paste your JSON data here...')).toBeInTheDocument();
    expect(screen.getByText('Enter valid JSON data to see the tree visualization')).toBeInTheDocument();
  });

  test('parses and displays simple JSON object', async () => {
    render(<JSONVisualizer />);
    
    const textarea = screen.getByPlaceholderText('Paste your JSON data here...');
    const testJSON = '{"name": "John", "age": 30, "active": true}';
    
    fireEvent.change(textarea, { target: { value: testJSON } });
    
    await waitFor(() => {
      // Check that the tree structure is rendered
      expect(screen.queryByText('Enter valid JSON data to see the tree visualization')).not.toBeInTheDocument();
      // Check for the presence of tree nodes (they should be rendered in the tree area)
      const treeArea = screen.getByText('JSON Tree Visualizer').closest('[data-slot="card"]');
      expect(treeArea).toBeInTheDocument();
    });
  });

  test('displays error for invalid JSON', async () => {
    render(<JSONVisualizer />);
    
    const textarea = screen.getByPlaceholderText('Paste your JSON data here...');
    const invalidJSON = '{"name": "John", "age":}';
    
    fireEvent.change(textarea, { target: { value: invalidJSON } });
    
    await waitFor(() => {
      expect(screen.getByText(/Invalid JSON/)).toBeInTheDocument();
    });
  });

  test('handles nested objects and arrays', async () => {
    render(<JSONVisualizer />);
    
    const textarea = screen.getByPlaceholderText('Paste your JSON data here...');
    const nestedJSON = '{"user": {"name": "John", "hobbies": ["reading", "coding"]}}';
    
    fireEvent.change(textarea, { target: { value: nestedJSON } });
    
    await waitFor(() => {
      // Just check that the tree is rendered (not showing the empty state)
      expect(screen.queryByText('Enter valid JSON data to see the tree visualization')).not.toBeInTheDocument();
    });
  });

  test('search functionality is available', async () => {
    render(<JSONVisualizer />);
    
    const textarea = screen.getByPlaceholderText('Paste your JSON data here...');
    const testJSON = '{"name": "John", "age": 30}';
    
    fireEvent.change(textarea, { target: { value: testJSON } });
    
    await waitFor(() => {
      // Check that search input is available when JSON is parsed
      expect(screen.getByPlaceholderText('Search keys, values, or paths...')).toBeInTheDocument();
    });
  });

  test('expand/collapse buttons are available', async () => {
    render(<JSONVisualizer />);
    
    const textarea = screen.getByPlaceholderText('Paste your JSON data here...');
    const nestedJSON = '{"user": {"name": "John", "age": 30}}';
    
    fireEvent.change(textarea, { target: { value: nestedJSON } });
    
    await waitFor(() => {
      expect(screen.getByText('Expand All')).toBeInTheDocument();
      expect(screen.getByText('Collapse All')).toBeInTheDocument();
    });
  });
});