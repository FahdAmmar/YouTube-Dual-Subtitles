import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { GlossaryPanel } from '@/components/console/GlossaryPanel'
import { VideoKeyProvider } from '@/context/VideoKeyContext'
import { saveGlossaryEntry, makeGlossaryEntryId } from '@/lib/utils/glossaryStore'

const speech = vi.hoisted(() => ({ isSupported: true, speakText: vi.fn() }))

vi.mock('@/lib/utils/textToSpeech', () => ({
  isSpeechSupported: () => speech.isSupported,
  speakText: speech.speakText,
  stopSpeaking: vi.fn(),
}))

beforeEach(() => {
  window.localStorage.clear()
  speech.isSupported = true
  speech.speakText.mockClear()
  saveGlossaryEntry({
    id: makeGlossaryEntryId('Haus', 'de'),
    word: 'Haus',
    languageCode: 'de',
    partOfSpeech: '',
    translation: 'بيت',
    definition: '',
    example: null,
    addedAt: 1,
  })
})

function startReview() {
  render(
    <VideoKeyProvider value={null}>
      <GlossaryPanel isOpen onClose={() => {}} />
    </VideoKeyProvider>,
  )
  fireEvent.click(screen.getByRole('button', { name: /مراجعة الكلمات المستحقة/ }))
}

describe('pronouncing a word during review', () => {
  it('speaks the word in its own language', () => {
    startReview()
    fireEvent.click(screen.getByRole('button', { name: 'نطق الكلمة' }))
    expect(speech.speakText).toHaveBeenCalledWith('Haus', 'de')
  })

  it('hides the button where the browser cannot speak', () => {
    speech.isSupported = false
    startReview()
    expect(screen.queryByRole('button', { name: 'نطق الكلمة' })).not.toBeInTheDocument()
  })
})
