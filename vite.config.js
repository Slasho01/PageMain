import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    build: {
      rollupOptions: {
        output: {
          // React y el router cambian poco: van en su propio archivo (mejor caché entre despliegues)
          manualChunks: { vendor: ['react', 'react-dom', 'react-dom/client', 'react-router-dom', 'react/jsx-runtime'] },
        },
      },
    },
    server: {
      port: 5173,
      // En desarrollo las llamadas a /api se reenvían a la API de Rust (sin problemas de CORS)
      proxy: {
        '/api': { target: env.API_TARGET || 'http://127.0.0.1:8080', changeOrigin: true },
        '/uploads': { target: env.API_TARGET || 'http://127.0.0.1:8080', changeOrigin: true },
      },
    },
  }
})
