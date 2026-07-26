import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from '../App'
import { installMockYouTubeApi, type MockYouTubePlayer } from './testHelpers/mockYouTubePlayer'

let activePlayer: MockYouTubePlayer | null = null

beforeEach(() => {
  activePlayer = null
  installMockYouTubeApi((player) => {
    activePlayer = player
  })
  document.documentElement.style.removeProperty('--color-console')
})

function makeFile(name: string, content: string) {
  return new File([content], name, { type: 'text/plain' })
}

const SOURCE_SRT = `1\n00:00:01,000 --> 00:00:08,000\nمرحباً\n`
const TRANSLATION_SRT = `1\n00:00:01,000 --> 00:00:08,000\nHello\n`

describe('dynamic site accent color', () => {
  it('updates --color-console live when the English (trackB) subtitle color changes', async () => {
    render(<App />)

    fireEvent.change(screen.getByLabelText('VIDEO_URL'), {
      target: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    })
    fireEvent.click(screen.getByRole('button', { name: /تشغيل/ }))
    await waitFor(() => expect(screen.getByText(/DISPLAY_MODE/)).toBeInTheDocument())

    const initialConsoleColor = getComputedStyle(document.documentElement).getPropertyValue('--color-console').trim()
    expect(initialConsoleColor.length).toBeGreaterThan(0)

    fireEvent.click(screen.getByLabelText('فتح إعدادات حجم ولون الترجمة'))
    await screen.findByRole('dialog', { name: 'إعدادات عرض الترجمة' })
    const trackBColorInput = document.getElementById('font-color-الإنجليزية') as HTMLInputElement
    expect(trackBColorInput).toBeInTheDocument()

    fireEvent.change(trackBColorInput, { target: { value: '#ff2255' } })

    await waitFor(() => {
      const updatedConsoleColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--color-console')
        .trim()
      expect(updatedConsoleColor).not.toBe(initialConsoleColor)
    })

    // تغيير آخر يُثبت أن الربط حيّ ومستمر، وليس مجرد قراءة أولى لمرة واحدة
    const afterFirstChange = getComputedStyle(document.documentElement).getPropertyValue('--color-console').trim()
    fireEvent.change(trackBColorInput, { target: { value: '#22ccff' } })
    await waitFor(() => {
      const secondChange = getComputedStyle(document.documentElement).getPropertyValue('--color-console').trim()
      expect(secondChange).not.toBe(afterFirstChange)
    })
  })

  it('adds a pulsing glow class to the currently active transcript scene', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
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
    await waitFor(() => expect(screen.getByText('Hello')).toBeInTheDocument())

    expect(activePlayer).not.toBeNull()
    activePlayer!.setTime(2)
    fireEvent.click(screen.getByRole('button', { name: 'تشغيل' }))

    await waitFor(() => {
      const activeSlice = screen.getAllByText('Hello').find((element) => element.closest('button'))?.closest('button')
      expect(activeSlice).toHaveClass('animate-glow-pulse')
    })

    expect(screen.queryByText('حدث خطأ غير متوقع')).not.toBeInTheDocument()
    errorSpy.mockRestore()
  })
})
