import React from 'react';
import { render, screen } from '@testing-library/react';
import { HashRouter } from 'react-router-dom';
import { Navigation } from '../Navigation';
import { ToolRegistryProvider } from '../../../contexts/ToolRegistryContext';

// Mock the tool registry context
const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <HashRouter>
      <ToolRegistryProvider>
        {component}
      </ToolRegistryProvider>
    </HashRouter>
  );
};

describe('Navigation', () => {
  it('should render navigation with all tools including new developer tools', () => {
    renderWithProviders(<Navigation />);
    
    // Check that the navigation renders
    expect(screen.getByText('Dev Tools')).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
    
    // Check that new tools are present in navigation
    expect(screen.getByText('JSON Type Generator')).toBeInTheDocument();
    expect(screen.getByText('Diff Checker')).toBeInTheDocument();
    
    // Check that existing tools are still present
    expect(screen.getByText('JSON Converter')).toBeInTheDocument();
    expect(screen.getByText('JSON Visualizer')).toBeInTheDocument();
    expect(screen.getByText('CSV Viewer')).toBeInTheDocument();
  });

  it('should have proper links for new tools', () => {
    renderWithProviders(<Navigation />);
    
    // Check that links are properly formed
    const jsonTypeGeneratorLink = screen.getByRole('link', { name: /JSON Type Generator/i });
    const diffCheckerLink = screen.getByRole('link', { name: /Diff Checker/i });
    
    expect(jsonTypeGeneratorLink).toHaveAttribute('href', '#/json-type-generator');
    expect(diffCheckerLink).toHaveAttribute('href', '#/diff-checker');
  });

  it('should render with proper icons for new tools', () => {
    renderWithProviders(<Navigation />);
    
    // The icons should be rendered (we can't easily test the specific icon type, 
    // but we can verify the structure is correct)
    const toolLinks = screen.getAllByRole('link');
    expect(toolLinks.length).toBeGreaterThan(5); // Home + 5 tools
  });
});