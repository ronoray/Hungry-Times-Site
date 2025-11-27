import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        // optional: clearer errors if backend is down
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.error('[VITE PROXY ERROR] /api → http://localhost:5000', err?.code || err?.message)
          })
        },
      },
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

  // prebundle heroicons to avoid deps warnings
  optimizeDeps: {
    include: ['@heroicons/react/24/outline'],
  },

  preview: {
    host: true,
    port: 4174
  }
})
