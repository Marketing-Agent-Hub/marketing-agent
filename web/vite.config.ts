import path from 'path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    headers: {
      // Allow popup window communication for Google OAuth
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
    proxy: {
      // All product API calls: /api/* → http://localhost:3001/*
      // (strips /api prefix, backend routes start at /)
      '/api/internal': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/internal/, '/internal'),
      },
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
