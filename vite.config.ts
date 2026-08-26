import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/awakemedia-site/',
  plugins: [react()],
  server: {
    port: 5199,
    strictPort: true,
  },
})
