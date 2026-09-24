import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss()],
  server: {
    fs: {
      allow: ['..'],
    },
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
