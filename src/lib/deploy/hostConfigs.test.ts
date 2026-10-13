import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/** Reads a file from the project root (tests run from there) */
const read = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), 'utf8')

/** Netlify / Cloudflare Pages `_headers`: a path line followed by indented "Name: value" lines */
function parseHeadersFile(content: string): Map<string, Map<string, string>> {
  const result = new Map<string, Map<string, string>>()
  let current: Map<string, string> | null = null
  for (const line of content.split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue
    if (!/^\s/.test(line)) {
      current = new Map()
      result.set(line.trim(), current)
    } else if (current) {
      const separator = line.indexOf(':')
      current.set(line.slice(0, separator).trim().toLowerCase(), line.slice(separator + 1).trim())
    }
  }
  return result
}

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
  const netlify = parseHeadersFile(read('public/_headers')).get('/*')!
  const vercel = vercelHeaders().get('/(.*)')!

  it.each([
    ['x-content-type-options', 'nosniff'],
    ['x-frame-options', 'DENY'],
    ['content-security-policy', "frame-ancestors 'none'"],
  ])('sets %s the same way on every host', (name, expected) => {
    expect(netlify.get(name)).toBe(expected)
    expect(vercel.get(name)).toBe(expected)
  })

  it('keeps the Referrer-Policy YouTube embeds need: with no referrer they refuse to play (error 153)', () => {
    for (const headers of [netlify, vercel]) {
      expect(headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin')
    }
  })

  it('does not restrict the browser features embedded players rely on', () => {
    for (const headers of [netlify, vercel]) {
      const policy = headers.get('permissions-policy') ?? ''
      expect(policy).not.toMatch(/fullscreen|autoplay|picture-in-picture|encrypted-media/)
    }
  })
})

describe('caching rules', () => {
  const netlify = parseHeadersFile(read('public/_headers'))
  const vercel = vercelHeaders()

  it('never caches the files that decide whether the app updates', () => {
    for (const file of ['/sw.js', '/registerSW.js', '/manifest.webmanifest', '/index.html']) {
      expect(netlify.get(file)?.get('cache-control')).toBe('no-cache')
    }
    const vercelRule = [...vercel].find(([source]) => source.includes('sw.js'))
    expect(vercelRule?.[1].get('cache-control')).toBe('no-cache')
  })

  it('caches the hashed build output for a year', () => {
    expect(netlify.get('/assets/*')?.get('cache-control')).toBe('public, max-age=31536000, immutable')
    expect(vercel.get('/assets/(.*)')?.get('cache-control')).toBe('public, max-age=31536000, immutable')
  })

  it('caches the fonts for the same time on every host', () => {
    expect(netlify.get('/fonts/*')?.get('cache-control')).toBe('public, max-age=2592000')
    expect(vercel.get('/fonts/(.*)')?.get('cache-control')).toBe('public, max-age=2592000')
  })
})

describe('deployment files', () => {
  it('pins the same Node major in every place that chooses one', () => {
    const nvmrc = read('.nvmrc').trim()
    expect(nvmrc).toMatch(/^\d+$/)
    expect(read('netlify.toml')).toContain(`NODE_VERSION = "${nvmrc}"`)
    expect(read('.github/workflows/ci.yml')).toContain(`node-version: ${nvmrc}`)
    expect(read('.github/workflows/deploy.yml')).toContain(`node-version: ${nvmrc}`)
  })

  it('pins package.json engines to the same Node major, so Vercel builds with it instead of the newest release', () => {
    const nvmrc = read('.nvmrc').trim()
    const engines = (JSON.parse(read('package.json')) as { engines: { node: string } }).engines
    expect(engines.node).toBe(`${nvmrc}.x`)
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
