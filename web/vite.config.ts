import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'global': 'globalThis',
  },
  resolve: {
    alias: {
      'buffer': 'buffer',
    },
  },
  optimizeDeps: {
    include: ['buffer'],
  },
  server: {
    host: true,          // tương đương 0.0.0.0, cho truy cập từ ngoài
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
