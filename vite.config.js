import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5174,
    proxy: {
      // ✅ ADD THIS - Proxy all /api requests to your Express backend
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      },
      // Keep your existing proxies
      '/public-testimonials': {
        target: 'https://ops.hungrytimes.in',
        changeOrigin: true,
        secure: true
      },
      '/public-feedback': {
        target: 'https://ops.hungrytimes.in',
        changeOrigin: true,
        secure: true
      }
    }
  },
  preview: {
    host: true,
    port: 4174
  }
})