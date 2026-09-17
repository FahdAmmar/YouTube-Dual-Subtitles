import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { VitePWA } from 'vite-plugin-pwa'

// إعداد Vite: يفعّل دعم React، ويهيئ الاستيراد المختصر "@/" للإشارة إلى مجلد src
// كما يفصل مكتبات الطرف الثالث الكبيرة (React, Framer Motion) في حزمة (chunk) منفصلة
// لتحسين التخزين المؤقت للمتصفح (Caching) وتقليل حجم الحزمة الأساسية
export default defineConfig({
  plugins: [
    react(),
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
        start_url: '/',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // تضمين الخطوط المُستضافة محلياً صراحةً — جزء أساسي من تجربة عدم
        // الاتصال، لا نريدها تُستثنى بالخطأ من التخزين المؤقت المسبق
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,ico}'],
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
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          motion: ['framer-motion'],
        },
      },
    },
  },
  server: {
    port: 5173,
  },
})
