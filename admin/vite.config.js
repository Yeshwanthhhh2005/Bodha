import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5101,
    strictPort: true,   // fail fast instead of silently picking another port
    host: true,         // bind 0.0.0.0 so phones / other devices on LAN can reach it
  },
  preview: {
    port: 5101,
    strictPort: true,
    host: true,
  },
});
