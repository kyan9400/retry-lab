import type { SimulationConfig, StrategyId } from '../types'

export const STORAGE_KEY = 'retry-lab:v1'

export const defaultConfig: SimulationConfig = {
  clients: 240,
  retries: 6,
  baseDelayMs: 500,
  maxDelayMs: 8_000,
  outageMs: 2_500,
  capacityPerBucket: 24,
  bucketMs: 250,
  seed: 42,
}

interface SavedState {
  version: 1
  config: SimulationConfig
  selected: StrategyId
}

function clamp(value: unknown, fallback: number, minimum: number, maximum: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(maximum, Math.max(minimum, Math.round(value)))
    : fallback
}

export function normalizeConfig(input: Partial<SimulationConfig> | null | undefined): SimulationConfig {
  return {
    clients: clamp(input?.clients, defaultConfig.clients, 10, 1_000),
    retries: clamp(input?.retries, defaultConfig.retries, 1, 10),
    baseDelayMs: clamp(input?.baseDelayMs, defaultConfig.baseDelayMs, 50, 5_000),
    maxDelayMs: clamp(input?.maxDelayMs, defaultConfig.maxDelayMs, 250, 60_000),
    outageMs: clamp(input?.outageMs, defaultConfig.outageMs, 0, 30_000),
    capacityPerBucket: clamp(input?.capacityPerBucket, defaultConfig.capacityPerBucket, 1, 200),
    bucketMs: 250,
    seed: clamp(input?.seed, defaultConfig.seed, 1, 999_999),
  }
}

function isStrategy(value: unknown): value is StrategyId {
  return value === 'fixed' || value === 'exponential' || value === 'full-jitter' || value === 'decorrelated'
}

export function loadState(): SavedState {
  try {
    if (location.hash.startsWith('#scenario=')) {
      const decoded = JSON.parse(atob(location.hash.slice('#scenario='.length))) as Partial<SimulationConfig>
      return { version: 1, config: normalizeConfig(decoded), selected: 'full-jitter' }
    }
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) throw new Error('No saved state')
    const parsed = JSON.parse(stored) as Partial<SavedState>
    if (parsed.version !== 1) throw new Error('Unsupported state')
    return {
      version: 1,
      config: normalizeConfig(parsed.config),
      selected: isStrategy(parsed.selected) ? parsed.selected : 'full-jitter',
    }
  } catch {
    return { version: 1, config: defaultConfig, selected: 'full-jitter' }
  }
}

export function saveState(config: SimulationConfig, selected: StrategyId): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, config, selected }))
  } catch {
    // Storage can be disabled or unavailable in private browsing.
  }
}

export function scenarioHash(config: SimulationConfig): string {
  return `#scenario=${btoa(JSON.stringify(config))}`
}
