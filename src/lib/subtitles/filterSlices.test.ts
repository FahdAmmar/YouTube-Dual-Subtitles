import { describe, it, expect } from 'vitest'
import { filterSlicesByQuery } from './filterSlices'
import type { PairedSlice } from './pairCues'

function makeSlice(overrides: Partial<PairedSlice>): PairedSlice {
  return {
    id: 'slice-0',
    originalIndex: 0,
    start: 0,
    end: 1,
    sourceText: null,
    translationText: null,
    ...overrides,
  }
}

describe('filterSlicesByQuery', () => {
  it('returns all slices unchanged when the query is empty', () => {
    const slices = [makeSlice({ sourceText: 'مرحباً' }), makeSlice({ sourceText: 'وداعاً' })]
    expect(filterSlicesByQuery(slices, '')).toEqual(slices)
  })

  it('returns all slices unchanged when the query is only whitespace', () => {
    const slices = [makeSlice({ sourceText: 'مرحباً' })]
    expect(filterSlicesByQuery(slices, '   ')).toEqual(slices)
  })

  it('matches a partial substring in the source text', () => {
    const target = makeSlice({ id: 'slice-a', sourceText: 'كيف حالك اليوم' })
    const other = makeSlice({ id: 'slice-b', sourceText: 'وداعاً' })
    expect(filterSlicesByQuery([target, other], 'حالك')).toEqual([target])
  })

  it('matches a partial substring in the translation text', () => {
    const target = makeSlice({ id: 'slice-a', translationText: 'Good morning everyone' })
    const other = makeSlice({ id: 'slice-b', translationText: 'Goodbye' })
    expect(filterSlicesByQuery([target, other], 'morning')).toEqual([target])
  })

  it('matches regardless of case', () => {
    const target = makeSlice({ translationText: 'Hello World' })
    expect(filterSlicesByQuery([target], 'WORLD')).toEqual([target])
  })

  it('matches a slice whose source OR translation contains the query, not requiring both', () => {
    const matchesInSourceOnly = makeSlice({ id: 'slice-a', sourceText: 'coffee', translationText: 'قهوة' })
    const matchesInTranslationOnly = makeSlice({ id: 'slice-b', sourceText: 'شاي', translationText: 'coffee break' })
    const noMatch = makeSlice({ id: 'slice-c', sourceText: 'موز', translationText: 'banana' })

    expect(filterSlicesByQuery([matchesInSourceOnly, matchesInTranslationOnly, noMatch], 'coffee')).toEqual([
      matchesInSourceOnly,
      matchesInTranslationOnly,
    ])
  })

  it('returns an empty array when nothing matches', () => {
    const slices = [makeSlice({ sourceText: 'مرحباً' })]
    expect(filterSlicesByQuery(slices, 'xyz-not-found')).toEqual([])
  })

  it('does not throw when a track is entirely null (only one file uploaded so far)', () => {
    const slice = makeSlice({ sourceText: null, translationText: 'Hello' })
    expect(filterSlicesByQuery([slice], 'hello')).toEqual([slice])
    expect(filterSlicesByQuery([slice], 'nonexistent')).toEqual([])
  })
})
