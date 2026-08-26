import type { Attempt, SimulationResult, StrategyId } from '../types'
import { strategyColors } from '../lib/palette'

interface PressureChartProps {
  results: SimulationResult[]
  outageMs: number
  bucketMs: number
  selected: StrategyId
}

export function PressureChart({ results, outageMs, bucketMs, selected }: PressureChartProps) {
  const width = 1_000
  const height = 320
  const left = 46
  const top = 24
  const chartWidth = width - left - 18
  const chartHeight = height - top - 42
  let timeline = bucketMs
  let maximum = 1
  for (const result of results) {
    if (result.timelineMs > timeline) timeline = result.timelineMs
    for (const bin of result.bins) if (bin.attempts > maximum) maximum = bin.attempts
  }
  const binCount = Math.ceil(timeline / bucketMs) + 1
  const x = (value: number) => left + (value / timeline) * chartWidth
  const y = (value: number) => top + chartHeight - (value / maximum) * chartHeight

  return (
    <svg className="pressure-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Retry attempts per 250 millisecond window for four strategies">
      <title>Retry pressure comparison</title>
      <rect x={left} y={top} width={Math.max(0, x(outageMs) - left)} height={chartHeight} className="outage-zone" />
      {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
        <g key={fraction}>
          <line x1={left} x2={width - 18} y1={y(maximum * fraction)} y2={y(maximum * fraction)} className="grid-line" />
          <text x={left - 9} y={y(maximum * fraction) + 4} textAnchor="end">{Math.round(maximum * fraction)}</text>
        </g>
      ))}
      <line x1={x(outageMs)} x2={x(outageMs)} y1={top} y2={top + chartHeight} className="recovery-line" />
      <text x={Math.min(width - 120, x(outageMs) + 8)} y={top + 14} className="recovery-label">service recovers</text>
      {results.map((result) => {
        const byStart = new Map(result.bins.map((bin) => [bin.startMs, bin.attempts]))
        const points: string[] = []
        for (let index = 0; index < binCount; index += 1) {
          const at = index * bucketMs
          points.push(`${x(at)},${y(byStart.get(at) ?? 0)}`)
        }
        return <polyline key={result.strategy} points={points.join(' ')} fill="none" stroke={strategyColors[result.strategy]} className={result.strategy === selected ? 'series selected' : 'series'} />
      })}
      <line x1={left} x2={width - 18} y1={top + chartHeight} y2={top + chartHeight} className="axis" />
      <text x={left} y={height - 9}>0 s</text>
      <text x={width - 18} y={height - 9} textAnchor="end">{(timeline / 1_000).toFixed(1)} s</text>
    </svg>
  )
}

interface AttemptMapProps {
  attempts: Attempt[]
  clients: number
  timelineMs: number
  outageMs: number
}

export function AttemptMap({ attempts, clients, timelineMs, outageMs }: AttemptMapProps) {
  const width = 1_000
  const height = 250
  const left = 25
  const usableWidth = width - left - 15
  const usableHeight = height - 32
  const step = Math.max(1, Math.ceil(attempts.length / 900))
  const sampled = attempts.filter((_, index) => index % step === 0)
  return (
    <svg className="attempt-map" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Individual client retry attempts over time">
      <title>Individual retry attempts</title>
      <rect x={left} y={8} width={(outageMs / timelineMs) * usableWidth} height={usableHeight} className="outage-zone" />
      {sampled.map((attempt) => (
        <circle
          key={`${attempt.client}-${attempt.number}`}
          cx={left + (attempt.atMs / timelineMs) * usableWidth}
          cy={8 + (attempt.client / Math.max(1, clients - 1)) * usableHeight}
          r={attempt.outcome === 'success' ? 3.2 : 2.1}
          className={`attempt-dot ${attempt.outcome}`}
        />
      ))}
      <line x1={left + (outageMs / timelineMs) * usableWidth} x2={left + (outageMs / timelineMs) * usableWidth} y1={8} y2={8 + usableHeight} className="recovery-line" />
    </svg>
  )
}
