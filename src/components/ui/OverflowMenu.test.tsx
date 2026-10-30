import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OverflowMenu } from './OverflowMenu'

function renderMenu() {
  const onFirst = vi.fn()
  const onSecond = vi.fn()
  render(
    <div>
      <button type="button">خارج القائمة</button>
      <OverflowMenu
        label="المزيد من الخيارات"
        items={[
          { key: 'first', label: 'الخيار الأول', onSelect: onFirst },
          { key: 'second', label: 'الخيار الثاني', onSelect: onSecond },
        ]}
      />
    </div>,
  )
  return { onFirst, onSecond, trigger: screen.getByRole('button', { name: 'المزيد من الخيارات' }) }
}

describe('OverflowMenu', () => {
  it('is closed at first and announces that it controls a menu', () => {
    const { trigger } = renderMenu()

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('opens on click, focuses the first item, and runs the chosen action then returns focus to the trigger', async () => {
    const user = userEvent.setup()
    const { onFirst, onSecond, trigger } = renderMenu()

    await user.click(trigger)

    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('menuitem', { name: 'الخيار الأول' })).toHaveFocus()

    await user.click(screen.getByRole('menuitem', { name: 'الخيار الثاني' }))

    expect(onSecond).toHaveBeenCalledTimes(1)
    expect(onFirst).not.toHaveBeenCalled()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('moves between items with the arrow keys and wraps around', async () => {
    const user = userEvent.setup()
    const { trigger } = renderMenu()
    await user.click(trigger)

    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('menuitem', { name: 'الخيار الثاني' })).toHaveFocus()

    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('menuitem', { name: 'الخيار الأول' })).toHaveFocus()

    await user.keyboard('{ArrowUp}')
    expect(screen.getByRole('menuitem', { name: 'الخيار الثاني' })).toHaveFocus()
  })

  it('closes on Escape and gives focus back to the trigger', async () => {
    const user = userEvent.setup()
    const { trigger } = renderMenu()
    await user.click(trigger)

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('closes when the pointer goes down outside of it', async () => {
    const user = userEvent.setup()
    const { trigger } = renderMenu()
    await user.click(trigger)
    expect(screen.getByRole('menu')).toBeInTheDocument()

    fireEvent.pointerDown(screen.getByRole('button', { name: 'خارج القائمة' }))

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })
})
