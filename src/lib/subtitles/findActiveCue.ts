/** أي بنية زمنية قابلة للبحث عنها: أي شيء له بداية ونهاية بالثواني */
interface TimedItem {
  start: number
  end: number
}

/**
 * إيجاد العنصر الزمني النشط عند لحظة معيّنة باستخدام البحث الثنائي (Binary Search)
 *
 * دالة معمَّمة (Generic) عمداً — تُستخدم لكل من مقاطع الترجمة الخام
 * (SubtitleCue) ومقاطع لوحة النص الموحّدة (PairedSlice)، فكلاهما يشترك
 * فقط في حقلي start/end. هذا التعميم يمنع تكرار نفس خوارزمية البحث
 * الثنائي مرتين بصياغتين مختلفتين (مبدأ DRY).
 *
 * لماذا بحث ثنائي وليس بحثاً خطياً (linear scan)؟
 * هذه الدالة تُستدعى عشرات المرات في الثانية أثناء تشغيل الفيديو. مع
 * ملفات ترجمة طويلة (آلاف المقاطع لفيديو مدته ساعتان) فإن البحث الخطي
 * O(n) في كل استدعاء يصبح مكلفاً وقد يسبب تقطعاً ملحوظاً، بينما البحث
 * الثنائي O(log n) يحافظ على أداء سلس بغض النظر عن طول الملف (يفترض هذا
 * أن المصفوفة مرتبة تصاعدياً حسب start، وهو ما تضمنه دوال التحليل
 * parseSRT و parseVTT، وكذلك pairCuesIntoSlices بحكم بنائها فوقها)
 *
 * المقاطع قد تتداخل (مقطع طويل يحوي مقطعاً قصيراً). البحث الثنائي البسيط عن "المقطع الذي
 * يحوي الزمن" يضلّ طريقه حينها فيُرجع null وتختفي الترجمة من منتصف مقطع نشط. لذلك نبحث عن
 * آخر مقطع بدأ، ثم نرجع للخلف ما دام أكبر end حتى ذلك الفهرس (prefixMaxEnd) أبعد من الزمن.
 * عدد الخطوات الراجعة = عمق التداخل فقط، فيبقى الأداء O(log n + k)
 */
/**
 * أكبر end بين أول عنصر والعنصر الحالي، تُبنى مرة لكل مصفوفة. المفتاح هو المصفوفة نفسها:
 * حالة React لا تتغيّر في مكانها، وأي قائمة جديدة تحصل على مصفوفتها الخاصة
 */
const prefixMaxEndCache = new WeakMap<object, Float64Array>()

function getPrefixMaxEnd(items: TimedItem[]): Float64Array {
  const cached = prefixMaxEndCache.get(items)
  if (cached && cached.length === items.length) return cached

  const maxEndUpTo = new Float64Array(items.length)
  let runningMax = -Infinity
  for (let index = 0; index < items.length; index++) {
    runningMax = Math.max(runningMax, items[index]!.end)
    maxEndUpTo[index] = runningMax
  }
  prefixMaxEndCache.set(items, maxEndUpTo)
  return maxEndUpTo
}

export function findActiveCue<T extends TimedItem>(items: T[], currentTimeSeconds: number): T | null {
  // آخر مقطع بدأ عند الزمن الحالي أو قبله
  let low = 0
  let high = items.length - 1
  let lastStarted = -1

  while (low <= high) {
    const mid = (low + high) >> 1
    if (items[mid]!.start <= currentTimeSeconds) {
      lastStarted = mid
      low = mid + 1
    } else {
      high = mid - 1
    }
  }

  if (lastStarted < 0) return null

  const maxEndUpTo = getPrefixMaxEnd(items)
  // نتوقف حين لا يبقى أي مقطع سابق ينتهي بعد الزمن الحالي
  for (let index = lastStarted; index >= 0 && maxEndUpTo[index]! > currentTimeSeconds; index--) {
    const item = items[index]!
    if (currentTimeSeconds < item.end) return item
  }

  return null // لا يوجد عنصر نشط في هذه اللحظة (فجوة بين مقطعين)
}
