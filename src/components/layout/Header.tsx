import { Home, Terminal } from 'lucide-react'
import { ThemeToggle } from '@/components/settings/ThemeToggle'
import { IconButton } from '@/components/ui/IconButton'

interface HeaderProps {
  /**
   * اختياري: موجود فقط في تخطيط "لوحة التحكم" (مرحلة ما بعد اختيار الفيديو)،
   * وينفّذ نفس مسار الرجوع لشاشة إعداد الفيديو المركزية — زر الموقع (AppShell)
   * يحرر Object URL للأي ملف فيديو محلي نشط ويصفّر مساري الترجمة قبل العودة.
   * في الشاشة الرئيسية نفسها لا معنى للزر فلا يُعرض إطلاقاً
   */
  onGoHome?: () => void
}

/**
 * رأس صفحة مضغوط بطابع زجاجي (Glass): يطفو فوق خلفية BackgroundFX بشفافية
 * وbackdrop-blur بدل لون مصمت، فتتدفّق الهالات خلفه دون أن تحجبها الشريط
 * العلوي — يحافظ على طابع "الكونسول التقني" مع عمق بصري أكبر. الشعار
 * مغطّى بطبقة توهّج ناعمة (glow) تجعله يبدو نابضاً دون وميض فعلي.
 *
 * زر الإعدادات انتقل إلى لوحة التحكم الجانبية (ConsolePanel) لأنه يخص
 * الترجمة تحديداً، بينما هذا الرأس عام لكامل التطبيق — فصل واضح بين إعدادات
 * النطاق العام والخاص.
 *
 * التنقّل إلى الشاشة الرئيسية: زر مرئي دائماً مقابل الشعار (بجانب مبدّل
 * السمة) لأن الرجوع للرئيسية — أي تغيير الفيديو الحالي — مسار مستخدمين
 * متكرر، وقد كان متاحاً سابقاً فقط من زر تهدّم فوق الفيديو نفسه
 */
export function Header({ onGoHome }: HeaderProps) {
  return (
    <header className="glass-subtle relative z-30 flex h-12 shrink-0 items-center justify-between border-b border-border/60 px-3.5 sm:px-5">
      <div className="flex items-center gap-2.5">
        <span className="relative flex h-7 w-7 items-center justify-center rounded-md bg-console text-white shadow-[0_0_18px_-2px_rgb(var(--color-console)/0.65)]">
          <Terminal size={15} aria-hidden="true" />
          {/* توهج ناعم خلف الشعار يربطه لونياً بالهالات في الخلفية */}
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-md ring-1 ring-inset ring-white/20"
          />
        </span>
        <h1 className="font-mono text-[13px] font-medium tracking-wide text-text-primary">
          DUAL_SUB<span className="text-console">.</span>
        </h1>
      </div>

      <div className="flex items-center gap-1.5">
        {onGoHome && (
          <IconButton
            onClick={onGoHome}
            aria-label="العودة إلى الشاشة الرئيسية"
            title="العودة إلى الشاشة الرئيسية"
            className="hover:text-console"
          >
            <Home size={19} aria-hidden="true" />
          </IconButton>
        )}
        <ThemeToggle />
      </div>
    </header>
  )
}
