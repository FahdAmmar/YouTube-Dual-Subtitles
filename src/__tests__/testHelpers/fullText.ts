/**
 * مطابقة نص كامل مقابل textContent الفعلي (العودي) لعنصر ما — ضروري منذ
 * إضافة ميزة "انقر على كلمة لرؤية معناها" (انظر SliceCard.tsx)، حيث نص
 * الترجمة الأجنبية لم يعد عقدة نصية واحدة بل مجموعة عناصر <span> منفصلة
 * (كلمة لكل عنصر). مطابقة getByText الافتراضية تبحث فقط في عُقد النص
 * المباشرة لكل عنصر، فلا تجد نصاً موزَّعاً على عناصر ابنة متعددة —
 * مطابق مخصّص عبر textContent الكامل هو الحل الموصى به رسمياً من
 * Testing Library لهذه الحالة تحديداً
 */
export function fullText(expected: string) {
  return (_content: string, element: Element | null) => element?.textContent === expected
}
