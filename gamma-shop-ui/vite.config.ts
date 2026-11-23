import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // lightningcss (Vite's default minifier) rejects an invalid `var(#acabeb)`
    // rule shipped in @coreui/coreui-pro@5.2.1's CSS; esbuild tolerates it.
    cssMinify: 'esbuild',
  },
})
