import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    target: 'esnext',
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three']
        }
      }
    }
  },
  assetsInclude: ['**/*.glb']
})
