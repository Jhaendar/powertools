// Core type definitions for the dev tools website

export interface Tool {
  id: string;
  name: string;
  path: string;
  component: React.LazyExoticComponent<React.ComponentType>;
  description: string;
  icon?: string;
  category: string;
}

export interface ToolRegistry {
  tools: Tool[];
  registerTool: (tool: Tool) => void;
  getTool: (id: string) => Tool | undefined;
  getAllTools: () => Tool[];
  getToolsByCategory: () => Record<string, Tool[]>;
}

// JSON Converter types
export interface JSONConverterState {
  input: string;
  output: string;
  mode: 'stringify' | 'parse';
  error: string | null;
  isValid: boolean;
}

// JSON Visualizer types
export interface JSONVisualizerState {
  input: string;
  parsedData: any;
  expandedNodes: Set<string>;
  error: string | null;
  searchTerm: string;
}

// CSV Viewer types
export interface CSVViewerState {
  rawData: string;
  parsedData: ParsedCSV;
  displayRows: number;
  currentPage: number;
  hasHeaders: boolean;
  error: string | null;
}

export interface ParsedCSV {
  headers: string[];
  rows: string[][];
  totalRows: number;
  hasHeaders: boolean;
}

export interface ParsedJSON {
  data: any;
  isValid: boolean;
  error?: string;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

// JSON Type Generator types
export interface JSONTypeGeneratorState {
  jsonInput: string;
  selectedFormat: 'typescript' | 'jsdoc' | 'python-typeddict' | 'python-dataclass' | 'pydantic-v2';
  generatedOutput: string;
  error: string | null;
}

export interface TypeGenerationOptions {
  format: JSONTypeGeneratorState['selectedFormat'];
  rootTypeName: string;
  useOptionalFields: boolean;
}

export interface JSONSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  properties?: Record<string, JSONSchema>;
  items?: JSONSchema;
  required?: string[];
  nullable?: boolean;
}

export interface GeneratedType {
  name: string;
  content: string;
  dependencies: string[];
}

// Text Diff Checker types
export interface DiffCheckerState {
  originalText: string;
  modifiedText: string;
  diffResult: DiffResult[];
  showLineNumbers: boolean;
}

export interface DiffResult {
  type: 'added' | 'removed' | 'unchanged';
  value: string;
  lineNumber?: number;
}