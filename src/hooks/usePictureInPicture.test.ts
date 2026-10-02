import { describe, it, expect, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePictureInPicture } from './usePictureInPicture'

function makeVideo() {
  const video = document.createElement('video')
  // Stable ref object, like a real useRef
  const ref = { current: video }
  const requestPictureInPicture = vi.fn().mockResolvedValue({})
  Object.defineProperty(video, 'requestPictureInPicture', { value: requestPictureInPicture, configurable: true })
  return { video, ref, requestPictureInPicture }
}

function setDocumentPip(options: { enabled: boolean; element?: Element | null }) {
  const exitPictureInPicture = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(document, 'pictureInPictureEnabled', { value: options.enabled, configurable: true })
  Object.defineProperty(document, 'pictureInPictureElement', { value: options.element ?? null, configurable: true })
  Object.defineProperty(document, 'exitPictureInPicture', { value: exitPictureInPicture, configurable: true })
  return exitPictureInPicture
}

afterEach(() => {
  Reflect.deleteProperty(document, 'pictureInPictureEnabled')
  Reflect.deleteProperty(document, 'pictureInPictureElement')
  Reflect.deleteProperty(document, 'exitPictureInPicture')
})

describe('usePictureInPicture', () => {
  it('is unsupported when there is no video ref (YouTube/Vimeo iframes)', () => {
    setDocumentPip({ enabled: true })
    const { result } = renderHook(() => usePictureInPicture(null, true))
    expect(result.current.isSupported).toBe(false)
  })

  it('is unsupported when the browser disables Picture-in-Picture', () => {
    setDocumentPip({ enabled: false })
    const { ref } = makeVideo()
    const { result } = renderHook(() => usePictureInPicture(ref, true))
    expect(result.current.isSupported).toBe(false)
  })

  it('requests Picture-in-Picture on toggle and tracks the active state from events', () => {
    setDocumentPip({ enabled: true })
    const { video, ref, requestPictureInPicture } = makeVideo()
    const { result } = renderHook(() => usePictureInPicture(ref, true))
    expect(result.current.isSupported).toBe(true)

    act(() => result.current.toggle())
    expect(requestPictureInPicture).toHaveBeenCalledOnce()

    act(() => {
      video.dispatchEvent(new Event('enterpictureinpicture'))
    })
    expect(result.current.isActive).toBe(true)

    act(() => {
      video.dispatchEvent(new Event('leavepictureinpicture'))
    })
    expect(result.current.isActive).toBe(false)
  })

  it('exits Picture-in-Picture on toggle when this video is already in it', () => {
    const { video, ref } = makeVideo()
    const exitPictureInPicture = setDocumentPip({ enabled: true, element: video })
    const { result } = renderHook(() => usePictureInPicture(ref, true))

    act(() => result.current.toggle())
    expect(exitPictureInPicture).toHaveBeenCalledOnce()
  })

  it('swallows a rejected request instead of throwing', async () => {
    setDocumentPip({ enabled: true })
    const { ref, requestPictureInPicture } = makeVideo()
    requestPictureInPicture.mockRejectedValue(new DOMException('denied', 'NotAllowedError'))
    const { result } = renderHook(() => usePictureInPicture(ref, true))

    await act(async () => result.current.toggle())
    expect(result.current.isActive).toBe(false)
  })
})
