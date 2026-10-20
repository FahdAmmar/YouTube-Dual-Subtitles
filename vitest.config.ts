import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import os from 'node:os'
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
    // Half the CPU count keeps jsdom workers out of each other's way. Uncapped, every
    // core spawns its own fork and each of them imports the whole app under jsdom: on a
    // 16-core machine with 16 workers the suite flaked its 5s timeouts (17 files) yet all
    // of those same tests passed in isolation, and capping to 8 turned the run both green
    // and faster (24s). On small machines at least two workers keep files in parallel
    maxWorkers: Math.max(2, Math.floor(os.cpus().length / 2)),
    // Suite cells render full YouTube mock players inside jsdom; under parallel
    // worker pressure on busy machines a few of them exceed the 5s default and
    // flake even though the same test passes in isolation (2s). 15s keeps the
    // suite green without masking real hangs
    testTimeout: 15_000,
  },
})
