import { useDeferredValue, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { AttemptMap, PressureChart } from './components/Charts'
import { strategyColors } from './lib/palette'
import { formatMilliseconds, simulateAll, strategies } from './lib/simulation'
import { defaultConfig, loadState, saveState, scenarioHash } from './lib/storage'
import type { SimulationConfig, SimulationResult, StrategyId } from './types'

const presets: { name: string; config: SimulationConfig }[] = [
  { name: 'API outage', config: defaultConfig },
  { name: 'Cache stampede', config: { ...defaultConfig, clients: 500, retries: 7, baseDelayMs: 400, outageMs: 3_200, capacityPerBucket: 18, seed: 73 } },
  { name: 'Batch workers', config: { ...defaultConfig, clients: 120, retries: 8, baseDelayMs: 1_000, maxDelayMs: 20_000, outageMs: 6_000, capacityPerBucket: 12, seed: 18 } },
]

interface RangeControlProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  display: string
  onChange: (value: number) => void
}

function RangeControl({ label, value, min, max, step, display, onChange }: RangeControlProps) {
  return (
    <label className="range-control">
      <span><strong>{label}</strong><output aria-label={`${label} value`}>{display}</output></span>
      <input aria-label={label} type="range" value={value} min={min} max={max} step={step} onChange={(event) => onChange(Number(event.target.value))} />
      <i aria-hidden="true"><span>min {min}</span><span>max {max}</span></i>
    </label>
  )
}

interface MetricProps { label: string; value: string; note: string; accent?: boolean }
function Metric({ label, value, note, accent = false }: MetricProps) {
  return <div className={`metric ${accent ? 'accent' : ''}`}><span>{label}</span><strong>{value}</strong><small>{note}</small></div>
}

interface StrategyPickerProps { selected: StrategyId; onChange: (strategy: StrategyId) => void; results: SimulationResult[] }
function StrategyPicker({ selected, onChange, results }: StrategyPickerProps) {
  return (
    <div className="strategy-picker" role="radiogroup" aria-label="Inspect strategy">
      {strategies.map((strategy) => {
        const result = results.find((item) => item.strategy === strategy.id)!
        return (
          <button
            type="button"
            role="radio"
            aria-checked={selected === strategy.id}
            className={selected === strategy.id ? 'strategy-card selected' : 'strategy-card'}
            style={{ '--strategy': strategyColors[strategy.id] } as CSSProperties}
            onClick={() => onChange(strategy.id)}
            key={strategy.id}
          >
            <span>{strategy.short}</span><strong>{strategy.name}</strong><small>{result.metrics.peakRetryLoad} peak / {result.metrics.successRate}% recovered</small>
          </button>
        )
      })}
    </div>
  )
}

function bestResult(results: SimulationResult[]): SimulationResult {
  let best = results[0]
  for (let index = 1; index < results.length; index += 1) {
    const candidate = results[index]
    if (candidate.metrics.successRate > best.metrics.successRate ||
      (candidate.metrics.successRate === best.metrics.successRate && candidate.metrics.peakRetryLoad < best.metrics.peakRetryLoad)) {
      best = candidate
    }
  }
  return best
}

function exportCsv(result: SimulationResult) {
  const rows = ['client,retry,time_ms,outcome', ...result.attempts.map((attempt) => `${attempt.client},${attempt.number},${attempt.atMs},${attempt.outcome}`)]
  const url = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `retry-lab-${result.strategy}.csv`
  anchor.click()
  URL.revokeObjectURL(url)
}

