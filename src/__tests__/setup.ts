import '@testing-library/jest-dom/vitest'

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
