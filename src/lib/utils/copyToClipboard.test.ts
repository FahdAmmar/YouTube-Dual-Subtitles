import { afterEach, describe, it, expect, vi } from 'vitest'
import { copyToClipboard } from './copyToClipboard'

afterEach(() => {
  vi.restoreAllMocks()
  Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true })
})

describe('copyToClipboard', () => {
  it('uses the async Clipboard API when available', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    await expect(copyToClipboard('hello')).resolves.toBe(true)
    expect(writeText).toHaveBeenCalledWith('hello')
  })

  it('falls back to a selection copy when the API rejects', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'))
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    document.execCommand = vi.fn().mockReturnValue(true)
    await expect(copyToClipboard('hello')).resolves.toBe(true)
    expect(document.execCommand).toHaveBeenCalledWith('copy')
    expect(document.querySelector('textarea')).toBeNull()
  })

  it('reports failure when nothing can copy', async () => {
    document.execCommand = vi.fn().mockReturnValue(false)
    await expect(copyToClipboard('hello')).resolves.toBe(false)
  })

  it('refuses to copy empty text', async () => {
    await expect(copyToClipboard('')).resolves.toBe(false)
  })
})
