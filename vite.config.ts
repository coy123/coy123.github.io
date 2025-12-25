import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const deferStylesPlugin = (): Plugin => ({
  name: 'defer-stylesheets',
  apply: 'build',
  transformIndexHtml(html) {
    return html.replace(
      /<link\s+rel="stylesheet"\s+href="([^"]+)"\s*\/?>/g,
      (_, href: string) =>
        `<link rel="preload" href="${href}" as="style" onload="this.onload=null;this.rel='stylesheet'"><noscript><link rel="stylesheet" href="${href}"></noscript>`
    )
  }
})

export default defineConfig({
  plugins: [react(), deferStylesPlugin()],
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Optimize chunk size and splitting
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunks for better caching
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'leaflet-vendor': ['leaflet']
        }
      }
    },
    // Chunk size warnings
    chunkSizeWarningLimit: 1000,
    // Minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console logs in production
        drop_debugger: true
      }
    },
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Source maps for production debugging (optional, disable for smaller builds)
    sourcemap: false
  },
  // Server configuration for development
  server: {
    // Enable compression in dev mode
    headers: {
      'Cache-Control': 'public, max-age=31536000'
    }
  }
})