import { beforeEach, describe, expect, it } from 'vitest'
import { defaultConfig, loadState, normalizeConfig, saveState, STORAGE_KEY } from './storage'

describe('configuration storage', () => {
  beforeEach(() => {
    localStorage.clear()
    history.replaceState(null, '', '/')
  })

  it('normalizes hostile or out-of-range values', () => {
    const config = normalizeConfig({ clients: 999_999, retries: -2, seed: Number.NaN })
    expect(config.clients).toBe(1_000)
    expect(config.retries).toBe(1)
    expect(config.seed).toBe(defaultConfig.seed)
  })

  it('round-trips a versioned saved state', () => {
    const config = { ...defaultConfig, clients: 310 }
    saveState(config, 'decorrelated')
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}').version).toBe(1)
    expect(loadState()).toEqual({ version: 1, config, selected: 'decorrelated' })
  })

  it('falls back safely from invalid storage', () => {
    localStorage.setItem(STORAGE_KEY, '{broken')
    expect(loadState().config).toEqual(defaultConfig)
  })
})
