import { createContext, useContext, type ReactNode } from 'react'
import { useTheme } from '@/hooks/useTheme'

type ThemeContextValue = ReturnType<typeof useTheme>

const ThemeContext = createContext<ThemeContextValue | null>(null)

/**
 * موفّر السمة: يُستخدم مرة واحدة فقط في جذر التطبيق (App.tsx)
 * نستخدم Context هنا تحديداً (وليس تمرير props) لأن السمة تُقرأ من عدة
 * مكوّنات متباعدة في الشجرة (الرأس، لوحة الإعدادات، عرض الترجمة)، وتمرير
 * Props عبر كل هذه المستويات كان سيسبب "Prop Drilling" غير ضروري
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useTheme()
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- تصميم مقصود: تجميع الموفّر والـ Hook الخاص به في ملف واحد هو نمط شائع ومقبول لسياقات React (Context)
export function useThemeContext(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useThemeContext يجب أن يُستخدم داخل ThemeProvider')
  }
  return context
}
