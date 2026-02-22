import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/FlagTime/',
  plugins: [react()],
  server: {
    proxy: {
      '/api/ctftime': {
        target: 'https://ctftime.org/api/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ctftime/, ''),
        headers: {
          'User-Agent': 'FlagTime/1.0',
        },
      },
    },
  },
})
