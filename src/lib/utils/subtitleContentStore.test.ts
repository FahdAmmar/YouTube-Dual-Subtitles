import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { resetIndexedDb } from '@/__tests__/testHelpers/resetIndexedDb'
import { saveSubtitleContent, getSubtitleContent, deleteSubtitleContentForVideo } from './subtitleContentStore'

beforeEach(() => {
  resetIndexedDb()
})

describe('subtitleContentStore', () => {
  it('returns null for content that was never saved', async () => {
    const content = await getSubtitleContent('youtube:abc', 'source', 'ar.srt')
    expect(content).toBeNull()
  })

  it('saves and retrieves content for the exact (video, track, fileName) combination', async () => {
    await saveSubtitleContent('youtube:abc', 'source', 'ar.srt', 'CONTENT_A')
    expect(await getSubtitleContent('youtube:abc', 'source', 'ar.srt')).toBe('CONTENT_A')
  })

  it('keeps source and translation content independent even with the same file name', async () => {
    await saveSubtitleContent('youtube:abc', 'source', 'dual.srt', 'SOURCE_CONTENT')
    await saveSubtitleContent('youtube:abc', 'translation', 'dual.srt', 'TRANSLATION_CONTENT')

    expect(await getSubtitleContent('youtube:abc', 'source', 'dual.srt')).toBe('SOURCE_CONTENT')
    expect(await getSubtitleContent('youtube:abc', 'translation', 'dual.srt')).toBe('TRANSLATION_CONTENT')
  })

  it('does not leak content between different videos', async () => {
    await saveSubtitleContent('youtube:abc', 'source', 'ar.srt', 'VIDEO_A_CONTENT')
    expect(await getSubtitleContent('youtube:xyz', 'source', 'ar.srt')).toBeNull()
  })

  it('overwrites previous content when the same key is saved again', async () => {
    await saveSubtitleContent('youtube:abc', 'source', 'ar.srt', 'OLD')
    await saveSubtitleContent('youtube:abc', 'source', 'ar.srt', 'NEW')
    expect(await getSubtitleContent('youtube:abc', 'source', 'ar.srt')).toBe('NEW')
  })

  it('prunes the oldest entries once the cap is exceeded', async () => {
    // السقف الداخلي 30 — نحفظ 32 مُدخلاً مميّزاً كي يُحذَف اثنان منها بالتأكيد
    for (let i = 0; i < 32; i++) {
      await saveSubtitleContent('youtube:cap-test', 'source', `file-${i}.srt`, `CONTENT_${i}`)
    }

    // الأقدم (أول ما أُضيف) يجب أن يُحذَف
    expect(await getSubtitleContent('youtube:cap-test', 'source', 'file-0.srt')).toBeNull()
    // الأحدث يجب أن يبقى محفوظاً
    expect(await getSubtitleContent('youtube:cap-test', 'source', 'file-31.srt')).toBe('CONTENT_31')
  })

  it('deletes both tracks of a video without affecting other videos', async () => {
    await saveSubtitleContent('youtube:abc', 'source', 'ar.srt', 'SOURCE_CONTENT')
    await saveSubtitleContent('youtube:abc', 'translation', 'en.srt', 'TRANSLATION_CONTENT')
    await saveSubtitleContent('youtube:xyz', 'source', 'ar.srt', 'OTHER_VIDEO_CONTENT')

    await deleteSubtitleContentForVideo('youtube:abc')

    expect(await getSubtitleContent('youtube:abc', 'source', 'ar.srt')).toBeNull()
    expect(await getSubtitleContent('youtube:abc', 'translation', 'en.srt')).toBeNull()
    // الفيديو الآخر يجب ألا يتأثر إطلاقاً
    expect(await getSubtitleContent('youtube:xyz', 'source', 'ar.srt')).toBe('OTHER_VIDEO_CONTENT')
  })

  it('does not throw when deleting a video that has no saved content', async () => {
    await expect(deleteSubtitleContentForVideo('youtube:never-saved')).resolves.toBeUndefined()
  })
})
