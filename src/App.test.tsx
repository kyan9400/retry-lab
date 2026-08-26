import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { STORAGE_KEY } from './lib/storage'

describe('Retry Lab', () => {
  beforeEach(() => {
    localStorage.clear()
    history.replaceState(null, '', '/')
  })

  it('renders the experiment and all four strategies', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /retry pressure/i })).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(4)
    expect(screen.getByRole('radio', { name: /full jitter/i })).toHaveAttribute('aria-checked', 'true')
  })

  it('updates controls and saves the scenario locally', () => {
    render(<App />)
    const clients = screen.getByRole('slider', { name: /clients/i })
    fireEvent.change(clients, { target: { value: '250' } })
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    expect(stored.version).toBe(1)
    expect(stored.config.clients).toBe(250)
  })

  it('switches the inspected strategy and restores defaults', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('radio', { name: /fixed delay/i }))
    expect(screen.getByRole('radio', { name: /fixed delay/i })).toHaveAttribute('aria-checked', 'true')
    await user.click(screen.getByRole('button', { name: /cache stampede/i }))
    expect(screen.getByLabelText('Clients value')).toHaveTextContent('500')
    await user.click(screen.getByRole('button', { name: /reset experiment/i }))
    expect(screen.getByLabelText('Clients value')).toHaveTextContent('240')
  })

  it('copies a shareable deterministic scenario', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /copy scenario/i }))
    expect(screen.getByText('Scenario link copied')).toBeInTheDocument()
  })
})
