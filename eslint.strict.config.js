import reactHooks from 'eslint-plugin-react-hooks'
import base from './eslint.config.js'

// The stricter react-hooks rules (the React Compiler readiness set) on top of the normal config.
// They are NOT part of `npm run lint`: some of the existing code predates them and fixing it all at once would touch
// the timing-sensitive player hooks. `npm run lint:strict` keeps the count from growing instead (see
// scripts/check-strict-lint.mjs and scripts/strict-lint-baseline.json).
export default [
  ...base,
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/**/*.test.*', 'src/__tests__/**'],
    rules: { ...reactHooks.configs['recommended-latest'].rules },
  },
]
