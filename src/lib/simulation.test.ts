import { describe, expect, it } from 'vitest'
import { defaultConfig } from './storage'
import { formatMilliseconds, simulate, simulateAll } from './simulation'

describe('simulate', () => {
  it('is deterministic for a seed', () => {
    const first = simulate('full-jitter', defaultConfig)
    const second = simulate('full-jitter', defaultConfig)
    expect(second).toEqual(first)
  })

  it('shows synchronized fixed retries creating a higher peak', () => {
    const fixed = simulate('fixed', defaultConfig)
    const jitter = simulate('full-jitter', defaultConfig)
    expect(fixed.metrics.peakRetryLoad).toBe(defaultConfig.clients)
    expect(jitter.metrics.peakRetryLoad).toBeLessThan(fixed.metrics.peakRetryLoad)
  })

  it('enforces capacity after service recovery', () => {
    const result = simulate('fixed', {
      ...defaultConfig,
      clients: 20,
      retries: 1,
      baseDelayMs: 1_000,
      outageMs: 500,
      capacityPerBucket: 3,
    })
    expect(result.metrics.successfulClients).toBe(3)
    expect(result.metrics.overloads).toBe(17)
    expect(result.metrics.successRate).toBe(15)
  })

  it('keeps all strategy results within configured client counts', () => {
    for (const result of simulateAll(defaultConfig)) {
      expect(result.metrics.successfulClients).toBeLessThanOrEqual(defaultConfig.clients)
      expect(result.metrics.totalRetries).toBeLessThanOrEqual(defaultConfig.clients * defaultConfig.retries)
      expect(result.bins.length).toBeGreaterThan(0)
    }
  })
})

describe('formatMilliseconds', () => {
  it('uses useful compact units', () => {
    expect(formatMilliseconds(null)).toBe('—')
    expect(formatMilliseconds(750)).toBe('750 ms')
    expect(formatMilliseconds(1_500)).toBe('1.5 s')
    expect(formatMilliseconds(15_000)).toBe('15 s')
  })
})
