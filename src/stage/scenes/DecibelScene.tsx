import { useEffect, useState } from 'react'
import { CONFIG } from '../../data/config'
import { Mascot } from '../../components/Mascot'
import { Confetti } from '../../components/Confetti'
import { SpeechBubble } from '../../components/SpeechBubble'
import { useDecibelAnim } from '../useDecibelAnim'
import { attemptIndexOf, isRunningStep } from '../../state/showMachine'
import { sfx } from '../../audio/sfx'
import { setShout, setTension, quake, flash } from '../shout'
import type { SceneProps } from '../App'

function Gauge({ db, target, burst = false }: { db: number; target: number; burst?: boolean }) {
  const max = 110
  const pct = Math.min(100, (db / max) * 100)
  const targetPct = (target / max) * 100
  return (
    <div className="gauge-wrap grounded">
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

function AttemptDots({ index, finished }: { index: number; finished: boolean }) {
  return (
    <div className="attempt-dots" aria-hidden>
      {CONFIG.attempts.map((_, i) => (
        <span
          key={i}
          className={i < index || (i === index && finished) ? 'done' : i === index ? 'current' : ''}
        />
      ))}
    </div>
  )
}

function Attempt({
  index,
  running,
  setBusy,
}: {
  index: number
  running: boolean
  setBusy: (b: boolean) => void
}) {
  const spec = CONFIG.attempts[index]
  const [finished, setFinished] = useState(false)
  useEffect(() => {
    // 준비 단계에서는 진행을 막지 않는다 — 운영자가 Enter로 함성을 시작해야 한다
    setBusy(running)
    setFinished(false)
    // 1차 0 → 2차 0.5 → 3차 1. 시도가 거듭될수록 세계가 조여든다.
    setTension(index / Math.max(1, CONFIG.attempts.length - 1))
    if (running) sfx.riseStart() // 함성이 커지는 지속음 — 게이지와 같이 자란다
    return () => {
      sfx.riseStop()
      setShout(0)
      setTension(0)
    }
  }, [index, running, setBusy])
  const db = useDecibelAnim(index, spec.peakDb, running, () => {
    setFinished(true)
    setBusy(false)
    sfx.riseStop()
    if (spec.success) {
      sfx.breakthrough()
      quake() // 세계가 한 번 크게 휜다
      flash() // 조여든 어둠이 한꺼번에 밝아진다
      setTension(0)
    } else {
      sfx.fail()
    }
  })
  // 소리와 세계의 반응은 같은 값을 본다. 준비 단계에서는 바람도 일지 않는다.
  useEffect(() => {
    if (!running) return
    sfx.riseLevel(db / 110)
    setShout(finished ? 0 : db / 110)
  }, [db, finished, running])
  const breakthrough = finished && spec.success
  return (
    <div className={`scene ${breakthrough ? 'breakthrough' : ''}`}>
      {breakthrough && <Confetti count={80} />}
      <div className="sky-layer">
        <SpeechBubble>{finished ? spec.done : spec.say}</SpeechBubble>
        <AttemptDots index={index} finished={finished} />
      </div>
      <div className="ground-layer">
        <Gauge db={db} target={CONFIG.targetDb} burst={breakthrough} />
        <div className={`db-readout grounded ${breakthrough ? 'success' : ''}`}>
          {Math.round(db)}
          <span className="db-unit">dB</span>
        </div>
        <div className="mascot-stand">
          <Mascot
            size={200}
            mood={breakthrough ? 'excited' : finished ? 'sad' : 'tense'}
          />
        </div>
      </div>
    </div>
  )
}

export function DecibelScene({ state, setBusy }: SceneProps) {
  if (state.step === 0) {
    return (
      <div className="scene">
        <div className="sky-layer">
          <SpeechBubble>{CONFIG.copy.decibelIntro}</SpeechBubble>
          <AttemptDots index={-1} finished={false} />
        </div>
        <div className="ground-layer">
          <Gauge db={0} target={CONFIG.targetDb} />
          <div className="mascot-stand">
            <Mascot size={220} mood="idle" />
          </div>
        </div>
      </div>
    )
  }
  return (
    <Attempt
      index={attemptIndexOf(state.step)}
      running={isRunningStep(state.step)}
      setBusy={setBusy}
    />
  )
}
