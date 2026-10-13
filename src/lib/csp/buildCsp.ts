/**
 * Content-Security-Policy for the production build. Every host here is one the app
 * really contacts; anything else is blocked, which limits the damage of an XSS bug
 * (for example through untrusted subtitle text).
 *
 * style-src keeps 'unsafe-inline' because React and Framer Motion write inline styles.
 * The theme bootstrap script in index.html is allowed by hash, not by 'unsafe-inline'.
 */
const YOUTUBE_HOSTS = ['https://www.youtube.com']
const EMBED_HOSTS = ['https://www.youtube.com', 'https://www.youtube-nocookie.com', 'https://player.vimeo.com']
const DICTIONARY_HOSTS = ['https://en.wiktionary.org', 'https://api.mymemory.translated.net']
const IMAGE_HOSTS = ['https://img.youtube.com', 'https://i.ytimg.com', 'https://i.vimeocdn.com']

export function buildCsp(inlineScriptHashes: string[]): string {
  const scriptSources = [
    "'self'",
    ...inlineScriptHashes.map((hash) => `'${hash}'`),
    ...YOUTUBE_HOSTS,
    'https://player.vimeo.com',
  ]

  return [
    "default-src 'self'",
    `script-src ${scriptSources.join(' ')}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${IMAGE_HOSTS.join(' ')}`,
    "media-src 'self' blob:",
    "font-src 'self' data:",
    `connect-src 'self' ${DICTIONARY_HOSTS.join(' ')}`,
    `frame-src ${EMBED_HOSTS.join(' ')}`,
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')
}
