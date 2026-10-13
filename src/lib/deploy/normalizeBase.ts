const SAFE_SEGMENT = /^[A-Za-z0-9._~-]+$/

/**
 * Turns the BASE_PATH build setting into the form Vite needs: a path that starts and ends with "/".
 * Hosting at the domain root is "/", a project page on GitHub Pages is "/repo-name/".
 * Anything that is not a plain path is rejected: a typo here would silently rewrite every asset URL.
 */
export function normalizeBase(raw: string | undefined): string {
  const trimmed = (raw ?? '').trim().replace(/^\/+|\/+$/g, '')
  if (trimmed === '') return '/'

  const segments = trimmed.split('/')
  const isPlainPath = segments.every((segment) => SAFE_SEGMENT.test(segment) && segment !== '.' && segment !== '..')
  if (!isPlainPath) {
    throw new Error(`BASE_PATH must be a plain path such as "/my-app/", got "${raw}"`)
  }
  return `/${segments.join('/')}/`
}
