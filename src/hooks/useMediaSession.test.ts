import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useMediaSession } from './useMediaSession'

type Handler = (details: Record<string, unknown>) => void

interface FakeSession {
  metadata: { title: string } | null
  playbackState: string
  handlers: Map<string, Handler | null>
  setActionHandler: ReturnType<typeof vi.fn>
  setPositionState: ReturnType<typeof vi.fn>
}

function installFakeMediaSession(): FakeSession {
  const session: FakeSession = {
    metadata: null,
    playbackState: 'none',
    handlers: new Map(),
    setActionHandler: vi.fn((action: string, handler: Handler | null) => {
      session.handlers.set(action, handler)
    }),
    setPositionState: vi.fn(),
  }
  Object.defineProperty(navigator, 'mediaSession', { value: session, configurable: true })
  vi.stubGlobal('MediaMetadata', class { constructor(public init: { title: string }) { this.title = init.title } title: string })
  return session
}

function makeControls() {
  return { onPlay: vi.fn(), onPause: vi.fn(), onSeekTo: vi.fn(), onPrevScene: vi.fn(), onNextScene: vi.fn() }
}

function setup(overrides: Partial<Parameters<typeof useMediaSession>[0]> = {}) {
  const controls = makeControls()
  const time = { current: 50 }
  const options = {
    enabled: true,
    title: 'My video',
    isPlaying: true,
    duration: 100,
    playbackRate: 1,
    getCurrentTime: () => time.current,
    controls,
    ...overrides,
  }
  const hook = renderHook((props: typeof options) => useMediaSession(props), { initialProps: options })
  return { ...hook, controls, time, options }
}

let session: FakeSession
beforeEach(() => {
  vi.useFakeTimers()
  session = installFakeMediaSession()
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  Reflect.deleteProperty(navigator, 'mediaSession')
})

const fire = (action: string, details: Record<string, unknown> = {}) => session.handlers.get(action)?.(details)

describe('useMediaSession', () => {
  it('publishes the title and playback state, and registers the transport handlers', () => {
    setup()
    expect(session.metadata?.title).toBe('My video')
    expect(session.playbackState).toBe('playing')
    for (const action of ['play', 'pause', 'seekbackward', 'seekforward', 'seekto', 'previoustrack', 'nexttrack']) {
      expect(session.handlers.get(action)).toBeTypeOf('function')
    }
  })

  it('reports paused when playback is paused', () => {
    setup({ isPlaying: false })
    expect(session.playbackState).toBe('paused')
  })

  it('does nothing while the player is not ready', () => {
    setup({ enabled: false })
    expect(session.setActionHandler).not.toHaveBeenCalled()
    expect(session.metadata).toBeNull()
  })

  it('maps play and pause to the player', () => {
    const { controls } = setup()
    fire('play')
    fire('pause')
    expect(controls.onPlay).toHaveBeenCalledTimes(1)
    expect(controls.onPause).toHaveBeenCalledTimes(1)
  })

  it('maps previous/next track to the previous/next subtitle segment', () => {
    const { controls } = setup()
    fire('previoustrack')
    fire('nexttrack')
    expect(controls.onPrevScene).toHaveBeenCalledTimes(1)
    expect(controls.onNextScene).toHaveBeenCalledTimes(1)
  })

  it('seeks 10 seconds by default and honours the requested offset', () => {
    const { controls } = setup()
    fire('seekbackward')
    expect(controls.onSeekTo).toHaveBeenLastCalledWith(40)
    fire('seekforward', { seekOffset: 30 })
    expect(controls.onSeekTo).toHaveBeenLastCalledWith(80)
  })

  it('keeps relative seeks inside the video bounds', () => {
    const { controls, time } = setup()
    time.current = 3
    fire('seekbackward')
    expect(controls.onSeekTo).toHaveBeenLastCalledWith(0)
    time.current = 95
    fire('seekforward')
    expect(controls.onSeekTo).toHaveBeenLastCalledWith(100)
  })

  it('seeks to an absolute position and ignores a missing or invalid one', () => {
    const { controls } = setup()
    fire('seekto', { seekTime: 42 })
    expect(controls.onSeekTo).toHaveBeenLastCalledWith(42)
    controls.onSeekTo.mockClear()
    fire('seekto', {})
    fire('seekto', { seekTime: Number.NaN })
    expect(controls.onSeekTo).not.toHaveBeenCalled()
  })

  it('publishes position state and refreshes it while playing', () => {
    const { time } = setup()
    expect(session.setPositionState).toHaveBeenLastCalledWith({ duration: 100, playbackRate: 1, position: 50 })

    time.current = 60
    vi.advanceTimersByTime(5000)
    expect(session.setPositionState).toHaveBeenLastCalledWith({ duration: 100, playbackRate: 1, position: 60 })
  })

  it('stops refreshing position while paused', () => {
    setup({ isPlaying: false })
    session.setPositionState.mockClear()
    vi.advanceTimersByTime(20000)
    expect(session.setPositionState).not.toHaveBeenCalled()
  })

  it('skips position state until the duration is known', () => {
    setup({ duration: 0 })
    expect(session.setPositionState).not.toHaveBeenCalled()
  })

  it('unregisters handlers and clears metadata when the player stops being ready', () => {
    const { rerender, options } = setup()
    rerender({ ...options, enabled: false })
    expect(session.handlers.get('play')).toBeNull()
    expect(session.handlers.get('nexttrack')).toBeNull()
    expect(session.metadata).toBeNull()
    expect(session.playbackState).toBe('none')
  })

  it('keeps working when a browser rejects an unsupported action', () => {
    session.setActionHandler.mockImplementation((action: string, handler: Handler | null) => {
      if (action === 'seekto') throw new TypeError('unsupported')
      session.handlers.set(action, handler)
    })
    expect(() => setup()).not.toThrow()
    expect(session.handlers.get('play')).toBeTypeOf('function')
  })

  it('is a no-op in browsers without the Media Session API', () => {
    Reflect.deleteProperty(navigator, 'mediaSession')
    expect(() => setup()).not.toThrow()
  })
})
