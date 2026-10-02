import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useContext } from 'react'
import { MotionConfigContext } from 'framer-motion'
import App from '../App'

// Probe replaces the shell so the test reads only the context App provides
vi.mock('@/components/layout/AppShell', () => ({
  AppShell: function Probe() {
    const { reducedMotion } = useContext(MotionConfigContext)
    return <p data-testid="reduced-motion-config">{reducedMotion}</p>
  },
}))

describe('reduced motion wiring', () => {
  it('makes Framer Motion follow the OS reduced-motion preference app-wide', () => {
    render(<App />)
    expect(screen.getByTestId('reduced-motion-config')).toHaveTextContent('user')
  })
})
