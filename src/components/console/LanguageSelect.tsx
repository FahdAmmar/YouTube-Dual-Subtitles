import { Languages } from 'lucide-react'
import { SUPPORTED_LANGUAGES } from '@/constants/languages'
import { cn } from '@/lib/utils/cn'

interface LanguageSelectProps {
  /** الرمز المُختار صراحةً؛ null يعني وضع الكشف التلقائي (تُتبع نتيجة الكشف عن الملف) */
  explicitCode: string | null
  onSelect: (code: string | null) => void
  /** يصف للمستخدم قارئات الشاشة أيّ مسار يتغيّر به، لأن القائمتين متطابقتان بصرياً */
  ariaLabel: string
  title: string
}

/** قيمة خاصة بالوضع التلقائي داخل القائمة — يجب أن تختلف عن كل رمز لغة فعلي */
const AUTO_SENTINEL = 'auto'

const SELECT_CLASSES =
  'h-7 min-w-0 max-w-[10.5rem] flex-1 rounded-sm border border-border bg-surface px-1.5 font-mono text-[11px] text-text-secondary transition-colors hover:border-console focus:border-console focus:outline-none focus-visible:ring-2 focus-visible:ring-console'

/**
 * قائمة اختيار لغة مسار ترجمة واحد، مصغّرة لتُوضَع داخل صف رفع الملف في
 * لوحة التحكم. قائمة `<select>` أصلية (وليست قائمة مخصّصة) لتبقى قابلة للاستخدام
 * بلوحة المفاتيح وعلى الجوال دون أي منطق إضافي، وتُبطأ بلا شيء.
 *
 * السلوك: الاختيار الصريح يفوق الكشف التلقائي — فبعد اختيار لغة تبقى لغة
 * الملفات المرفوعة لاحقاً هي المختارة مهما كان نصها غامضاً (الكشف التلقائي
 * لا يشمل سوى العربية والإنجليزية والألمانية). "تلقائي" يرجع إلى وضع الكشف.
 */
export function LanguageSelect({ explicitCode, onSelect, ariaLabel, title }: LanguageSelectProps) {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-1">
      <Languages size={11} className="shrink-0 text-text-muted" aria-hidden="true" />
      <select
        value={explicitCode ?? AUTO_SENTINEL}
        onChange={(event) => onSelect(event.target.value === AUTO_SENTINEL ? null : event.target.value)}
        aria-label={ariaLabel}
        title={title}
        className={cn(SELECT_CLASSES)}
      >
        <option value={AUTO_SENTINEL}>تلقائي (من الملف)</option>
        {SUPPORTED_LANGUAGES.map((language) => (
          <option key={language.code} value={language.code}>
            {language.labelNative}
          </option>
        ))}
      </select>
    </span>
  )
}
