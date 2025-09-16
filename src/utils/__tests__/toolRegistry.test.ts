import React from 'react';
import { toolRegistry } from '../toolRegistry';
import { Tool } from '../../types';

// Mock component for testing
const MockComponent = React.lazy(() => Promise.resolve({
  default: () => React.createElement('div', null, 'Mock Tool')
}));

describe('ToolRegistry', () => {
  beforeEach(() => {
    // Clear any existing tools for clean tests
    // Note: In a real implementation, we might want a reset method
  });

  test('should register and retrieve tools', () => {
    const testTool: Tool = {
      id: 'test-tool',
      name: 'Test Tool',
      path: '/test-tool',
      component: MockComponent,
      description: 'A test tool',
      category: 'Testing'
    };

    toolRegistry.registerTool(testTool);
    const retrievedTool = toolRegistry.getTool('test-tool');
    
    expect(retrievedTool).toBeDefined();
    expect(retrievedTool?.id).toBe('test-tool');
    expect(retrievedTool?.name).toBe('Test Tool');
  });

  test('should return all registered tools', () => {
    const tools = toolRegistry.getAllTools();
    
    // Should have at least the default tools (JSON Converter, JSON Visualizer, CSV Viewer)
    expect(tools.length).toBeGreaterThanOrEqual(3);
    
    const toolIds = tools.map(tool => tool.id);
    expect(toolIds).toContain('json-converter');
    expect(toolIds).toContain('json-visualizer');
    expect(toolIds).toContain('csv-viewer');
  });

  test('should group tools by category', () => {
    const toolsByCategory = toolRegistry.getToolsByCategory();
    
    expect(toolsByCategory).toHaveProperty('Data Processing');
    expect(toolsByCategory['Data Processing'].length).toBeGreaterThanOrEqual(3);
  });

  test('should update existing tool when registering with same id', () => {
    const originalTool: Tool = {
      id: 'update-test',
      name: 'Original Tool',
      path: '/original',
      component: MockComponent,
      description: 'Original description',
      category: 'Testing'
    };

    const updatedTool: Tool = {
      id: 'update-test',
      name: 'Updated Tool',
      path: '/updated',
      component: MockComponent,
      description: 'Updated description',
      category: 'Testing'
    };

    toolRegistry.registerTool(originalTool);
    toolRegistry.registerTool(updatedTool);
    
    const retrievedTool = toolRegistry.getTool('update-test');
    expect(retrievedTool?.name).toBe('Updated Tool');
    expect(retrievedTool?.path).toBe('/updated');
  });

  test('should return undefined for non-existent tool', () => {
    const nonExistentTool = toolRegistry.getTool('non-existent');
    expect(nonExistentTool).toBeUndefined();
  });
});