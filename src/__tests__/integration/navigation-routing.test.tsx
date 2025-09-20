import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import App from '../../App';

// Mock the lazy-loaded components to avoid loading issues in tests
vi.mock('../../components/JSONConverter/JSONConverter', () => ({
  default: () => <div data-testid="json-converter">JSON Converter Tool</div>
}));

vi.mock('../../components/JSONVisualizer/JSONVisualizer', () => ({
  default: () => <div data-testid="json-visualizer">JSON Visualizer Tool</div>
}));

vi.mock('../../components/CSVViewer/CSVViewer', () => ({
  default: () => <div data-testid="csv-viewer">CSV Viewer Tool</div>
}));

vi.mock('../../components/JSONTypeGenerator/JSONTypeGenerator', () => ({
  default: () => <div data-testid="json-type-generator">JSON Type Generator Tool</div>
}));

vi.mock('../../components/DiffChecker/DiffChecker', () => ({
  default: () => <div data-testid="diff-checker">Diff Checker Tool</div>
}));

describe('Navigation and Routing Integration', () => {
  const renderApp = () => {
    return render(<App />);
  };

  it('should navigate to home by default', async () => {
    renderApp();
    
    await waitFor(() => {
      expect(screen.getByText('Dev Tools Website')).toBeInTheDocument();
    });
  });

  it('should navigate to JSON Type Generator tool', async () => {
    renderApp();
    
    // Wait for the app to load
    await waitFor(() => {
      expect(screen.getAllByText('JSON Type Generator')).toHaveLength(2); // One in sidebar, one in main content
    });
    
    // Click on the JSON Type Generator link in the main content area (the card)
    const jsonTypeGeneratorLinks = screen.getAllByRole('link', { name: /JSON Type Generator/i });
    const mainContentLink = jsonTypeGeneratorLinks.find(link => 
      link.getAttribute('href') === '#/json-type-generator' && 
      link.textContent?.includes('Open Tool')
    ) || jsonTypeGeneratorLinks[0];
    
    fireEvent.click(mainContentLink);
    
    // Wait for the tool to load
    await waitFor(() => {
      expect(screen.getByTestId('json-type-generator')).toBeInTheDocument();
    });
  });

  it('should navigate to Diff Checker tool', async () => {
    renderApp();
    
    // Wait for the app to load and find at least one Diff Checker link
    await waitFor(() => {
      expect(screen.getByText('Diff Checker')).toBeInTheDocument();
    });
    
    // Click on any Diff Checker link
    const diffCheckerLinks = screen.getAllByRole('link', { name: /Diff Checker/i });
    fireEvent.click(diffCheckerLinks[0]);
    
    // Wait for the tool to load
    await waitFor(() => {
      expect(screen.getByTestId('diff-checker')).toBeInTheDocument();
    });
  });

  it('should handle direct URL navigation to new tools', async () => {
    // Test direct navigation to JSON Type Generator
    window.location.hash = '#/json-type-generator';
    renderApp();
    
    await waitFor(() => {
      expect(screen.getByTestId('json-type-generator')).toBeInTheDocument();
    });
  });

  it('should handle direct URL navigation to Diff Checker', async () => {
    // Test direct navigation to Diff Checker
    window.location.hash = '#/diff-checker';
    renderApp();
    
    await waitFor(() => {
      expect(screen.getByTestId('diff-checker')).toBeInTheDocument();
    });
  });

  it('should maintain proper URL structure for new tools', async () => {
    renderApp();
    
    // Check that the tool links have the correct href attributes
    await waitFor(() => {
      const jsonTypeGeneratorLink = screen.getByRole('link', { name: /JSON Type Generator/i });
      const diffCheckerLink = screen.getByRole('link', { name: /Diff Checker/i });
      
      expect(jsonTypeGeneratorLink).toHaveAttribute('href', '#/json-type-generator');
      expect(diffCheckerLink).toHaveAttribute('href', '#/diff-checker');
    });
  });

  it('should show all tools in the home page including new ones', async () => {
    renderApp();
    
    await waitFor(() => {
      // Check that all tools are displayed on the home page
      expect(screen.getByText('JSON Converter')).toBeInTheDocument();
      expect(screen.getByText('JSON Visualizer')).toBeInTheDocument();
      expect(screen.getByText('CSV Viewer')).toBeInTheDocument();
      expect(screen.getByText('JSON Type Generator')).toBeInTheDocument();
      expect(screen.getByText('Diff Checker')).toBeInTheDocument();
    });
  });

  it('should navigate between tools correctly', async () => {
    renderApp();
    
    // Navigate to JSON Type Generator
    await waitFor(() => {
      expect(screen.getByText('JSON Type Generator')).toBeInTheDocument();
    });
    
    const jsonTypeGeneratorLinks = screen.getAllByRole('link', { name: /JSON Type Generator/i });
    fireEvent.click(jsonTypeGeneratorLinks[0]);
    
    await waitFor(() => {
      expect(screen.getByTestId('json-type-generator')).toBeInTheDocument();
    });
    
    // Navigate to Diff Checker
    const diffCheckerLinks = screen.getAllByRole('link', { name: /Diff Checker/i });
    fireEvent.click(diffCheckerLinks[0]);
    
    await waitFor(() => {
      expect(screen.getByTestId('diff-checker')).toBeInTheDocument();
    });
    
    // Verify we can navigate back to home
    const homeLinks = screen.getAllByRole('link', { name: /Home/i });
    expect(homeLinks.length).toBeGreaterThan(0);
  });
});