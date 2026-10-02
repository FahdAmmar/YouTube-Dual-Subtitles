import { describe, it, expect } from 'vitest'
import { getTapZone, classifyRelease } from './touchGestures'

const at = (x: number, y: number, time: number) => ({ x, y, time })

describe('getTapZone', () => {
  it.each([
    [0, 'left'],
    [99, 'left'],
    [100, 'center'],
    [199, 'center'],
    [200, 'right'],
    [300, 'right'],
  ] as const)('maps x=%s in a 300px wide stage to %s', (x, zone) => {
    expect(getTapZone(x, 300)).toBe(zone)
  })

  it('falls back to the centre when the stage has no width yet', () => {
    expect(getTapZone(10, 0)).toBe('center')
  })
})

describe('classifyRelease', () => {
  it('treats a short, nearly still touch as a tap', () => {
    expect(classifyRelease(at(100, 100, 0), at(104, 98, 120))).toBe('tap')
  })

  it('treats a long press as nothing', () => {
    expect(classifyRelease(at(100, 100, 0), at(100, 100, 800))).toBe('none')
  })

  it('detects a fast horizontal swipe in each direction', () => {
    expect(classifyRelease(at(200, 100, 0), at(100, 105, 250))).toBe('swipe-left')
    expect(classifyRelease(at(100, 100, 0), at(200, 95, 250))).toBe('swipe-right')
  })

  it('ignores a swipe that is too short', () => {
    expect(classifyRelease(at(100, 100, 0), at(140, 100, 200))).toBe('none')
  })

  it('ignores a slow drag', () => {
    expect(classifyRelease(at(100, 100, 0), at(220, 100, 900))).toBe('none')
  })

  it('leaves vertical and diagonal drags to page scrolling', () => {
    expect(classifyRelease(at(100, 100, 0), at(110, 250, 250))).toBe('none')
    expect(classifyRelease(at(100, 100, 0), at(200, 190, 250))).toBe('none')
  })
})
