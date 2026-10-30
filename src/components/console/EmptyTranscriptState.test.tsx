import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { EmptyTranscriptState } from './EmptyTranscriptState'
import { YT_DLP_COMMAND } from '@/constants/subtitleHelp'

describe('EmptyTranscriptState', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    })
  })

  it('tells a new user to upload a subtitle file and copies the yt-dlp command in one tap', async () => {
    render(<EmptyTranscriptState reason="no-subtitles" />)

    expect(screen.getByText('ارفع ملف ترجمة واحداً على الأقل لعرض النص هنا')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /نسخ أمر تنزيل الترجمة/ }))

    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(YT_DLP_COMMAND))
    expect(await screen.findByRole('status')).toHaveTextContent('تم النسخ')
  })

  it('explains an empty search and an empty bookmarks list without offering the download command', () => {
    const { rerender } = render(<EmptyTranscriptState reason="no-matches" />)
    expect(screen.getByText('لا يوجد مقطع يطابق عبارة البحث')).toBeInTheDocument()

    rerender(<EmptyTranscriptState reason="no-bookmarks" />)
    expect(screen.getByText(/لم تحفظ أي جملة بعد/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /نسخ أمر/ })).not.toBeInTheDocument()
  })
})
