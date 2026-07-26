import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from '../App'
import { installMockYouTubeApi, type MockYouTubePlayer } from './testHelpers/mockYouTubePlayer'

const PROGRESS_STORAGE_KEY = 'ydc:video-progress'
const VIDEO_ID = 'dQw4w9WgXcQ'
const VIDEO_URL = `https://www.youtube.com/watch?v=${VIDEO_ID}`
// المشغّل المحاكي يُعيد 120 دوماً كمدّة ثابتة (انظر MockYouTubePlayer.getDuration)
const MOCK_DURATION = 120

let latestPlayerInstance: MockYouTubePlayer | null = null

beforeEach(() => {
  latestPlayerInstance = null
  installMockYouTubeApi((instance) => {
    latestPlayerInstance = instance
  })
})

afterEach(() => {
  window.localStorage.clear()
})

async function loadVideo() {
  render(<App />)

  fireEvent.change(screen.getByLabelText('VIDEO_URL'), {
    target: { value: VIDEO_URL },
  })
  fireEvent.click(screen.getByRole('button', { name: /تشغيل/ }))

  await waitFor(() => expect(screen.getByText(/DISPLAY_MODE/)).toBeInTheDocument())
}

describe('video watch progress', () => {
  it('resumes from the previously saved position once the player is ready', async () => {
    window.localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({ [`youtube:${VIDEO_ID}`]: { time: 45, duration: MOCK_DURATION, savedAt: Date.now() } }),
    )

    await loadVideo()

    await waitFor(() => {
      expect(latestPlayerInstance?.getCurrentTime()).toBe(45)
    })
  })

  it('does not resume for a video that was already essentially finished', async () => {
    // 115 من أصل 120 ثانية — ضمن نطاق END_GUARD_SECONDS، أي أن المستخدم
    // أنهى الفيديو عملياً في زيارة سابقة؛ يجب ألا يُعاد إليه قرب النهاية
    window.localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({ [`youtube:${VIDEO_ID}`]: { time: 115, duration: MOCK_DURATION, savedAt: Date.now() } }),
    )

    await loadVideo()

    // مهلة قصيرة كافية لمنح تأثير الاستعادة فرصة للعمل لو كان سيعمل خطأً
    await new Promise((resolve) => setTimeout(resolve, 300))
    expect(latestPlayerInstance?.getCurrentTime()).toBe(0)
  })

  it('does not resume when there is no saved entry for this video', async () => {
    await loadVideo()

    await new Promise((resolve) => setTimeout(resolve, 300))
    expect(latestPlayerInstance?.getCurrentTime()).toBe(0)
  })

  it('periodically saves the current position to localStorage', async () => {
    await loadVideo()
    latestPlayerInstance?.setTime(30)

    // الحفظ الدوري كل 4 ثوانٍ حقيقية (SAVE_INTERVAL_MS) — انتظار حقيقي هنا
    // بنفس النمط المُتَّبع في بقية اختبارات هذا المشروع (لا مؤقتات وهمية)
    await waitFor(
      () => {
        const raw = window.localStorage.getItem(PROGRESS_STORAGE_KEY)
        expect(raw).not.toBeNull()
        const map = JSON.parse(raw ?? '{}') as Record<string, { time: number }>
        expect(map[`youtube:${VIDEO_ID}`]?.time).toBe(30)
      },
      { timeout: 6000 },
    )
  }, 8000)
})
