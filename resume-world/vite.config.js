import { defineConfig } from 'vite'

export default defineConfig({
  // Inline (empty) PostCSS config so Vite does NOT walk up to the parent
  // Next.js portfolio's postcss.config.mjs (Tailwind), whose plugins aren't
  // installed in this subfolder. Résumé World uses plain CSS only.
  css: { postcss: {} },
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
