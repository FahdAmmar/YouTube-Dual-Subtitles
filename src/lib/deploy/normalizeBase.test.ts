import { describe, it, expect } from 'vitest'
import { normalizeBase } from './normalizeBase'

describe('normalizeBase', () => {
  it.each([
    [undefined, '/'],
    ['', '/'],
    ['/', '/'],
    ['/repo', '/repo/'],
    ['/repo/', '/repo/'],
    ['repo', '/repo/'],
    ['repo/', '/repo/'],
    ['/a/b', '/a/b/'],
    ['  /repo  ', '/repo/'],
    ['//repo//', '/repo/'],
  ])('turns %j into %j', (input, expected) => {
    expect(normalizeBase(input)).toBe(expected)
  })

  it('rejects values that are not a plain path, so a typo cannot rewrite every URL in the build', () => {
    expect(() => normalizeBase('https://example.com/app')).toThrow(/path/i)
    expect(() => normalizeBase('/a b')).toThrow(/path/i)
    expect(() => normalizeBase('/..')).toThrow(/path/i)
    expect(() => normalizeBase('/a"onload=x')).toThrow(/path/i)
  })
})
