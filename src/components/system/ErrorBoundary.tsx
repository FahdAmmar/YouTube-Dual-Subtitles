import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

/**
 * حدّ التقاط أخطاء React (Error Boundary)
 *
 * ملاحظة تقنية: يجب أن يكون Error Boundary مكوّن كلاس (Class Component)
 * حصراً — React لا يوفّر حتى الآن معادلاً له عبر Hooks (لا يوجد
 * useErrorBoundary). هذا هو الاستثناء الوحيد لمكوّن كلاس في كامل المشروع.
 *
 * الغرض: أي استثناء غير متوقع أثناء الرسم (مثال: بنية بيانات غير متوقعة
 * نتجت عن تعديل يدوي لقيمة في localStorage عبر أدوات المطوّر) كان سيُسقط
 * الصفحة بيضاء بالكامل دون أي تفسير للمستخدم. الآن يُعرض بدلاً من ذلك
 * واجهة استرداد واضحة مع خيار إعادة التحميل.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // تسجيل محلي في وحدة التحكم فقط — لا يوجد أي إرسال تلقائي لأي خادم
    // خارجي، اتساقاً مع كون هذا تطبيقاً من جهة العميل بالكامل دون تتبّع
    console.error('حدث خطأ غير متوقع داخل التطبيق:', error, errorInfo.componentStack)
  }

  private handleReload = (): void => {
    window.location.reload()
  }

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg px-6 text-center">
        <AlertTriangle size={32} className="text-error" aria-hidden="true" />
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-bold text-text-primary">حدث خطأ غير متوقع</h1>
          <p className="max-w-sm text-sm text-text-secondary">
            نعتذر عن هذا الإزعاج. حاول إعادة تحميل الصفحة؛ بيانات إعداداتك المحفوظة (السمة وتفضيلات
            العرض) لن تتأثر.
          </p>
        </div>
        <button
          type="button"
          onClick={this.handleReload}
          className="h-11 rounded-md bg-console px-5 text-[15px] font-medium text-white transition-colors hover:bg-console-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-console focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        >
          إعادة تحميل الصفحة
        </button>
      </div>
    )
  }
}
