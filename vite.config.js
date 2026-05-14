import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Production builds (e.g. GitHub Pages) serve from /drivemind-web/.
// Local dev still serves from /.
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/drivemind-web/' : '/',
  server: {
    host: '127.0.0.1',
    port: 5173,
    open: false,
  },
}));
