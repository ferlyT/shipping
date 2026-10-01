import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: '/mshipping/',  // PENTING: sesuai dengan production URL
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/mshipping/api': {
        target: 'http://localhost:3010',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://localhost:3010',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3010',
        changeOrigin: true,
      },
      '/mshipping/uploads': {
        target: 'http://localhost:3010',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/mshipping/, ''),
      },
      '/avatars': {
        target: 'http://localhost:3010',
        changeOrigin: true,
      },
      '/mshipping/avatars': {
        target: 'http://localhost:3010',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/mshipping/, ''),
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom') || id.includes('react-router-dom') || id.includes('zustand') || id.includes('/react/')) {
              return 'vendor-react'
            }
            if (id.includes('@tanstack') || id.includes('axios')) {
              return 'vendor-query'
            }
            if (id.includes('recharts') || id.includes('d3-')) {
              return 'vendor-charts'
            }
            if (id.includes('xlsx')) {
              return 'vendor-excel'
            }
            if (id.includes('jspdf') || id.includes('html2canvas')) {
              return 'vendor-pdf'
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons'
            }
          }
        },
      },
    },
  },
})

