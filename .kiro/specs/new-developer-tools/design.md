# Design Document

## Overview

This design outlines the implementation of two new developer tools for the existing dev tools website: a JSON Structure/Type Generator and a Text Diff Checker. Both tools will integrate seamlessly with the existing tool registry system, follow established patterns for state management and error handling, and provide responsive, user-friendly interfaces.

The JSON Structure/Type Generator will analyze JSON input and generate type definitions in multiple formats (TypeScript, JSDoc, Python TypedDict, Python Dataclass, and Pydantic v2). The Text Diff Checker will compare two text inputs and display differences in a GitHub-style diff format using the proven Myers diff algorithm.

## Architecture

### Tool Registry Integration

Both tools will integrate with the existing tool registry system:

```typescript
// Tool registration entries
{
  id: 'json-type-generator',
  name: 'JSON Type Generator',
  description: 'Generate type definitions from JSON data',
  icon: 'Code2',
  component: lazy(() => import('@/components/JSONTypeGenerator/JSONTypeGenerator'))
},
{
  id: 'diff-checker',
  name: 'Diff Checker', 
  description: 'Compare text differences with GitHub-style output',
  icon: 'GitCompare',
  component: lazy(() => import('@/components/DiffChecker/DiffChecker'))
}
```

### Component Structure

Following the established pattern, each tool will have:
- Main component file (`ToolName.tsx`)
- Test file (`__tests__/ToolName.test.tsx`)
- Integration with existing error boundaries
- State persistence using `usePersistentState`

### Dependencies

New dependencies to add:
- `diff` (^5.1.0): For text comparison using Myers algorithm
- No additional dependencies needed for JSON type generation (will use built-in JSON parsing)

## Components and Interfaces

### JSONTypeGenerator Component

```typescript
interface JSONTypeGeneratorState {
  jsonInput: string;
  selectedFormat: 'typescript' | 'jsdoc' | 'python-typeddict' | 'python-dataclass' | 'pydantic-v2';
  generatedOutput: string;
  error: string | null;
}

interface TypeGenerationOptions {
  format: JSONTypeGeneratorState['selectedFormat'];
  rootTypeName: string;
  useOptionalFields: boolean;
}
```

**Key Features:**
- Real-time JSON parsing and validation
- Format selector with 5 options
- Syntax highlighting for generated output
- Copy-to-clipboard functionality
- Error handling for invalid JSON

**Layout:**
- Top: Format selector (radio buttons or dropdown)
- Left panel: JSON input textarea with syntax highlighting
- Right panel: Generated output with syntax highlighting
- Bottom: Copy button and error display

### DiffChecker Component

```typescript
interface DiffCheckerState {
  originalText: string;
  modifiedText: string;
  diffResult: DiffResult[];
  showLineNumbers: boolean;
}

interface DiffResult {
  type: 'added' | 'removed' | 'unchanged';
  value: string;
  lineNumber?: number;
}
```

**Key Features:**
- Side-by-side text input areas
- Real-time diff generation
- GitHub-style diff output with colors
- Line number display
- Copy diff result functionality

**Layout:**
- Top: Two side-by-side textareas (Original | Modified)
- Bottom: Diff output with GitHub-style formatting
- Controls: Toggle line numbers, copy diff button

## Data Models

### JSON Type Generation Models

```typescript
interface JSONSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  properties?: Record<string, JSONSchema>;
  items?: JSONSchema;
  required?: string[];
  nullable?: boolean;
}

interface GeneratedType {
  name: string;
  content: string;
  dependencies: string[];
}
```

### Type Generation Strategies

**TypeScript Generation:**
```typescript
interface User {
  id: number;
  name: string;
  email: string | null;
  tags: string[];
  profile: UserProfile;
}
```

**JSDoc Generation:**
```javascript
/**
 * @typedef {Object} User
 * @property {number} id
 * @property {string} name  
 * @property {string|null} email
 * @property {string[]} tags
 * @property {UserProfile} profile
 */
```

**Python TypedDict Generation:**
```python
from typing import TypedDict

class UserProfile(TypedDict):
    bio: str
    avatar_url: str | None

class User(TypedDict):
    id: int
    name: str
    email: str | None
    tags: list[str]
    profile: UserProfile
```

