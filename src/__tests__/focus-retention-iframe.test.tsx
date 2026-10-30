import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from '../App'
import { installMockYouTubeApi } from './testHelpers/mockYouTubePlayer'

beforeEach(() => {
  installMockYouTubeApi()
})

async function renderWithVideoLoaded() {
  render(<App />)
  fireEvent.change(screen.getByLabelText('رابط الفيديو'), {
    target: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
  })
  fireEvent.click(screen.getByRole('button', { name: /تشغيل/ }))
  await waitFor(() => expect(screen.getByText(/وضع العرض/)).toBeInTheDocument())
  // The player becomes ready a moment after the screen mounts (the watch screen is loaded on demand), and the
  // controls and shortcuts only exist once it is
  await screen.findByRole('button', { name: 'تشغيل' })
}

describe('keyboard shortcuts keep responding after the YouTube iframe steals focus', () => {
  it('reclaims focus from the iframe once it becomes focused, so shortcuts stay live', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await renderWithVideoLoaded()

    // محاكاة ما تفعله مكتبة يوتيوب الحقيقية بعد التحميل: تستبدل حاوية
    // المشغّل بعنصر iframe فعلي (المحاكي في الاختبارات لا يُنشئ iframe حقيقياً)
    const iframe = document.createElement('iframe')
    document.body.appendChild(iframe)
    const stage = screen.getByTestId('video-stage')

    // نقرة المستخدم داخل فيديو يوتيوب تنقل التركيز إلى الـ iframe تماماً
    // كما يفعل .focus() هنا — ويُصدر ذلك حدث focusin يصعد إلى document
    iframe.focus()

    // يجب أن يُستعاد التركيز فوراً إلى حاوية المسرح بدل البقاء عالقاً في الـ iframe
    await waitFor(() => expect(document.activeElement).toBe(stage))

    // العنصر الحاسم: يجب أن تبقى الاختصارات فعّالة بعد استعادة التركيز
    fireEvent.keyDown(window, { key: ' ' })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'إيقاف مؤقت' })).toBeInTheDocument()
    })

    document.body.removeChild(iframe)
    expect(screen.queryByText('حدث خطأ غير متوقع')).not.toBeInTheDocument()
    errorSpy.mockRestore()
  })
})
