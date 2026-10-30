import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { GlossaryPanel } from '@/components/console/GlossaryPanel'
import { VideoKeyProvider } from '@/context/VideoKeyContext'
import { getGlossaryEntries, saveGlossaryEntry, makeGlossaryEntryId } from '@/lib/utils/glossaryStore'
import { DAY_MS } from '@/lib/utils/spacedRepetition'
import type { GlossaryEntry } from '@/types/glossary.types'

const NOW = Date.now()
let nextAddedAt = 1_000
const entry = (word: string, patch: Partial<GlossaryEntry> = {}): GlossaryEntry => ({
  id: makeGlossaryEntryId(word, 'de'),
  word,
  languageCode: 'de',
  partOfSpeech: '',
  translation: `ترجمة ${word}`,
  definition: '',
  example: null,
  addedAt: nextAddedAt++,
  ...patch,
})

beforeEach(() => {
  window.localStorage.clear()
  nextAddedAt = 1_000
})

function renderPanel(videoKey: string | null = null) {
  return render(
    <VideoKeyProvider value={videoKey}>
      <GlossaryPanel isOpen onClose={() => {}} />
    </VideoKeyProvider>,
  )
}

const visibleWords = () => screen.queryAllByTestId('entry-word').map((node) => node.textContent)
const search = (text: string) => fireEvent.change(screen.getByRole('searchbox', { name: 'بحث في المفردات' }), { target: { value: text } })

function seedThree() {
  saveGlossaryEntry(entry('Zebra'))
  saveGlossaryEntry(entry('Apfel', { review: { box: 5, dueAt: NOW + 30 * DAY_MS, lastReviewedAt: NOW } }))
  saveGlossaryEntry(entry('Brot', { review: { box: 1, dueAt: NOW + DAY_MS, lastReviewedAt: NOW } }))
}

describe('vocabulary search, filter and sort', () => {
  it('shows no search tools while the list is empty', () => {
    renderPanel()
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
  })

  it('narrows the list as the learner types, in any language of the entry', () => {
    seedThree()
    renderPanel()
    expect(visibleWords()).toHaveLength(3)

    search('ترجمة brot')
    expect(visibleWords()).toEqual(['Brot'])
    expect(screen.getByTestId('glossary-count')).toHaveTextContent('1 من 3')
  })

  it('says so, and offers to clear the search, when nothing matches', () => {
    seedThree()
    renderPanel()
    search('xyz')
    expect(screen.getByText('لا توجد كلمات مطابقة')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'مسح البحث' }))
    expect(visibleWords()).toHaveLength(3)
  })

  it('filters by learning status and marks the active filter', () => {
    seedThree()
    renderPanel()
    const group = screen.getByRole('group', { name: 'تصفية حسب الحالة' })

    fireEvent.click(within(group).getByRole('button', { name: 'جديدة' }))
    expect(visibleWords()).toEqual(['Zebra'])
    expect(within(group).getByRole('button', { name: 'جديدة' })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(within(group).getByRole('button', { name: 'متقنة' }))
    expect(visibleWords()).toEqual(['Apfel'])

    fireEvent.click(within(group).getByRole('button', { name: 'قيد التعلّم' }))
    expect(visibleWords()).toEqual(['Brot'])

    fireEvent.click(within(group).getByRole('button', { name: 'الكل' }))
    expect(visibleWords()).toHaveLength(3)
  })

  it('sorts alphabetically on request', () => {
    seedThree()
    renderPanel()
    expect(visibleWords()).toEqual(['Brot', 'Apfel', 'Zebra'])
    fireEvent.change(screen.getByLabelText('الترتيب'), { target: { value: 'alphabetical' } })
    expect(visibleWords()).toEqual(['Apfel', 'Brot', 'Zebra'])
  })

  it('can show only the words met in the video being watched', () => {
    saveGlossaryEntry(entry('hier', { context: { sentence: 'Komm hier', videoKey: 'youtube:abc', time: 1 } }))
    saveGlossaryEntry(entry('dort', { context: { sentence: 'Geh dort', videoKey: 'youtube:xyz', time: 1 } }))
    renderPanel('youtube:abc')
    expect(visibleWords()).toHaveLength(2)
    fireEvent.click(screen.getByLabelText('من هذا الفيديو فقط'))
    expect(visibleWords()).toEqual(['hier'])
  })

  it('offers the video filter only while a video is open', () => {
    saveGlossaryEntry(entry('hier'))
    renderPanel(null)
    expect(screen.queryByLabelText('من هذا الفيديو فقط')).not.toBeInTheDocument()
  })
})

