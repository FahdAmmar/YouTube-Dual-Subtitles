import { useEffect, useState } from 'react'

export interface StorageUsageEstimate {
  /** false إن كان المتصفح لا يدعم navigator.storage.estimate() إطلاقاً (Safari القديم، بعض متصفحات الجوال) */
  isSupported: boolean
  usageBytes: number
  quotaBytes: number
}

const EMPTY_ESTIMATE: StorageUsageEstimate = { isSupported: false, usageBytes: 0, quotaBytes: 0 }

/**
 * يقرأ المساحة الفعلية المستخدمة من حصة المتصفح (تشمل IndexedDB —
 * محتوى ملفات الترجمة المحفوظة — وlocalStorage) عبر navigator.storage
 * .estimate()، الواجهة القياسية المخصصة لهذا الغرض تحديداً.
 *
 * shouldMeasure (حالة فتح لوحة الإعدادات عادة) تُبقي القياس معطّلاً حتى
 * الحاجة الفعلية فقط: لا داعي لاستدعاء هذه الواجهة عند كل تحميل للتطبيق
 * بينما لوحة الإعدادات مغلقة أصلاً ولا أحد يرى نتيجتها.
 */
export function useStorageUsageEstimate(shouldMeasure: boolean): StorageUsageEstimate {
  const [estimate, setEstimate] = useState<StorageUsageEstimate>(EMPTY_ESTIMATE)

  useEffect(() => {
    if (!shouldMeasure) return
    if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return

    let cancelled = false
    navigator.storage
      .estimate()
      .then((result) => {
        if (cancelled) return
        setEstimate({ isSupported: true, usageBytes: result.usage ?? 0, quotaBytes: result.quota ?? 0 })
      })
      .catch(() => {
        // تجاهل بأمان: تبقى isSupported=false فتُخفي اللوحة نفسها القيمة المضلِّلة
      })

    return () => {
      cancelled = true
    }
  }, [shouldMeasure])

  return estimate
}
