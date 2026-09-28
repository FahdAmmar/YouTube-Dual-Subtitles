import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { installMockYouTubeApi, type MockYouTubePlayer } from './testHelpers/mockYouTubePlayer'
import { fullText } from './testHelpers/fullText'

let activePlayer: MockYouTubePlayer | null = null

beforeEach(() => {
  activePlayer = null
  installMockYouTubeApi((player) => {
    activePlayer = player
  })
})

function makeFile(name: string, content: string) {
  return new File([content], name, { type: 'text/plain' })
}

const SOURCE_SRT = `1
00:00:01,000 --> 00:00:04,000
مرحباً بكم في هذا الفيديو

2
00:00:05,000 --> 00:00:08,000
هذا مثال على القهوة العربية

3
00:00:09,000 --> 00:00:12,000
شكراً لمشاهدتكم
`

const TRANSLATION_SRT = `1
00:00:01,200 --> 00:00:04,200
Welcome to this video

2
00:00:05,200 --> 00:00:08,200
This is an example about coffee

3
00:00:09,200 --> 00:00:12,200
Thanks for watching
`

async function loadVideoWithSubtitles() {
  render(<App />)
  fireEvent.change(screen.getByLabelText('VIDEO_URL'), {
    target: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
  })
  fireEvent.click(screen.getByRole('button', { name: /تشغيل/ }))
  await waitFor(() => expect(screen.getByText(/DISPLAY_MODE/)).toBeInTheDocument())

  await fireEvent.change(screen.getByLabelText('رفع ملف ترجمة العربية'), {
    target: { files: [makeFile('ar.srt', SOURCE_SRT)] },
  })
  await fireEvent.change(screen.getByLabelText('رفع ملف ترجمة الإنجليزية'), {
    target: { files: [makeFile('en.srt', TRANSLATION_SRT)] },
  })
  await waitFor(() => expect(screen.getByText('TRANSCRIPT — 3 SEG')).toBeInTheDocument())
}

