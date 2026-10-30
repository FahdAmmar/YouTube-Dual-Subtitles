import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { GlossaryPanel } from '@/components/console/GlossaryPanel'
import { VideoKeyProvider } from '@/context/VideoKeyContext'
import { getGlossaryEntries, saveGlossaryEntry, makeGlossaryEntryId } from '@/lib/utils/glossaryStore'
import type { GlossaryEntry } from '@/types/glossary.types'

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

function startReview() {
  render(
    <VideoKeyProvider value={null}>
      <GlossaryPanel isOpen onClose={() => {}} />
    </VideoKeyProvider>,
  )
  fireEvent.click(screen.getByRole('button', { name: /مراجعة الكلمات المستحقة/ }))
}

const press = (key: string) => fireEvent.keyDown(document.body, { key })
const reviewOf = (word: string) => getGlossaryEntries().find((item) => item.word === word)?.review

describe('reviewing with the keyboard', () => {
  it('reveals the answer with Space, then grades with the number keys', () => {
    saveGlossaryEntry(entry('Haus'))
    startReview()
    expect(screen.queryByText('ترجمة Haus')).not.toBeInTheDocument()

    press(' ')
    expect(screen.getByText('ترجمة Haus')).toBeInTheDocument()

    press('2')
    expect(reviewOf('Haus')?.box).toBe(1)
    expect(screen.getByText('أنهيت مراجعة اليوم')).toBeInTheDocument()
  })

  it('reveals with Enter too', () => {
    saveGlossaryEntry(entry('Haus'))
    startReview()
    press('Enter')
    expect(screen.getByText('ترجمة Haus')).toBeInTheDocument()
  })

  it('maps 1 to "forgot", 2 to "remembered" and 3 to "easy"', () => {
    for (const word of ['eins', 'zwei', 'drei']) saveGlossaryEntry(entry(word))
    startReview()
    for (const key of ['1', '2', '3']) {
      press(' ')
      press(key)
    }
    expect(reviewOf('eins')?.box).toBe(0)
    expect(reviewOf('zwei')?.box).toBe(1)
    expect(reviewOf('drei')?.box).toBe(2)
  })

  it('accepts the Arabic-Indic digits of an Arabic keyboard layout', () => {
    saveGlossaryEntry(entry('Haus'))
    startReview()
    press(' ')
    press('٣')
    expect(reviewOf('Haus')?.box).toBe(2)
  })

  it('ignores the number keys until the answer is shown, so a stray key never grades a word unseen', () => {
    saveGlossaryEntry(entry('Haus'))
    startReview()
    press('3')
    expect(reviewOf('Haus')).toBeUndefined()
    expect(screen.queryByText('أنهيت مراجعة اليوم')).not.toBeInTheDocument()
  })

  it('ignores keys pressed together with Ctrl, Alt or Cmd', () => {
    saveGlossaryEntry(entry('Haus'))
    startReview()
    fireEvent.keyDown(document.body, { key: ' ', ctrlKey: true })
    expect(screen.queryByText('ترجمة Haus')).not.toBeInTheDocument()
  })

  it('does not double-reveal or skip when Space is pressed on the focused reveal button', () => {
    for (const word of ['eins', 'zwei']) saveGlossaryEntry(entry(word))
    startReview()
    const reveal = screen.getByRole('button', { name: /إظهار الإجابة/ })
    reveal.focus()
    fireEvent.keyDown(reveal, { key: ' ' })
    // The browser turns Space on a button into a click; the key handler must leave that to the button
    expect(screen.queryByText('ترجمة eins')).not.toBeInTheDocument()
    fireEvent.click(reveal)
    expect(screen.getByText('ترجمة eins')).toBeInTheDocument()
  })

  it('shows the key next to each answer button', () => {
    saveGlossaryEntry(entry('Haus'))
    startReview()
    press(' ')
    for (const [name, key] of [
      [/لم أتذكرها/, '1'],
      [/تذكرتها/, '2'],
      [/سهلة/, '3'],
    ] as const) {
      expect(screen.getByRole('button', { name })).toHaveAttribute('aria-keyshortcuts', key)
    }
  })
})

describe('review progress and summary', () => {
  it('shows a progress bar that advances with every answer', () => {
    for (const word of ['eins', 'zwei']) saveGlossaryEntry(entry(word))
    startReview()
    const bar = screen.getByRole('progressbar', { name: 'تقدّم المراجعة' })
    expect(bar).toHaveAttribute('aria-valuemax', '2')
    expect(bar).toHaveAttribute('aria-valuenow', '0')

    press(' ')
    press('2')
    expect(screen.getByRole('progressbar', { name: 'تقدّم المراجعة' })).toHaveAttribute('aria-valuenow', '1')
  })

  it('ends with a summary of the answers and the words that were forgotten', () => {
    for (const word of ['eins', 'zwei', 'drei']) saveGlossaryEntry(entry(word))
    startReview()
    for (const key of ['1', '2', '3']) {
      press(' ')
      press(key)
    }
    const summary = screen.getByTestId('review-summary')
    expect(summary).toHaveTextContent('لم أتذكرها: 1')
    expect(summary).toHaveTextContent('تذكرتها: 1')
    expect(summary).toHaveTextContent('سهلة: 1')
    expect(screen.getByTestId('review-forgotten')).toHaveTextContent('eins')
    expect(screen.getByTestId('review-forgotten')).not.toHaveTextContent('zwei')
  })

  it('does not list forgotten words when every answer was right', () => {
    saveGlossaryEntry(entry('Haus'))
    startReview()
    press(' ')
    press('2')
    expect(screen.queryByTestId('review-forgotten')).not.toBeInTheDocument()
  })
})

describe('limiting new words per session', () => {
  it('offers a cap on new words and applies it to the review button', () => {
    for (let index = 0; index < 8; index += 1) saveGlossaryEntry(entry(`wort${index}`))
    render(
      <VideoKeyProvider value={null}>
        <GlossaryPanel isOpen onClose={() => {}} />
      </VideoKeyProvider>,
    )
    expect(screen.getByRole('button', { name: /مراجعة الكلمات المستحقة \(8\)/ })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('كلمات جديدة في كل جلسة مراجعة'), { target: { value: '5' } })
    expect(screen.getByRole('button', { name: /مراجعة الكلمات المستحقة \(5\)/ })).toBeInTheDocument()
  })

  it('remembers the chosen cap', () => {
    for (let index = 0; index < 8; index += 1) saveGlossaryEntry(entry(`wort${index}`))
    window.localStorage.setItem('ydc:review-new-limit', '5')
    render(
      <VideoKeyProvider value={null}>
        <GlossaryPanel isOpen onClose={() => {}} />
      </VideoKeyProvider>,
    )
    expect(screen.getByRole('button', { name: /مراجعة الكلمات المستحقة \(5\)/ })).toBeInTheDocument()
  })

  it('falls back to the default when storage holds something unreadable', () => {
    for (let index = 0; index < 8; index += 1) saveGlossaryEntry(entry(`wort${index}`))
    window.localStorage.setItem('ydc:review-new-limit', '"lots"')
    render(
      <VideoKeyProvider value={null}>
        <GlossaryPanel isOpen onClose={() => {}} />
      </VideoKeyProvider>,
    )
    expect(screen.getByRole('button', { name: /مراجعة الكلمات المستحقة \(8\)/ })).toBeInTheDocument()
  })
})
