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
        manualChunks: {
          // React core (~140 KB)
          'vendor-react': ['react', 'react-dom'],
          // Router (~30 KB)
          'vendor-router': ['react-router-dom'],
          // Icons (~tree-shaken per page)
          'vendor-icons': ['lucide-react'],
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
