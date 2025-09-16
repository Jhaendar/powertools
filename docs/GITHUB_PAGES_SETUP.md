# GitHub Pages Setup Guide

This guide walks you through setting up GitHub Pages deployment for the Dev Tools Website.

## Quick Setup

1. **Enable GitHub Pages in your repository:**
   - Go to Settings > Pages
   - Select "GitHub Actions" as the source
   - The workflow will automatically deploy on pushes to the `main` branch

2. **Update configuration for your repository:**
   
   In `vite.config.ts`:
   ```typescript
   base: '/your-repository-name/',
   ```
   
   In `package.json`:
   ```json
   "homepage": "https://yourusername.github.io/your-repository-name"
   ```

## What's Already Configured

### ✅ GitHub Actions Workflow
- **File**: `.github/workflows/deploy.yml`
- **Features**:
  - Automatic deployment on push to main
  - Node.js 18 environment
  - Dependency caching for faster builds
  - Test execution (with graceful failure handling)
  - Optimized build process
  - Proper GitHub Pages permissions

### ✅ SPA Routing Support
- **404.html**: Handles client-side routing for direct URL access
- **index.html**: Includes SPA routing script for proper navigation
- **HashRouter**: Configured in React Router for GitHub Pages compatibility

### ✅ Build Optimization
- **Vite Configuration**: Optimized for GitHub Pages with proper base path
- **Code Splitting**: Vendor, UI, and utility chunks for better caching
- **Asset Optimization**: Minification and compression enabled
- **Bundle Analysis**: Configured chunk size warnings and optimization

### ✅ Deployment Scripts
- `npm run build`: Production build
- `npm run deploy`: Manual deployment via gh-pages
- `npm run verify:deployment`: Build verification script
- `npm run preview`: Local production preview

## Verification

Run the verification script to ensure everything is configured correctly:

```bash
npm run verify:deployment
```

This checks:
- ✅ Build output exists
- ✅ Required files are present (index.html, 404.html, static assets)
- ✅ SPA routing scripts are included
- ✅ Asset paths are configured for GitHub Pages

## Testing Deployment

### Local Testing
```bash
# Build and preview locally
npm run build
npm run preview
```

### Manual Deployment
```bash
# Deploy manually using gh-pages
npm run deploy
```

### Automatic Deployment
- Push to `main` branch
- GitHub Actions will automatically build and deploy
- Check the Actions tab for deployment status

## Troubleshooting

### Common Issues

1. **404 on direct URL access**
   - ✅ Already fixed: 404.html is configured
   - ✅ Already fixed: SPA routing scripts are included

2. **Assets not loading**
   - ✅ Already fixed: Base path configured in vite.config.ts
   - ✅ Already fixed: Homepage URL in package.json

3. **Routing not working**
   - ✅ Already fixed: HashRouter is used
   - ✅ Already fixed: GitHub Pages SPA routing scripts

### Debug Commands

```bash
# Check build output
npm run build && ls -la build/

# Verify deployment configuration
npm run verify:deployment

# Test production build locally
npm run preview
```

## Security & Performance

### ✅ Security Features
- Pinned GitHub Actions versions
- Minimal deployment permissions
- No sensitive data in build output
- Regular dependency audits

### ✅ Performance Optimizations
- Code splitting for better caching
- Asset optimization and minification
- Lazy loading for tool components
- Optimized bundle sizes
- Source maps disabled in production

## Repository Structure

```
.github/
  workflows/
    deploy.yml          # GitHub Actions deployment workflow
public/
  404.html             # SPA routing fallback
scripts/
  verify-deployment.js # Build verification script
docs/
  GITHUB_PAGES_SETUP.md # This guide
DEPLOYMENT.md          # Detailed deployment documentation
```

## Next Steps

1. Update the repository name in configuration files
2. Push to main branch to trigger first deployment
3. Verify the site works at `https://yourusername.github.io/your-repository-name`
4. Test all tool functionality and routing

The deployment is now fully configured and ready to use! 🚀