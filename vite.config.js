import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,   // allow LAN access
    port: 5174    // run dev server on port 5174
  },
  preview: {
    host: true,
    port: 4174    // preview build on 4174
  }
})
