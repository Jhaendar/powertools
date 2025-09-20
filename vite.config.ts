import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(async () => {
  const tailwindcss = (await import('@tailwindcss/vite')).default
  return {
    plugins: [react(), tailwindcss()],
    base: '/powertools/',
    build: {
      outDir: 'build',
      assetsDir: 'static',
      // Optimize bundle splitting for better performance
      rollupOptions: {
        output: {
          manualChunks: {
            // Vendor chunk for React and core dependencies
            vendor: ['react', 'react-dom', 'react-router-dom'],
            // UI components chunk
            ui: ['@radix-ui/react-collapsible', '@radix-ui/react-dialog', '@radix-ui/react-label', 
                 '@radix-ui/react-navigation-menu', '@radix-ui/react-select', '@radix-ui/react-separator',
                 '@radix-ui/react-slot', '@radix-ui/react-toggle', 'lucide-react'],
            // Utility libraries chunk
            utils: ['clsx', 'class-variance-authority', 'tailwind-merge', 'diff']
          }
        }
      },
      // Optimize chunk size warnings
      chunkSizeWarningLimit: 1000,
      // Enable source maps for production debugging
      sourcemap: false,
      // Minify for production using esbuild (faster than terser)
      minify: 'esbuild'
    },
    server: {
      port: 3000,
      open: true
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/setupTests.ts',
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: [
          'node_modules/',
          'src/setupTests.ts',
          '**/*.d.ts',
          '**/*.test.{ts,tsx}',
          '**/__tests__/**',
          'src/reportWebVitals.ts',
          'src/react-app-env.d.ts',
          'build/',
          'public/',
          'scripts/',
          'docs/'
        ],
        thresholds: {
          global: {
            branches: 70,
            functions: 70,
            lines: 70,
            statements: 70
          }
        }
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    // Performance optimizations
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom', 'lucide-react', 'diff']
    }
  }
})