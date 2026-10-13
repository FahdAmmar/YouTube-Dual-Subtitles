import { useEffect, useRef, useState } from 'react'
import { assignFilesToTracks, filterSubtitleFiles, textToSubtitleFile } from '@/lib/subtitles/subtitleFileRouting'

interface UseSubtitleFileDropOptions {
  isEnabled: boolean
  isSourceLoaded: boolean
  onUploadSource: (file: File) => void
  onUploadTranslation: (file: File) => void
}

function hasFiles(event: DragEvent): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes('Files')
}

function isTypingTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
}

/**
 * Lets subtitle files be dropped anywhere on the page, or subtitle text be pasted,
 * instead of hunting for the small upload buttons. Everything goes through the same
 * upload handlers, so validation and error states behave exactly as with the file picker.
 */
export function useSubtitleFileDrop(options: UseSubtitleFileDropOptions): { isDragging: boolean } {
  const [isDragging, setIsDragging] = useState(false)
  const optionsRef = useRef(options)
  optionsRef.current = options

  useEffect(() => {
    if (!options.isEnabled) {
      setIsDragging(false)
      return
    }

    // dragenter/dragleave also fire for every child element, so count them to know when the drag really left
    let dragDepth = 0

    function route(files: File[]) {
      const { isSourceLoaded, onUploadSource, onUploadTranslation } = optionsRef.current
      const assignment = assignFilesToTracks(filterSubtitleFiles(files), isSourceLoaded)
      if (assignment.source) onUploadSource(assignment.source)
      if (assignment.translation) onUploadTranslation(assignment.translation)
    }

    function handleDragEnter(event: DragEvent) {
      if (!hasFiles(event)) return
      dragDepth += 1
      setIsDragging(true)
    }
    function handleDragOver(event: DragEvent) {
      if (!hasFiles(event)) return
      event.preventDefault()
    }
    function handleDragLeave(event: DragEvent) {
      if (!hasFiles(event)) return
      dragDepth = Math.max(0, dragDepth - 1)
      if (dragDepth === 0) setIsDragging(false)
    }
    function handleDrop(event: DragEvent) {
      if (!hasFiles(event)) return
      event.preventDefault()
      dragDepth = 0
      setIsDragging(false)
      route(Array.from(event.dataTransfer?.files ?? []))
    }
    function handlePaste(event: ClipboardEvent) {
      if (isTypingTarget(event.target)) return
      const files = Array.from(event.clipboardData?.files ?? [])
      if (files.length > 0) {
        route(files)
        return
      }
      const pasted = textToSubtitleFile(event.clipboardData?.getData('text/plain') ?? '')
      if (pasted) route([pasted])
    }

    window.addEventListener('dragenter', handleDragEnter)
    window.addEventListener('dragover', handleDragOver)
    window.addEventListener('dragleave', handleDragLeave)
    window.addEventListener('drop', handleDrop)
    window.addEventListener('paste', handlePaste)
    return () => {
      window.removeEventListener('dragenter', handleDragEnter)
      window.removeEventListener('dragover', handleDragOver)
      window.removeEventListener('dragleave', handleDragLeave)
      window.removeEventListener('drop', handleDrop)
      window.removeEventListener('paste', handlePaste)
    }
  }, [options.isEnabled])

  return { isDragging }
}
