# Deployment Guide

This document provides instructions for deploying the Dev Tools Website to GitHub Pages.

## Prerequisites

1. GitHub repository with GitHub Pages enabled
2. Node.js 18+ installed locally
3. npm or yarn package manager

## Automated Deployment (Recommended)

The project is configured with GitHub Actions for automatic deployment:

### Setup

1. **Enable GitHub Pages in your repository:**
   - Go to Settings > Pages
   - Select "GitHub Actions" as the source
   - The workflow will automatically deploy on pushes to the `release` branch

2. **Update the base URL in `vite.config.ts`:**
   ```typescript
   base: '/your-repository-name/',
   ```

3. **Update the homepage in `package.json`:**
   ```json
   "homepage": "https://yourusername.github.io/your-repository-name"
   ```

### Workflow Features

- ✅ Automatic deployment on push to release branch
- ✅ Runs tests before deployment
- ✅ Optimized build process
- ✅ Proper permissions for GitHub Pages
- ✅ Concurrent deployment protection

### Release Process

The project uses a two-branch deployment strategy:

- **`main` branch**: Development branch for ongoing work
- **`release` branch**: Production branch that triggers deployments

**To deploy your changes:**

1. **Develop on main branch:**
   ```bash
   git checkout main
   # Make your changes
   git add .
   git commit -m "Your changes"
   git push origin main
   ```

2. **Deploy to production:**
   ```bash
   # Merge main into release to trigger deployment
   git checkout release
   git merge main
   git push origin release
   ```

3. **Alternative: Direct push to release:**
   ```bash
   # If you want to deploy specific changes directly
   git checkout release
   # Make your changes or cherry-pick commits
   git push origin release
   ```

The GitHub Actions workflow will automatically build and deploy when changes are pushed to the `release` branch.

## Manual Deployment

For manual deployment using gh-pages:

```bash
# Build and deploy
npm run deploy

# Or step by step
npm run build
npm run verify:deployment
npx gh-pages -d build
```

## Deployment Verification

Run the verification script to ensure your build is ready for deployment:

```bash
npm run verify:deployment
```

This script checks:
- ✅ Build output exists
- ✅ Required files are present
- ✅ SPA routing is configured
- ✅ Asset paths are correct

## Local Testing

Test the production build locally:

```bash
# Build the project
npm run build

# Preview the production build
npm run preview

# Test deployment configuration
npm run deploy:test
```

## Troubleshooting

### Common Issues

1. **404 errors on direct URL access:**
   - Ensure `404.html` exists in the build output
   - Verify the SPA routing script is included

2. **Assets not loading:**
   - Check the `base` configuration in `vite.config.ts`
   - Ensure the homepage URL in `package.json` is correct

3. **Routing not working:**
   - Verify HashRouter is used instead of BrowserRouter
   - Check that the GitHub Pages SPA routing scripts are included

### Debug Steps

1. **Check build output:**
   ```bash
   npm run build
   ls -la build/
   ```

2. **Verify configuration:**
   ```bash
   npm run verify:deployment
   ```

3. **Test locally:**
   ```bash
   npm run preview
   ```

## Configuration Files

### GitHub Actions Workflow (`.github/workflows/deploy.yml`)
- Automated deployment configuration
- Test execution before deployment
- Proper GitHub Pages permissions

### Vite Configuration (`vite.config.ts`)
- Base path for GitHub Pages
- Build optimization settings
- Asset bundling configuration

### Package.json Scripts
- `build`: Production build
- `deploy`: Manual deployment
- `verify:deployment`: Build verification
- `preview`: Local production preview

### SPA Routing Files
- `public/404.html`: GitHub Pages SPA routing fallback
- `index.html`: Main entry point with routing script

## Performance Optimization

The build is optimized for GitHub Pages with:

- ✅ Code splitting for better caching
- ✅ Asset optimization and minification
- ✅ Lazy loading for tool components
- ✅ Optimized bundle sizes
- ✅ Source map generation (disabled in production)

## Security

- ✅ Dependencies are regularly audited
- ✅ GitHub Actions uses pinned versions
- ✅ Minimal permissions for deployment
- ✅ No sensitive data in build output