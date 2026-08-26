import type { Attempt, LoadBin, SimulationConfig, SimulationMetrics, SimulationResult, StrategyId } from '../types'

export const strategies: { id: StrategyId; name: string; short: string; description: string }[] = [
  { id: 'fixed', name: 'Fixed delay', short: 'FIX', description: 'Every client waits the same amount of time between attempts.' },
  { id: 'exponential', name: 'Exponential', short: 'EXP', description: 'Delay doubles after each failure, but clients remain synchronized.' },
  { id: 'full-jitter', name: 'Full jitter', short: 'JIT', description: 'Each delay is random between zero and the exponential ceiling.' },
  { id: 'decorrelated', name: 'Decorrelated', short: 'DEC', description: 'Each delay varies from the base to three times the previous delay.' },
]

const strategyIndex = new Map(strategies.map((strategy, index) => [strategy.id, index]))

function random(seed: number): () => number {
  let value = seed >>> 0
  return () => {
    value += 0x6d2b79f5
    let result = value
    result = Math.imul(result ^ (result >>> 15), result | 1)
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61)
    return ((result ^ (result >>> 14)) >>> 0) / 4_294_967_296
  }
}

function delayFor(strategy: StrategyId, attempt: number, previous: number, config: SimulationConfig, next: () => number): number {
  const ceiling = Math.min(config.maxDelayMs, config.baseDelayMs * 2 ** (attempt - 1))
  switch (strategy) {
    case 'fixed': return config.baseDelayMs
    case 'exponential': return ceiling
    case 'full-jitter': return Math.max(1, Math.round(next() * ceiling))
    case 'decorrelated': {
      const upper = Math.max(config.baseDelayMs, previous * 3)
      return Math.min(config.maxDelayMs, Math.round(config.baseDelayMs + next() * (upper - config.baseDelayMs)))
    }
  }
}

function percentile95(sorted: number[]): number | null {
  if (sorted.length === 0) return null
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)]
}

export function simulate(strategy: StrategyId, config: SimulationConfig): SimulationResult {
  const scheduled: Omit<Attempt, 'outcome'>[] = []
  const offset = (strategyIndex.get(strategy) ?? 0) * 104_729
  for (let client = 0; client < config.clients; client += 1) {
    const next = random(config.seed + client * 7_919 + offset)
    let atMs = 0
    let previous = config.baseDelayMs
    for (let attempt = 1; attempt <= config.retries; attempt += 1) {
      const delay = delayFor(strategy, attempt, previous, config, next)
      previous = delay
      atMs += delay
      scheduled.push({ client, number: attempt, atMs })
    }
  }
  scheduled.sort((left, right) => left.atMs - right.atMs || left.client - right.client || left.number - right.number)

  const successful = new Set<number>()
  const capacity = new Map<number, number>()
  const attempts: Attempt[] = []
  const recoveryTimes: number[] = []
  for (const item of scheduled) {
    if (successful.has(item.client)) continue
    if (item.atMs < config.outageMs) {
      attempts.push({ ...item, outcome: 'outage' })
      continue
    }
    const bucket = Math.floor(item.atMs / config.bucketMs)
    const used = capacity.get(bucket) ?? 0
    if (used >= config.capacityPerBucket) {
      attempts.push({ ...item, outcome: 'overload' })
      continue
    }
    capacity.set(bucket, used + 1)
    successful.add(item.client)
    recoveryTimes.push(item.atMs - config.outageMs)
    attempts.push({ ...item, outcome: 'success' })
  }

  const binsByStart = new Map<number, LoadBin>()
  let peakRetryLoad = 0
  for (const attempt of attempts) {
    const startMs = Math.floor(attempt.atMs / config.bucketMs) * config.bucketMs
    const bin = binsByStart.get(startMs) ?? { startMs, attempts: 0, overloads: 0, successes: 0 }
    bin.attempts += 1
    if (attempt.outcome === 'overload') bin.overloads += 1
    if (attempt.outcome === 'success') bin.successes += 1
    binsByStart.set(startMs, bin)
    if (bin.attempts > peakRetryLoad) peakRetryLoad = bin.attempts
  }

  recoveryTimes.sort((left, right) => left - right)
  let maxTime = config.outageMs
  for (const attempt of attempts) if (attempt.atMs > maxTime) maxTime = attempt.atMs
  const metrics: SimulationMetrics = {
    successRate: Math.round((successful.size / config.clients) * 100),
    successfulClients: successful.size,
    peakRetryLoad,
    wastedRetries: attempts.filter((attempt) => attempt.outcome === 'outage').length,
    overloads: attempts.filter((attempt) => attempt.outcome === 'overload').length,
    p95RecoveryMs: percentile95(recoveryTimes),
    recoverySpreadMs: recoveryTimes.length > 1 ? recoveryTimes[recoveryTimes.length - 1] - recoveryTimes[0] : recoveryTimes.length === 1 ? 0 : null,
    totalRetries: attempts.length,
  }
  return {
    strategy,
    attempts,
    bins: [...binsByStart.values()].sort((left, right) => left.startMs - right.startMs),
    metrics,
    timelineMs: Math.max(config.bucketMs, Math.ceil(maxTime / config.bucketMs) * config.bucketMs),
  }
}

export function simulateAll(config: SimulationConfig): SimulationResult[] {
  return strategies.map((strategy) => simulate(strategy.id, config))
}

export function formatMilliseconds(value: number | null): string {
  if (value === null) return '—'
  if (value < 1_000) return `${Math.round(value)} ms`
  return `${(value / 1_000).toFixed(value < 10_000 ? 1 : 0)} s`
}
