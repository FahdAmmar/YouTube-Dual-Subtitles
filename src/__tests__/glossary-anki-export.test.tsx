import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { GlossaryPanel } from '@/components/console/GlossaryPanel'
import { saveGlossaryEntry, makeGlossaryEntryId } from '@/lib/utils/glossaryStore'

const downloadTextFile = vi.fn()
vi.mock('@/lib/subtitles/serializeSRT', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/subtitles/serializeSRT')>()),
  downloadTextFile: (...args: unknown[]) => downloadTextFile(...args),
}))

beforeEach(() => {
  window.localStorage.clear()
  downloadTextFile.mockClear()
})

describe('Anki export and review progress in the glossary panel', () => {
  it('downloads Cloze cards built from the saved sentences as a dated .txt file', () => {
    saveGlossaryEntry({
      id: makeGlossaryEntryId('müde', 'de'),
      word: 'müde',
      languageCode: 'de',
      partOfSpeech: '',
      translation: 'متعب',
      definition: '',
      example: null,
      addedAt: 1,
      context: { sentence: 'Ich bin müde heute', videoKey: 'youtube:dQw4w9WgXcQ', time: 62 },
    })
    render(<GlossaryPanel isOpen onClose={() => {}} />)

    fireEvent.click(screen.getByRole('button', { name: /تصدير بطاقات Anki/ }))

    const [content, fileName] = downloadTextFile.mock.calls[0] as [string, string]
    expect(content).toContain('#notetype:Cloze')
    expect(content).toContain('Ich bin {{c1::müde::متعب}} heute')
    expect(fileName).toMatch(/^anki_\d{4}-\d{2}-\d{2}\.txt$/)
  })

  it('keeps the existing CSV export unchanged and separate', () => {
    saveGlossaryEntry({
      id: makeGlossaryEntryId('Haus', 'de'),
      word: 'Haus',
      languageCode: 'de',
      partOfSpeech: '',
      translation: 'منزل',
      definition: '',
      example: null,
      addedAt: 1,
    })
    render(<GlossaryPanel isOpen onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /تصدير المفردات/ }))
    expect(downloadTextFile.mock.calls[0]![0]).toBe('Haus,منزل,,,,de\r\n')
  })

  it('counts each answered review toward the daily goal', () => {
    saveGlossaryEntry({
      id: makeGlossaryEntryId('Haus', 'de'),
      word: 'Haus',
      languageCode: 'de',
      partOfSpeech: '',
      translation: 'منزل',
      definition: '',
      example: null,
      addedAt: 1,
    })
    render(<GlossaryPanel isOpen onClose={() => {}} />)
    expect(screen.getByTestId('reviews-today')).toHaveTextContent('مراجعات اليوم: 0 / 10')

    fireEvent.click(screen.getByRole('button', { name: /مراجعة الكلمات المستحقة/ }))
    fireEvent.click(screen.getByRole('button', { name: 'إظهار الإجابة' }))
    fireEvent.click(screen.getByRole('button', { name: /تذكرتها/ }))
    fireEvent.click(screen.getByRole('button', { name: 'العودة إلى القائمة' }))

    expect(screen.getByTestId('reviews-today')).toHaveTextContent('مراجعات اليوم: 1 / 10')
  })
})
