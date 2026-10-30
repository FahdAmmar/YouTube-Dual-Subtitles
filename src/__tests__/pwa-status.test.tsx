import { describe, it, expect, vi, afterEach } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import App from '../App'
import { PwaStatusToast } from '@/components/system/PwaStatusToast'
import { PwaUpdatePrompt } from '@/components/system/PwaUpdatePrompt'

const pwa = vi.hoisted(() => ({
  needRefresh: false,
  offlineReady: false,
  setNeedRefresh: vi.fn(),
  setOfflineReady: vi.fn(),
  updateServiceWorker: vi.fn(async () => {}),
}))

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [pwa.needRefresh, pwa.setNeedRefresh],
    offlineReady: [pwa.offlineReady, pwa.setOfflineReady],
    updateServiceWorker: pwa.updateServiceWorker,
  }),
}))

afterEach(() => {
  pwa.needRefresh = false
  pwa.offlineReady = false
  pwa.setNeedRefresh.mockClear()
  pwa.setOfflineReady.mockClear()
  pwa.updateServiceWorker.mockClear()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('PwaStatusToast', () => {
  const noop = () => {}

  it('renders nothing when there is nothing to say', () => {
    const { container } = render(<PwaStatusToast needRefresh={false} offlineReady={false} onUpdate={noop} onDismiss={noop} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('offers the new version, and lets the learner choose when to switch', () => {
    const onUpdate = vi.fn()
    const onDismiss = vi.fn()
    render(<PwaStatusToast needRefresh offlineReady={false} onUpdate={onUpdate} onDismiss={onDismiss} />)

    expect(screen.getByRole('status')).toHaveTextContent('نسخة جديدة من التطبيق جاهزة')
    fireEvent.click(screen.getByRole('button', { name: 'لاحقاً' }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
    expect(onUpdate).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'تحديث الآن' }))
    expect(onUpdate).toHaveBeenCalledTimes(1)
  })

  it('tells the learner once the app can be used without a connection', () => {
    render(<PwaStatusToast needRefresh={false} offlineReady onUpdate={noop} onDismiss={noop} />)
    expect(screen.getByRole('status')).toHaveTextContent('التطبيق جاهز للعمل دون اتصال')
    expect(screen.queryByRole('button', { name: 'تحديث الآن' })).not.toBeInTheDocument()
  })

  it('puts the update first when both messages apply', () => {
    render(<PwaStatusToast needRefresh offlineReady onUpdate={noop} onDismiss={noop} />)
    expect(screen.getByRole('status')).toHaveTextContent('نسخة جديدة')
    expect(screen.getByRole('status')).not.toHaveTextContent('دون اتصال')
  })
})

describe('PwaUpdatePrompt', () => {
  it('updates the service worker and reloads when the learner accepts', () => {
    pwa.needRefresh = true
    render(<PwaUpdatePrompt />)
    fireEvent.click(screen.getByRole('button', { name: 'تحديث الآن' }))
    expect(pwa.updateServiceWorker).toHaveBeenCalledWith(true)
  })

  it('keeps the old version running when the learner says "later"', () => {
    pwa.needRefresh = true
    render(<PwaUpdatePrompt />)
    fireEvent.click(screen.getByRole('button', { name: 'لاحقاً' }))
    expect(pwa.setNeedRefresh).toHaveBeenCalledWith(false)
    expect(pwa.updateServiceWorker).not.toHaveBeenCalled()
  })

  it('hides the "ready offline" note by itself after a few seconds', () => {
    vi.useFakeTimers()
    pwa.offlineReady = true
    render(<PwaUpdatePrompt />)
    expect(pwa.setOfflineReady).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(7000)
    })
    expect(pwa.setOfflineReady).toHaveBeenCalledWith(false)
  })
})

describe('connection badge in the header', () => {
  function setOnline(isOnline: boolean) {
    vi.spyOn(Navigator.prototype, 'onLine', 'get').mockReturnValue(isOnline)
    act(() => {
      window.dispatchEvent(new Event(isOnline ? 'online' : 'offline'))
    })
  }

  it('appears when the connection drops and disappears when it returns', () => {
    vi.spyOn(Navigator.prototype, 'onLine', 'get').mockReturnValue(true)
    render(<App />)
    expect(screen.queryByText('غير متصل')).not.toBeInTheDocument()

    setOnline(false)
    expect(screen.getByRole('status', { name: 'حالة الاتصال' })).toHaveTextContent('غير متصل')

    setOnline(true)
    expect(screen.queryByText('غير متصل')).not.toBeInTheDocument()
  })

  it('shows up at once when the app is opened without a connection', () => {
    vi.spyOn(Navigator.prototype, 'onLine', 'get').mockReturnValue(false)
    render(<App />)
    expect(screen.getByRole('status', { name: 'حالة الاتصال' })).toBeInTheDocument()
  })
})
