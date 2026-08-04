import { useEffect, useState } from 'react'
import { CONFIG } from '../../data/config'
import { Mascot } from '../../components/Mascot'
import { Confetti } from '../../components/Confetti'
import { useDecibelAnim } from '../useDecibelAnim'
import type { SceneProps } from '../App'

function Gauge({ db, target, burst = false }: { db: number; target: number; burst?: boolean }) {
  const max = 110
  const pct = Math.min(100, (db / max) * 100)
  const targetPct = (target / max) * 100
  return (
    <div className="gauge-wrap">
      <div className="gauge">
        <div className="gauge-fill" style={{ height: `${pct}%` }} />
        <div className="gauge-target" style={{ bottom: `${targetPct}%` }}>
          {target}dB
        </div>
      </div>
      {burst && (
        <div className="gauge-burst" aria-hidden>
          {Array.from({ length: 10 }, (_, i) => (
            <span key={i} className="spark" />
          ))}
        </div>
      )}
    </div>
  )
}

function Attempt({ index, setBusy }: { index: number; setBusy: (b: boolean) => void }) {
  const spec = CONFIG.attempts[index]
  const [finished, setFinished] = useState(false)
  useEffect(() => {
    setBusy(true)
    setFinished(false)
  }, [index, setBusy])
  const db = useDecibelAnim(index, spec.peakDb, () => {
    setFinished(true)
    setBusy(false)
  })
  const isLastChance = index === CONFIG.attempts.length - 1
  const breakthrough = finished && spec.success
  return (
    <div className={`scene decibel ${breakthrough ? 'breakthrough' : ''}`}>
      {breakthrough && <Confetti count={80} />}
      <h1 className="scene-title">
        {finished
          ? spec.success
            ? CONFIG.copy.decibelSuccess
            : CONFIG.copy.decibelFail
          : isLastChance
            ? CONFIG.copy.decibelLastChance
            : CONFIG.copy.decibelTitle}
      </h1>
      <div className="decibel-row">
        <Gauge db={db} target={CONFIG.targetDb} burst={breakthrough} />
        <div className={`db-readout ${breakthrough ? 'success' : ''}`}>
          {Math.round(db)}
          <span className="db-unit">dB</span>
        </div>
        <Mascot size={220} className={breakthrough ? 'cheer' : ''} />
      </div>
    </div>
  )
}

export function DecibelScene({ state, setBusy }: SceneProps) {
  if (state.step === 0) {
    return (
      <div className="scene">
        <Mascot size={240} />
        <h1 className="scene-title">{CONFIG.copy.decibelTitle}</h1>
        <Gauge db={0} target={CONFIG.targetDb} />
      </div>
    )
  }
  return <Attempt index={state.step - 1} setBusy={setBusy} />
}
