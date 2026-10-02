import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import App from '../App'
import { installMockYouTubeApi } from './testHelpers/mockYouTubePlayer'

beforeEach(() => {
  window.localStorage.clear()
  installMockYouTubeApi()
})

const makeFile = (name: string, content: string) => new File([content], name, { type: 'text/plain' })

const ASS_SOURCE = `[Script Info]
ScriptType: v4.00+

[V4+ Styles]
Format: Name, Fontname, Fontsize
Style: Default,Arial,20

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:04.00,Default,,0,0,0,,{\\an2}مرحباً بكم\\Nفي هذا الفيديو
Dialogue: 0,0:00:05.00,0:00:08.00,Default,,0,0,0,,{\\p1}m 0 0 l 50 50{\\p0}
Dialogue: 0,0:00:05.00,0:00:08.00,Default,,0,0,0,,هذا مثال، على القهوة
Comment: 0,0:00:09.00,0:00:10.00,Default,,0,0,0,,Translator note
`

async function openVideo() {
  render(<App />)
  fireEvent.change(screen.getByLabelText('VIDEO_URL'), {
    target: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
  })
  fireEvent.click(screen.getByRole('button', { name: /تشغيل/ }))
  await waitFor(() => expect(screen.getByText(/DISPLAY_MODE/)).toBeInTheDocument())
}

describe('ASS / SSA subtitle upload', () => {
  it('offers .ass and .ssa in both file pickers', async () => {
    await openVideo()
    for (const label of ['رفع ملف ترجمة العربية', 'رفع ملف ترجمة ثنائي اللغة']) {
      const accept = screen.getByLabelText(label).getAttribute('accept') ?? ''
      expect(accept.split(',')).toEqual(expect.arrayContaining(['.srt', '.vtt', '.ass', '.ssa']))
    }
  })

  it('loads an .ass file as a track, skipping drawings and comments', async () => {
    await openVideo()

    fireEvent.change(screen.getByLabelText('رفع ملف ترجمة العربية'), {
      target: { files: [makeFile('episode.ass', ASS_SOURCE)] },
    })

    await waitFor(() => expect(screen.getByText('TRANSCRIPT — 2 SEG')).toBeInTheDocument())
    const transcript = within(screen.getByRole('complementary'))
    expect(transcript.getByText('episode.ass')).toBeInTheDocument()
    expect(transcript.getByText(/هذا مثال، على القهوة/)).toBeInTheDocument()
    expect(transcript.queryByText(/Translator note/)).not.toBeInTheDocument()
  })

  it('keeps the original error handling for formats that are still unsupported', async () => {
    await openVideo()

    fireEvent.change(screen.getByLabelText('رفع ملف ترجمة العربية'), {
      target: { files: [makeFile('episode.sub', 'x')] },
    })

    expect(await screen.findByText(/المسموح: SRT أو VTT أو ASS أو SSA/)).toBeInTheDocument()
  })
})
