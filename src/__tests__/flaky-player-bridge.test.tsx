import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from '../App'
import { MockYouTubePlayer, type MockYouTubePlayerOptions } from './testHelpers/mockYouTubePlayer'

/**
 * محاكٍ يحاكي بالضبط سيناريو التقرير: getCurrentTime يعمل بشكل طبيعي عدة
 * مرات (تماماً كالتشغيل السليم لعدة دقائق)، ثم يبدأ فجأة برمي استثناء —
 * يحاكي انقطاعاً حقيقياً في جسر postMessage بين الصفحة وiframe يوتيوب
 * (تقييد تبويب غير نشط، انقطاع شبكة مؤقت...) والذي يصبح أكثر احتمالاً كلما
 * طال زمن التشغيل، وهو تحديداً ما أبلغ عنه المستخدم: "بعد فترة من التشغيل"
 */
class FlakyMockPlayer extends MockYouTubePlayer {
  private callCount = 0
  private readonly failAfterCalls: number

  constructor(elementId: string, options: MockYouTubePlayerOptions, failAfterCalls: number) {
    super(elementId, options)
    this.failAfterCalls = failAfterCalls
  }

  override getCurrentTime(): number {
    this.callCount += 1
    if (this.callCount > this.failAfterCalls) {
      throw new Error('postMessage bridge to youtube-nocookie.com iframe timed out')
    }
    return super.getCurrentTime()
  }
}

beforeEach(() => {
  window.YT = {
    Player: class extends FlakyMockPlayer {
      constructor(elementId: string, options: MockYouTubePlayerOptions) {
        // يفشل بعد 3 نبضات ناجحة لمحاكاة "بعد فترة من التشغيل" وليس فوراً
        super(elementId, options, 3)
      }
    },
  }
})

describe('resilience against a flaky YouTube postMessage bridge', () => {
  it('keeps working after getCurrentTime starts throwing mid-playback', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<App />)

    fireEvent.change(screen.getByLabelText('VIDEO_URL'), {
      target: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    })
    fireEvent.click(screen.getByRole('button', { name: /تشغيل/ }))

    await waitFor(() => expect(screen.getByText(/DISPLAY_MODE/)).toBeInTheDocument())

    // بدء التشغيل الفعلي؛ يُفعّل مؤقت الاستطلاع (usePlayerTime) الذي
    // يستدعي getCurrentTime بشكل متكرر — وهو ما سيبدأ بالفشل بعد قليل
    fireEvent.click(screen.getByRole('button', { name: 'تشغيل' }))

    // انتظار عدة نبضات حقيقية (120ms لكل نبضة)، متجاوزين نقطة الفشل المحاكاة
    await new Promise((resolve) => setTimeout(resolve, 900))

    // التطبيق يجب أن يبقى شغّالاً بشكل طبيعي تماماً، دون أي شاشة خطأ
    expect(screen.queryByText('حدث خطأ غير متوقع')).not.toBeInTheDocument()
    expect(screen.getByText(/DISPLAY_MODE/)).toBeInTheDocument()

    errorSpy.mockRestore()
  })
})
