import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react'
import { VoiceSelector } from './VoiceSelector'

function voice(name: string, lang: string, localService: boolean) {
  return { name, lang, voiceURI: name, localService, default: false } as SpeechSynthesisVoice
}

const VOICES = [voice('Anna', 'de-DE', true), voice('Google Deutsch', 'de-DE', false), voice('Samantha', 'en-US', true)]

describe('VoiceSelector', () => {
  const originalSynth = window.speechSynthesis
  let speak: ReturnType<typeof vi.fn>
  let cancel: ReturnType<typeof vi.fn>

  function installSynth(voices: SpeechSynthesisVoice[]) {
    speak = vi.fn()
    cancel = vi.fn()
    Object.defineProperty(window, 'speechSynthesis', {
      value: { getVoices: () => voices, speak, cancel, addEventListener: vi.fn(), removeEventListener: vi.fn() },
      configurable: true,
      writable: true,
    })
  }

  function openPicker() {
    fireEvent.click(screen.getByRole('button', { name: /تغيير/ }))
    return screen.getByRole('dialog', { name: 'اختيار صوت الألمانية' })
  }

  beforeEach(() => window.localStorage.clear())
  afterEach(() => {
    Object.defineProperty(window, 'speechSynthesis', { value: originalSynth, configurable: true, writable: true })
  })

  it('shows "تلقائي" as the current choice with no saved preference', () => {
    installSynth(VOICES)
    render(<VoiceSelector languageCode="de" languageLabel="الألمانية" />)
    expect(screen.getByText('تلقائي')).toBeInTheDocument()
  })

  it('lists only this language\'s voices in the picker, sorted local-first', () => {
    installSynth(VOICES)
    render(<VoiceSelector languageCode="de" languageLabel="الألمانية" />)

    const dialog = openPicker()
    const names = within(dialog)
      .getAllByRole('button')
      .map((el) => el.textContent)
      .filter((text) => text?.includes('Anna') || text?.includes('Google Deutsch'))
    expect(names[0]).toContain('Anna')
    expect(within(dialog).queryByText('Samantha')).not.toBeInTheDocument()
  })

  it('selects a voice from the picker, persists it per language, and closes the dialog', async () => {
    installSynth(VOICES)
    render(<VoiceSelector languageCode="de" languageLabel="الألمانية" />)

    const dialog = openPicker()
    fireEvent.click(within(dialog).getByText('Anna'))

    expect(JSON.parse(window.localStorage.getItem('ydc:speech-voices') ?? '{}')).toEqual({ de: 'Anna' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByText('Anna')).toBeInTheDocument()
  })

  it('previews a voice with the shared rate, toggling the button to a stop icon while playing', () => {
    installSynth(VOICES)
    render(<VoiceSelector languageCode="de" languageLabel="الألمانية" />)

    const dialog = openPicker()
    fireEvent.click(within(dialog).getByRole('button', { name: '1.5×' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'تجربة صوت Anna' }))

    const utterance = speak.mock.calls[0]?.[0] as SpeechSynthesisUtterance | undefined
    expect(utterance?.voice?.name).toBe('Anna')
    expect(utterance?.rate).toBe(1.5)
    expect(utterance?.text).toBe('Hallo, wie geht es dir?')
    expect(within(dialog).getByRole('button', { name: 'إيقاف معاينة Anna' })).toBeInTheDocument()

    fireEvent.click(within(dialog).getByRole('button', { name: 'إيقاف معاينة Anna' }))
    expect(cancel).toHaveBeenCalled()
    expect(within(dialog).getByRole('button', { name: 'تجربة صوت Anna' })).toBeInTheDocument()
  })

  it('stops any playing preview when the dialog is closed', () => {
    installSynth(VOICES)
    render(<VoiceSelector languageCode="de" languageLabel="الألمانية" />)

    const dialog = openPicker()
    fireEvent.click(within(dialog).getByRole('button', { name: 'تجربة صوت Anna' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'إغلاق' }))

    expect(cancel).toHaveBeenCalled()
  })

  it('explains what to do when the device has no voice for the language, with no picker button', () => {
    installSynth(VOICES)
    render(<VoiceSelector languageCode="ja" languageLabel="اليابانية" />)
    expect(screen.getByText(/لا توجد أصوات متاحة لهذه اللغة/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /تغيير/ })).not.toBeInTheDocument()
  })
})
