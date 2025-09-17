import { render, screen, fireEvent, waitFor } from '@/utils/test-utils';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import JSONConverter from '@/components/JSONConverter/JSONConverter';
import JSONVisualizer from '@/components/JSONVisualizer/JSONVisualizer';
import CSVViewer from '@/components/CSVViewer/CSVViewer';

// Mock the clipboard helper
vi.mock('@/utils/clipboardHelper', () => ({
  clipboardHelper: {
    copy: vi.fn().mockResolvedValue(true),
    isSupported: vi.fn().mockReturnValue(true),
  },
}));

describe('Tool Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render JSON Converter without errors', async () => {
    render(<JSONConverter />);
    
    expect(screen.getByText('JSON Converter')).toBeInTheDocument();
    expect(screen.getByLabelText('JSON input')).toBeInTheDocument();
    expect(screen.getByLabelText('JSON string output')).toBeInTheDocument();
  });

  it('should render JSON Visualizer without errors', async () => {
    render(<JSONVisualizer />);
    
    expect(screen.getByText('JSON Tree Visualizer')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Paste your JSON data here...')).toBeInTheDocument();
  });

  it('should render CSV Viewer without errors', async () => {
    render(<CSVViewer />);
    
    expect(screen.getByText('CSV Table Viewer')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Paste your CSV data here...')).toBeInTheDocument();
  });

  it('should handle JSON Converter workflow', async () => {
    render(<JSONConverter />);
    
    const input = screen.getByLabelText('JSON input');
    const output = screen.getByLabelText('JSON string output');
    
    // Enter JSON data
    fireEvent.change(input, { target: { value: '{"name": "test"}' } });
    
    // Wait for processing
    await waitFor(() => {
      expect((output as HTMLTextAreaElement).value).toBeTruthy();
      expect((output as HTMLTextAreaElement).value).toContain('name');
      expect((output as HTMLTextAreaElement).value).toContain('test');
    });
    
    // Test copy functionality
    const copyButton = screen.getByRole('button', { name: /copy/i });
    fireEvent.click(copyButton);
    
    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });
  });

  it('should handle JSON Visualizer workflow', async () => {
    render(<JSONVisualizer />);
    
    const input = screen.getByPlaceholderText('Paste your JSON data here...');
    
    // Enter JSON data
    fireEvent.change(input, { target: { value: '{"name": "test", "nested": {"value": 123}}' } });
    
    // Wait for processing
    await waitFor(() => {
      // Should not show the empty state message
      expect(screen.queryByText('Enter valid JSON data to see the tree visualization')).not.toBeInTheDocument();
    });
    
    // Should have expand/collapse controls
    expect(screen.getByText('Expand All')).toBeInTheDocument();
    expect(screen.getByText('Collapse All')).toBeInTheDocument();
  });

  it('should handle CSV Viewer workflow', async () => {
    render(<CSVViewer />);
    
    const input = screen.getByPlaceholderText('Paste your CSV data here...');
    
    // Enter CSV data
    const csvData = 'Name,Age,City\nJohn,25,NYC\nJane,30,LA';
    fireEvent.change(input, { target: { value: csvData } });
    
    // Should have the basic interface elements
    expect(screen.getByText('Upload CSV File')).toBeInTheDocument();
    expect(screen.getByText('Rows per page')).toBeInTheDocument();
    expect(screen.getByText('Header Detection')).toBeInTheDocument();
  });

  it('should handle error states gracefully', async () => {
    render(<JSONConverter />);
    
    const input = screen.getByLabelText('JSON input');
    
    // Enter invalid JSON
    fireEvent.change(input, { target: { value: '{"invalid": json}' } });
    
    // Should show error message
    await waitFor(() => {
      expect(screen.getByText('Invalid JSON')).toBeInTheDocument();
    });
  });

  it('should maintain component isolation', async () => {
    // Test that components can be rendered independently
    const { unmount: unmountConverter } = render(<JSONConverter />);
    expect(screen.getByText('JSON Converter')).toBeInTheDocument();
    unmountConverter();
    
    const { unmount: unmountVisualizer } = render(<JSONVisualizer />);
    expect(screen.getByText('JSON Tree Visualizer')).toBeInTheDocument();
    unmountVisualizer();
    
    render(<CSVViewer />);
    expect(screen.getByText('CSV Table Viewer')).toBeInTheDocument();
  });
});