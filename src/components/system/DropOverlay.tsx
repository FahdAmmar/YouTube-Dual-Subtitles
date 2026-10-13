import { FileUp } from 'lucide-react'

/** Shown while a file is dragged over the page; the drop itself is handled at window level */
export function DropOverlay({ isVisible }: { isVisible: boolean }) {
  if (!isVisible) return null
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center bg-bg/80 p-6 backdrop-blur-sm"
    >
      <div className="flex max-w-sm flex-col items-center gap-3 rounded-xl border-2 border-dashed border-console px-10 py-12 text-center">
        <FileUp size={32} className="text-console" />
        <p className="text-base font-medium text-text-primary">أفلت ملف الترجمة هنا</p>
        <p className="text-xs text-text-secondary">ملف واحد يملأ المسار الفارغ، وملفان يُعيَّنان للأصل ثم الترجمة</p>
      </div>
    </div>
  )
}
