# Project Structure & Architecture

## Folder Organization

```
src/
├── components/           # React components organized by feature
│   ├── [ToolName]/      # Individual tool components
│   │   ├── [ToolName].tsx
│   │   └── __tests__/   # Component-specific tests
│   ├── ErrorBoundary/   # Error handling components
│   ├── Layout/          # App layout components
│   ├── Navigation/      # Navigation components
│   ├── Sidebar/         # Sidebar components
│   ├── ui/             # shadcn/ui components
│   └── index.ts        # Component exports
├── contexts/           # React contexts
├── types/             # TypeScript type definitions
├── utils/             # Utility functions and helpers
│   ├── __tests__/     # Utility tests
│   └── index.ts       # Utility exports
├── __tests__/         # Integration and E2E tests
│   ├── integration/   # Integration tests
│   └── e2e/          # End-to-end tests
└── lib/              # Third-party library configurations
```

## Architecture Patterns

### Tool Registry System
- **Central Registry**: `src/utils/toolRegistry.ts` manages all tools
- **Dynamic Routing**: Tools are automatically registered with routes
- **Lazy Loading**: All tool components use `React.lazy()` for code splitting
- **Type Safety**: All tools implement the `Tool` interface

### Component Structure
- **Feature-based Organization**: Each tool has its own folder
- **Co-located Tests**: Tests live alongside components in `__tests__/` folders
- **Barrel Exports**: Use `index.ts` files for clean imports
- **Error Boundaries**: Each tool wrapped in `ToolErrorBoundary`

### State Management
- **Local State**: Use `useState` for component-specific state
- **Persistent State**: Use `usePersistentState` for data that should survive page reloads
- **Context**: Use React Context for app-wide state (ToolRegistry)
- **No Global State Library**: Keep it simple with React's built-in state

### Utility Organization
- **Single Responsibility**: Each utility file has one clear purpose
- **Comprehensive Testing**: All utilities have corresponding test files
- **Error Handling**: Centralized error handling in `errorHandler.ts`
- **Input Validation**: Centralized validation in `inputValidator.ts`

## File Naming Conventions

### Components
- **PascalCase**: `JSONConverter.tsx`, `ErrorBoundary.tsx`
- **Folder Structure**: `ComponentName/ComponentName.tsx`
- **Test Files**: `ComponentName.test.tsx`

### Utilities
- **camelCase**: `toolRegistry.ts`, `clipboardHelper.ts`
- **Descriptive Names**: Function clearly indicates purpose
- **Test Files**: `utilityName.test.ts`

### Types
- **Interfaces**: Use `interface` for object shapes
- **Type Aliases**: Use `type` for unions and complex types
- **Naming**: Descriptive names ending in appropriate suffix (State, Props, etc.)

## Import Conventions

### Path Aliases
- **@/**: Maps to `src/` directory
- **Absolute Imports**: Use `@/components/ui/button` instead of relative paths
- **Consistent Ordering**: External deps → Internal deps → Relative imports

### Component Imports
```typescript
// External dependencies first
import React from 'react';
import { Card, CardHeader } from '@/components/ui/card';

// Internal utilities and types
import { toolRegistry } from '@/utils/toolRegistry';
import { Tool } from '@/types';

// Relative imports last
import './Component.css';
```

## Testing Strategy

### Unit Tests
- **Component Tests**: Focus on user interactions and rendering
- **Utility Tests**: Test all functions with edge cases
- **Coverage Target**: 70% minimum across all metrics

### Integration Tests
- **Tool Switching**: Test navigation between tools
- **State Persistence**: Verify data survives page reloads
- **Error Scenarios**: Test error boundaries and recovery

### E2E Tests
- **User Workflows**: Complete user journeys through tools
- **Cross-browser**: Ensure compatibility across browsers
- **Performance**: Monitor bundle sizes and load times

## Performance Considerations

### Code Splitting
- **Tool-level Splitting**: Each tool is a separate chunk
- **Vendor Chunking**: React, UI libs, and utils in separate bundles
- **Lazy Loading**: All tools loaded on-demand

### Bundle Optimization
- **Tree Shaking**: Import only what's needed from libraries
- **Asset Optimization**: Images and static assets optimized
- **Chunk Size Monitoring**: Warnings at 1000kb threshold