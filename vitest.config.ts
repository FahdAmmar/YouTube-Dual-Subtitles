import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// Node 25 and newer expose their own `localStorage` on the global object (the Web Storage API is on by default).
// Without a --localstorage-file it is a stub that returns undefined and takes the place of jsdom's real storage,
// so every test that touches localStorage fails with "Cannot read properties of undefined". Turning the Node
// feature off lets jsdom provide it, exactly as on Node 22 and 24. The flag is only passed where it is needed,
// because older Node versions reject options they do not know.
const nodeMajor = Number(process.versions.node.split('.')[0])
const workerArgs = nodeMajor >= 25 ? ['--no-experimental-webstorage'] : []

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    execArgv: workerArgs,
  },
})
