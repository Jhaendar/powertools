# JSONTypeGenerator State Persistence

## Overview

The JSONTypeGenerator component uses the `usePersistentState` hook to automatically save and restore user data across browser sessions and page reloads.

## Persisted State

The following state is automatically persisted:

- **selectedFormat**: The currently selected output format (TypeScript, JSDoc, Python TypedDict, etc.)
- **generatedOutput**: The generated type definitions
- **error**: Any error messages from JSON parsing or type generation

## Non-Persisted State

The following state is kept local to prevent cursor jumping and improve UX:

- **jsonInput**: The JSON input text (handled separately to prevent cursor issues)
- **isCopied**: Copy success feedback state
- **isProcessing**: Processing indicator state

## Storage Strategy

1. **URL Parameters**: Primary storage for shareable state
2. **localStorage**: Backup storage for cross-session persistence
3. **Automatic Cleanup**: Empty or default values are not persisted

## Key Features

### Automatic Persistence
- State is automatically saved when changed
- No manual save/load actions required
- Debounced to prevent excessive updates

### Shareable URLs
- Generate shareable URLs with current state
- Include JSON input in shareable state
- Base64 encoded for URL safety

### State Cleanup
- "Clear All" button resets to default state
- Empty values are automatically cleaned up
- Separate "Clear Input" for just JSON input

### Error Handling
- Graceful handling of localStorage failures
- URL parsing errors don't break functionality
- State corruption recovery

## Usage Example

```typescript
// The hook automatically handles persistence
const [persistentState, setPersistentState] = usePersistentState<JSONTypeGeneratorState>(
  'json-type-generator',
  {
    selectedFormat: 'typescript',
    generatedOutput: '',
    error: null
  }
);

// Update persisted state
setPersistentState({
  selectedFormat: 'python-dataclass'
});
```

## Testing

State persistence is thoroughly tested with:

- Unit tests for state updates
- Integration tests for persistence across remounts
- Error handling tests
- Cleanup functionality tests

See `JSONTypeGenerator.statePersistence.test.tsx` for comprehensive test coverage.