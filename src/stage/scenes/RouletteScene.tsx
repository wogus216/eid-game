import { useEffect, useRef, useState } from 'react'
import { CONFIG } from '../../data/config'
import { Mascot } from '../../components/Mascot'
import type { SceneProps } from '../App'

const SPIN_MS = 3800
const ALMOST_MS = 1400 // 멈추기 전 "나와라 나와라…!" 구간

export function RouletteScene({ state, setBusy }: SceneProps) {
  const { winners, entryCount } = state
  const [spinning, setSpinning] = useState(false)
  const [almost, setAlmost] = useState(false)
  const [flick, setFlick] = useState<number | null>(null) // 스핀 중 스쳐가는 번호
  const [revealed, setRevealed] = useState(winners.length) // 새로고침 복구 시 전부 공개 상태
  const lastSeen = useRef(winners.join(','))

  useEffect(() => {
    const key = winners.join(',')
    if (key !== lastSeen.current && winners.length > 0) {
      lastSeen.current = key
      setSpinning(true)
      setAlmost(false)
      setRevealed(winners.length - 1)
      setBusy(true)

      // 번호 플리커: 빠르게 돌다가 점점 느려지며 애간장
      let delay = 55
      let elapsed = 0
      let tickTimer: ReturnType<typeof setTimeout> | null = null
      const tick = () => {
        setFlick(1 + Math.floor(Math.random() * entryCount))
        elapsed += delay
        if (elapsed > SPIN_MS * 0.5) delay = Math.min(delay * 1.3, 430)
        if (elapsed < SPIN_MS - 120) tickTimer = setTimeout(tick, delay)
      }
      tick()

      const almostTimer = setTimeout(() => setAlmost(true), SPIN_MS - ALMOST_MS)
      const doneTimer = setTimeout(() => {
        setSpinning(false)
        setAlmost(false)
        setFlick(null)
        setRevealed(winners.length)
        setBusy(false)
      }, SPIN_MS)

      return () => {
        if (tickTimer) clearTimeout(tickTimer)
        clearTimeout(almostTimer)
        clearTimeout(doneTimer)
        setBusy(false)
      }
    }
  }, [winners, entryCount, setBusy])

  const current = winners[winners.length - 1]
  const showCard = winners.length > 0 && revealed >= winners.length

  return (
    <div className="scene">
      <div className="sky-layer">
        <h1 className="scene-title">{CONFIG.copy.rouletteTitle}</h1>
      </div>
      <div className="ground-layer">
        <div className="grounded">
          <div className={`wheel ${spinning ? 'spinning' : ''} ${almost ? 'almost' : ''}`}>
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i} className="wheel-spoke" style={{ transform: `rotate(${i * 30}deg)` }} />
            ))}
            <div className="wheel-center">
              {spinning ? (
                <span className={`wheel-flick ${almost ? 'almost' : ''}`}>{flick ?? '?'}</span>
              ) : showCard ? (
                <span className="wheel-number">{current}</span>
              ) : (
                '?'
              )}
            </div>
          </div>
        </div>
        <div className="winner-board grounded">
          {winners.slice(0, revealed).map((n, i) => (
            <div key={`${n}-${i}`} className="winner-chip">
              {i + 1}번째 · <strong>{n}번</strong>
            </div>
          ))}
          {Array.from({ length: CONFIG.winnerCount - revealed }, (_, i) => (
            <div key={`empty-${i}`} className="winner-chip empty">
              ?
            </div>
          ))}
        </div>
        <div className="mascot-stand">
          <Mascot size={170} />
        </div>
      </div>
      {/* 구호 슬롯은 항상 렌더링해 레이아웃 점프를 막는다 */}
      <div className={`chant ${spinning ? '' : 'hidden'} ${almost ? 'almost' : ''}`}>
        {almost ? CONFIG.copy.rouletteAlmost : CONFIG.copy.rouletteChant}
      </div>
    </div>
  )
}
