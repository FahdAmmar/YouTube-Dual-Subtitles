import { describe, it, expect } from 'vitest'
import { getVideoKey } from './videoKey'

describe('getVideoKey', () => {
  it('keys a YouTube source by its video id', () => {
    expect(getVideoKey({ type: 'youtube', videoId: 'dQw4w9WgXcQ' })).toBe('youtube:dQw4w9WgXcQ')
  })

  it('keys a local source by its file name, ignoring the object URL', () => {
    const key = getVideoKey({
      type: 'local',
      objectUrl: 'blob:https://example.com/some-random-uuid',
      fileName: 'lecture.mp4',
    })
    expect(key).toBe('local:lecture.mp4')
  })

  it('produces the same key for the same local file name across different object URLs', () => {
    // objectUrl عشوائي في كل جلسة (URL.createObjectURL)، فلا يجوز أن يؤثر
    // على المفتاح — نفس الملف المُعاد اختياره يجب أن يُعيد نفس المفتاح تماماً
    const first = getVideoKey({ type: 'local', objectUrl: 'blob:one', fileName: 'lecture.mp4' })
    const second = getVideoKey({ type: 'local', objectUrl: 'blob:two', fileName: 'lecture.mp4' })
    expect(first).toBe(second)
  })

  it('does not collide between a youtube id and a local file name that look alike', () => {
    const youtubeKey = getVideoKey({ type: 'youtube', videoId: 'lecture.mp4' })
    const localKey = getVideoKey({ type: 'local', objectUrl: 'blob:x', fileName: 'lecture.mp4' })
    expect(youtubeKey).not.toBe(localKey)
  })
})
