import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from '../App'
import { installMockYouTubeApi } from './testHelpers/mockYouTubePlayer'

beforeEach(() => {
  window.localStorage.clear()
  installMockYouTubeApi()
})

const HOME_BUTTON_NAME = 'العودة إلى الشاشة الرئيسية'

describe('home navigation button', () => {
  it('is absent on the home screen itself, appears in the player layout, and returns home', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<App />)

    // المرحلة الأولى (الشاشة الرئيسية): لا معنى لزر العودة إليها فلا يُعرض إطلاقاً
    expect(screen.queryByRole('button', { name: HOME_BUTTON_NAME })).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('VIDEO_URL'), {
      target: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    })
    fireEvent.click(screen.getByRole('button', { name: /تشغيل/ }))

    await waitFor(() => expect(screen.getByText(/DISPLAY_MODE/)).toBeInTheDocument())

    const homeButton = screen.getByRole('button', { name: HOME_BUTTON_NAME })
    fireEvent.click(homeButton)

    // الرجوع للرئيسية: نموذج الرابط يعود، والزر يختفي مع تخطيط لوحة التحكم
    await waitFor(() => expect(screen.getByLabelText('VIDEO_URL')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: HOME_BUTTON_NAME })).not.toBeInTheDocument()

    // والعملية قابلة للتكرار: الفيديو نفسه يفتح مرة أخرى بلا أي خطأ
    fireEvent.change(screen.getByLabelText('VIDEO_URL'), {
      target: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    })
    fireEvent.click(screen.getByRole('button', { name: /تشغيل/ }))
    await waitFor(() => expect(screen.getByText(/DISPLAY_MODE/)).toBeInTheDocument())

    errorSpy.mockRestore()
  })
})
