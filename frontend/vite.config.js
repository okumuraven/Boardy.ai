import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Vite always allows bare IPs by default (why plain-IP phone testing
    // already worked) but blocks named hosts not on this list - needed
    // once phone testing moves to the Tailscale Serve hostname so Google
    // OAuth can accept a real, public-TLD origin instead of a raw IP.
    allowedHosts: ['parrot.tail780ac1.ts.net'],
    proxy: {
      '/webhook-test': {
        target: 'http://localhost:5678',
        changeOrigin: true,
      }
    }
  }
})
