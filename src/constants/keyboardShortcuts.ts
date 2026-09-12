export interface KeyboardShortcutHandlers {
  onTogglePlayPause: () => void
  onSpeedUp: () => void
  onSlowDown: () => void
  onToggleFullscreen: () => void
  onResetSpeed: () => void
  onPrevScene: () => void
  onNextScene: () => void
  onVolumeUp: () => void
  onVolumeDown: () => void
  /** إعادة تشغيل المقطع الحالي من بدايته — اختصار "0" */
  onRestartScene: () => void
  /** تكرار المقطع الحالي N مرات — اختصارات "1"/"2"/"3" */
  onRepeatScene: (totalLoops: number) => void
  /** إظهار/إخفاء لوحة اختصارات لوحة المفاتيح — اختصار "؟" */
  onShowHelp: () => void
  /** التركيز على حقل البحث داخل النص المفرَّغ — اختصار "/" */
  onFocusSearch: () => void
}

/** فئات العرض في لوحة المساعدة فقط — لا علاقة لها بالمعالجة الفعلية في useKeyboardShortcuts، فقط لتجميع القائمة بصرياً بدل قائمة مسطّحة واحدة طويلة */
export type KeyboardShortcutCategory = 'تشغيل' | 'تنقّل وتكرار' | 'عام'

export interface KeyboardShortcutDefinition {
  /** كل صيغ event.key التي تُفعّل هذا الاختصار (حالة كبيرة/صغيرة، أسماء بديلة كـ "Spacebar") */
  matchKeys: string[]
  /** رمز واحد يُعرض للمستخدم في لوحة المساعدة (بصرف النظر عن عدد matchKeys) */
  displayKey: string
  description: string
  category: KeyboardShortcutCategory
  /** الإجراء الفعلي عند الضغط — دالة صغيرة تُحدّد أي معالج تستدعي وبأي وسائط (مهم لـ onRepeatScene التي تُستدعى بوسيط مختلف لكل مفتاح) */
  action: (handlers: KeyboardShortcutHandlers) => void
}

/**
 * مصدر الحقيقة الوحيد لكل اختصارات لوحة المفاتيح الخاصة بالفيديو: يُستخدم
 * مباشرة من useKeyboardShortcuts لمعالجة الضغطات الفعلية، ومن
 * KeyboardShortcutsPanel لعرضها في لوحة المساعدة — بدل نسختين منفصلتين
 * (منطق + عرض) كان يجب مزامنتهما يدوياً عند أي تعديل مستقبلي
 */
export const KEYBOARD_SHORTCUTS: KeyboardShortcutDefinition[] = [
  {
    matchKeys: [' ', 'Spacebar'],
    displayKey: 'Space',
    description: 'تشغيل/إيقاف مؤقت',
    category: 'تشغيل',
    action: (h) => h.onTogglePlayPause(),
  },
  {
    matchKeys: ['ArrowLeft'],
    displayKey: '←',
    description: 'المقطع السابق',
    category: 'تنقّل وتكرار',
    action: (h) => h.onPrevScene(),
  },
  {
    matchKeys: ['ArrowRight'],
    displayKey: '→',
    description: 'المقطع التالي',
    category: 'تنقّل وتكرار',
    action: (h) => h.onNextScene(),
  },
  {
    matchKeys: ['ArrowUp'],
    displayKey: '↑',
    description: 'رفع الصوت',
    category: 'تشغيل',
    action: (h) => h.onVolumeUp(),
  },
  {
    matchKeys: ['ArrowDown'],
    displayKey: '↓',
    description: 'خفض الصوت',
    category: 'تشغيل',
    action: (h) => h.onVolumeDown(),
  },
  {
    matchKeys: ['c', 'C'],
    displayKey: 'C',
    description: 'تسريع التشغيل (+0.5×)',
    category: 'تشغيل',
    action: (h) => h.onSpeedUp(),
  },
  {
    matchKeys: ['x', 'X'],
    displayKey: 'X',
    description: 'إبطاء التشغيل (−0.5×)',
    category: 'تشغيل',
    action: (h) => h.onSlowDown(),
  },
  {
    matchKeys: ['z', 'Z'],
    displayKey: 'Z',
    description: 'إعادة ضبط السرعة (1×)',
    category: 'تشغيل',
    action: (h) => h.onResetSpeed(),
  },
  {
    matchKeys: ['f', 'F'],
    displayKey: 'F',
    description: 'تبديل وضع ملء الشاشة',
    category: 'تشغيل',
    action: (h) => h.onToggleFullscreen(),
  },
  {
    matchKeys: ['0'],
    displayKey: '0',
    description: 'إعادة تشغيل المقطع الحالي من بدايته',
    category: 'تنقّل وتكرار',
    action: (h) => h.onRestartScene(),
  },
  {
    matchKeys: ['1'],
    displayKey: '1',
    description: 'تكرار المقطع الحالي مرّتين',
    category: 'تنقّل وتكرار',
    action: (h) => h.onRepeatScene(2),
  },
  {
    matchKeys: ['2'],
    displayKey: '2',
    description: 'تكرار المقطع الحالي ثلاث مرات',
    category: 'تنقّل وتكرار',
    action: (h) => h.onRepeatScene(3),
  },
  {
    matchKeys: ['3'],
    displayKey: '3',
    description: 'تكرار المقطع الحالي أربع مرات',
    category: 'تنقّل وتكرار',
    action: (h) => h.onRepeatScene(4),
  },
  {
    matchKeys: ['?'],
    displayKey: '?',
    description: 'إظهار/إخفاء لوحة الاختصارات',
    category: 'عام',
    action: (h) => h.onShowHelp(),
  },
  {
    matchKeys: ['/'],
    displayKey: '/',
    description: 'التركيز على حقل البحث في النص المفرَّغ',
    category: 'عام',
    action: (h) => h.onFocusSearch(),
  },
]
