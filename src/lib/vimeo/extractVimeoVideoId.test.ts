import { describe, it, expect } from 'vitest'
import { extractVimeoVideoId } from './extractVimeoVideoId'

const VIMEO_ID_ONLY_DIGITS = /^\d+$/

describe('extractVimeoVideoId', () => {
  it('extracts the id from a standard vimeo.com URL', () => {
    expect(extractVimeoVideoId('https://vimeo.com/76979871')).toEqual({
      success: true,
      videoId: '76979871',
      hash: null,
      error: null,
    })
  })

  it('extracts both the id and the privacy hash from an unlisted-video URL', () => {
    const result = extractVimeoVideoId('https://vimeo.com/76979871/8272103f6e')
    expect(result.success).toBe(true)
    expect(result.videoId).toBe('76979871')
    expect(result.hash).toBe('8272103f6e')
  })

  it('extracts the hash from a player.vimeo.com URL with an h= query parameter', () => {
    const result = extractVimeoVideoId('https://player.vimeo.com/video/76979871?h=8272103f6e')
    expect(result.success).toBe(true)
    expect(result.videoId).toBe('76979871')
    expect(result.hash).toBe('8272103f6e')
  })

  it('extracts the id from a direct player.vimeo.com embed URL', () => {
    expect(extractVimeoVideoId('https://player.vimeo.com/video/76979871')).toEqual({
      success: true,
      videoId: '76979871',
      hash: null,
      error: null,
    })
  })

  it('accepts www. prefix', () => {
    const result = extractVimeoVideoId('https://www.vimeo.com/76979871')
    expect(result.success).toBe(true)
  })

  it('accepts a bare numeric id with no URL', () => {
    expect(extractVimeoVideoId('76979871')).toEqual({ success: true, videoId: '76979871', hash: null, error: null })
  })

  it('rejects an empty input', () => {
    const result = extractVimeoVideoId('  ')
    expect(result.success).toBe(false)
    expect(result.videoId).toBeNull()
  })

  it('rejects a non-Vimeo host, even if it looks plausible', () => {
    const result = extractVimeoVideoId('https://evil.com/vimeo.com/76979871')
    expect(result.success).toBe(false)
  })

  it('rejects a YouTube URL', () => {
    const result = extractVimeoVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    expect(result.success).toBe(false)
  })

  it('extracts only the safe numeric prefix, ignoring anything injected after it', () => {
    const result = extractVimeoVideoId('https://vimeo.com/12345<script>alert(1)</script>')
    expect(result.success).toBe(true)
    expect(result.videoId).toBe('12345')
    expect(result.videoId).toMatch(VIMEO_ID_ONLY_DIGITS)
    // العلامات غير الأبجدية الرقمية لا يجب أن تُقبل كتجزئة خصوصية صالحة
    expect(result.hash).toBeNull()
  })

  it('rejects a vimeo.com URL with no numeric id at all', () => {
    const result = extractVimeoVideoId('https://vimeo.com/watch/something')
    expect(result.success).toBe(false)
  })
})
