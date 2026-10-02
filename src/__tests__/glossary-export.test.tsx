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

describe('glossary CSV export', () => {
  it('downloads all saved words as a dated CSV file', () => {
    saveGlossaryEntry({
      id: makeGlossaryEntryId('Haus', 'de'),
      word: 'Haus',
      languageCode: 'de',
      partOfSpeech: 'noun',
      translation: 'منزل',
      definition: 'A building.',
      example: null,
      addedAt: 1,
    })
    render(<GlossaryPanel isOpen onClose={() => {}} />)

    fireEvent.click(screen.getByRole('button', { name: /تصدير المفردات/ }))

    expect(downloadTextFile).toHaveBeenCalledTimes(1)
    const [content, fileName] = downloadTextFile.mock.calls[0] as [string, string]
    expect(content).toBe('Haus,منزل,A building.,,noun,de\r\n')
    expect(fileName).toMatch(/^glossary_\d{4}-\d{2}-\d{2}\.csv$/)
  })

  it('disables the export button while the glossary is empty', () => {
    render(<GlossaryPanel isOpen onClose={() => {}} />)
    expect(screen.getByRole('button', { name: /تصدير المفردات/ })).toBeDisabled()
  })
})
