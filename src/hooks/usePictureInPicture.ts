import { useCallback, useEffect, useState, type RefObject } from 'react'

/**
 * Native Picture-in-Picture for a local <video>. YouTube/Vimeo play inside
 * cross-origin iframes, so pass `null` for them (unsupported by design).
 * Note: the PiP window shows the video only, not the subtitle overlay.
 */
export function usePictureInPicture(videoRef: RefObject<HTMLVideoElement> | null, isReady: boolean) {
  const [isActive, setIsActive] = useState(false)

  const isSupported = Boolean(videoRef && isReady && document.pictureInPictureEnabled)

  useEffect(() => {
    const video = videoRef?.current
    if (!video || !isReady) return

    setIsActive(document.pictureInPictureElement === video)
    const handleEnter = () => setIsActive(true)
    const handleLeave = () => setIsActive(false)
    video.addEventListener('enterpictureinpicture', handleEnter)
    video.addEventListener('leavepictureinpicture', handleLeave)

    return () => {
      video.removeEventListener('enterpictureinpicture', handleEnter)
      video.removeEventListener('leavepictureinpicture', handleLeave)
      // Don't leave an orphaned PiP window when the video is replaced
      if (document.pictureInPictureElement === video) {
        document.exitPictureInPicture().catch(() => {})
      }
    }
  }, [videoRef, isReady])

  const toggle = useCallback(() => {
    const video = videoRef?.current
    if (!video) return
    const request =
      document.pictureInPictureElement === video
        ? document.exitPictureInPicture()
        : video.requestPictureInPicture()
    // Browsers may reject (permissions, policy); the button simply does nothing
    request.catch(() => {})
  }, [videoRef])

  return { isSupported, isActive, toggle }
}
