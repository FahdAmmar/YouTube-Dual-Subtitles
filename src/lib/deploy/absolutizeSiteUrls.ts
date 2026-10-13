// Matches a root-relative path to the image, with or without the base path Vite may already have added.
// Paths that start with a scheme (https://...) are already absolute and do not match.
const SOCIAL_IMAGE_TAG = /(<meta\s+(?:property="og:image"|name="twitter:image")\s+content=")\/(?:[^"/]+\/)*og-image\.png(")/g

/**
 * Link previews (WhatsApp, X, Slack, ...) ignore a relative og:image, so once the public address is known
 * (SITE_URL at build time) the image paths become absolute and canonical/og:url are added.
 * Without a SITE_URL the page is returned untouched.
 */
export function absolutizeSiteUrls(html: string, siteUrl: string | undefined, base: string): string {
  if (!siteUrl) return html

  let origin: string
  try {
    const parsed = new URL(siteUrl)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw new Error('not http(s)')
    origin = parsed.origin
  } catch {
    throw new Error(`SITE_URL must be an http(s) address such as "https://example.com", got "${siteUrl}"`)
  }

  const root = `${origin}${base}`
  return html
    .replace(SOCIAL_IMAGE_TAG, `$1${root}og-image.png$2`)
    .replace(
      '</head>',
      `    <link rel="canonical" href="${root}" />\n    <meta property="og:url" content="${root}" />\n  </head>`,
    )
}
