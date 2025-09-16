import React from 'react';
import { Tool, ToolRegistry } from '../types';

// Lazy-loaded components - will be implemented in later tasks
const JSONConverter = React.lazy(() => import('../components/JSONConverter/JSONConverter'));
const JSONVisualizer = React.lazy(() => import('../components/JSONVisualizer/JSONVisualizer'));
const CSVViewer = React.lazy(() => import('../components/CSVViewer/CSVViewer'));

class ToolRegistryImpl implements ToolRegistry {
  private _tools: Tool[] = [];

  constructor() {
    // Register default tools
    this.registerTool({
      id: 'json-converter',
      name: 'JSON Converter',
      path: '/json-converter',
      component: JSONConverter,
      description: 'Convert JSON to string and vice versa',
      category: 'Data Processing'
    });

    this.registerTool({
      id: 'json-visualizer',
      name: 'JSON Visualizer',
      path: '/json-visualizer',
      component: JSONVisualizer,
      description: 'Visualize JSON data in a tree structure',
      category: 'Data Processing'
    });

    this.registerTool({
      id: 'csv-viewer',
      name: 'CSV Viewer',
      path: '/csv-viewer',
      component: CSVViewer,
      description: 'View CSV data in a table format',
      category: 'Data Processing'
    });

    // Future tools - placeholder for demonstration
    // These will be implemented in later tasks
    /*
    this.registerTool({
      id: 'url-encoder',
      name: 'URL Encoder/Decoder',
      path: '/url-encoder',
      component: React.lazy(() => import('../components/URLEncoder/URLEncoder')),
      description: 'Encode and decode URLs',
      category: 'Text Processing'
    });

    this.registerTool({
      id: 'base64-converter',
      name: 'Base64 Converter',
      path: '/base64-converter',
      component: React.lazy(() => import('../components/Base64Converter/Base64Converter')),
      description: 'Encode and decode Base64 strings',
      category: 'Text Processing'
    });

    this.registerTool({
      id: 'color-picker',
      name: 'Color Picker',
      path: '/color-picker',
      component: React.lazy(() => import('../components/ColorPicker/ColorPicker')),
      description: 'Pick and convert colors between formats',
      category: 'Design Tools'
    });

    this.registerTool({
      id: 'qr-generator',
      name: 'QR Code Generator',
      path: '/qr-generator',
      component: React.lazy(() => import('../components/QRGenerator/QRGenerator')),
      description: 'Generate QR codes from text',
      category: 'Utilities'
    });
    */
  }

  get tools(): Tool[] {
    return [...this._tools];
  }

  registerTool(tool: Tool): void {
    const existingIndex = this._tools.findIndex(t => t.id === tool.id);
    if (existingIndex >= 0) {
      this._tools[existingIndex] = tool;
    } else {
      this._tools.push(tool);
    }
  }

  getTool(id: string): Tool | undefined {
    return this._tools.find(tool => tool.id === id);
  }

  getAllTools(): Tool[] {
    return this.tools;
  }

  getToolsByCategory(): Record<string, Tool[]> {
    return this._tools.reduce((acc, tool) => {
      if (!acc[tool.category]) {
        acc[tool.category] = [];
      }
      acc[tool.category].push(tool);
      return acc;
    }, {} as Record<string, Tool[]>);
  }
}

// Export singleton instance
export const toolRegistry = new ToolRegistryImpl();