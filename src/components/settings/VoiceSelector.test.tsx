import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { VoiceSelector } from './VoiceSelector'

function voice(name: string, lang: string, localService: boolean) {
  return { name, lang, voiceURI: name, localService, default: false } as SpeechSynthesisVoice
}

const VOICES = [voice('Anna', 'de-DE', true), voice('Google Deutsch', 'de-DE', false), voice('Samantha', 'en-US', true)]

describe('VoiceSelector', () => {
  const originalSynth = window.speechSynthesis
  let speak: ReturnType<typeof vi.fn>

  function installSynth(voices: SpeechSynthesisVoice[]) {
    speak = vi.fn()
    Object.defineProperty(window, 'speechSynthesis', {
      value: { getVoices: () => voices, speak, cancel: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() },
      configurable: true,
      writable: true,
    })
  }

  beforeEach(() => window.localStorage.clear())
  afterEach(() => {
    Object.defineProperty(window, 'speechSynthesis', { value: originalSynth, configurable: true, writable: true })
  })

  it('lists only this language\'s voices, grouped as local vs network', () => {
    installSynth(VOICES)
    render(<VoiceSelector languageCode="de" languageLabel="الألمانية" />)

    const select = screen.getByLabelText('صوت نطق الألمانية')
    expect(within(select).getByRole('group', { name: 'أصوات محلية (نظام التشغيل)' })).toBeInTheDocument()
    expect(within(select).getByRole('group', { name: 'أصوات شبكية (عبر الإنترنت)' })).toBeInTheDocument()
    expect(within(select).getByText('Anna — de-DE')).toBeInTheDocument()
    expect(within(select).queryByText(/Samantha/)).not.toBeInTheDocument()
  })

  it('persists the chosen voice per language and speaks the sample with it', () => {
    installSynth(VOICES)
    render(<VoiceSelector languageCode="de" languageLabel="الألمانية" />)

    fireEvent.change(screen.getByLabelText('صوت نطق الألمانية'), { target: { value: 'Anna' } })
    expect(JSON.parse(window.localStorage.getItem('ydc:speech-voices') ?? '{}')).toEqual({ de: 'Anna' })

    fireEvent.click(screen.getByRole('button', { name: 'تجربة صوت الألمانية' }))
    const utterance = speak.mock.calls[0]?.[0] as SpeechSynthesisUtterance
    expect(utterance.voice?.name).toBe('Anna')
    expect(utterance.text).toBe('Hallo, wie geht es dir?')
  })

  it('explains what to do when the device has no voice for the language', () => {
    installSynth(VOICES)
    render(<VoiceSelector languageCode="ja" languageLabel="اليابانية" />)
    expect(screen.getByText(/لا توجد أصوات متاحة لهذه اللغة/)).toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })
})
