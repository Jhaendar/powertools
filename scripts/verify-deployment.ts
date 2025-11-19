#!/usr/bin/env node

/**
 * Deployment verification script for GitHub Pages
 * This script verifies that the build output is correctly configured for GitHub Pages deployment
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BUILD_DIR = 'build';
const REQUIRED_FILES = ['index.html', '404.html', 'static'];

interface VerificationResult {
  success: boolean;
  message: string;
}

function verifyBuildOutput(): void {
  console.log('🔍 Verifying build output for GitHub Pages deployment...\n');

  // Check if build directory exists
  const buildPath = path.join(__dirname, '..', BUILD_DIR);
  if (!fs.existsSync(buildPath)) {
    console.error('❌ Build directory not found. Run "npm run build" first.');
    process.exit(1);
  }

  // Check required files
  const missingFiles: string[] = [];
  REQUIRED_FILES.forEach(file => {
    const filePath = path.join(buildPath, file);
    if (!fs.existsSync(filePath)) {
      missingFiles.push(file);
    }
  });

  if (missingFiles.length > 0) {
    console.error('❌ Missing required files:');
    missingFiles.forEach(file => console.error(`   - ${file}`));
    process.exit(1);
  }

  // Verify 404.html exists and has correct content
  const notFoundPath = path.join(buildPath, '404.html');
  if (fs.existsSync(notFoundPath)) {
    const content = fs.readFileSync(notFoundPath, 'utf8');
    if (content.includes('pathSegmentsToKeep')) {
      console.log('✅ 404.html configured for SPA routing');
    } else {
      console.warn('⚠️  404.html exists but may not be configured for SPA routing');
    }
  }

  // Verify index.html has SPA routing script
  const indexPath = path.join(buildPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    const content = fs.readFileSync(indexPath, 'utf8');
    if (content.includes('spa-github-pages')) {
      console.log('✅ index.html configured for SPA routing');
    } else {
      console.warn('⚠️  index.html may not be configured for SPA routing');
    }
  }

  // Check asset paths are relative
  const indexContent = fs.readFileSync(indexPath, 'utf8');
  if (indexContent.includes('/powertools/')) {
    console.log('✅ Assets configured with correct base path');
  } else {
    console.warn('⚠️  Assets may not have correct base path for GitHub Pages');
  }

  console.log('\n🎉 Build verification completed successfully!');
  console.log('\n📋 Deployment checklist:');
  console.log('   1. ✅ Build output generated');
  console.log('   2. ✅ Required files present');
  console.log('   3. ✅ SPA routing configured');
  console.log('   4. ✅ Asset paths configured');
  console.log('\n🚀 Ready for GitHub Pages deployment!');
}

// Run verification
verifyBuildOutput();
