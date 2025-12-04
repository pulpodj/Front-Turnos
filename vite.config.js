import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/API': {
        target: 'https://backend-turnos-7n89.onrender.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})

