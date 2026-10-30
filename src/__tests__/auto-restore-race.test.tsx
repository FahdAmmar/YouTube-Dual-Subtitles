import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react'
import App from '../App'
import { installMockYouTubeApi } from './testHelpers/mockYouTubePlayer'
import { resetIndexedDb } from './testHelpers/resetIndexedDb'

// Reopening a video restores its subtitle files from IndexedDB on its own, while the person (or a test) may upload
// the same files at the same moment. Which of the two finishes first depends on the machine: the restore needs
// several IndexedDB round trips, the upload needs one file read. These tests pin that order with explicit delays
// so every machine exercises both orders, instead of passing or failing by luck of timing.
const timing = vi.hoisted(() => ({ restoreReadMs: 0, bilingualParseMs: 0, restoreReadsFinished: 0 }))

vi.mock('@/lib/utils/subtitleContentStore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils/subtitleContentStore')>()
  return {
    ...actual,
    getSubtitleContent: async (...args: Parameters<typeof actual.getSubtitleContent>) => {
      if (timing.restoreReadMs > 0) await new Promise((resolve) => setTimeout(resolve, timing.restoreReadMs))
      const content = await actual.getSubtitleContent(...args)
      timing.restoreReadsFinished += 1
      return content
    },
  }
})

vi.mock('@/lib/subtitles/parseSubtitleFile', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/subtitles/parseSubtitleFile')>()
  return {
    ...actual,
    parseSubtitleFile: async (file: File) => {
      // Only the bilingual file carries both languages in one cue; the restored per-track files never do
      const text = await file.text()
      if (timing.bilingualParseMs > 0 && text.includes('Hello') && text.includes('مرحباً')) {
        await new Promise((resolve) => setTimeout(resolve, timing.bilingualParseMs))
      }
      return actual.parseSubtitleFile(new File([text], file.name))
    },
  }
})

const VIDEO_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
const BILINGUAL_SRT = `1\n00:00:01,000 --> 00:00:04,000\nمرحباً\nHello\n`
const OTHER_SOURCE_SRT = `1\n00:00:01,000 --> 00:00:04,000\nأهلاً بالعالم\n`

function makeFile(name: string, content: string) {
  return new File([content], name, { type: 'text/plain' })
}

async function openVideo() {
  render(<App />)
  fireEvent.change(screen.getByLabelText('رابط الفيديو'), { target: { value: VIDEO_URL } })
  fireEvent.click(screen.getByRole('button', { name: /تشغيل/ }))
  await waitFor(() => expect(screen.getByText(/وضع العرض/)).toBeInTheDocument())
}

async function uploadBilingual() {
  fireEvent.change(screen.getByLabelText('رفع ملف ترجمة ثنائي اللغة'), {
    target: { files: [makeFile('dual.srt', BILINGUAL_SRT)] },
  })
}

/** First visit: load the bilingual file and delay only the translation track, so a saved offset and stored content exist */
async function firstVisitWithTranslationDelayed() {
  timing.restoreReadMs = 0
  timing.bilingualParseMs = 0
  await openVideo()
  await uploadBilingual()
  await waitFor(() => expect(screen.getAllByText('dual.srt').length).toBeGreaterThan(0))
  fireEvent.click(screen.getAllByLabelText(/تأخير ترجمة/)[1]!)
  await waitFor(() => expect(screen.getByText('+0.25ث')).toBeInTheDocument())
  // The files are written to IndexedDB in the background; give those writes time to land before the page "closes"
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 150))
  })
  cleanup()
}

/** Waits until the automatic restore has read both stored files, then lets the tracks settle */
async function waitForRestoreToFinish() {
  await waitFor(() => expect(timing.restoreReadsFinished).toBeGreaterThanOrEqual(2))
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 120))
  })
}

beforeEach(() => {
  installMockYouTubeApi()
  timing.restoreReadMs = 0
  timing.bilingualParseMs = 0
  timing.restoreReadsFinished = 0
})

afterEach(() => {
  timing.restoreReadMs = 0
  timing.bilingualParseMs = 0
  window.localStorage.clear()
  resetIndexedDb()
})

describe('subtitle auto-restore racing a manual upload', () => {
  it('keeps each track\'s saved offset when the upload finishes before the automatic restore', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await firstVisitWithTranslationDelayed()

    timing.restoreReadsFinished = 0
    timing.restoreReadMs = 300
    await openVideo()
    await uploadBilingual()
    await waitForRestoreToFinish()

    expect(screen.getByText('0.0ث')).toBeInTheDocument() // source: unchanged
    expect(screen.getByText('+0.25ث')).toBeInTheDocument() // translation: its own saved delay survived the late restore
    errorSpy.mockRestore()
  })

  it('keeps each track\'s saved offset when the automatic restore finishes before the upload', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await firstVisitWithTranslationDelayed()

    timing.restoreReadsFinished = 0
    timing.bilingualParseMs = 300
    await openVideo()
    await uploadBilingual()
    await waitForRestoreToFinish()
    await waitFor(() => expect(screen.getByText('+0.25ث')).toBeInTheDocument())

    expect(screen.getByText('0.0ث')).toBeInTheDocument()
    errorSpy.mockRestore()
  })

  it('restores both tracks and their offsets exactly once when nothing is uploaded', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await firstVisitWithTranslationDelayed()

    timing.restoreReadsFinished = 0
    timing.restoreReadMs = 40
    await openVideo()
    await waitForRestoreToFinish()

    expect(screen.getByText('0.0ث')).toBeInTheDocument()
    expect(screen.getByText('+0.25ث')).toBeInTheDocument()
    // One read per track: a second, duplicate restore would also reset the offset it has just brought back
    expect(timing.restoreReadsFinished).toBe(2)
    errorSpy.mockRestore()
  })

  it('does not replace a file the person loaded while the automatic restore was still reading', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await firstVisitWithTranslationDelayed()

    timing.restoreReadsFinished = 0
    timing.restoreReadMs = 300
    await openVideo()
    fireEvent.change(screen.getByLabelText('رفع ملف ترجمة العربية'), {
      target: { files: [makeFile('other.srt', OTHER_SOURCE_SRT)] },
    })
    await waitFor(() => expect(screen.getByText('other.srt')).toBeInTheDocument())
    await waitForRestoreToFinish()

    // The source track keeps the newer upload; only the untouched translation track is restored from storage
    expect(screen.getByText('other.srt')).toBeInTheDocument()
    expect(screen.getAllByText('dual.srt')).toHaveLength(1)
    errorSpy.mockRestore()
  })
})
