import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'

// Versión de la app (package.json) disponible en el front como import.meta.env.VITE_APP_VERSION
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(version),
  },
  server: {
    port: 5175,
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