**Python Dataclass Generation:**
```python
from dataclasses import dataclass

@dataclass
class UserProfile:
    bio: str
    avatar_url: str | None = None

@dataclass  
class User:
    id: int
    name: str
    email: str | None = None
    tags: list[str] = field(default_factory=list)
    profile: UserProfile = None
```

**Pydantic v2 Generation:**
```python
from pydantic import BaseModel, Field

class UserProfile(BaseModel):
    bio: str
    avatar_url: str | None = None

class User(BaseModel):
    id: int
    name: str
    email: str | None = None
    tags: list[str] = Field(default_factory=list)
    profile: UserProfile | None = None
```

## Error Handling

### JSON Type Generator Error Handling

1. **Invalid JSON Input:**
   - Display clear error message with line/column information
   - Highlight problematic area if possible
   - Graceful degradation - don't crash the interface

2. **Complex JSON Structures:**
   - Handle circular references by detecting and breaking cycles
   - Limit nesting depth to prevent performance issues
   - Provide warnings for very large objects

3. **Type Inference Edge Cases:**
   - Mixed array types (infer union types)
   - Empty arrays (default to `unknown[]` or `list[Any]`)
   - Very large numbers (handle BigInt appropriately)

### Diff Checker Error Handling

1. **Large Text Inputs:**
   - Implement debouncing for real-time updates
   - Show loading indicator for large diffs
   - Limit input size to prevent browser freezing

2. **Memory Management:**
   - Clean up diff results when component unmounts
   - Optimize diff algorithm for large texts
   - Provide fallback for extremely large comparisons

## Testing Strategy

### Unit Tests

**JSONTypeGenerator Tests:**
```typescript
describe('JSONTypeGenerator', () => {
  test('generates TypeScript interfaces from valid JSON')
  test('handles invalid JSON gracefully')
  test('generates correct Python TypedDict structures')
  test('handles nested objects and arrays')
  test('generates union types for null values')
  test('persists state across page reloads')
  test('copies generated output to clipboard')
})
```

**DiffChecker Tests:**
```typescript
describe('DiffChecker', () => {
  test('generates correct diff for text changes')
  test('handles identical texts')
  test('displays line numbers correctly')
  test('handles large text inputs efficiently')
  test('copies diff output to clipboard')
  test('persists input state across page reloads')
})
```

### Integration Tests

1. **Tool Navigation:** Test routing between tools
2. **State Persistence:** Verify data survives page refresh
3. **Error Boundaries:** Test error recovery
4. **Performance:** Monitor bundle size impact

### Type Generation Test Cases

Test with various JSON structures:
- Simple objects with primitive types
- Nested objects and arrays
- Mixed-type arrays
- Objects with null values
- Empty objects and arrays
- Large, complex JSON structures

## Performance Considerations

### JSON Type Generator Optimizations

1. **Debounced Processing:** Debounce JSON parsing and type generation (300ms delay)
2. **Memoization:** Cache generated types for identical JSON inputs
3. **Worker Threads:** Consider web workers for very large JSON processing
4. **Lazy Loading:** Load syntax highlighting libraries on demand

### Diff Checker Optimizations

1. **Efficient Diff Algorithm:** Use the proven Myers algorithm via `diff` library
2. **Virtualization:** For very large diffs, implement virtual scrolling
3. **Debounced Updates:** Debounce diff generation during typing
4. **Memory Management:** Clean up large diff results appropriately

### Bundle Size Impact

- `diff` library: ~15KB gzipped
- Both tools will be lazy-loaded to minimize initial bundle size
- Syntax highlighting libraries loaded on demand
- Estimated total impact: ~25KB gzipped per tool

## Accessibility Considerations

1. **Keyboard Navigation:** Full keyboard support for all interactions
2. **Screen Reader Support:** Proper ARIA labels and descriptions
3. **Color Contrast:** Ensure diff colors meet WCAG guidelines
4. **Focus Management:** Clear focus indicators and logical tab order
5. **Error Announcements:** Screen reader announcements for errors

## Mobile Responsiveness

1. **Responsive Layout:** Stack panels vertically on mobile
2. **Touch-Friendly:** Adequate touch targets (44px minimum)
3. **Optimized Inputs:** Appropriate keyboard types for mobile
4. **Performance:** Optimize for mobile performance constraints