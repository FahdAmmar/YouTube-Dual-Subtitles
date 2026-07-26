import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from '../App'
import { installMockYouTubeApi } from './testHelpers/mockYouTubePlayer'

beforeEach(() => {
  installMockYouTubeApi()
})

function makeVideoFile(name: string, type: string) {
  return new File(['fake video bytes'], name, { type })
}

// يوتيوب أوقف رسمياً setPlaybackQuality/getAvailableQualityLevels في IFrame
// API (لم تعد لها أي أثر فعلي) — هذه الاختبارات تُثبّت أن الواجهة أصبحت
// شارة معلوماتية غير تفاعلية فقط لفيديوهات يوتيوب، ولا تظهر إطلاقاً للفيديو
// المحلي (حيث لا معنى لمفهوم "جودة" بديلة أصلاً)
describe('video quality indicator', () => {
  it('shows a non-interactive AUTO badge for a YouTube video, with no selectable menu', async () => {
    render(<App />)

    fireEvent.change(screen.getByLabelText('VIDEO_URL'), {
      target: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    })
    fireEvent.click(screen.getByRole('button', { name: /تشغيل/ }))
    await waitFor(() => expect(screen.getByText(/DISPLAY_MODE/)).toBeInTheDocument())

    const badge = await screen.findByText('AUTO')
    expect(badge.tagName).toBe('SPAN')

    // لا يوجد أي زر قابل للنقر لفتح قائمة جودة، ولا قائمة نفسها
    expect(screen.queryByRole('button', { name: /جودة الفيديو/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('menu', { name: 'اختيار جودة الفيديو' })).not.toBeInTheDocument()

    fireEvent.click(badge)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('does not show any quality indicator for a local video file', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('radio', { name: '[ ملف من جهازي ]' }))
    fireEvent.change(screen.getByLabelText('اختيار ملف فيديو محلي'), {
      target: { files: [makeVideoFile('clip.mp4', 'video/mp4')] },
    })
    await waitFor(() => expect(screen.getByText(/DISPLAY_MODE/)).toBeInTheDocument())

    const video = document.querySelector('video') as HTMLVideoElement
    Object.defineProperty(video, 'duration', { value: 120, configurable: true })
    fireEvent(video, new Event('loadedmetadata'))

    await screen.findByRole('button', { name: 'تشغيل' })
    expect(screen.queryByText('AUTO')).not.toBeInTheDocument()
  })
})
