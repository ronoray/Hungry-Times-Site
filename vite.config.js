import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5174,
    proxy: {
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
    port: 4174    // preview build on 4174
  }
})
