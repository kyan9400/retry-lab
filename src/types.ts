export type StrategyId = 'fixed' | 'exponential' | 'full-jitter' | 'decorrelated'
export type AttemptOutcome = 'outage' | 'overload' | 'success'

export interface SimulationConfig {
  clients: number
  retries: number
  baseDelayMs: number
  maxDelayMs: number
  outageMs: number
  capacityPerBucket: number
  bucketMs: number
  seed: number
}

export interface Attempt {
  client: number
  number: number
  atMs: number
  outcome: AttemptOutcome
}

export interface LoadBin {
  startMs: number
  attempts: number
  overloads: number
  successes: number
}

export interface SimulationMetrics {
  successRate: number
  successfulClients: number
  peakRetryLoad: number
  wastedRetries: number
  overloads: number
  p95RecoveryMs: number | null
  recoverySpreadMs: number | null
  totalRetries: number
}

export interface SimulationResult {
  strategy: StrategyId
  attempts: Attempt[]
  bins: LoadBin[]
  metrics: SimulationMetrics
  timelineMs: number
}
