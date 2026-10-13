import { describe, it, expect } from 'vitest'
import { buildCsp } from './buildCsp'

const directive = (csp: string, name: string) =>
  csp.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name} `)) ?? ''

describe('buildCsp', () => {
  const csp = buildCsp(['sha256-abc='])

  it('allows only the app itself plus the listed script hash by default', () => {
    expect(directive(csp, 'default-src')).toBe("default-src 'self'")
    expect(directive(csp, 'script-src')).toContain("'sha256-abc='")
    expect(directive(csp, 'script-src')).not.toContain("'unsafe-inline'")
    expect(directive(csp, 'script-src')).not.toContain("'unsafe-eval'")
  })

  it('lets the page talk only to the two dictionary services', () => {
    expect(directive(csp, 'connect-src')).toBe(
      "connect-src 'self' https://en.wiktionary.org https://api.mymemory.translated.net",
    )
  })

  it('allows the video providers to be embedded and nothing else', () => {
    expect(directive(csp, 'frame-src')).toBe(
      'frame-src https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com',
    )
  })

  it('blocks plugins and base-tag or form hijacking', () => {
    expect(directive(csp, 'object-src')).toBe("object-src 'none'")
    expect(directive(csp, 'base-uri')).toBe("base-uri 'self'")
    expect(directive(csp, 'form-action')).toBe("form-action 'self'")
  })

  it('lets local video play from blob URLs', () => {
    expect(directive(csp, 'media-src')).toContain('blob:')
  })

  it('works with no inline scripts', () => {
    expect(directive(buildCsp([]), 'script-src')).not.toContain('sha256')
  })
})
