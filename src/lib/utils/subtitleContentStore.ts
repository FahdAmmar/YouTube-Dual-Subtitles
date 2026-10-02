/**
 * يخزّن محتوى ملف ترجمة كاملاً (وليس اسمه فقط) — يتيح تفعيله تلقائياً
 * بلا أي تدخّل من المستخدم عند العودة لنفس الفيديو من سجل المشاهدات.
 *
 * IndexedDB (وليس localStorage كبقية ميزات التخزين المحلي في المشروع):
 * ملفات SRT/VTT نصوص عادية ضمن سقف 2 ميغابايت (انظر parseSubtitleFile)،
 * لكن حصة localStorage الإجمالية (~5-10 ميغابايت) تُستهلَك بسرعة عند
 * تخزين محتوى ملفات كاملة بدل نصوص/أرقام قصيرة كبقية الإعدادات؛
 * IndexedDB مصمَّم لهذا الحجم تحديداً، وحصته أكبر بكثير في كل المتصفحات.
 *
 * فشل أي عملية هنا صامت بالكامل بعمد (يرجع null/لا يفعل شيئاً بدل رمي
 * استثناء): تعطّل IndexedDB (وضع تصفح خاص صارم، حصة ممتلئة، متصفح قديم
 * لا يدعمه إطلاقاً...) يجب ألا يُفشل عملية رفع الترجمة الفعلية الناجحة
 * أصلاً — هذا تخزين تكميلي (Progressive Enhancement) وليس أساسياً.
 */

const DB_NAME = 'ydc-subtitle-content'
const DB_VERSION = 1
const STORE_NAME = 'files'
const SAVED_AT_INDEX = 'savedAt'

// سقف أقل من سجل المشاهدات (40) بعمد: كل فيديو قد يملك مسارين (مصدر +
// ترجمة)، ومحتوى الملفات أثقل بكثير من نص/رقم قصير، فسقف أصغر هنا يوازن
// بين الفائدة الفعلية واستهلاك حصة IndexedDB المخصصة للمتصفح
export const MAX_STORED_FILES = 30

export type SubtitleTrackId = 'source' | 'translation'

export interface StoredSubtitleFile {
  key: string
  content: string
  savedAt: number
}

function buildKey(videoKey: string, trackId: SubtitleTrackId, fileName: string): string {
  return `${videoKey}::${trackId}::${fileName}`
}

function isIndexedDbAvailable(): boolean {
  return typeof indexedDB !== 'undefined'
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' })
        store.createIndex(SAVED_AT_INDEX, SAVED_AT_INDEX)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error as Error)
  })
}

function awaitTransaction(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error as Error)
  })
}

/** يحذف أقدم المُدخلات (حسب savedAt) بما يتجاوز MAX_STORED_FILES — بنفس فلسفة سقف سجل المشاهدات */
async function pruneOldestEntries(db: IDBDatabase): Promise<void> {
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)

  // مرتّبة تصاعدياً حسب savedAt تلقائياً (ترتيب الفهرس) — الأقدم أولاً
  const orderedKeys = await new Promise<IDBValidKey[]>((resolve, reject) => {
    const request = store.index(SAVED_AT_INDEX).getAllKeys()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error as Error)
  })

  const excessCount = orderedKeys.length - MAX_STORED_FILES
  if (excessCount > 0) {
    for (const key of orderedKeys.slice(0, excessCount)) {
      store.delete(key)
    }
  }

  await awaitTransaction(tx)
}

export async function saveSubtitleContent(
  videoKey: string,
  trackId: SubtitleTrackId,
  fileName: string,
  content: string,
): Promise<void> {
  if (!isIndexedDbAvailable()) return

  try {
    const db = await openDatabase()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const entry: StoredSubtitleFile = { key: buildKey(videoKey, trackId, fileName), content, savedAt: Date.now() }
    tx.objectStore(STORE_NAME).put(entry)
    await awaitTransaction(tx)
    await pruneOldestEntries(db)
    db.close()
  } catch {
    // تجاهل بصمت — انظر التوثيق أعلى الملف
  }
}

export async function getSubtitleContent(
  videoKey: string,
  trackId: SubtitleTrackId,
  fileName: string,
): Promise<string | null> {
  if (!isIndexedDbAvailable()) return null

  try {
    const db = await openDatabase()
    const tx = db.transaction(STORE_NAME, 'readonly')
    const result = await new Promise<StoredSubtitleFile | undefined>((resolve, reject) => {
      const request = tx.objectStore(STORE_NAME).get(buildKey(videoKey, trackId, fileName))
      request.onsuccess = () => resolve(request.result as StoredSubtitleFile | undefined)
      request.onerror = () => reject(request.error as Error)
    })
    db.close()
    return result?.content ?? null
  } catch {
    return null
  }
}

/**
 * يحذف كل محتوى الترجمة المحفوظ لفيديو واحد (المسار المصدر والترجمة معاً)
 * — يُستدعى عند إزالة مُدخل من سجل المشاهدات (useWatchHistory). المفتاح
 * مركّب (videoKey::trackId::fileName)، فنحذف بمدى بادئة (IDBKeyRange) لا
 * بمطابقة مفتاح تامة، تماماً كما تفعل deleteOffsetsForVideo مع localStorage
 */
export async function deleteSubtitleContentForVideo(videoKey: string): Promise<void> {
  if (!isIndexedDbAvailable()) return

  try {
    const db = await openDatabase()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const prefix = `${videoKey}::`
    const range = IDBKeyRange.bound(prefix, prefix + '\uffff')

    const request = store.openCursor(range)
    request.onsuccess = () => {
      const cursor = request.result
      if (cursor) {
        cursor.delete()
        cursor.continue()
      }
    }

    await awaitTransaction(tx)
    db.close()
  } catch {
    // تجاهل بصمت — انظر التوثيق أعلى الملف
  }
}

/** كل الملفات المحفوظة — لتصدير نسخة احتياطية؛ يعيد [] عند أي فشل، بنفس فلسفة بقية الملف */
export async function getAllSubtitleFiles(): Promise<StoredSubtitleFile[]> {
  if (!isIndexedDbAvailable()) return []

  try {
    const db = await openDatabase()
    const tx = db.transaction(STORE_NAME, 'readonly')
    const files = await new Promise<StoredSubtitleFile[]>((resolve, reject) => {
      const request = tx.objectStore(STORE_NAME).getAll()
      request.onsuccess = () => resolve(request.result as StoredSubtitleFile[])
      request.onerror = () => reject(request.error as Error)
    })
    db.close()
    return files
  } catch {
    return []
  }
}

/**
 * يكتب ملفات مستعادة من نسخة احتياطية محافظاً على savedAt الأصلي (ليبقى ترتيب
 * التقليم صحيحاً). على عكس بقية الملف يرمي عند الفشل: المستخدم طلب الاستعادة
 * صراحةً ويجب أن يعرف إن لم تنجح
 */
export async function restoreSubtitleFiles(files: readonly StoredSubtitleFile[]): Promise<void> {
  if (files.length === 0) return
  if (!isIndexedDbAvailable()) throw new Error('IndexedDB unavailable')

  const db = await openDatabase()
  try {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    for (const file of files) store.put(file)
    await awaitTransaction(tx)
    await pruneOldestEntries(db)
  } finally {
    db.close()
  }
}
