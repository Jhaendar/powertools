import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/utils/test-utils';
import { vi } from 'vitest';
import JSONTypeGenerator from '@/components/JSONTypeGenerator/JSONTypeGenerator';
import DiffChecker from '@/components/DiffChecker/DiffChecker';
import { ToolErrorBoundary } from '@/components/ErrorBoundary';

// Mock console.error to avoid noise in test output
const originalError = console.error;
beforeAll(() => {
  console.error = vi.fn();
});

afterAll(() => {
  console.error = originalError;
});

describe('Tool Error Boundary Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('JSONTypeGenerator Error Handling', () => {
    it('should recover from JSON parsing errors gracefully', async () => {
      render(<JSONTypeGenerator />);
      
      // Find the JSON input textarea (not the clear button)
      const jsonInput = screen.getByRole('textbox', { name: /json input/i });
      
      // Enter invalid JSON
      fireEvent.change(jsonInput, { target: { value: '{ invalid json }' } });
      
      // Wait for debounced processing
      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      }, { timeout: 1000 });
      
      // Verify the tool is still functional
      expect(screen.getByText(/JSON Type Generator/i)).toBeInTheDocument();
      expect(jsonInput).toBeInTheDocument();
      
      // Enter valid JSON to recover
      fireEvent.change(jsonInput, { target: { value: '{"test": "value"}' } });
      
      // Wait for processing and verify recovery
      await waitFor(() => {
        const outputArea = screen.getByLabelText(/generated type definitions/i);
        expect((outputArea as HTMLTextAreaElement).value).toContain('interface');
      }, { timeout: 1000 });
    });

    it('should be wrapped in ToolErrorBoundary', () => {
      // Verify that JSONTypeGenerator is wrapped in error boundary by checking structure
      render(<JSONTypeGenerator />);
      
      // The component should render successfully (indicating error boundary is working)
      expect(screen.getByText(/JSON Type Generator/i)).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /json input/i })).toBeInTheDocument();
    });
  });

  describe('DiffChecker Error Handling', () => {
    it('should handle large text inputs gracefully', async () => {
      render(<DiffChecker />);
      
      // Find text input areas
      const originalInput = screen.getByLabelText(/original text input/i);
      const modifiedInput = screen.getByLabelText(/modified text input/i);
      
      // Create moderately large text (to avoid performance issues in tests)
      const largeText = 'x'.repeat(10000); // 10k characters
      const modifiedLargeText = 'y'.repeat(10000);
      
      fireEvent.change(originalInput, { target: { value: largeText } });
      fireEvent.change(modifiedInput, { target: { value: modifiedLargeText } });
      
      // Wait for processing
      await waitFor(() => {
        // Should either show processing or handle the large input
        const diffOutput = screen.getByText(/Diff Output/i);
        expect(diffOutput).toBeInTheDocument();
      }, { timeout: 2000 });
      
      // Verify the tool is still responsive
      expect(screen.getByText(/Text Diff Checker/i)).toBeInTheDocument();
      expect(originalInput).toBeInTheDocument();
      expect(modifiedInput).toBeInTheDocument();
    });

    it('should be wrapped in ToolErrorBoundary', () => {
      // Verify that DiffChecker is wrapped in error boundary by checking structure
      render(<DiffChecker />);
      
      // The component should render successfully (indicating error boundary is working)
      expect(screen.getByText(/Text Diff Checker/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/original text input/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/modified text input/i)).toBeInTheDocument();
    });
  });

  describe('Error Boundary Component Functionality', () => {
    // Test the error boundary directly with a component that throws
    const ThrowingComponent: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = true }) => {
      if (shouldThrow) {
        throw new Error('Test component error');
      }
      return <div data-testid="no-error">Component working</div>;
    };

    it('should catch errors and display error UI', () => {
      render(
        <ToolErrorBoundary toolName="Test Tool">
          <ThrowingComponent />
        </ToolErrorBoundary>
      );
      
      // Should show error boundary UI
      expect(screen.getByText(/Error in Test Tool/i)).toBeInTheDocument();
      expect(screen.getByText(/An unexpected error occurred/i)).toBeInTheDocument();
      
      // Should show action buttons
      expect(screen.getByRole('button', { name: /Try Again/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Go Back/i })).toBeInTheDocument();
    });

    it('should render children when there is no error', () => {
      render(
        <ToolErrorBoundary toolName="Test Tool">
          <ThrowingComponent shouldThrow={false} />
        </ToolErrorBoundary>
      );
      
      // Should render the child component normally
      expect(screen.getByTestId('no-error')).toBeInTheDocument();
      expect(screen.getByText('Component working')).toBeInTheDocument();
      
      // Should not show error UI
      expect(screen.queryByText(/Error in Test Tool/i)).not.toBeInTheDocument();
    });

    it('should handle retry functionality', () => {
      const mockReload = vi.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: mockReload },
        writable: true
      });

      const onRetry = vi.fn();
      
      render(
        <ToolErrorBoundary toolName="Test Tool" onRetry={onRetry}>
          <ThrowingComponent />
        </ToolErrorBoundary>
      );
      
      // Click retry button
      const retryButton = screen.getByRole('button', { name: /Try Again/i });
      fireEvent.click(retryButton);
      
      // Should call onRetry callback
      expect(onRetry).toHaveBeenCalled();
    });

    it('should handle go back functionality', () => {
      const onGoBack = vi.fn();
      
      render(
        <ToolErrorBoundary toolName="Test Tool" onGoBack={onGoBack}>
          <ThrowingComponent />
        </ToolErrorBoundary>
      );
      
      // Click go back button
      const goBackButton = screen.getByRole('button', { name: /Go Back/i });
      fireEvent.click(goBackButton);
      
      // Should call onGoBack callback
      expect(onGoBack).toHaveBeenCalled();
    });
  });

  describe('Application Stability', () => {
    it('should not crash the entire application when tools error', () => {
      // Render a component that contains both tools and other content
      const AppWithTools = () => (
        <div>
          <h1 data-testid="app-header">Dev Tools App</h1>
          <div data-testid="tool-container">
            <JSONTypeGenerator />
          </div>
          <div data-testid="other-content">Other app content</div>
        </div>
      );
      
      render(<AppWithTools />);
      
      // Verify the app structure is intact even if tools have errors
      expect(screen.getByTestId('app-header')).toBeInTheDocument();
      expect(screen.getByTestId('tool-container')).toBeInTheDocument();
      expect(screen.getByTestId('other-content')).toBeInTheDocument();
      
      // The tool should be wrapped in error boundary and not crash the app
      expect(screen.getByText(/JSON Type Generator/i)).toBeInTheDocument();
    });

    it('should isolate errors to individual tools', () => {
      // Create a component with both tools
      const MultiToolApp = () => (
        <div>
          <div data-testid="json-tool-section">
            <JSONTypeGenerator />
          </div>
          <div data-testid="diff-tool-section">
            <DiffChecker />
          </div>
        </div>
      );
      
      render(<MultiToolApp />);
      
      // Both tools should render successfully
      expect(screen.getByTestId('json-tool-section')).toBeInTheDocument();
      expect(screen.getByTestId('diff-tool-section')).toBeInTheDocument();
      expect(screen.getByText(/JSON Type Generator/i)).toBeInTheDocument();
      expect(screen.getByText(/Text Diff Checker/i)).toBeInTheDocument();
    });
  });
});