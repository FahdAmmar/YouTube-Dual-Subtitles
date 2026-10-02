import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { resetIndexedDb } from '@/__tests__/testHelpers/resetIndexedDb'
import { STORAGE_KEYS } from '@/constants/theme.constants'
import { BACKUP_FORMAT, BACKUP_VERSION } from '@/lib/utils/backup'
import { BackupPanel } from './BackupPanel'

const downloadTextFile = vi.fn()
vi.mock('@/lib/subtitles/serializeSRT', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/subtitles/serializeSRT')>()),
  downloadTextFile: (...args: unknown[]) => downloadTextFile(...args),
}))

beforeEach(() => {
  window.localStorage.clear()
  resetIndexedDb()
  downloadTextFile.mockClear()
})

function jsonFile(content: unknown, name = 'backup.json') {
  return new File([typeof content === 'string' ? content : JSON.stringify(content)], name, {
    type: 'application/json',
  })
}

describe('BackupPanel', () => {
  it('exports a dated JSON backup containing the saved settings', async () => {
    window.localStorage.setItem(STORAGE_KEYS.GLOSSARY, '{"a":1}')
    render(<BackupPanel />)

    await userEvent.click(screen.getByRole('button', { name: /تصدير نسخة احتياطية/ }))

    await waitFor(() => expect(downloadTextFile).toHaveBeenCalledTimes(1))
    const [content, fileName] = downloadTextFile.mock.calls[0] as [string, string]
    expect(JSON.parse(content)).toMatchObject({ format: BACKUP_FORMAT, local: { [STORAGE_KEYS.GLOSSARY]: '{"a":1}' } })
    expect(fileName).toMatch(/^dual-subtitles-backup_\d{4}-\d{2}-\d{2}\.json$/)
    expect(await screen.findByRole('status')).toHaveTextContent('تم تنزيل')
  })

  it('restores a valid backup and offers a reload to apply it', async () => {
    render(<BackupPanel />)
    const backup = {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      createdAt: 1,
      local: { [STORAGE_KEYS.GLOSSARY]: '{"restored":true}' },
      subtitles: [],
    }

    await userEvent.upload(screen.getByLabelText('اختيار ملف نسخة احتياطية'), jsonFile(backup))

    expect(await screen.findByRole('status')).toHaveTextContent('تمت الاستعادة')
    expect(window.localStorage.getItem(STORAGE_KEYS.GLOSSARY)).toBe('{"restored":true}')
    expect(screen.getByRole('button', { name: /إعادة تحميل الصفحة/ })).toBeInTheDocument()
  })

  it('shows an error and changes nothing when the file is not a valid backup', async () => {
    window.localStorage.setItem(STORAGE_KEYS.GLOSSARY, '{"keep":true}')
    render(<BackupPanel />)

    await userEvent.upload(screen.getByLabelText('اختيار ملف نسخة احتياطية'), jsonFile('not json {'))

    expect(await screen.findByRole('alert')).toHaveTextContent('JSON')
    expect(window.localStorage.getItem(STORAGE_KEYS.GLOSSARY)).toBe('{"keep":true}')
    expect(screen.queryByRole('button', { name: /إعادة تحميل الصفحة/ })).not.toBeInTheDocument()
  })

  it('rejects an oversized file without reading it', async () => {
    render(<BackupPanel />)
    const huge = jsonFile('{}')
    Object.defineProperty(huge, 'size', { value: 65 * 1024 * 1024 })
    const readSpy = vi.spyOn(huge, 'text')

    await userEvent.upload(screen.getByLabelText('اختيار ملف نسخة احتياطية'), huge)

    expect(await screen.findByRole('alert')).toHaveTextContent('أكبر من الحد')
    expect(readSpy).not.toHaveBeenCalled()
  })
})
