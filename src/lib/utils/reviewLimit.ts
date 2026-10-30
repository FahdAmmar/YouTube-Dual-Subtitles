/** How many never-reviewed words one review session may introduce; null means no limit */
export const NEW_LIMIT_OPTIONS: readonly (number | null)[] = [5, 10, 20, 50, null]
export const DEFAULT_NEW_LIMIT = 20

/** Storage may hold anything (manual edits, restored backups): only an offered value is accepted */
export function normalizeNewLimit(raw: unknown): number | null {
  for (const option of NEW_LIMIT_OPTIONS) {
    if (option === raw) return option
  }
  return DEFAULT_NEW_LIMIT
}
