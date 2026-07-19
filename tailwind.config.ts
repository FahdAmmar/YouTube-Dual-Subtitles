import type { Config } from 'tailwindcss'

// نظام التصميم (Design System) الخاص بالتطبيق
// جميع الألوان معرّفة كمتغيرات CSS (انظر src/styles/tokens.css) حتى تعمل
// بشكل صحيح مع التبديل بين الوضع الداكن والفاتح دون إعادة بناء الأنماط
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--color-bg) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        'surface-elevated': 'rgb(var(--color-surface-elevated) / <alpha-value>)',
        border: 'rgb(var(--color-border) / <alpha-value>)',
        'text-primary': 'rgb(var(--color-text-primary) / <alpha-value>)',
        'text-secondary': 'rgb(var(--color-text-secondary) / <alpha-value>)',
        'text-muted': 'rgb(var(--color-text-muted) / <alpha-value>)',
        // لون المسار الأول (اللغة أ) — أصفر الترجمة الكلاسيكي بنسخة مُهذّبة
        'track-a': 'rgb(var(--color-track-a) / <alpha-value>)',
        'track-a-hover': 'rgb(var(--color-track-a-hover) / <alpha-value>)',
        // لون المسار الثاني (اللغة ب) — أزرق مخضر يوازن اللون الأول
        'track-b': 'rgb(var(--color-track-b) / <alpha-value>)',
        'track-b-hover': 'rgb(var(--color-track-b-hover) / <alpha-value>)',
        // لون تمييز لوحة التحكم (Console) — بنفسجي كهربائي مميز لعناصر
        // الواجهة التقنية (الأزرار، الحدود النشطة، توهج العنصر المختار)
        console: 'rgb(var(--color-console) / <alpha-value>)',
        'console-hover': 'rgb(var(--color-console-hover) / <alpha-value>)',
        success: 'rgb(var(--color-success) / <alpha-value>)',
        warning: 'rgb(var(--color-warning) / <alpha-value>)',
        error: 'rgb(var(--color-error) / <alpha-value>)',
        info: 'rgb(var(--color-info) / <alpha-value>)',
      },
      fontFamily: {
        // عائلة خط واحدة تغطي العربية واللاتينية معاً لضمان الانسجام البصري
        // والأداء (تحميل عائلة خط واحدة فقط بدل عدة عائلات)
        sans: ['"IBM Plex Sans Arabic"', '"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        // خط أحادي المسافة (Monospace) خاص بعناصر واجهة "الكونسول" التقنية
        // فقط (تسميات، شارات، أزرار قوسية) — من نفس عائلة IBM Plex لضمان
        // انسجام بصري كامل مع الخط الأساسي رغم اختلاف الدور
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
      },
      boxShadow: {
        soft: '0 1px 2px rgb(0 0 0 / 0.04), 0 8px 24px -8px rgb(0 0 0 / 0.12)',
        elevated: '0 2px 8px rgb(0 0 0 / 0.06), 0 16px 40px -12px rgb(0 0 0 / 0.18)',
        // توهج خفيف حول العنصر النشط حالياً في قائمة النص (المقطع المتزامن مع الفيديو)
        'glow-console': '0 0 0 1px rgb(var(--color-console) / 0.4), 0 4px 20px -4px rgb(var(--color-console) / 0.35)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.35' },
        },
        // هالة بطيئة تطفو وتتلاشى في الخلفية — أساس التأثير السينمائي
        aurora: {
          '0%, 100%': { transform: 'translate3d(0, 0, 0) scale(1)', opacity: '0.7' },
          '33%': { transform: 'translate3d(4%, -3%, 0) scale(1.08)', opacity: '0.9' },
          '66%': { transform: 'translate3d(-3%, 4%, 0) scale(0.96)', opacity: '0.6' },
        },
        // طفو ناعم لأعلى ولأسفل — للعناصر العائمة كالشارات والنقاط
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        // تدرّج متحرّك على الحدود المتوهّجة (gradient border)
        'border-flow': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        // وميض ناعم لـ"الشارة الحيّة" (مؤشر جاهزية)
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgb(var(--color-console) / 0.4)' },
          '50%': { boxShadow: '0 0 0 6px rgb(var(--color-console) / 0)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-120%)' },
          '100%': { transform: 'translateX(220%)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 180ms ease-out',
        'pulse-dot': 'pulse-dot 1.6s ease-in-out infinite',
        aurora: 'aurora 18s ease-in-out infinite',
        float: 'float 6s ease-in-out infinite',
        'border-flow': 'border-flow 6s ease infinite',
        'glow-pulse': 'glow-pulse 2.4s ease-in-out infinite',
        shimmer: 'shimmer 2.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config