describe('undoing a removal', () => {
  it('puts the word back exactly as it was, review progress included', () => {
    const review = { box: 3, dueAt: NOW + 7 * DAY_MS, lastReviewedAt: NOW }
    saveGlossaryEntry(entry('Haus', { review, addedAt: 5_000 }))
    renderPanel()

    fireEvent.click(screen.getByRole('button', { name: 'حذف "Haus" من المفردات' }))
    expect(getGlossaryEntries()).toHaveLength(0)
    expect(screen.getByRole('status')).toHaveTextContent('Haus')

    fireEvent.click(screen.getByRole('button', { name: 'تراجع' }))
    const [restored] = getGlossaryEntries()
    expect(restored?.word).toBe('Haus')
    expect(restored?.addedAt).toBe(5_000)
    expect(restored?.review).toEqual(review)
    expect(screen.queryByRole('button', { name: 'تراجع' })).not.toBeInTheDocument()
  })

  it('only offers to undo the latest removal', () => {
    saveGlossaryEntry(entry('eins'))
    saveGlossaryEntry(entry('zwei'))
    renderPanel()
    fireEvent.click(screen.getByRole('button', { name: 'حذف "eins" من المفردات' }))
    fireEvent.click(screen.getByRole('button', { name: 'حذف "zwei" من المفردات' }))
    fireEvent.click(screen.getByRole('button', { name: 'تراجع' }))
    expect(getGlossaryEntries().map((item) => item.word)).toEqual(['zwei'])
  })
})

describe('personal notes on a word', () => {
  it('adds a note, shows it, and finds the word by it', () => {
    saveGlossaryEntry(entry('Haus'))
    saveGlossaryEntry(entry('Brot'))
    renderPanel()

    fireEvent.click(screen.getByRole('button', { name: 'إضافة ملاحظة لـ "Haus"' }))
    fireEvent.change(screen.getByLabelText('ملاحظتك عن الكلمة'), { target: { value: 'مثل home بالإنجليزية' } })
    fireEvent.click(screen.getByRole('button', { name: 'حفظ الملاحظة' }))

    expect(getGlossaryEntries().find((item) => item.word === 'Haus')?.note).toBe('مثل home بالإنجليزية')
    expect(screen.getByTestId('entry-note')).toHaveTextContent('مثل home بالإنجليزية')

    search('home')
    expect(visibleWords()).toEqual(['Haus'])
  })

  it('edits and clears an existing note', () => {
    saveGlossaryEntry(entry('Haus', { note: 'قديمة' }))
    renderPanel()
    fireEvent.click(screen.getByRole('button', { name: 'تعديل ملاحظة "Haus"' }))
    expect(screen.getByLabelText('ملاحظتك عن الكلمة')).toHaveValue('قديمة')

    fireEvent.change(screen.getByLabelText('ملاحظتك عن الكلمة'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'حفظ الملاحظة' }))
    expect(getGlossaryEntries()[0]).not.toHaveProperty('note')
    expect(screen.queryByTestId('entry-note')).not.toBeInTheDocument()
  })

  it('leaves the note alone when editing is cancelled', () => {
    saveGlossaryEntry(entry('Haus', { note: 'قديمة' }))
    renderPanel()
    fireEvent.click(screen.getByRole('button', { name: 'تعديل ملاحظة "Haus"' }))
    fireEvent.change(screen.getByLabelText('ملاحظتك عن الكلمة'), { target: { value: 'جديدة' } })
    fireEvent.click(screen.getByRole('button', { name: 'إلغاء' }))
    expect(getGlossaryEntries()[0]?.note).toBe('قديمة')
  })
})
