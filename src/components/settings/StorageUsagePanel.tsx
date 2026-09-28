import { useStorageUsageEstimate } from '@/hooks/useStorageUsageEstimate'
import { useWatchHistoryEntries } from '@/hooks/useWatchHistory'
import { formatBytes } from '@/lib/utils/formatBytes'

interface StorageUsagePanelProps {
  /** فتح لوحة الإعدادات فعلياً — يُستخدم لتأجيل قياس المساحة حتى الحاجة الفعلية فقط */
  isOpen: boolean
}

/**
 * لوحة شفافية صغيرة داخل الإعدادات: تُظهر مساحة تخزين المتصفح المستخدمة
 * فعلياً (IndexedDB بشكل أساسي، حيث تُحفظ محتويات ملفات الترجمة، إضافة
 * إلى localStorage) — مهمة لتطبيق يعتمد كلياً على تخزين المتصفح كبديل لأي
 * خادم، حيث لا وسيلة أخرى للمستخدم لمعرفة حجم ما تراكم فعلياً بمرور الوقت.
 *
 * لا تُكرر زر "مسح الكل" الموجود أصلاً في قائمة سجل المشاهدات
 * (WatchHistoryList، انظر useWatchHistoryEntries.clearHistory) — تكتفي
 * بالإشارة إليه بدل تكرار نفس المنطق في مكانين
 */
export function StorageUsagePanel({ isOpen }: StorageUsagePanelProps) {
  const estimate = useStorageUsageEstimate(isOpen)
  const { entries } = useWatchHistoryEntries()

  // المتصفح لا يدعم واجهة القياس إطلاقاً — إخفاء اللوحة كاملة بدل عرض
  // أصفار مضلِّلة توحي بأن التخزين فارغ فعلاً
  if (!estimate.isSupported) return null

  const usedPercent =
    estimate.quotaBytes > 0 ? Math.min(100, (estimate.usageBytes / estimate.quotaBytes) * 100) : 0

  return (
    <div className="flex flex-col gap-2 border-s-4 border-border ps-4">
      <h3 className="text-sm font-semibold text-text-primary">مساحة التخزين</h3>

      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-surface-elevated"
        role="progressbar"
        aria-label="نسبة مساحة التخزين المستخدمة من حصة المتصفح"
        aria-valuenow={Math.round(usedPercent)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-console transition-[width] duration-300"
          style={{ width: `${usedPercent}%` }}
        />
      </div>

      <p className="font-mono text-xs text-text-muted">
        {formatBytes(estimate.usageBytes)} مستخدَمة من {formatBytes(estimate.quotaBytes)} متاحة ·{' '}
        {entries.length} فيديو في السجل
      </p>

      <p className="text-xs text-text-muted">
        لحذف البيانات المحفوظة، استخدم زر «مسح الكل» في قائمة سجل المشاهدات
      </p>
    </div>
  )
}
