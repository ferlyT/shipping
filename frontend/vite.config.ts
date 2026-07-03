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
    },
  },
})
