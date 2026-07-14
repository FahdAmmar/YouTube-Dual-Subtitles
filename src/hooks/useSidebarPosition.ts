import { useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { STORAGE_KEYS } from '@/constants/theme.constants'

export type SidebarPosition = 'left' | 'right'

export interface UseSidebarPositionResult {
  position: SidebarPosition
  toggle: () => void
}

/** يدير تفضيل موضع اللوحة الجانبية (يمين الشاشة أو يسارها) مع حفظه بين الجلسات */
export function useSidebarPosition(): UseSidebarPositionResult {
  const [position, setPosition] = useLocalStorage<SidebarPosition>(STORAGE_KEYS.SIDEBAR_POSITION, 'left')

  const toggle = useCallback(() => {
    setPosition((previous) => (previous === 'left' ? 'right' : 'left'))
  }, [setPosition])

  return { position, toggle }
}

/**
 * يحسب قيم flex `order` الصحيحة للعناصر الثلاثة (الفيديو، مقبض السحب،
 * اللوحة الجانبية) بحيث تظهر اللوحة الجانبية فعلياً على الجانب المطلوب من
 * الشاشة (position) — بصرف النظر عن اتجاه الصفحة (dir).
 *
 * لماذا هذا ضروري: ترتيب DOM الفعلي ثابت دوماً [الفيديو، المقبض، اللوحة]،
 * لكن ترتيب flex-direction: row البصري يعتمد على dir — في RTL يبدأ المحور
 * الرئيسي من اليمين، وفي LTR من اليسار. لذا فإن "أي طرف من الترتيب" يجب
 * أن يحمل أصغر قيمة order يختلف باختلاف dir، رغم أن position (الجانب
 * الفعلي المطلوب على الشاشة) هو نفسه بغض النظر عن اتجاه النص
 */
export function getSidebarFlexOrder(
  position: SidebarPosition,
  dir: 'rtl' | 'ltr',
): { video: number; handle: number; sidebar: number } {
  const sidebarAtMainAxisStart =
    (position === 'left' && dir === 'ltr') || (position === 'right' && dir === 'rtl')

  return sidebarAtMainAxisStart
    ? { sidebar: 1, handle: 2, video: 3 }
    : { video: 1, handle: 2, sidebar: 3 }
}

/**
 * نفس منطق getSidebarFlexOrder أعلاه، لكن بأسماء أصناف Tailwind كاملة
 * وحرفية بدل أرقام مجرّدة — ضروري لأن فاحص Tailwind الساكن (JIT) يحتاج
 * رؤية اسم الصنف بالضبط مكتوباً في الكود المصدري لتوليد الـ CSS المقابل
 * له؛ بناء الاسم ديناميكياً عبر `lg:order-${n}` لا يُكتشف ولن يُولَّد له
 * أي تنسيق فعلي في نسخة الإنتاج. بما أن هناك احتمالين فقط للترتيب الناتج
 * (بغض النظر عن أربع تركيبات position×dir الممكنة)، تُكتب كلتا الحالتين
 * حرفياً هنا صراحة.
 *
 * sidebarBorderClass: الحد الفاصل بين اللوحة الجانبية والفيديو يجب أن
 * يظهر على الحافة *المواجهة* للفيديو تحديداً، وهذه الحافة تتبدّل فعلياً
 * (border-inline-start أو -end) حسب أي جانب انتقلت إليه اللوحة — بخلاف
 * order الذي لا يغيّر القيمة الفعلية لخاصية منطقية كهذه، فلا يمكن الاعتماد
 * على صنف ثابت واحد (border-s) بعد الآن
 */
export function getSidebarFlexOrderClasses(
  position: SidebarPosition,
  dir: 'rtl' | 'ltr',
): { video: string; handle: string; sidebar: string; sidebarBorderClass: string } {
  const order = getSidebarFlexOrder(position, dir)
  return order.sidebar === 1
    ? { sidebar: 'lg:order-1', handle: 'lg:order-2', video: 'lg:order-3', sidebarBorderClass: 'lg:border-e' }
    : { video: 'lg:order-1', handle: 'lg:order-2', sidebar: 'lg:order-3', sidebarBorderClass: 'lg:border-s' }
}
