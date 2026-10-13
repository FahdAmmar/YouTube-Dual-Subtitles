import { describe, it, expect } from 'vitest'
import { contrastRatio, ensureReadableColor } from './color'

const hexToRgbTuple = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number]

describe('contrastRatio', () => {
  it('matches the WCAG reference values', () => {
    expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 1)
    expect(contrastRatio([119, 119, 119], [255, 255, 255])).toBeCloseTo(4.48, 1)
    expect(contrastRatio([10, 20, 30], [10, 20, 30])).toBe(1)
  })
})

describe('ensureReadableColor', () => {
  const DARK_CARD: [number, number, number] = [26, 32, 38]
  const LIGHT_CARD: [number, number, number] = [226, 232, 240]

  it('leaves a colour alone when it is already readable', () => {
    expect(ensureReadableColor('#4fc7be', DARK_CARD, 6.5)).toBe('#4fc7be')
  })

  it('darkens a bright colour until it reads on a light surface, keeping its hue', () => {
    const fixed = ensureReadableColor('#4fc7be', LIGHT_CARD, 6.5)
    expect(contrastRatio(hexToRgbTuple(fixed), LIGHT_CARD)).toBeGreaterThanOrEqual(6.5)
    const [r, g, b] = hexToRgbTuple(fixed)
    expect(g).toBeGreaterThan(r) // still a teal, not grey
    expect(b).toBeGreaterThan(r)
  })

  it('lightens a dark colour until it reads on a dark surface', () => {
    const fixed = ensureReadableColor('#1a3a8a', DARK_CARD, 6.5)
    expect(contrastRatio(hexToRgbTuple(fixed), DARK_CARD)).toBeGreaterThanOrEqual(6.5)
  })

  it('handles extremes: white on light and black on dark both become readable', () => {
    expect(contrastRatio(hexToRgbTuple(ensureReadableColor('#ffffff', LIGHT_CARD, 6.5)), LIGHT_CARD)).toBeGreaterThanOrEqual(6.5)
    expect(contrastRatio(hexToRgbTuple(ensureReadableColor('#000000', DARK_CARD, 6.5)), DARK_CARD)).toBeGreaterThanOrEqual(6.5)
  })

  it('returns the input unchanged when it is not a valid colour', () => {
    expect(ensureReadableColor('not-a-colour', DARK_CARD, 6.5)).toBe('not-a-colour')
  })
})
