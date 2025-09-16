import { render, screen } from '@/utils/test-utils';
import { vi } from 'vitest';
import CSVViewer from '../CSVViewer';

// Mock the clipboard helper
vi.mock('../../../utils/clipboardHelper', () => ({
  clipboardHelper: {
    copy: vi.fn().mockResolvedValue(true),
    isSupported: vi.fn().mockReturnValue(true)
  }
}));

describe('CSVViewer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the CSV viewer interface', () => {
    render(<CSVViewer />);
    
    expect(screen.getByText('CSV Table Viewer')).toBeInTheDocument();
    expect(screen.getByText('Upload CSV File')).toBeInTheDocument();
    expect(screen.getByText('Rows per page')).toBeInTheDocument();
    expect(screen.getByText('Header Detection')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Paste your CSV data here...')).toBeInTheDocument();
  });

  it('renders action buttons', () => {
    render(<CSVViewer />);
    
    expect(screen.getByText('Paste from Clipboard')).toBeInTheDocument();
    expect(screen.getByText('Clear')).toBeInTheDocument();
  });

  it('renders form controls', () => {
    render(<CSVViewer />);
    
    // Check that select components are rendered
    expect(screen.getByText('50 rows')).toBeInTheDocument();
    expect(screen.getByText('Auto-detect')).toBeInTheDocument();
  });
});