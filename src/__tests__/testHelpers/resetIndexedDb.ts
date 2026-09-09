import { IDBFactory } from 'fake-indexeddb'

/**
 * يعيد تعيين قاعدة fake-indexeddb بالكامل — هذا هو النمط الموثَّق رسمياً
 * في مكتبة fake-indexeddb نفسها لإعادة الضبط بين الاختبارات، مستخرج هنا
 * بدل تكراره حرفياً (سطران + تعليق eslint-disable) في كل ملف اختبار
 * يتعامل مع IndexedDB
 */
export function resetIndexedDb(): void {
  // eslint-disable-next-line no-global-assign
  indexedDB = new IDBFactory()
}
