import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/** Reads a file from the project root (tests run from there) */
const read = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), 'utf8')

interface VercelConfig {
  headers: { source: string; headers: { key: string; value: string }[] }[]
}

function vercelHeaders(): Map<string, Map<string, string>> {
  const config = JSON.parse(read('vercel.json')) as VercelConfig
  return new Map(
    config.headers.map((rule) => [rule.source, new Map(rule.headers.map((h) => [h.key.toLowerCase(), h.value]))]),
  )
}

describe('security headers', () => {
  const vercel = vercelHeaders().get('/(.*)')!

  it.each([
    ['x-content-type-options', 'nosniff'],
    ['x-frame-options', 'DENY'],
    ['content-security-policy', "frame-ancestors 'none'"],
  ])('sets %s on every response', (name, expected) => {
    expect(vercel.get(name)).toBe(expected)
  })

  it('keeps the Referrer-Policy YouTube embeds need: with no referrer they refuse to play (error 153)', () => {
    expect(vercel.get('referrer-policy')).toBe('strict-origin-when-cross-origin')
  })

  it('does not restrict the browser features embedded players rely on', () => {
    const policy = vercel.get('permissions-policy') ?? ''
    expect(policy).not.toMatch(/fullscreen|autoplay|picture-in-picture|encrypted-media/)
  })
})

describe('caching rules', () => {
  const vercel = vercelHeaders()

  it('never caches the files that decide whether the app updates', () => {
    const rule = [...vercel].find(([source]) => source.includes('sw.js'))
    expect(rule?.[1].get('cache-control')).toBe('no-cache')
    for (const file of ['sw.js', 'registerSW.js', 'manifest.webmanifest', 'index.html']) {
      expect(rule?.[0]).toContain(file)
    }
  })

  it('caches the hashed build output for a year', () => {
    expect(vercel.get('/assets/(.*)')?.get('cache-control')).toBe('public, max-age=31536000, immutable')
  })

  it('caches the fonts for 30 days', () => {
    expect(vercel.get('/fonts/(.*)')?.get('cache-control')).toBe('public, max-age=2592000')
  })
})

describe('deployment files', () => {
  it('pins the same Node major in every place that chooses one', () => {
    const nvmrc = read('.nvmrc').trim()
    expect(nvmrc).toMatch(/^\d+$/)
    expect(read('.github/workflows/ci.yml')).toContain(`node-version: ${nvmrc}`)
  })

  it('pins package.json engines to the same Node major, so Vercel builds with it instead of the newest release', () => {
    const nvmrc = read('.nvmrc').trim()
    const engines = (JSON.parse(read('package.json')) as { engines: { node: string } }).engines
    // "22.x" or a floor inside the same major such as "^22.13.0" (Vite 7, ESLint 10 and Tailwind 4 need 22.13): never another major
    expect(engines.node).toMatch(new RegExp(`^\\^?${nvmrc}\\.(x|\\d+\\.\\d+)$`))
  })

  it('tells Vercel exactly how to install and build, and where the output is', () => {
    const config = JSON.parse(read('vercel.json')) as Record<string, string>
    expect(config.installCommand).toBe('npm ci')
    expect(config.buildCommand).toBe('npm run build')
    expect(config.outputDirectory).toBe('dist')
  })

  it('lets crawlers in', () => {
    expect(read('public/robots.txt')).toMatch(/User-agent: \*\s+Allow: \//)
  })
})
