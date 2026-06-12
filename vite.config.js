import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  publicDir: 'public',

  build: {
    copyPublicDir: true,

    rollupOptions: {
      input: {
        main: './index.html'
      },
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          // react-dom is the heavy one (~130 KB) — keep it in a stable vendor
          // chunk so it caches across deploys instead of riding in main.
          if (id.includes('react-dom') || id.includes('/scheduler/') ||
              /[\\/]react[\\/]/.test(id)) return 'vendor-react';
          if (id.includes('react-router')) return 'vendor-router';
          if (id.includes('lucide-react')) return 'vendor-icons';
        }
      }
    }
  },

  server: {
    host: true,
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
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

  preview: {
    host: true,
    port: 4174
  }
})
