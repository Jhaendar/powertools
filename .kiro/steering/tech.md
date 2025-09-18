# Technology Stack

## Build System & Framework
- **Vite**: Modern build tool with fast HMR and optimized production builds
- **React 19**: Latest React with concurrent features
- **TypeScript**: Full type safety across the codebase
- **React Router DOM**: Hash-based routing for GitHub Pages compatibility

## UI & Styling
- **Tailwind CSS 4**: Utility-first CSS framework with Vite plugin
- **shadcn/ui**: High-quality React components built on Radix UI
- **Radix UI**: Accessible, unstyled UI primitives
- **Lucide React**: Modern icon library
- **Class Variance Authority**: Type-safe component variants

## Testing & Quality
- **Vitest**: Fast unit testing with Vite integration
- **Testing Library**: React testing utilities with user-centric approach
- **@vitest/coverage-v8**: Code coverage reporting
- **jsdom**: DOM environment for testing

## Development Tools
- **ESLint**: Code linting (inherited from CRA)
- **TypeScript**: Static type checking
- **GitHub Actions**: CI/CD pipeline
- **gh-pages**: Deployment to GitHub Pages

## Common Commands

### Development
```bash
npm run dev          # Start development server (port 3000)
npm start           # Alternative dev server command
```

### Building
```bash
npm run build       # Production build (outputs to /build)
npm run preview     # Preview production build locally
```

### Testing
```bash
npm test            # Run tests in watch mode
npm run test:ci     # Run tests once (CI mode)
npm run test:coverage    # Run tests with coverage report
npm run test:comprehensive  # Run full test suite including E2E
```

### Deployment
```bash
npm run deploy      # Manual deployment to GitHub Pages
npm run deploy:test # Test deployment locally
npm run verify:deployment  # Verify build is ready for deployment
```

## Build Configuration
- **Base Path**: `/powertools/` for GitHub Pages
- **Output Directory**: `build/` (not `dist/`)
- **Code Splitting**: Vendor, UI, and utils chunks for optimal caching
- **Bundle Analysis**: Chunk size warnings at 1000kb
- **Source Maps**: Disabled in production for performance