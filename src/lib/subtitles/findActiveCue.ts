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
 */
export function findActiveCue<T extends TimedItem>(items: T[], currentTimeSeconds: number): T | null {
  let low = 0
  let high = items.length - 1

  while (low <= high) {
    const mid = (low + high) >> 1
    const item = items[mid]!

    if (currentTimeSeconds < item.start) {
      high = mid - 1
    } else if (currentTimeSeconds >= item.end) {
      low = mid + 1
    } else {
      // الزمن الحالي يقع ضمن [start, end) لهذا العنصر تحديداً
      return item
    }
  }

  return null // لا يوجد عنصر نشط في هذه اللحظة (فجوة بين مقطعين)
}
