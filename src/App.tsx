import { LazyMotion, MotionConfig } from 'framer-motion'
import { ThemeProvider } from '@/context/ThemeContext'
import { SubtitleSettingsProvider } from '@/context/SubtitleSettingsContext'
import { AppShell } from '@/components/layout/AppShell'
import { ErrorBoundary } from '@/components/system/ErrorBoundary'

/** Loaded after the first paint; `strict` makes any accidental full `motion.*` import throw instead of re-bundling it */
const loadMotionFeatures = () => import('@/lib/motion/domAnimationFeatures').then((module) => module.default)

/**
 * جذر شجرة المكوّنات: ترتيب الموفّرات (Providers) هنا مقصود — السمة في
 * الخارج لأنها تؤثر على كل شيء بما فيه لوحة إعدادات الترجمة نفسها.
 * ErrorBoundary يغلّف كل شيء ليلتقط أي استثناء غير متوقع في أي مكان
 * من شجرة المكوّنات، بما في ذلك أخطاء داخل الموفّرات نفسها.
 */
export default function App() {
  return (
    <ErrorBoundary>
      <LazyMotion features={loadMotionFeatures} strict>
        {/* Framer Motion ignores the CSS media rule; "user" follows the OS setting */}
        <MotionConfig reducedMotion="user">
          <ThemeProvider>
            <SubtitleSettingsProvider>
              <AppShell />
            </SubtitleSettingsProvider>
          </ThemeProvider>
        </MotionConfig>
      </LazyMotion>
    </ErrorBoundary>
  )
}
