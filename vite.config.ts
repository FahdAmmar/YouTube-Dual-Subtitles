import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// إعداد Vite: يفعّل دعم React، ويهيئ الاستيراد المختصر "@/" للإشارة إلى مجلد src
// كما يفصل مكتبات الطرف الثالث الكبيرة (React, Framer Motion) في حزمة (chunk) منفصلة
// لتحسين التخزين المؤقت للمتصفح (Caching) وتقليل حجم الحزمة الأساسية
export default defineConfig({
  plugins: [react()],
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
