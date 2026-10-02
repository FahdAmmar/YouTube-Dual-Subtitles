import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { VideoGestureLayer } from './VideoGestureLayer'

function setup() {
  const handlers = {
    onTogglePlay: vi.fn(),
    onSeekBackward: vi.fn(),
    onSeekForward: vi.fn(),
    onPrevScene: vi.fn(),
    onNextScene: vi.fn(),
  }
  const view = render(<VideoGestureLayer {...handlers} />)
  const layer = screen.getByTestId('video-gesture-layer')
  // 300px wide stage: left < 100 <= center < 200 <= right
  vi.spyOn(layer, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 300, height: 170, right: 300, bottom: 170, x: 0, y: 0, toJSON: () => ({}) })
  return { ...handlers, layer, view }
}

type Layer = HTMLElement
const touch = { pointerType: 'touch', isPrimary: true }
const press = (layer: Layer, x: number, y = 80, extra: object = {}) => fireEvent.pointerDown(layer, { ...touch, clientX: x, clientY: y, ...extra })
const release = (layer: Layer, x: number, y = 80, extra: object = {}) => fireEvent.pointerUp(layer, { ...touch, clientX: x, clientY: y, ...extra })
const tap = (layer: Layer, x: number) => {
  press(layer, x)
  release(layer, x)
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('VideoGestureLayer', () => {
  it('toggles playback on a single tap, only after the double-tap window has passed', () => {
    const { layer, onTogglePlay } = setup()
    tap(layer, 150)
    vi.advanceTimersByTime(299)
    expect(onTogglePlay).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(onTogglePlay).toHaveBeenCalledTimes(1)
  })

  it('seeks backward on a double tap on the left third, without toggling playback', () => {
    const { layer, onSeekBackward, onSeekForward, onTogglePlay } = setup()
    tap(layer, 40)
    tap(layer, 45)
    vi.advanceTimersByTime(1000)
    expect(onSeekBackward).toHaveBeenCalledTimes(1)
    expect(onSeekForward).not.toHaveBeenCalled()
    expect(onTogglePlay).not.toHaveBeenCalled()
  })

  it('seeks forward on a double tap on the right third', () => {
    const { layer, onSeekForward, onTogglePlay } = setup()
    tap(layer, 260)
    tap(layer, 255)
    vi.advanceTimersByTime(1000)
    expect(onSeekForward).toHaveBeenCalledTimes(1)
    expect(onTogglePlay).not.toHaveBeenCalled()
  })

  it('keeps seeking on each further tap right after a double tap, like a video app', () => {
    const { layer, onSeekForward, onTogglePlay } = setup()
    tap(layer, 260)
    tap(layer, 260)
    vi.advanceTimersByTime(200)
    tap(layer, 260)
    vi.advanceTimersByTime(1000)
    expect(onSeekForward).toHaveBeenCalledTimes(2)
    expect(onTogglePlay).not.toHaveBeenCalled()
  })

  it('does nothing on a double tap in the centre', () => {
    const { layer, onTogglePlay, onSeekBackward, onSeekForward } = setup()
    tap(layer, 150)
    tap(layer, 150)
    vi.advanceTimersByTime(1000)
    expect(onTogglePlay).not.toHaveBeenCalled()
    expect(onSeekBackward).not.toHaveBeenCalled()
    expect(onSeekForward).not.toHaveBeenCalled()
  })

  it('resolves the first tap as a play/pause toggle when the next tap lands in another zone', () => {
    const { layer, onTogglePlay, onSeekForward } = setup()
    tap(layer, 40)
    tap(layer, 260)
    expect(onTogglePlay).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(300)
    expect(onTogglePlay).toHaveBeenCalledTimes(2)
    expect(onSeekForward).not.toHaveBeenCalled()
  })

  it('jumps to the next scene on a swipe left and the previous scene on a swipe right', () => {
    const { layer, onNextScene, onPrevScene, onTogglePlay } = setup()
    press(layer, 220)
    vi.advanceTimersByTime(150)
    release(layer, 120, 85)
    expect(onNextScene).toHaveBeenCalledTimes(1)

    press(layer, 100)
    vi.advanceTimersByTime(150)
    release(layer, 200, 78)
    expect(onPrevScene).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(1000)
    expect(onTogglePlay).not.toHaveBeenCalled()
  })

  it('ignores mouse input, so desktop clicks keep reaching the player', () => {
    const { layer, onTogglePlay } = setup()
    press(layer, 150, 80, { pointerType: 'mouse' })
    release(layer, 150, 80, { pointerType: 'mouse' })
    vi.advanceTimersByTime(1000)
    expect(onTogglePlay).not.toHaveBeenCalled()
  })

  it('ignores extra fingers (pinch) and cancelled touches (the browser took over to scroll)', () => {
    const { layer, onTogglePlay } = setup()
    press(layer, 150, 80, { isPrimary: false })
    release(layer, 150, 80, { isPrimary: false })

    press(layer, 150)
    fireEvent.pointerCancel(layer, { ...touch })
    release(layer, 150)
    vi.advanceTimersByTime(1000)
    expect(onTogglePlay).not.toHaveBeenCalled()
  })

  it('does not fire a pending tap after it is removed from the page', () => {
    const { layer, view, onTogglePlay } = setup()
    tap(layer, 150)
    view.unmount()
    vi.advanceTimersByTime(1000)
    expect(onTogglePlay).not.toHaveBeenCalled()
  })

  it('is decorative for assistive tech and leaves vertical scrolling to the browser', () => {
    const { layer } = setup()
    expect(layer).toHaveAttribute('aria-hidden', 'true')
    expect(layer.className).toContain('touch-pan-y')
  })
})
