import '@testing-library/jest-dom/vitest'
// jsdom لا يوفّر IndexedDB إطلاقاً — محاكاة كاملة في الذاكرة لاختبار
// subtitleContentStore.ts (تخزين محتوى ملفات الترجمة لسجل المشاهدات)
import 'fake-indexeddb/auto'

// محاكاة قياسية لـ window.matchMedia (متوفرة فعلياً في كل المتصفحات الحديثة،
// لكن jsdom لا يوفرها افتراضياً) — هذا يحاكي بيئة متصفح حقيقي بدقة
if (!window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as unknown as MediaQueryList
}

// محاكاة ResizeObserver — غير متوفرة في jsdom لكنها مستخدمة في
// useDraggableOverlayPosition لمتابعة أبعاد حاوية الفيديو
if (typeof window.ResizeObserver === 'undefined') {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  window.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver
}

// jsdom لا يوفّر Web Speech API إطلاقاً — محاكاة بسيطة للمُنشئ العام كي لا
// تفشل اختبارات textToSpeech.ts (نطق نص المقطع) بسبب غياب هذا المُنشئ فقط،
// بمعزل تام عن المنطق الفعلي المُختبَر (window.speechSynthesis نفسه يُحاكى
// داخل كل اختبار على حدة حسب الحاجة)
if (typeof window.SpeechSynthesisUtterance === 'undefined') {
  class SpeechSynthesisUtteranceMock {
    text: string
    lang = ''
    constructor(text: string) {
      this.text = text
    }
  }
  window.SpeechSynthesisUtterance =
    SpeechSynthesisUtteranceMock as unknown as typeof SpeechSynthesisUtterance
}

// مطابقة اتجاه الصفحة الفعلي المضبوط في index.html (dir="rtl" lang="ar")
// — Testing Library تُركّب المكوّنات مباشرة داخل document جديد لا يمرّ
// بـ index.html إطلاقاً، فبدون هذا السطر تُختبر الواجهة بافتراض LTR خاطئ
// تماماً، بينما التطبيق الفعلي يعمل دوماً بـ RTL
document.documentElement.dir = 'rtl'
document.documentElement.lang = 'ar'

// jsdom لا يُنفّذ محرك تخطيط (Layout Engine) حقيقياً، فتُعيد
// getBoundingClientRect() دوماً أصفاراً لكل العناصر بلا استثناء. أي كود
// يعتمد على أبعاد فعلية (كحساب أقصى عرض للوحة الجانبية القابلة للسحب) يحتاج
// قيماً واقعية لاختباره بمعنى — نحاكي هنا أبعاد شاشة سطح مكتب معتادة
Element.prototype.getBoundingClientRect = (): DOMRect => ({
  width: 1280,
  height: 800,
  top: 0,
  left: 0,
  right: 1280,
  bottom: 800,
  x: 0,
  y: 0,
  toJSON() {
    return this
  },
})
