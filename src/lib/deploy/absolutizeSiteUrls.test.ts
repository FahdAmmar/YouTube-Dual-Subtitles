import { describe, it, expect } from 'vitest'
import { absolutizeSiteUrls } from './absolutizeSiteUrls'

const HTML = `<head>
<meta property="og:image" content="/og-image.png" />
<meta name="twitter:image" content="/og-image.png" />
<title>x</title>
</head>`

describe('absolutizeSiteUrls', () => {
  it('turns the social image paths into absolute URLs, which link previews require', () => {
    const result = absolutizeSiteUrls(HTML, 'https://example.com', '/')
    expect(result).toContain('property="og:image" content="https://example.com/og-image.png"')
    expect(result).toContain('name="twitter:image" content="https://example.com/og-image.png"')
  })

  it('includes the base path when the site is served from a sub-folder', () => {
    expect(absolutizeSiteUrls(HTML, 'https://user.github.io', '/dual/')).toContain(
      'content="https://user.github.io/dual/og-image.png"',
    )
  })

  it('adds the canonical link and og:url for the site root', () => {
    const result = absolutizeSiteUrls(HTML, 'https://example.com/', '/')
    expect(result).toContain('<link rel="canonical" href="https://example.com/" />')
    expect(result).toContain('<meta property="og:url" content="https://example.com/" />')
  })

  it('leaves the page untouched when no site URL is given', () => {
    expect(absolutizeSiteUrls(HTML, undefined, '/')).toBe(HTML)
    expect(absolutizeSiteUrls(HTML, '', '/')).toBe(HTML)
  })

  it('refuses a site URL that is not an http(s) origin, so it can never inject markup', () => {
    expect(() => absolutizeSiteUrls(HTML, 'javascript:alert(1)', '/')).toThrow(/http/i)
    expect(() => absolutizeSiteUrls(HTML, 'https://a.com"><script>', '/')).toThrow(/http/i)
    expect(() => absolutizeSiteUrls(HTML, 'not a url', '/')).toThrow(/http/i)
  })

  it('ignores any path on the site URL, keeping only its origin', () => {
    expect(absolutizeSiteUrls(HTML, 'https://example.com/some/page?x=1', '/')).toContain(
      'content="https://example.com/og-image.png"',
    )
  })

  // Vite adds the base path to meta image URLs itself before this runs; the real build showed it
  it('handles an image path that already carries the base path, without doubling it', () => {
    const alreadyPrefixed = `<head>
<meta property="og:image" content="/dual/og-image.png" />
<meta name="twitter:image" content="/dual/og-image.png" />
</head>`
    const result = absolutizeSiteUrls(alreadyPrefixed, 'https://user.github.io', '/dual/')
    expect(result).toContain('property="og:image" content="https://user.github.io/dual/og-image.png"')
    expect(result).toContain('name="twitter:image" content="https://user.github.io/dual/og-image.png"')
    expect(result).not.toContain('/dual/dual/')
  })

  it('leaves images that are already absolute alone', () => {
    const absolute = '<head><meta property="og:image" content="https://cdn.example.com/og-image.png" /></head>'
    expect(absolutizeSiteUrls(absolute, 'https://example.com', '/')).toContain('content="https://cdn.example.com/og-image.png"')
  })
})
