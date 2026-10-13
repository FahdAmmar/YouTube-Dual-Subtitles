import { describe, it, expect } from 'vitest'
import { resolveSiteUrl } from './resolveSiteUrl'

const production = {
  VERCEL: '1',
  VERCEL_ENV: 'production',
  VERCEL_PROJECT_PRODUCTION_URL: 'dual-sub.vercel.app',
  VERCEL_URL: 'dual-sub-git-main-me.vercel.app',
}

describe('resolveSiteUrl', () => {
  it('stays unset outside Vercel, so a local build leaves the page untouched', () => {
    expect(resolveSiteUrl({})).toBeUndefined()
    expect(resolveSiteUrl({ VERCEL_PROJECT_PRODUCTION_URL: 'dual-sub.vercel.app', VERCEL_ENV: 'production' })).toBeUndefined()
  })

  it('lets an explicit SITE_URL win over anything Vercel provides (custom domains)', () => {
    expect(resolveSiteUrl({ ...production, SITE_URL: 'https://learn.example.com' })).toBe('https://learn.example.com')
  })

  it('ignores an empty SITE_URL', () => {
    expect(resolveSiteUrl({ ...production, SITE_URL: '  ' })).toBe('https://dual-sub.vercel.app')
  })

  it('uses the production domain for production builds', () => {
    expect(resolveSiteUrl(production)).toBe('https://dual-sub.vercel.app')
  })

  it('uses the deployment address for preview builds', () => {
    expect(resolveSiteUrl({ ...production, VERCEL_ENV: 'preview' })).toBe('https://dual-sub-git-main-me.vercel.app')
  })

  it('does not write an unexpected platform value into the HTML', () => {
    expect(resolveSiteUrl({ ...production, VERCEL_PROJECT_PRODUCTION_URL: 'evil.com/"><script>' })).toBeUndefined()
    expect(resolveSiteUrl({ ...production, VERCEL_PROJECT_PRODUCTION_URL: 'https://already-has-scheme.com' })).toBeUndefined()
    expect(resolveSiteUrl({ ...production, VERCEL_PROJECT_PRODUCTION_URL: '' })).toBeUndefined()
  })
})
