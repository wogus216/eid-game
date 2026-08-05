import { useEffect, useRef, useState } from 'react'
import { CONFIG } from '../../data/config'
import { roundStartOf } from '../../state/showMachine'
import { Mascot } from '../../components/Mascot'
import { SpeechBubble } from '../../components/SpeechBubble'
import { sfx } from '../../audio/sfx'
import type { SceneProps } from '../App'

const SPIN_MS = 3800
const ALMOST_MS = 1400 // 멈추기 전 "나와라 나와라…!" 구간

export function RouletteScene({ state, setBusy }: SceneProps) {
  const { winners, entryCount, step } = state
  const round = CONFIG.prizeRounds[step]
  // 보드에는 현재 라운드에서 뽑힌 번호만 올라간다
  const roundWinners = winners.slice(roundStartOf(step))
  const [spinning, setSpinning] = useState(false)
  const [almost, setAlmost] = useState(false)
  const [flick, setFlick] = useState<number | null>(null) // 스핀 중 스쳐가는 번호
  const [revealed, setRevealed] = useState(roundWinners.length) // 새로고침 복구 시 전부 공개 상태
  const lastSeen = useRef(winners.join(','))

  useEffect(() => {
    const key = winners.join(',')
    if (key !== lastSeen.current && winners.length > 0) {
      lastSeen.current = key
      const filled = winners.length - roundStartOf(step)
      setSpinning(true)
      setAlmost(false)
      setRevealed(filled - 1)
      setBusy(true)

      // 번호 플리커 — 바퀴의 감속 곡선과 같은 리듬으로 간격을 벌린다
      let elapsed = 0
      let tickTimer: ReturnType<typeof setTimeout> | null = null
      const tick = () => {
        setFlick(1 + Math.floor(Math.random() * entryCount))
        sfx.tick()
        const t = Math.min(1, elapsed / SPIN_MS)
        const delay = 42 + 430 * t ** 3
        elapsed += delay
        if (elapsed < SPIN_MS - 140) tickTimer = setTimeout(tick, delay)
      }
      tick()

      const almostTimer = setTimeout(() => setAlmost(true), SPIN_MS - ALMOST_MS)
      const doneTimer = setTimeout(() => {
        setSpinning(false)
        setAlmost(false)
        setFlick(null)
        setRevealed(filled)
        setBusy(false)
        sfx.reveal()
      }, SPIN_MS)

      return () => {
        if (tickTimer) clearTimeout(tickTimer)
        clearTimeout(almostTimer)
        clearTimeout(doneTimer)
        setBusy(false)
      }
    }
  }, [winners, entryCount, step, setBusy])

  // 라운드가 바뀌면 winners는 그대로인 채 보드만 비워진다 — revealed를 라운드 안으로 가둔다
  const shown = Math.min(revealed, roundWinners.length)
  const current = roundWinners[roundWinners.length - 1]
  const showCard = roundWinners.length > 0 && shown >= roundWinners.length

  return (
    <div className="scene">
      <div className="sky-layer">
        <SpeechBubble>
          {step > 0 ? CONFIG.copy.rouletteTitleNext : CONFIG.copy.rouletteTitle}
        </SpeechBubble>
      </div>
      <div className="ground-layer">
        <div className="grounded wheel-stand">
          <div className="wheel-pointer" aria-hidden />
          <div
            className={`wheel ${spinning ? 'spinning' : ''}`}
            style={spinning ? { animationDuration: `${SPIN_MS}ms` } : undefined}
          >
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i} className="wheel-spoke" style={{ transform: `rotate(${i * 30}deg)` }} />
            ))}
          </div>
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
        <div className="winner-board grounded">
          <div className="board-label">{round.label}</div>
          {roundWinners.slice(0, shown).map((n, i) => (
            <div key={`${n}-${i}`} className="winner-chip">
              {i + 1}번째 · <strong>{n}번</strong>
            </div>
          ))}
          {Array.from({ length: round.count - shown }, (_, i) => (
            <div key={`empty-${i}`} className="winner-chip empty">
              ?
            </div>
          ))}
        </div>
        <div className="mascot-stand">
          <Mascot size={170} mood={spinning ? 'nervous' : 'idle'} />
        </div>
      </div>
      {/* 구호 슬롯은 항상 렌더링해 레이아웃 점프를 막는다 */}
      <div className={`chant ${spinning ? '' : 'hidden'} ${almost ? 'almost' : ''}`}>
        {almost ? CONFIG.copy.rouletteAlmost : CONFIG.copy.rouletteChant}
      </div>
    </div>
  )
}
