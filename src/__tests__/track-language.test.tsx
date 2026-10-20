import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, renderHook, act, within } from '@testing-library/react'
import { useSubtitleTrack } from '../hooks/useSubtitleTrack'
import App from '../App'
import { STORAGE_KEYS } from '../constants/theme.constants'

beforeEach(() => window.localStorage.clear())

function makeFile(name: string, content: string) {
  return new File([content], name, { type: 'text/plain' })
}

// لغتان مميزتان: ألمانية يكتشفها الكشف فعلاً (كلمات + أملاوت)، وفرنسية
// لا يغطيها الكشف أصلاً — هرساً للحالتين عند التحقق من أفضلية الاختيار الصريح
const GERMAN_SRT = `1
00:00:01,000 --> 00:00:04,000
Hallo wie geht es dir, sind wir hier? Das ist sehr schön und die Äpfel sind warm.

2
00:00:05,000 --> 00:00:08,000
Ich habe ein sehr großes und warmes Bitten mit vielen Äonen und Jägers
`
const FRENCH_SRT = `1
00:00:01,000 --> 00:00:04,000
Bonjour, voici une très grande fleur avec beaucoup de couleurs.

2
00:00:05,000 --> 00:00:08,000
Elle est belle et très jolie aujourd'hui, merci beaucoup mon ami.
`
const ARABIC_SRT = `1
00:00:01,000 --> 00:00:04,000
مرحباً بكم في هذا الفيديو

2
00:00:05,000 --> 00:00:08,000
هذا مثال على الترجمة العربية
`

describe('per-track language selection', () => {
  it('keeps auto-detection working while no explicit language is chosen', async () => {
    const { result } = renderHook(() => useSubtitleTrack('en', 'الإنجليزية'))
    expect(result.current.explicitLanguageCode).toBeNull()

    await act(async () => {
      await result.current.uploadFile(makeFile('de.srt', GERMAN_SRT))
    })
    expect(result.current.track.languageCode).toBe('de')
    expect(result.current.track.languageLabel).toBe('الألمانية')
  })

  it('an explicit choice overrides detection on later uploads, and persists in localStorage', async () => {
    const { result } = renderHook(() => useSubtitleTrack('en', 'الإنجليزية', 'translation'))

    await act(async () => {
      await result.current.uploadFile(makeFile('ar.srt', ARABIC_SRT))
    })
    // وضع تلقائي: الكشف يشعر بأن الملف عربي فيعرض العربية على المسار الإنكليزي الابتدائي
    expect(result.current.track.languageCode).toBe('ar')

    await act(() => result.current.selectLanguage('de'))
    expect(result.current.track.languageCode).toBe('de')

    // ملف عربي جديد بعد الاختيار الصريح: يبقى مسار الترجمة ألمانية رغم أن
    // الكشف التلقائي سيقوله عربياً بلا اللوم — صوت النطق والبحث كانا سيتحولان غلط
    await act(async () => {
      await result.current.uploadFile(makeFile('ar2.srt', ARABIC_SRT))
    })
    expect(result.current.track.languageCode).toBe('de')

    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEYS.TRACK_LANGUAGES)!).translation).toBe('de')
  })

  it('a fresh session with a saved choice starts in that language and applies it to the next upload', async () => {
    const { result } = renderHook(() => useSubtitleTrack('en', 'الإنجليزية', 'translation'))
    await act(() => result.current.selectLanguage('fr'))
    expect(result.current.track.languageCode).toBe('fr')

    // جلسة جديدة: الـ Hook المنشأ حديثاً يبدأ باللغة المحفوظة، ويطبّقها على
    // الملف القادم حتى وإن لم يكشفها (الكشف لا يدعم الفرنسية أصلاً)
    const restored = renderHook(() => useSubtitleTrack('en', 'الإنجليزية', 'translation'))
    expect(restored.result.current.track.languageCode).toBe('fr')
    expect(restored.result.current.explicitLanguageCode).toBe('fr')

    await act(async () => {
      await restored.result.current.uploadFile(makeFile('fr.srt', FRENCH_SRT))
    })
    expect(restored.result.current.track.languageCode).toBe('fr')
  })

  it('choosing "تلقائي" clears the explicit choice, reapplies detection and clears localStorage', async () => {
    const { result } = renderHook(() => useSubtitleTrack('en', 'الإنجليزية', 'translation'))
    await act(async () => {
      await result.current.uploadFile(makeFile('ar.srt', ARABIC_SRT))
    })
    await act(() => result.current.selectLanguage('de'))
    expect(result.current.track.languageCode).toBe('de')

    // الرجوع للوضع التلقائي: يُعاد الكشف من المقاطع الحالية (العربية)
    await act(() => result.current.selectLanguage(null))
    expect(result.current.track.languageCode).toBe('ar')
    expect(result.current.explicitLanguageCode).toBeNull()
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEYS.TRACK_LANGUAGES)!).translation).toBeNull()
  })
})

describe('language selection in the console rows', () => {
  it('shows supported languages for both tracks, and an explicit pick survives an upload of another language', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<App />)
    fireEvent.change(screen.getByLabelText('VIDEO_URL'), {
      target: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    })
    fireEvent.click(screen.getByRole('button', { name: /تشغيل/ }))
    await waitFor(() => expect(screen.getByText(/DISPLAY_MODE/)).toBeInTheDocument())

    const sourceSelect = screen.getByRole('combobox', { name: 'لغة المسار الأصلي' }) as HTMLSelectElement
    const translationSelect = screen.getByRole('combobox', { name: 'لغة مسار الترجمة' }) as HTMLSelectElement
    expect(sourceSelect.value).toBe('auto')
    expect(translationSelect.value).toBe('auto')
    expect(within(sourceSelect).getByRole('option', { name: 'Deutsch' })).toBeInTheDocument()
    expect(within(sourceSelect).getByRole('option', { name: 'العربية' })).toBeInTheDocument()

    // اختيار ألمانية صريح للمسار الأصلي، ثم رفع ملف عربي: يبقى الألمانية
    fireEvent.change(sourceSelect, { target: { value: 'de' } })
    expect(screen.getByLabelText('رفع ملف ترجمة الألمانية')).toBeInTheDocument()
    await fireEvent.change(screen.getByLabelText('رفع ملف ترجمة الألمانية'), {
      target: { files: [makeFile('ar.srt', ARABIC_SRT)] },
    })
    await waitFor(() => expect(screen.getByText('ar.srt')).toBeInTheDocument())
    expect((screen.getByRole('combobox', { name: 'لغة المسار الأصلي' }) as HTMLSelectElement).value).toBe('de')

    // ورجوع الوضع التلقائي يعيد الكشف: الملف عربي فيصير المسار عربياً
    fireEvent.change(screen.getByRole('combobox', { name: 'لغة المسار الأصلي' }), { target: { value: 'auto' } })
    await waitFor(() => expect(screen.getByLabelText('رفع ملف ترجمة العربية')).toBeInTheDocument())

    errorSpy.mockRestore()
  })
})
