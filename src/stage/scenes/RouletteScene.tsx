import { useEffect, useRef, useState } from 'react'
import { CONFIG } from '../../data/config'
import { Mascot } from '../../components/Mascot'
import type { SceneProps } from '../App'

const SPIN_MS = 2500

export function RouletteScene({ state, setBusy }: SceneProps) {
  const { winners } = state
  const [spinning, setSpinning] = useState(false)
  const [revealed, setRevealed] = useState(winners.length) // 새로고침 복구 시 전부 공개 상태
  const lastSeen = useRef(winners.join(','))

  useEffect(() => {
    const key = winners.join(',')
    if (key !== lastSeen.current && winners.length > 0) {
      lastSeen.current = key
      setSpinning(true)
      setRevealed(winners.length - 1)
      setBusy(true)
      const t = setTimeout(() => {
        setSpinning(false)
        setRevealed(winners.length)
        setBusy(false)
      }, SPIN_MS)
      return () => clearTimeout(t)
    }
  }, [winners, setBusy])

  const current = winners[winners.length - 1]
  const showCard = winners.length > 0 && revealed >= winners.length

  return (
    <div className="scene">
      <h1 className="scene-title">{CONFIG.copy.rouletteTitle}</h1>
      <div className="roulette-row">
        <div className={`wheel ${spinning ? 'spinning' : ''}`}>
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="wheel-spoke" style={{ transform: `rotate(${i * 30}deg)` }} />
          ))}
          <div className="wheel-center">
            {showCard ? <span className="wheel-number">{current}</span> : '?'}
          </div>
        </div>
        <div className="winner-list">
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
        <Mascot size={180} />
      </div>
    </div>
  )
}
