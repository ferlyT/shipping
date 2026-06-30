import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: '/shipping/',  // PENTING: sesuai dengan production URL
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/shipping/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
