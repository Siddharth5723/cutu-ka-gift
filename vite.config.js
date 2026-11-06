import { defineConfig } from 'vite'

export default defineConfig({
  base: '/cutu-ka-gift/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          gsap: ['gsap'],
          marked: ['marked']
        }
      }
    }
  },
  server: {
    port: 3000,
    open: true
  }
})