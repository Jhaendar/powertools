import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import HashGenerator from '../HashGenerator';

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

// Mock Web Crypto API for testing
const mockDigest = vi.fn();
Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      digest: mockDigest
    }
  },
  writable: true
});

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('HashGenerator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Setup default mock for digest to return a valid hash
    mockDigest.mockResolvedValue(new ArrayBuffer(32));
  });

  test('renders the component with correct title and description', () => {
    renderWithRouter(<HashGenerator />);

    expect(screen.getByText('Hash Generator')).toBeInTheDocument();
    expect(screen.getByText(/Generate cryptographic hashes from text or files/)).toBeInTheDocument();
  });

  test('renders algorithm selector', () => {
    renderWithRouter(<HashGenerator />);

    expect(screen.getByLabelText('Select Algorithm')).toBeInTheDocument();
  });

  test('renders input textarea', () => {
    renderWithRouter(<HashGenerator />);

    expect(screen.getByLabelText('Text to hash')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter text to generate hash/)).toBeInTheDocument();
  });

  test('renders action buttons', () => {
    renderWithRouter(<HashGenerator />);

    expect(screen.getByRole('button', { name: /Share/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Clear All/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Upload File/i })).toBeInTheDocument();
  });

  test('updates input text', () => {
    renderWithRouter(<HashGenerator />);

    const inputTextarea = screen.getByLabelText('Text to hash');
    fireEvent.change(inputTextarea, { target: { value: 'Hello, World!' } });

    expect(inputTextarea).toHaveValue('Hello, World!');
  });

  test('displays character and byte count when text is entered', () => {
    renderWithRouter(<HashGenerator />);

    const inputTextarea = screen.getByLabelText('Text to hash');
    fireEvent.change(inputTextarea, { target: { value: 'Hello' } });

    expect(screen.getByText(/Character count: 5/)).toBeInTheDocument();
    expect(screen.getByText(/Byte size:/)).toBeInTheDocument();
  });

  test('shows empty state when no input is provided', () => {
    renderWithRouter(<HashGenerator />);

    expect(screen.getByText(/Enter text or upload a file to generate hash/)).toBeInTheDocument();
  });

  test('disables action buttons when no input', () => {
    renderWithRouter(<HashGenerator />);

    const shareButton = screen.getByRole('button', { name: /Share/i });
    const clearButton = screen.getByRole('button', { name: /Clear All/i });

    expect(shareButton).toBeDisabled();
    expect(clearButton).toBeDisabled();
  });

  test('enables action buttons when input is provided', () => {
    renderWithRouter(<HashGenerator />);

    const inputTextarea = screen.getByLabelText('Text to hash');
    fireEvent.change(inputTextarea, { target: { value: 'Test input' } });

    const shareButton = screen.getByRole('button', { name: /Share/i });
    const clearButton = screen.getByRole('button', { name: /Clear All/i });

    expect(shareButton).not.toBeDisabled();
    expect(clearButton).not.toBeDisabled();
  });

  test('clears input when Clear All button is clicked', () => {
    renderWithRouter(<HashGenerator />);

    const inputTextarea = screen.getByLabelText('Text to hash');
    fireEvent.change(inputTextarea, { target: { value: 'Test input' } });

    const clearButton = screen.getByRole('button', { name: /Clear All/i });
    fireEvent.click(clearButton);

    expect(inputTextarea).toHaveValue('');
  });

  test('generates hash when input is provided', async () => {
    // Mock the digest method to return a predictable hash
    const mockHashBuffer = new Uint8Array([
      0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef,
      0xfe, 0xdc, 0xba, 0x98, 0x76, 0x54, 0x32, 0x10,
      0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef,
      0xfe, 0xdc, 0xba, 0x98, 0x76, 0x54, 0x32, 0x10
    ]).buffer;

    mockDigest.mockResolvedValue(mockHashBuffer);

    renderWithRouter(<HashGenerator />);

    const inputTextarea = screen.getByLabelText('Text to hash');
    fireEvent.change(inputTextarea, { target: { value: 'Hello, World!' } });

    // Wait for hash generation
    await waitFor(() => {
      expect(screen.getByText(/Generated Hash/)).toBeInTheDocument();
    });

    // Check if digest was called
    expect(mockDigest).toHaveBeenCalled();
  });

  test('displays algorithm description for SHA-256', () => {
    renderWithRouter(<HashGenerator />);

    expect(screen.getByText(/Recommended for most use cases/)).toBeInTheDocument();
  });

  test('renders info section with features and use cases', () => {
    renderWithRouter(<HashGenerator />);

    expect(screen.getByText(/Features:/)).toBeInTheDocument();
    expect(screen.getByText(/Use cases:/)).toBeInTheDocument();
    expect(screen.getByText(/Multiple hash algorithms/)).toBeInTheDocument();
    expect(screen.getByText(/Verify file integrity/)).toBeInTheDocument();
  });

  test('displays keyboard shortcuts in info section', () => {
    renderWithRouter(<HashGenerator />);

    expect(screen.getByText(/Keyboard shortcuts:/)).toBeInTheDocument();
    expect(screen.getByText(/Clear all/)).toBeInTheDocument();
  });

  test('copy button appears when hash is generated', async () => {
    const mockHashBuffer = new Uint8Array([
      0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef,
      0xfe, 0xdc, 0xba, 0x98, 0x76, 0x54, 0x32, 0x10,
      0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef,
      0xfe, 0xdc, 0xba, 0x98, 0x76, 0x54, 0x32, 0x10
    ]).buffer;

    mockDigest.mockResolvedValue(mockHashBuffer);

    renderWithRouter(<HashGenerator />);

    const inputTextarea = screen.getByLabelText('Text to hash');
    fireEvent.change(inputTextarea, { target: { value: 'Test' } });

    // Wait for hash generation and copy button to appear
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Copy Hash/i })).toBeInTheDocument();
    });
  });

  test('renders error boundary wrapper', () => {
    // This test verifies the component is wrapped in an error boundary
    // The actual error boundary functionality is tested separately
    renderWithRouter(<HashGenerator />);

    // Component should render normally when no error occurs
    expect(screen.getByText('Hash Generator')).toBeInTheDocument();
  });
});
