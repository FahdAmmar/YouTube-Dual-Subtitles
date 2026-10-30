import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, it, expect } from 'vitest'

const css = readFileSync(path.resolve(__dirname, '../index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * Tailwind 4 compiles the stylesheet with Lightning CSS. When a rule lists `backdrop-filter` and then
 * `-webkit-backdrop-filter` with the same value, Lightning CSS merges them into the prefixed one only, and
 * Chrome, Edge and Firefox (which ignore the prefixed form) silently lose the blur. Listing the prefixed
 * declaration first keeps both. This was found by comparing screenshots of the app before and after the upgrade.
 */
describe('hand-written backdrop-filter rules', () => {
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*backdrop-filter[^{}]*)\}/g)].map((match) => ({
    selector: (match[1] ?? '').trim(),
    body: match[2] ?? '',
  }))

  it('finds the glass classes this guard is about', () => {
    const selectors = rules.map((rule) => rule.selector)
    expect(selectors).toEqual(expect.arrayContaining(['.glass-panel', '.glass-subtle']))
  })

  for (const { selector, body } of rules) {
    it(`${selector} lists the -webkit- prefixed declaration before the standard one`, () => {
      const prefixed = body.indexOf('-webkit-backdrop-filter')
      const standard = body.search(/(?<!-)backdrop-filter\s*:/)
      expect(standard, 'the standard declaration must be present').toBeGreaterThanOrEqual(0)
      if (prefixed >= 0) expect(prefixed).toBeLessThan(standard)
    })
  }
})
