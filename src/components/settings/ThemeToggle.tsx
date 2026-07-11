import { Sun, Moon } from 'lucide-react'
import { IconButton } from '@/components/ui/IconButton'
import { useThemeContext } from '@/context/ThemeContext'

/** زر تبديل السمة — يعرض الأيقونة المقابلة للسمة التي سيتحول إليها التطبيق عند النقر */
export function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useThemeContext()
  const isDark = resolvedTheme === 'dark'

  return (
    <IconButton
      onClick={toggleTheme}
      aria-label={isDark ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الداكن'}
    >
      {isDark ? <Sun size={19} aria-hidden="true" /> : <Moon size={19} aria-hidden="true" />}
    </IconButton>
  )
}
