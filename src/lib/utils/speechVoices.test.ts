import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  getPrimaryLanguage,
  filterVoicesByLanguage,
  getSavedVoiceUri,
  saveVoiceUri,
  resolvePreferredVoice,
  SPEECH_RATES,
  getSpeechRate,
  saveSpeechRate,
  describeVoiceLanguage,
} from './speechVoices'

function voice(name: string, lang: string, voiceURI = name, localService = true) {
  return { name, lang, voiceURI, localService, default: false } as SpeechSynthesisVoice
}

const VOICES = [
  voice('Anna', 'de-DE'),
  voice('Markus', 'de_AT'),
  voice('Samantha', 'en-US'),
  voice('Hoda', 'ar-EG'),
]

describe('speechVoices', () => {
  const originalSynth = window.speechSynthesis

  beforeEach(() => window.localStorage.clear())
  afterEach(() => {
    Object.defineProperty(window, 'speechSynthesis', { value: originalSynth, configurable: true, writable: true })
  })

  it('extracts the primary language from BCP-47 tags, including Android underscore form', () => {
    expect(getPrimaryLanguage('de-DE')).toBe('de')
    expect(getPrimaryLanguage('de_AT')).toBe('de')
    expect(getPrimaryLanguage('EN')).toBe('en')
  })

  it('filters voices by language regardless of region and sorts by name', () => {
    expect(filterVoicesByLanguage(VOICES, 'de').map((v) => v.name)).toEqual(['Anna', 'Markus'])
    expect(filterVoicesByLanguage(VOICES, 'fr')).toEqual([])
  })

  it('saves, reads and clears a voice preference per language independently', () => {
    saveVoiceUri('de', 'Anna')
    saveVoiceUri('en', 'Samantha')
    expect(getSavedVoiceUri('de-DE')).toBe('Anna')
    saveVoiceUri('de', null)
    expect(getSavedVoiceUri('de')).toBeNull()
    expect(getSavedVoiceUri('en')).toBe('Samantha')
  })

  it('resolves the saved voice only while it is still installed', () => {
    Object.defineProperty(window, 'speechSynthesis', {
      value: { getVoices: () => VOICES },
      configurable: true,
      writable: true,
    })
    saveVoiceUri('de', 'Markus')
    expect(resolvePreferredVoice('de')?.name).toBe('Markus')

    saveVoiceUri('de', 'Removed-Voice')
    expect(resolvePreferredVoice('de')).toBeUndefined()
  })

  it('does not throw when speechSynthesis lacks getVoices', () => {
    Object.defineProperty(window, 'speechSynthesis', { value: {}, configurable: true, writable: true })
    saveVoiceUri('de', 'Anna')
    expect(resolvePreferredVoice('de')).toBeUndefined()
  })

  it('defaults the speech rate to 1 and persists a valid choice', () => {
    expect(getSpeechRate()).toBe(1)
    saveSpeechRate(1.5)
    expect(getSpeechRate()).toBe(1.5)
    expect(SPEECH_RATES).toContain(1.5)
  })

  it('ignores a corrupted or unsupported stored rate', () => {
    window.localStorage.setItem('ydc:speech-rate', '99')
    expect(getSpeechRate()).toBe(1)
    window.localStorage.setItem('ydc:speech-rate', 'abc')
    expect(getSpeechRate()).toBe(1)
  })

  it('describes a language tag in Arabic, falling back to the raw tag when invalid', () => {
    expect(describeVoiceLanguage('de-DE')).toContain('الألمانية')
    expect(describeVoiceLanguage('de_AT')).toContain('الألمانية')
    expect(describeVoiceLanguage('???')).toBe('???')
  })
})
