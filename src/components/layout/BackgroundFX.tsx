import { memo } from 'react'
import { cn } from '@/lib/utils/cn'

/**
 * خلفية حيّة ثابتة (Fixed) بطبقات ثلاث متحدّدة (Composited Layers):
 *
 * 1) هالات Aurora متحرّكة — ثلاث كتل ضبابية ضخمة بألوان النظام (بنفسجي
 *    الكونسول، أزرق-مخضر المسار ب، ذهبي المسار أ) تطفو وتتلاشى ببطء
 *    شديد (18 ثانية لكل دورة) كاملة. تعطي إحساساً سينمائياً دون أي تشتيت،
 *    لأنها شفّافة جداً وتحتها شبكة تخفّف حدّتها أكثر.
 *
 * 2) شبكة نقطية خفيفة (Grid) — تُضيف طابع "الكونسول التقني" المعهود في
 *    نظام التصميم، مع قناع شعاعي (radial mask) يُخفي الحواف تدريجياً
 *    لتبدو منبثقة من المنتصف بدل إطار صلب.
 *
 * 3) نسيج تشويش رقمي (Noise) — يكسر التدرجات النقية ويمنع ظهور
 *    "banding" في تدرّجات الـ Aurora، ويمنح ملمساً سينمائياً راقياً.
 *
 * الأداء: كل طبقة على عنصر مستقل بـ will-change وtranslateZ(0) لإجبار
 * إنشاء طبقة GPU مخصّصة (Compositor Layer) لكل واحدة، فتتحرك الـ Aurora
 * على الـ Compositor وحده دون لمس الـ Layout/Paint thread الرئيسي.
 * pointer-events: none على الجذع بالكامل حتى لا تعترض أي تفاعل أمامي.
 *
 * تُحترم تفضيل تقليل الحركة: عند تفعيله على مستوى النظام تتوقّف الـ Aurora
 * تماماً وتبقى ثابتة كطبقة لونية هادئة — راحة بصرية للمستخدمين الحساسين.
 */
export const BackgroundFX = memo(function BackgroundFX({
  className,
}: {
  className?: string
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none fixed inset-0 -z-10 overflow-hidden',
        className,
      )}
    >
      {/* طبقة الهالات المتحرّكة */}
      <div className="absolute inset-0">
        <span
          className="absolute -top-1/4 left-[-10%] h-[60vh] w-[60vh] rounded-full opacity-60 blur-[100px] will-change-transform [animation:aurora_18s_ease-in-out_infinite] [transform:translateZ(0)]"
          style={{
            background:
              'radial-gradient(circle at center, rgb(var(--aurora-a) / 0.55), transparent 65%)',
          }}
        />
        <span
          className="absolute top-1/3 right-[-15%] h-[55vh] w-[55vh] rounded-full opacity-50 blur-[100px] will-change-transform [animation:aurora_22s_ease-in-out_infinite_-7s] [transform:translateZ(0)]"
          style={{
            background:
              'radial-gradient(circle at center, rgb(var(--aurora-b) / 0.5), transparent 65%)',
          }}
        />
        <span
          className="absolute bottom-[-20%] left-1/4 h-[50vh] w-[50vh] rounded-full opacity-40 blur-[100px] will-change-transform [animation:aurora_26s_ease-in-out_infinite_-12s] [transform:translateZ(0)]"
          style={{
            background:
              'radial-gradient(circle at center, rgb(var(--aurora-c) / 0.45), transparent 65%)',
          }}
        />
      </div>

      {/* طبقة الشبكة النقطية — فوق الهالات، تحت المحتوى */}
      <div className="bg-grid absolute inset-0" />

      {/* طبقة التشويش الرقمي — أعلى طبقة بصرية، blend-overlay تدمجها */}
      <div className="bg-noise absolute inset-0" />

      {/* تدرّج خطّ أفق خفيف (vignette) في الأسفل لربط الخلفية بالأرضية */}
      <div
        className="absolute inset-x-0 bottom-0 h-1/3"
        style={{
          background:
            'linear-gradient(to top, rgb(var(--color-bg) / 0.9), transparent)',
        }}
      />
    </div>
  )
})
