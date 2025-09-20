import React from 'react';
import { render, screen } from '@testing-library/react';
import { HashRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { Sidebar } from '../Sidebar';
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

describe('Sidebar', () => {
  const defaultProps = {
    isOpen: true,
    onToggle: vi.fn(),
    onClose: vi.fn(),
  };

  it('should render sidebar with all tools including new developer tools', () => {
    renderWithProviders(<Sidebar {...defaultProps} />);
    
    // Check that the sidebar renders
    expect(screen.getByText('Dev Tools')).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
    
    // Check that new tools are present in sidebar
    expect(screen.getByText('JSON Type Generator')).toBeInTheDocument();
    expect(screen.getByText('Diff Checker')).toBeInTheDocument();
    
    // Check that existing tools are still present
    expect(screen.getByText('JSON Converter')).toBeInTheDocument();
    expect(screen.getByText('JSON Visualizer')).toBeInTheDocument();
    expect(screen.getByText('CSV Viewer')).toBeInTheDocument();
  });

  it('should organize tools by categories', () => {
    renderWithProviders(<Sidebar {...defaultProps} />);
    
    // Check that categories are present
    expect(screen.getByText('Data Processing')).toBeInTheDocument();
    expect(screen.getByText('Code Generation')).toBeInTheDocument();
    expect(screen.getByText('Text Processing')).toBeInTheDocument();
  });

  it('should have proper links for new tools', () => {
    renderWithProviders(<Sidebar {...defaultProps} />);
    
    // Check that links are properly formed
    const jsonTypeGeneratorLink = screen.getByRole('link', { name: /JSON Type Generator/i });
    const diffCheckerLink = screen.getByRole('link', { name: /Diff Checker/i });
    
    expect(jsonTypeGeneratorLink).toHaveAttribute('href', '#/json-type-generator');
    expect(diffCheckerLink).toHaveAttribute('href', '#/diff-checker');
  });

  it('should not render when closed', () => {
    renderWithProviders(<Sidebar {...defaultProps} isOpen={false} />);
    
    // The sidebar should have the closed class
    const sidebar = screen.getByRole('complementary', { hidden: true });
    expect(sidebar).toHaveClass('-translate-x-full');
  });
});