import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import App from '../App'
import { installMockYouTubeApi } from './testHelpers/mockYouTubePlayer'

beforeEach(() => {
  window.localStorage.clear()
  installMockYouTubeApi(() => {})
})

afterEach(() => {
  Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true })
})

const file = (name: string, content: string) => new File([content], name, { type: 'text/plain' })
const SRT = (text: string) => `1\n00:00:01,000 --> 00:00:03,000\n${text}\n`

async function startVideo() {
  render(<App />)
  fireEvent.change(screen.getByLabelText('VIDEO_URL'), {
    target: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
  })
  fireEvent.click(screen.getByRole('button', { name: /تشغيل/ }))
  await waitFor(() => expect(screen.getByText(/DISPLAY_MODE/)).toBeInTheDocument())
}

function dispatchDrop(files: File[]) {
  const event = new Event('drop', { cancelable: true })
  Object.defineProperty(event, 'dataTransfer', { value: { types: ['Files'], files } })
  act(() => {
    window.dispatchEvent(event)
  })
}

describe('dropping and pasting subtitles', () => {
  it('fills both tracks when two files are dropped on the page', async () => {
    await startVideo()
    dispatchDrop([file('ar.srt', SRT('مرحباً')), file('en.srt', SRT('Hello'))])

    await waitFor(() => expect(screen.getByText('ar.srt')).toBeInTheDocument())
    expect(screen.getByText('en.srt')).toBeInTheDocument()
  })

  it('puts a single dropped file in the empty source track first', async () => {
    await startVideo()
    dispatchDrop([file('only.srt', SRT('Hello'))])

    await waitFor(() => expect(screen.getByText('only.srt')).toBeInTheDocument())
  })

  it('ignores dropped files that are not subtitles', async () => {
    await startVideo()
    dispatchDrop([file('photo.png', 'x')])

    expect(screen.queryByText('photo.png')).not.toBeInTheDocument()
  })

  it('loads subtitle text pasted anywhere outside a text field', async () => {
    await startVideo()
    const event = new Event('paste', { cancelable: true })
    Object.defineProperty(event, 'clipboardData', {
      value: { files: [], getData: () => SRT('Pasted line') },
    })
    act(() => {
      window.dispatchEvent(event)
    })

    await waitFor(() => expect(screen.getByText('pasted.srt')).toBeInTheDocument())
  })

  it('does not hijack pasting into the URL field', async () => {
    render(<App />)
    const input = screen.getByLabelText('VIDEO_URL')
    const event = new Event('paste', { bubbles: true, cancelable: true })
    Object.defineProperty(event, 'clipboardData', { value: { files: [], getData: () => SRT('x') } })
    act(() => {
      input.dispatchEvent(event)
    })

    expect(screen.queryByText('pasted.srt')).not.toBeInTheDocument()
  })
})
