import { describe, it, expect } from 'vitest'
import { getSidebarFlexOrder, getSidebarFlexOrderClasses } from '@/hooks/useSidebarPosition'

describe('getSidebarFlexOrder', () => {
  it('RTL + position=left → sidebar visually on the left (matches current default UI)', () => {
    // في RTL: بداية المحور الرئيسي يمين — video بترتيب أصغر يعني يمين،
    // sidebar بترتيب أكبر يعني يسار
    expect(getSidebarFlexOrder('left', 'rtl')).toEqual({ video: 1, handle: 2, sidebar: 3 })
  })

  it('RTL + position=right → sidebar visually on the right', () => {
    expect(getSidebarFlexOrder('right', 'rtl')).toEqual({ sidebar: 1, handle: 2, video: 3 })
  })

  it('LTR + position=left → sidebar visually on the left', () => {
    // في LTR: بداية المحور الرئيسي يسار، فالوصول لنفس الجانب الفعلي (يسار)
    // يتطلب ترتيباً معكوساً عن حالة RTL أعلاه
    expect(getSidebarFlexOrder('left', 'ltr')).toEqual({ sidebar: 1, handle: 2, video: 3 })
  })

  it('LTR + position=right → sidebar visually on the right', () => {
    expect(getSidebarFlexOrder('right', 'ltr')).toEqual({ video: 1, handle: 2, sidebar: 3 })
  })
})

describe('getSidebarFlexOrderClasses', () => {
  it('produces literal Tailwind class strings (not dynamically interpolated) matching the numeric order', () => {
    expect(getSidebarFlexOrderClasses('left', 'rtl')).toEqual({
      video: 'lg:order-1',
      handle: 'lg:order-2',
      sidebar: 'lg:order-3',
      sidebarBorderClass: 'lg:border-s',
    })
    expect(getSidebarFlexOrderClasses('right', 'rtl')).toEqual({
      sidebar: 'lg:order-1',
      handle: 'lg:order-2',
      video: 'lg:order-3',
      sidebarBorderClass: 'lg:border-e',
    })
  })
})