describe('transcript search', () => {
  it('filters segments live and updates the match count in the header', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await loadVideoWithSubtitles()

    expect(screen.getByText('شكراً لمشاهدتكم')).toBeInTheDocument()
    // نص الترجمة الأجنبية أصبح كلمات منفصلة منذ ميزة "انقر على كلمة
    // لرؤية معناها" — انظر توثيق fullText
    expect(screen.getByText(fullText('This is an example about coffee'))).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('البحث داخل النص المفرَّغ'), { target: { value: 'coffee' } })

    await waitFor(() => expect(screen.getByText('TRANSCRIPT — 1/3 SEG')).toBeInTheDocument())
    expect(screen.getByText('هذا مثال على القهوة العربية')).toBeInTheDocument()
    expect(screen.queryByText('شكراً لمشاهدتكم')).not.toBeInTheDocument()
    expect(screen.queryByText(fullText('Welcome to this video'))).not.toBeInTheDocument()

    expect(screen.queryByText('حدث خطأ غير متوقع')).not.toBeInTheDocument()
    errorSpy.mockRestore()
  })

  it('matches Arabic source text even when the query itself is Arabic, independent of case for Latin text', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await loadVideoWithSubtitles()

    fireEvent.change(screen.getByLabelText('البحث داخل النص المفرَّغ'), { target: { value: 'مشاهدتكم' } })
    await waitFor(() => expect(screen.getByText('TRANSCRIPT — 1/3 SEG')).toBeInTheDocument())
    expect(screen.getByText('شكراً لمشاهدتكم')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('البحث داخل النص المفرَّغ'), { target: { value: 'WELCOME' } })
    await waitFor(() => expect(screen.getByText('TRANSCRIPT — 1/3 SEG')).toBeInTheDocument())
    expect(screen.getByText(fullText('Welcome to this video'))).toBeInTheDocument()

    expect(screen.queryByText('حدث خطأ غير متوقع')).not.toBeInTheDocument()
    errorSpy.mockRestore()
  })

  it('shows a distinct "no matches" message (not the generic empty-transcript message) when nothing matches', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await loadVideoWithSubtitles()

    fireEvent.change(screen.getByLabelText('البحث داخل النص المفرَّغ'), { target: { value: 'nonexistent-xyz' } })

    await waitFor(() => expect(screen.getByText(/NO_MATCHES/)).toBeInTheDocument())
    expect(screen.getByText(/لا يوجد مقطع يطابق عبارة البحث/)).toBeInTheDocument()
    expect(screen.queryByText(/NO_TRANSCRIPT_DATA/)).not.toBeInTheDocument()

    expect(screen.queryByText('حدث خطأ غير متوقع')).not.toBeInTheDocument()
    errorSpy.mockRestore()
  })

  it('restores the full list when the search is cleared via the clear button', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await loadVideoWithSubtitles()

    fireEvent.change(screen.getByLabelText('البحث داخل النص المفرَّغ'), { target: { value: 'coffee' } })
    await waitFor(() => expect(screen.getByText('TRANSCRIPT — 1/3 SEG')).toBeInTheDocument())

    fireEvent.click(screen.getByLabelText('مسح البحث'))

    await waitFor(() => expect(screen.getByText('TRANSCRIPT — 3 SEG')).toBeInTheDocument())
    expect(screen.getByText('شكراً لمشاهدتكم')).toBeInTheDocument()

    expect(screen.queryByText('حدث خطأ غير متوقع')).not.toBeInTheDocument()
    errorSpy.mockRestore()
  })

  it('clears the search on Escape, then blurs the field on a second Escape', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await loadVideoWithSubtitles()

    const searchInput = screen.getByLabelText('البحث داخل النص المفرَّغ')
    searchInput.focus()
    fireEvent.change(searchInput, { target: { value: 'coffee' } })
    await waitFor(() => expect(screen.getByText('TRANSCRIPT — 1/3 SEG')).toBeInTheDocument())

    fireEvent.keyDown(searchInput, { key: 'Escape' })
    await waitFor(() => expect(screen.getByText('TRANSCRIPT — 3 SEG')).toBeInTheDocument())
    expect(searchInput).toHaveFocus()

    fireEvent.keyDown(searchInput, { key: 'Escape' })
    expect(searchInput).not.toHaveFocus()

    expect(screen.queryByText('حدث خطأ غير متوقع')).not.toBeInTheDocument()
    errorSpy.mockRestore()
  })

  it('keeps a filtered segment clickable to seek the video to its start time', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await loadVideoWithSubtitles()

    fireEvent.change(screen.getByLabelText('البحث داخل النص المفرَّغ'), { target: { value: 'coffee' } })
    await waitFor(() => expect(screen.getByText('TRANSCRIPT — 1/3 SEG')).toBeInTheDocument())

    fireEvent.click(screen.getByText(fullText('This is an example about coffee')))

    await waitFor(() => expect(activePlayer?.getCurrentTime()).toBe(5))

    expect(screen.queryByText('حدث خطأ غير متوقع')).not.toBeInTheDocument()
    errorSpy.mockRestore()
  })

  it('preserves the original segment number in filtered results instead of renumbering', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await loadVideoWithSubtitles()

    // "شكراً لمشاهدتكم" هو المقطع الثالث أصلاً (SEG_003) — يجب أن يبقى كذلك حتى مُصفّى وحيداً
    fireEvent.change(screen.getByLabelText('البحث داخل النص المفرَّغ'), { target: { value: 'مشاهدتكم' } })
    await waitFor(() => expect(screen.getByText('TRANSCRIPT — 1/3 SEG')).toBeInTheDocument())
    expect(screen.getByText('SEG_003')).toBeInTheDocument()
    expect(screen.queryByText('SEG_001')).not.toBeInTheDocument()

    expect(screen.queryByText('حدث خطأ غير متوقع')).not.toBeInTheDocument()
    errorSpy.mockRestore()
  })

  it('focuses the search field via the "/" shortcut', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await loadVideoWithSubtitles()

    const searchInput = screen.getByLabelText('البحث داخل النص المفرَّغ')
    expect(searchInput).not.toHaveFocus()

    fireEvent.keyDown(window, { key: '/' })

    expect(searchInput).toHaveFocus()

    expect(screen.queryByText('حدث خطأ غير متوقع')).not.toBeInTheDocument()
    errorSpy.mockRestore()
  })

  it('does not trigger the "/" shortcut while already typing in the search field itself', async () => {
    const user = userEvent.setup()
    await loadVideoWithSubtitles()

    const searchInput = screen.getByLabelText('البحث داخل النص المفرَّغ')
    await user.click(searchInput)
    await user.keyboard('a/b')

    // "/" يجب أن يُكتَب حرفياً داخل الحقل، لا أن يُعامَل كاختصار عام
    expect(searchInput).toHaveValue('a/b')
  })
})
