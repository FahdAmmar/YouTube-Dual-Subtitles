import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { isSpeechSupported, speakText, stopSpeaking } from './textToSpeech'

describe('textToSpeech', () => {
  const originalSpeechSynthesis = window.speechSynthesis

  afterEach(() => {
    Object.defineProperty(window, 'speechSynthesis', {
      value: originalSpeechSynthesis,
      configurable: true,
      writable: true,
    })
  })

  describe('isSpeechSupported', () => {
    it('returns false when the browser has no speechSynthesis API', () => {
      Object.defineProperty(window, 'speechSynthesis', {
        value: undefined,
        configurable: true,
        writable: true,
      })
      expect(isSpeechSupported()).toBe(false)
    })

    it('returns true when speechSynthesis is available', () => {
      Object.defineProperty(window, 'speechSynthesis', {
        value: { speak: vi.fn(), cancel: vi.fn() },
        configurable: true,
        writable: true,
      })
      expect(isSpeechSupported()).toBe(true)
    })
  })

  describe('speakText', () => {
    let cancel: ReturnType<typeof vi.fn>
    let speak: ReturnType<typeof vi.fn>

    beforeEach(() => {
      cancel = vi.fn()
      speak = vi.fn()
      Object.defineProperty(window, 'speechSynthesis', {
        value: { speak, cancel },
        configurable: true,
        writable: true,
      })
    })

    it('cancels any in-progress speech before speaking the new text', () => {
      speakText('Hello there')
      expect(cancel).toHaveBeenCalledTimes(1)
      expect(speak).toHaveBeenCalledTimes(1)
    })

    it('sets the utterance language when provided', () => {
      speakText('Bonjour', 'fr')
      const utterance = speak.mock.calls[0]?.[0] as SpeechSynthesisUtterance
      expect(utterance.lang).toBe('fr')
      expect(utterance.text).toBe('Bonjour')
    })

    it('uses the voice the user chose for that language', () => {
      const anna = { name: 'Anna', lang: 'de-DE', voiceURI: 'anna', localService: true } as SpeechSynthesisVoice
      Object.defineProperty(window, 'speechSynthesis', {
        value: { speak, cancel, getVoices: () => [anna] },
        configurable: true,
        writable: true,
      })
      window.localStorage.setItem('ydc:speech-voices', JSON.stringify({ de: 'anna' }))

      speakText('Guten Tag', 'de')

      const utterance = speak.mock.calls[0]?.[0] as SpeechSynthesisUtterance
      expect(utterance.voice).toBe(anna)
      expect(utterance.lang).toBe('de-DE')
      window.localStorage.clear()
    })

    it('does nothing for empty or whitespace-only text', () => {
      speakText('   ')
      expect(speak).not.toHaveBeenCalled()
    })

    it('does nothing silently when speech synthesis is unsupported', () => {
      Object.defineProperty(window, 'speechSynthesis', {
        value: undefined,
        configurable: true,
        writable: true,
      })
      expect(() => speakText('Hello')).not.toThrow()
    })
  })

  describe('stopSpeaking', () => {
    it('cancels speech when supported', () => {
      const cancel = vi.fn()
      Object.defineProperty(window, 'speechSynthesis', {
        value: { speak: vi.fn(), cancel },
        configurable: true,
        writable: true,
      })
      stopSpeaking()
      expect(cancel).toHaveBeenCalledTimes(1)
    })

    it('does nothing silently when unsupported', () => {
      Object.defineProperty(window, 'speechSynthesis', {
        value: undefined,
        configurable: true,
        writable: true,
      })
      expect(() => stopSpeaking()).not.toThrow()
    })
  })
})
