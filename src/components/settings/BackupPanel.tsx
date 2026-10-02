import { useRef, useState, type ChangeEvent } from 'react'
import { Download, Upload, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { downloadTextFile } from '@/lib/subtitles/serializeSRT'
import { createBackup, parseBackup, applyBackup, BackupError, MAX_BACKUP_BYTES } from '@/lib/utils/backup'

type Status =
  | { kind: 'idle' }
  | { kind: 'exported' }
  | { kind: 'restored' }
  | { kind: 'error'; message: string }

function backupFileName(): string {
  return `dual-subtitles-backup_${new Date().toISOString().slice(0, 10)}.json`
}

function toErrorMessage(error: unknown): string {
  return error instanceof BackupError ? error.message : 'حدث خطأ غير متوقع أثناء معالجة الملف'
}

/**
 * نسخ احتياطي واستعادة لبيانات المتصفح المحلية (الإعدادات، السجل، المفردات،
 * ملفات الترجمة). الاستعادة تستبدل القيم الموجودة في الملف فقط، وتتطلب إعادة
 * تحميل الصفحة لأن حالة React الحالية لا تُقرأ من التخزين إلا عند الإقلاع
 */
export function BackupPanel() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  async function handleExport() {
    try {
      downloadTextFile(JSON.stringify(await createBackup()), backupFileName())
      setStatus({ kind: 'exported' })
    } catch (error) {
      setStatus({ kind: 'error', message: toErrorMessage(error) })
    }
  }

  async function handleFileChosen(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Reset so choosing the same file twice still fires onChange
    event.target.value = ''
    if (!file) return

    try {
      if (file.size > MAX_BACKUP_BYTES) throw new BackupError('الملف أكبر من الحد المسموح')
      await applyBackup(parseBackup(await file.text()))
      setStatus({ kind: 'restored' })
    } catch (error) {
      setStatus({ kind: 'error', message: toErrorMessage(error) })
    }
  }

  return (
    <div className="flex flex-col gap-2 border-s-4 border-border ps-4">
      <h3 className="text-sm font-semibold text-text-primary">نسخة احتياطية</h3>
      <p className="text-xs text-text-muted">
        احفظ إعداداتك وسجل المشاهدة والمفردات وملفات الترجمة في ملف، واستعدها على أي متصفح أو جهاز.
      </p>

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={handleExport}>
          <Download size={15} aria-hidden="true" />
          تصدير نسخة احتياطية
        </Button>
        <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
          <Upload size={15} aria-hidden="true" />
          استعادة من ملف
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          aria-label="اختيار ملف نسخة احتياطية"
          onChange={handleFileChosen}
          className="hidden"
        />
      </div>

      {status.kind === 'exported' && (
        <p role="status" className="text-xs text-text-secondary">
          تم تنزيل النسخة الاحتياطية
        </p>
      )}
      {status.kind === 'restored' && (
        <div role="status" className="flex flex-col items-start gap-2 text-xs text-text-secondary">
          تمت الاستعادة. أعد تحميل الصفحة لتطبيق البيانات المستعادة.
          <Button size="sm" onClick={() => window.location.reload()}>
            <RefreshCw size={15} aria-hidden="true" />
            إعادة تحميل الصفحة
          </Button>
        </div>
      )}
      {status.kind === 'error' && (
        <p role="alert" className="text-xs font-medium text-red-500">
          {status.message}
        </p>
      )}
    </div>
  )
}
