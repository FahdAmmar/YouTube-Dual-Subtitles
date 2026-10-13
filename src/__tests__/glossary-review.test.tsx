import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { GlossaryPanel } from '@/components/console/GlossaryPanel'
import { VideoKeyProvider } from '@/context/VideoKeyContext'
import { getGlossaryEntries, saveGlossaryEntry, makeGlossaryEntryId } from '@/lib/utils/glossaryStore'
import { createBackup } from '@/lib/utils/backup'
import { DAY_MS } from '@/lib/utils/spacedRepetition'
import type { GlossaryEntry } from '@/types/glossary.types'

const entry = (word: string, patch: Partial<GlossaryEntry> = {}): GlossaryEntry => ({
  id: makeGlossaryEntryId(word, 'de'),
  word,
  languageCode: 'de',
  partOfSpeech: '',
  translation: `ترجمة ${word}`,
  definition: '',
  example: null,
  addedAt: Date.now() - 1000,
  ...patch,
})

beforeEach(() => window.localStorage.clear())

function renderPanel(props: { videoKey?: string | null; onSeekToTime?: (s: number) => void } = {}) {
  return render(
    <VideoKeyProvider value={props.videoKey ?? null}>
      <GlossaryPanel isOpen onClose={() => {}} onSeekToTime={props.onSeekToTime} />
    </VideoKeyProvider>,
  )
}

describe('glossary review', () => {
  it('counts new words as due and disables review when none are', () => {
    renderPanel()
    expect(screen.getByRole('button', { name: /لا توجد كلمات مستحقة/ })).toBeDisabled()
  })

  it('reviews a word: hides the answer first, then schedules it by the chosen grade', () => {
    saveGlossaryEntry(entry('Haus'))
    renderPanel()

    fireEvent.click(screen.getByRole('button', { name: /مراجعة الكلمات المستحقة \(1\)/ }))
    expect(screen.queryByText('ترجمة Haus')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'إظهار الإجابة' }))
    expect(screen.getByText('ترجمة Haus')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /تذكرتها/ }))

    const saved = getGlossaryEntries()[0]!
    expect(saved.review?.box).toBe(1)
    expect(saved.review!.dueAt).toBeGreaterThan(Date.now() + DAY_MS - 5000)
    expect(screen.getByText('أنهيت مراجعة اليوم')).toBeInTheDocument()
  })

  it('brings a forgotten word back within minutes, not days', () => {
    saveGlossaryEntry(entry('Haus'))
    renderPanel()
    fireEvent.click(screen.getByRole('button', { name: /مراجعة الكلمات المستحقة/ }))
    fireEvent.click(screen.getByRole('button', { name: 'إظهار الإجابة' }))
    fireEvent.click(screen.getByRole('button', { name: /لم أتذكرها/ }))

    const { review } = getGlossaryEntries()[0]!
    expect(review?.box).toBe(0)
    expect(review!.dueAt - Date.now()).toBeLessThan(11 * 60 * 1000)
  })

  it('skips words that are not due yet', () => {
    saveGlossaryEntry(entry('Haus', { review: { box: 2, dueAt: Date.now() + 2 * DAY_MS, lastReviewedAt: Date.now() } }))
    renderPanel()
    expect(screen.getByRole('button', { name: /لا توجد كلمات مستحقة/ })).toBeDisabled()
  })

  it('shows a fill-in-the-blank card when the sentence is saved, and the full sentence in the answer', () => {
    saveGlossaryEntry(
      entry('müde', { context: { sentence: 'Ich bin müde heute', videoKey: 'yt:abc', time: 42 } }),
    )
    renderPanel({ videoKey: 'yt:abc' })
    fireEvent.click(screen.getByRole('button', { name: /مراجعة الكلمات المستحقة/ }))

    expect(screen.getByText('Ich bin _____ heute')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'إظهار الإجابة' }))
    expect(screen.getByText('«Ich bin müde heute»')).toBeInTheDocument()
  })

  it('jumps to the scene of a word from the same video, and offers nothing for another video', () => {
    const seeks: number[] = []
    saveGlossaryEntry(entry('müde', { context: { sentence: 'Ich bin müde', videoKey: 'yt:abc', time: 42 } }))
    saveGlossaryEntry(entry('Haus', { context: { sentence: 'Das Haus', videoKey: 'yt:other', time: 9 } }))
    renderPanel({ videoKey: 'yt:abc', onSeekToTime: (seconds) => seeks.push(seconds) })

    expect(screen.queryByRole('button', { name: /مشهد "Haus"/ })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /مشهد "müde"/ }))
    expect(seeks).toEqual([42])
  })

  it('survives a corrupted review or context in storage', () => {
    saveGlossaryEntry(entry('Haus', { review: 'broken' as never, context: 42 as never }))
    renderPanel()
    expect(screen.getByRole('button', { name: /مراجعة الكلمات المستحقة \(1\)/ })).toBeEnabled()
  })

  it('keeps review progress and saved sentences in backups', async () => {
    saveGlossaryEntry(
      entry('Haus', {
        review: { box: 3, dueAt: 5, lastReviewedAt: 1 },
        context: { sentence: 'Das Haus', videoKey: 'yt:abc', time: 7 },
      }),
    )
    const backup = await createBackup()
    const stored = JSON.parse(backup.local['ydc:glossary'] ?? '{}') as Record<string, GlossaryEntry>
    const saved = Object.values(stored)[0]!
    expect(saved.review?.box).toBe(3)
    expect(saved.context?.sentence).toBe('Das Haus')
  })
})

describe('review session list', () => {
  it('lists saved sentences under the words', () => {
    saveGlossaryEntry(entry('müde', { context: { sentence: 'Ich bin müde', videoKey: 'yt:abc', time: 1 } }))
    renderPanel()
    const list = screen.getByRole('list')
    expect(within(list).getByText('«Ich bin müde»')).toBeInTheDocument()
  })
})
