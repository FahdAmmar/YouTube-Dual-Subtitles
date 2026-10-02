import { MotionConfig } from 'framer-motion'
import { ThemeProvider } from '@/context/ThemeContext'
import { SubtitleSettingsProvider } from '@/context/SubtitleSettingsContext'
import { AppShell } from '@/components/layout/AppShell'
import { ErrorBoundary } from '@/components/system/ErrorBoundary'

/**
 * جذر شجرة المكوّنات: ترتيب الموفّرات (Providers) هنا مقصود — السمة في
 * الخارج لأنها تؤثر على كل شيء بما فيه لوحة إعدادات الترجمة نفسها.
 * ErrorBoundary يغلّف كل شيء ليلتقط أي استثناء غير متوقع في أي مكان
 * من شجرة المكوّنات، بما في ذلك أخطاء داخل الموفّرات نفسها.
 */
export default function App() {
  return (
    <ErrorBoundary>
      {/* Framer Motion ignores the CSS media rule; "user" follows the OS setting */}
      <MotionConfig reducedMotion="user">
        <ThemeProvider>
          <SubtitleSettingsProvider>
            <AppShell />
          </SubtitleSettingsProvider>
        </ThemeProvider>
      </MotionConfig>
    </ErrorBoundary>
  )
}
