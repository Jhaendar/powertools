// Utility functions for the dev tools website

// Export all utility implementations
export { clipboardHelper } from './clipboardHelper';
export { fileParser } from './fileParser';
export { errorHandler } from './errorHandler';
export { inputValidator, commonValidationRules } from './inputValidator';
export { 
  useURLState, 
  useURLParam, 
  usePersistentState, 
  localStorageState, 
  generateShareableURL, 
  parseSharedURL 
} from './statePersistence';
export { performanceMonitor, usePerformanceMonitor } from './performanceMonitor';
export { virtualizationManager, useVirtualization } from './virtualization';

// Export new utilities for JSON type generation and text diff processing
export {
  analyzeJSONStructure,
  generateTypeScriptInterface,
  generateJSDocTypes,
  generatePythonTypedDict,
  generatePythonDataclass,
  generatePydanticModel,
  parseJSONSafely
} from './jsonTypeGenerator';

export {
  processTextDiff,
  formatDiffOutput,
  getDiffStats,
  areTextsIdentical,
  debounce,
  validateTextInput,
  optimizeTextForDiff
} from './textDiffProcessor';

// Export types for external use
export type { ClipboardHelper } from './clipboardHelper';
export type { FileParser } from './fileParser';
export type { ErrorHandler, ErrorInfo } from './errorHandler';
export type { InputValidator, ValidationRule, ValidationResult } from './inputValidator';
export type { PerformanceMetrics, PerformanceThresholds } from './performanceMonitor';
export type { VirtualizationConfig, VirtualizedRange, ChunkedProcessingConfig } from './virtualization';