export default function App() {
  const [initial] = useState(loadState)
  const [config, setConfig] = useState(initial.config)
  const [selected, setSelected] = useState<StrategyId>(initial.selected)
  const [notice, setNotice] = useState('')
  const deferredConfig = useDeferredValue(config)
  const results = useMemo(() => simulateAll(deferredConfig), [deferredConfig])
  const active = results.find((result) => result.strategy === selected) ?? results[0]
  const best = bestResult(results)
  const selectedDefinition = strategies.find((strategy) => strategy.id === selected)!
  const isCalculating = config !== deferredConfig

  useEffect(() => saveState(config, selected), [config, selected])
  useEffect(() => {
    if (!notice) return
    const timeout = window.setTimeout(() => setNotice(''), 2200)
    return () => window.clearTimeout(timeout)
  }, [notice])

  const change = (key: keyof SimulationConfig, value: number) => setConfig((current) => ({ ...current, [key]: value }))
  const copyScenario = async () => {
    const url = `${location.origin}${location.pathname}${scenarioHash(config)}`
    try { await navigator.clipboard.writeText(url); setNotice('Scenario link copied') } catch { setNotice('Clipboard unavailable') }
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#results">Skip to results</a>
      <header className="topbar">
        <a className="wordmark" href="#top"><span>R↗</span><strong>Retry Lab</strong></a>
        <p>Distributed systems field simulator</p>
        <div className="top-actions"><button type="button" onClick={copyScenario}>Copy scenario</button><a href="https://github.com/kyan9400/retry-lab" target="_blank" rel="noreferrer">Source ↗</a></div>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-copy"><p className="kicker">Experiment 004 / client recovery</p><h1>RETRY<br /><em>WITHOUT</em><br />THE STAMPEDE.</h1><p className="dek">Model hundreds of clients recovering from the same outage. See exactly when synchronized backoff turns a temporary failure into a second incident.</p></div>
          <div className="hero-number"><strong>04</strong><span>strategies<br />same outage<br />one honest comparison</span></div>
          <div className="orbit" aria-hidden="true"><span /><span /><span /></div>
        </section>

        <section className="lab-grid">
          <aside className="controls" aria-labelledby="controlsTitle">
            <header><span>01</span><div><p>Test conditions</p><h2 id="controlsTitle">Control bench</h2></div></header>
            <div className="presets" aria-label="Scenario presets">{presets.map((preset) => <button type="button" key={preset.name} onClick={() => { setConfig(preset.config); setNotice(`${preset.name} loaded`) }}>{preset.name}</button>)}</div>
            <RangeControl label="Clients" value={config.clients} min={10} max={1000} step={10} display={String(config.clients)} onChange={(value) => change('clients', value)} />
            <RangeControl label="Retry budget" value={config.retries} min={1} max={10} step={1} display={`${config.retries} attempts`} onChange={(value) => change('retries', value)} />
            <RangeControl label="Base delay" value={config.baseDelayMs} min={50} max={5000} step={50} display={formatMilliseconds(config.baseDelayMs)} onChange={(value) => change('baseDelayMs', value)} />
            <RangeControl label="Backoff ceiling" value={config.maxDelayMs} min={250} max={30000} step={250} display={formatMilliseconds(config.maxDelayMs)} onChange={(value) => change('maxDelayMs', value)} />
            <RangeControl label="Outage duration" value={config.outageMs} min={0} max={15000} step={250} display={formatMilliseconds(config.outageMs)} onChange={(value) => change('outageMs', value)} />
            <RangeControl label="Recovery capacity" value={config.capacityPerBucket} min={1} max={100} step={1} display={`${config.capacityPerBucket} / 250ms`} onChange={(value) => change('capacityPerBucket', value)} />
            <label className="seed-control"><span>Deterministic seed</span><input aria-label="Deterministic seed" type="number" min="1" max="999999" value={config.seed} onChange={(event) => change('seed', Number(event.target.value))} /></label>
            <button className="reset-button" type="button" onClick={() => { setConfig(defaultConfig); setSelected('full-jitter'); setNotice('Defaults restored') }}>Reset experiment</button>
          </aside>

          <div className={`results ${isCalculating ? 'calculating' : ''}`} id="results">
            <section className="pressure-panel">
              <header className="panel-heading"><span>02</span><div><p>Attempts per 250 ms window</p><h2>Retry pressure</h2></div><strong className="best-badge">Best recovery<br /><b>{strategies.find((item) => item.id === best.strategy)?.name}</b></strong></header>
              <PressureChart results={results} outageMs={deferredConfig.outageMs} bucketMs={deferredConfig.bucketMs} selected={selected} />
              <div className="legend">{strategies.map((strategy) => <button type="button" key={strategy.id} onClick={() => setSelected(strategy.id)} className={selected === strategy.id ? 'active' : ''}><i style={{ background: strategyColors[strategy.id] }} />{strategy.name}</button>)}</div>
            </section>

            <StrategyPicker selected={selected} onChange={setSelected} results={results} />

            <section className="inspection-panel">
              <header className="panel-heading"><span>03</span><div><p>Selected model / {selectedDefinition.short}</p><h2>{selectedDefinition.name}</h2></div><p className="strategy-description">{selectedDefinition.description}</p></header>
              <div className="metrics-row">
                <Metric label="Recovered" value={`${active.metrics.successRate}%`} note={`${active.metrics.successfulClients} of ${deferredConfig.clients} clients`} accent />
                <Metric label="Peak pressure" value={String(active.metrics.peakRetryLoad)} note="retries in one window" />
                <Metric label="P95 recovery" value={formatMilliseconds(active.metrics.p95RecoveryMs)} note="after service returned" />
                <Metric label="Overload drops" value={String(active.metrics.overloads)} note="healthy but over capacity" />
              </div>
              <div className="map-head"><div><strong>Client attempt map</strong><span>orange = outage · blue = overload · green = success</span></div><button type="button" onClick={() => exportCsv(active)}>Export CSV</button></div>
              <AttemptMap attempts={active.attempts} clients={deferredConfig.clients} timelineMs={active.timelineMs} outageMs={deferredConfig.outageMs} />
            </section>

            <section className="comparison-panel">
              <header className="panel-heading"><span>04</span><div><p>Decision record</p><h2>Compare outcomes</h2></div></header>
              <div className="table-wrap"><table><thead><tr><th>Strategy</th><th>Recovered</th><th>Peak / window</th><th>Wasted in outage</th><th>Overload drops</th><th>P95 recovery</th><th>Recovery spread</th></tr></thead><tbody>{results.map((result) => <tr key={result.strategy} className={result.strategy === selected ? 'selected' : ''} onClick={() => setSelected(result.strategy)}><th><i style={{ background: strategyColors[result.strategy] }} />{strategies.find((item) => item.id === result.strategy)?.name}</th><td>{result.metrics.successRate}%</td><td>{result.metrics.peakRetryLoad}</td><td>{result.metrics.wastedRetries}</td><td>{result.metrics.overloads}</td><td>{formatMilliseconds(result.metrics.p95RecoveryMs)}</td><td>{formatMilliseconds(result.metrics.recoverySpreadMs)}</td></tr>)}</tbody></table></div>
              <aside className="finding"><span>Field note</span><p>Jitter is not just about lowering average traffic. It spreads retries across time, preserving recovery capacity when many clients observed the same failure simultaneously.</p></aside>
            </section>
          </div>
        </section>
      </main>

      <footer><strong>Retry Lab</strong><p>Runs entirely in your browser · deterministic by seed · no network requests</p><span>Built for learning, capacity planning, and design reviews.</span></footer>
      <div className={`notice ${notice ? 'show' : ''}`} role="status" aria-live="polite">{notice}</div>
    </div>
  )
}
