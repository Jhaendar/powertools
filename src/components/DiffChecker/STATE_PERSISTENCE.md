# DiffChecker State Persistence

## Overview

The DiffChecker component uses the `usePersistentState` hook to automatically save and restore user data across browser sessions and page reloads.

## Persisted State

The following state is automatically persisted:

- **originalText**: The original text input
- **modifiedText**: The modified text input  
- **showLineNumbers**: Whether line numbers are displayed in diff output

## Non-Persisted State

The following state is kept local for performance and UX:

- **diffResult**: The computed diff results (recalculated on load)
- **isProcessing**: Processing indicator state
- **error**: Error messages (cleared on reload)
- **copySuccess**: Copy success feedback state

## Storage Strategy

1. **URL Parameters**: Primary storage for shareable state
2. **localStorage**: Backup storage for cross-session persistence
3. **Automatic Cleanup**: Empty values are not persisted

## Key Features

### Automatic Persistence
- Text inputs are automatically saved as user types
- Settings like line number display are preserved
- Debounced to prevent excessive updates

### Shareable URLs
- Generate shareable URLs with current text content
- Include all settings in shareable state
- Base64 encoded for URL safety

### State Cleanup
- "Clear All" button removes all text and resets settings
- Empty text inputs don't create unnecessary storage
- Automatic cleanup of old state

### Performance Optimization
- Diff results are not persisted (recalculated on load)
- Large text inputs are handled efficiently
- Debounced processing prevents UI freezing

### Error Handling
- Graceful handling of localStorage failures
- URL parsing errors don't break functionality
- State corruption recovery

## Usage Example

```typescript
// The hook automatically handles persistence
const [persistentState, setPersistentState] = usePersistentState<DiffCheckerPersistentState>(
  'diff-checker',
  {
    originalText: '',
    modifiedText: '',
    showLineNumbers: true
  }
);

// Update persisted state
setPersistentState({
  originalText: 'new original text'
});
```

## State Restoration

When the component loads:

1. Persistent state is restored from URL or localStorage
2. Text inputs are populated with saved content
3. Diff processing automatically runs if text is present
4. Settings like line numbers are applied

## Testing

State persistence is thoroughly tested with:

- Unit tests for state updates
- Integration tests for persistence across remounts
- Text input restoration tests
- Settings persistence tests
- Cleanup functionality tests

See `DiffChecker.statePersistence.test.tsx` for comprehensive test coverage.