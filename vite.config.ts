import { createHash } from 'node:crypto'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { VitePWA } from 'vite-plugin-pwa'
import { buildCsp } from './src/lib/csp/buildCsp'
import { normalizeBase } from './src/lib/deploy/normalizeBase'
import { absolutizeSiteUrls } from './src/lib/deploy/absolutizeSiteUrls'
import { resolveSiteUrl } from './src/lib/deploy/resolveSiteUrl'

// "/" for a domain root; set BASE_PATH=/repo-name/ for GitHub Pages project sites. Read once so every URL agrees.
const base = normalizeBase(process.env.BASE_PATH)

// SITE_URL, or on Vercel the address Vercel provides for the build (see resolveSiteUrl)
const siteUrl = resolveSiteUrl(process.env)

// With a site URL known at build time, link-preview images become absolute URLs and canonical/og:url are added
function siteMetadata(): Plugin {
  return {
    name: 'site-metadata',
    apply: 'build',
    transformIndexHtml: (html) => absolutizeSiteUrls(html, siteUrl, base),
  }
}

// Production only: the dev server injects inline scripts (hot reload) that a strict policy would block
function contentSecurityPolicy(): Plugin {
  return {
    name: 'content-security-policy',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const inlineScripts = [...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((match) => match[1] ?? '')
        const hashes = inlineScripts.map((script) => `sha256-${createHash('sha256').update(script).digest('base64')}`)
        const tag = `<meta http-equiv="Content-Security-Policy" content="${buildCsp(hashes)}" />`
        return html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    ${tag}`)
      },
    },
  }
}

// إعداد Vite: يفعّل دعم React، ويهيئ الاستيراد المختصر "@/" للإشارة إلى مجلد src
// كما يفصل React في حزمة (chunk) منفصلة طويلة التخزين المؤقت (Caching)، ويترك ميزات
// حركة Framer Motion تُحمَّل بعد أول رسم (LazyMotion) لتقليل حجم الحزمة الأساسية
export default defineConfig({
  base,
  plugins: [
    react(),
    siteMetadata(),
    contentSecurityPolicy(),
    VitePWA({
      // تحديث تلقائي صامت للنسخة الجديدة في الخلفية — مشروع بحجمنا لا
      // يحتاج واجهة "نسخة جديدة متوفرة، أعد التحميل؟" إضافية
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon-16x16.png', 'favicon-32x32.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'مترجم يوتيوب المزدوج',
        short_name: 'DUAL_SUB',
        description: 'شاهد فيديوهات يوتيوب مع ترجمتين متزامنتين بلغتين مختلفتين في آن واحد',
        lang: 'ar',
        dir: 'rtl',
        // نفس لون الخلفية الداكنة للتطبيق — يمنع وميضاً أبيض عند فتح
        // التطبيق المُثبَّت قبل رسم الواجهة الفعلية (شاشة البداية)
        theme_color: '#0B0E14',
        background_color: '#0B0E14',
        display: 'standalone',
        // Tied to the base path: an absolute "/" would point outside the app when it is hosted in a sub-folder
        start_url: base,
        scope: base,
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // الخطوط المُستضافة محلياً جزء أساسي من تجربة عدم الاتصال، فخطوط الواجهة (العربية + الجزء اللاتيني
        // من Mono) تُخزَّن مسبقاً مع التطبيق
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,ico}'],
        // ما لا تحتاجه الزيارة الأولى لا يُنزَّل عند تثبيت الـ Service Worker: صورة المعاينة (تقرأها محركات المشاركة
        // وليس التطبيق) وأجزاء الخطوط النادرة (سيريلية، يونانية، لاتينية موسّعة، رموز)
        globIgnores: ['og-image.png', 'fonts/IBMPlexSans-*.woff2', 'fonts/IBMPlexMono-*-{latin-ext,cyrillic,symbols}.woff2'],
        // ...وتُخزَّن عند أول استخدام فعلي، فتعمل دون اتصال بعد ذلك
        runtimeCaching: [
          {
            urlPattern: /\/fonts\/[^/]+\.woff2$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'font-subsets',
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    // The gzip size report re-compresses every file just to print a number: skip it, builds finish sooner
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        // React rarely changes, so it keeps its own long-cached chunk. framer-motion is deliberately not listed:
        // forcing it into one chunk would pull the lazily loaded animation features into the first download
        manualChunks: {
          vendor: ['react', 'react-dom'],
        },
      },
    },
  },
  server: {
    port: 5173,
  },
})
