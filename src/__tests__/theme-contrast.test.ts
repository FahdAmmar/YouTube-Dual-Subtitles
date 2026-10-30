import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { contrastRatio, type RgbTuple } from '@/lib/utils/color'

/** WCAG AA for normal-size text, which is what every text token is used for */
const MIN_TEXT_CONTRAST = 4.5

const css = readFileSync(path.resolve(__dirname, '../index.css'), 'utf8')

const THEME_BLOCKS = {
  dark: /:root,\s*\[data-theme='dark'\]\s*\{([^}]*)\}/,
  light: /\[data-theme='light'\]\s*\{([^}]*)\}/,
} as const

function readToken(theme: keyof typeof THEME_BLOCKS, name: string): RgbTuple {
  const block = THEME_BLOCKS[theme].exec(css)?.[1]
  if (!block) throw new Error(`No ${theme} theme block in index.css`)
  const match = new RegExp(`--rgb-${name}:\\s*(\\d+)\\s+(\\d+)\\s+(\\d+)\\s*;`).exec(block)
  if (!match) throw new Error(`--rgb-${name} is missing from the ${theme} theme`)
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

const TEXT_TOKENS = ['text-primary', 'text-secondary', 'text-muted'] as const
const SURFACE_TOKENS = ['bg', 'surface', 'surface-elevated'] as const

describe('theme text contrast (WCAG AA)', () => {
  for (const theme of ['dark', 'light'] as const) {
    for (const text of TEXT_TOKENS) {
      for (const surface of SURFACE_TOKENS) {
        it(`${theme}: ${text} on ${surface} reaches ${MIN_TEXT_CONTRAST}:1`, () => {
          const ratio = contrastRatio(readToken(theme, text), readToken(theme, surface))
          expect(ratio).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST)
        })
      }
    }
  }

  it('keeps the hierarchy: muted text is never stronger than secondary text', () => {
    for (const theme of ['dark', 'light'] as const) {
      const surface = readToken(theme, 'surface')
      const secondary = contrastRatio(readToken(theme, 'text-secondary'), surface)
      const muted = contrastRatio(readToken(theme, 'text-muted'), surface)
      expect(muted).toBeLessThanOrEqual(secondary)
    }
  })
})
