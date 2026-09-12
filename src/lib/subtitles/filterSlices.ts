import type { PairedSlice } from './pairCues'

/**
 * يُصفّي المقاطع حسب مطابقة نصية جزئية غير حسّاسة لحالة الأحرف، في نص
 * المصدر أو الترجمة معاً (بصرف النظر عن وضع العرض الحالي — قد يبحث
 * المستخدم عن عبارة يتذكّرها بأي من اللغتين حتى لو كانت غير ظاهرة حالياً)
 *
 * استعلام فارغ (أو بياض فقط) يُرجع كل المقاطع دون تصفية — هذا هو حال
 * "لا بحث نشط بعد" الافتراضي
 */
export function filterSlicesByQuery(slices: PairedSlice[], query: string): PairedSlice[] {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return slices

  return slices.filter((slice) => {
    const source = slice.sourceText?.toLowerCase() ?? ''
    const translation = slice.translationText?.toLowerCase() ?? ''
    return source.includes(normalizedQuery) || translation.includes(normalizedQuery)
  })
}
