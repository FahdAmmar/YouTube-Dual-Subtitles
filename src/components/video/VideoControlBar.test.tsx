import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VideoControlBar } from './VideoControlBar'
import { YT_PLAYER_STATE } from '@/types/youtube.types'

function renderBar(extra: Partial<Parameters<typeof VideoControlBar>[0]> = {}) {
  return render(
    <VideoControlBar
      playerState={YT_PLAYER_STATE.PAUSED}
      duration={100}
      getCurrentTime={() => 0}
      onPlay={vi.fn()}
      onPause={vi.fn()}
      onSeek={vi.fn()}
      onToggleMute={vi.fn()}
      onSetVolume={vi.fn()}
      initialAudioState={{ isMuted: false, volume: 100 }}
      isFullscreen={false}
      onToggleFullscreen={vi.fn()}
      playbackRate={1}
      onSetPlaybackRate={vi.fn()}
      qualityLevels={[]}
      currentQuality="auto"
      isShadowingEnabled={false}
      onToggleShadowing={vi.fn()}
      {...extra}
    />,
  )
}

describe('VideoControlBar picture-in-picture button', () => {
  it('is hidden when no handler is provided', () => {
    renderBar()
    expect(screen.queryByRole('button', { name: /صورة داخل صورة/ })).not.toBeInTheDocument()
  })

  it('calls the handler and reflects the active state', async () => {
    const onToggle = vi.fn()
    renderBar({ onTogglePictureInPicture: onToggle, isPictureInPictureActive: true })

    const button = screen.getByRole('button', { name: /صورة داخل صورة/ })
    expect(button).toHaveAttribute('aria-pressed', 'true')

    await userEvent.click(button)
    expect(onToggle).toHaveBeenCalledOnce()
  })
})
