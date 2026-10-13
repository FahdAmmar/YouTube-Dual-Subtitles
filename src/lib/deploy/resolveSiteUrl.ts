// Vercel hostnames are plain DNS names without scheme or path ("my-app.vercel.app", "example.com")
const HOSTNAME = /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/i

/**
 * Public address the build should use for share images and canonical links.
 * An explicit SITE_URL always wins. Otherwise, when building on Vercel, the address comes from the variables
 * Vercel sets for every build: the production domain for production builds, the deployment's own address for
 * previews. Anywhere else (local build, GitHub Pages without SITE_URL) it stays unset and the page is left
 * as it is. Platform values that do not look like a hostname are ignored rather than written into the HTML.
 */
export function resolveSiteUrl(env: Record<string, string | undefined>): string | undefined {
  const explicit = env.SITE_URL?.trim()
  if (explicit) return explicit

  if (env.VERCEL !== '1') return undefined

  const host = (env.VERCEL_ENV === 'production' ? env.VERCEL_PROJECT_PRODUCTION_URL : env.VERCEL_URL)?.trim()
  return host && HOSTNAME.test(host) ? `https://${host}` : undefined
}
