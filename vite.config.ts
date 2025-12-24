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
    assetsDir: 'assets'
  }
})