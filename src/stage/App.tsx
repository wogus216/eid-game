import { useCallback, useEffect, useReducer, useRef, useState, type ReactNode } from 'react'
import { reduce, initialState, DECIBEL_LAST_STEP, type ShowState, type ShowAction } from '../state/showMachine'
import { save, load, clear } from '../state/persistence'
import { CONFIG } from '../data/config'
import { Scenery } from '../components/Scenery'
import { StandbyScene } from './scenes/StandbyScene'
import { DecibelScene } from './scenes/DecibelScene'
import { RouletteScene } from './scenes/RouletteScene'
import { ResultScene } from './scenes/ResultScene'
import '../styles/tokens.css'
import '../styles/base.css'
import '../styles/stage.css'

export interface SceneProps {
  state: ShowState
  setBusy: (busy: boolean) => void
}

// 운영자 큐: 지금 Enter를 누르면 무엇이 일어나는지
function nextCue(s: ShowState): string | null {
  switch (s.scene) {
    case 'standby':
      return CONFIG.copy.cue.standby
    case 'decibel':
      return s.step < DECIBEL_LAST_STEP
        ? CONFIG.copy.cue.attempt(s.step + 1)
        : CONFIG.copy.cue.toRoulette
    case 'roulette':
      return s.winners.length < CONFIG.winnerCount
        ? CONFIG.copy.cue.draw(s.winners.length + 1)
        : CONFIG.copy.cue.toResult
    case 'result':
      return null
  }
}

export function App() {
  const [state, dispatch] = useReducer(
    (s: ShowState, a: ShowAction) => reduce(s, a),
    undefined,
    () => load() ?? initialState,
  )
  const busyRef = useRef(false)
  const lastActionAt = useRef(0)
  const escTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [escHolding, setEscHolding] = useState(false)

  useEffect(() => save(state), [state])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return
      // busy 플래그는 렌더 이후에 세워지므로, 같은 프레임/연타로 들어온
      // 진행 키는 시간 기반으로 한 번 더 걸러준다
      const throttled = () => {
        const now = performance.now()
        if (now - lastActionAt.current < 300) return true
        lastActionAt.current = now
        return false
      }
      switch (e.key) {
        case 'Enter':
          if (!busyRef.current && !throttled()) dispatch({ type: 'NEXT' })
          break
        case 'ArrowLeft':
          if (!busyRef.current && !throttled()) dispatch({ type: 'BACK' })
          break
        case 'ArrowUp':
          dispatch({ type: 'ADJUST_ENTRY', delta: +1 })
          break
        case 'ArrowDown':
          dispatch({ type: 'ADJUST_ENTRY', delta: -1 })
          break
        case 'r':
        case 'R':
          if (!busyRef.current && !throttled()) dispatch({ type: 'REDRAW_LAST' })
          break
        case 'f':
        case 'F':
          if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
          else void document.documentElement.requestFullscreen().catch(() => {})
          break
        case 'Escape':
          setEscHolding(true)
          escTimer.current = setTimeout(() => {
            clear()
            dispatch({ type: 'RESET' })
            setEscHolding(false)
            busyRef.current = false
          }, CONFIG.escHoldMs)
          break
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && escTimer.current) {
        clearTimeout(escTimer.current)
        escTimer.current = null
        setEscHolding(false)
      }
    }
    // 모바일 테스트용: 터치 탭 = Enter (마우스 클릭에는 반응하지 않음)
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return
      const now = performance.now()
      if (now - lastActionAt.current < 300) return
      lastActionAt.current = now
      if (!busyRef.current) dispatch({ type: 'NEXT' })
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('pointerdown', onPointerDown)
    return () => {
      if (escTimer.current) clearTimeout(escTimer.current)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('pointerdown', onPointerDown)
    }
  }, [])

  const [busyUi, setBusyUi] = useState(false)
  const setBusy = useCallback((busy: boolean) => {
    busyRef.current = busy
    setBusyUi(busy)
  }, [])

  const cue = nextCue(state)

  const scenes: Record<ShowState['scene'], ReactNode> = {
    standby: <StandbyScene state={state} setBusy={setBusy} />,
    decibel: <DecibelScene state={state} setBusy={setBusy} />,
    roulette: <RouletteScene state={state} setBusy={setBusy} />,
    result: <ResultScene state={state} setBusy={setBusy} onRestart={() => dispatch({ type: 'RESTART' })} />,
  }

  return (
    <>
      <Scenery />
      <div className="petals" aria-hidden>
        {Array.from({ length: 10 }, (_, i) => (
          <span
            key={i}
            className="petal"
            style={{
              left: `${(i * 97) % 100}%`,
              animationDelay: `${(i % 10) * 1.6}s`,
              animationDuration: `${9 + (i % 5) * 2.2}s`,
            }}
          />
        ))}
      </div>
      <div
        key={state.scene === 'decibel' ? `decibel-${state.step}` : state.scene}
        className="scene-fade"
      >
        {scenes[state.scene]}
      </div>
      {cue && !busyUi && !escHolding && (
        <div className="cue-chip">
          {CONFIG.copy.cuePrefix} {cue}
        </div>
      )}
      {escHolding && (
        <div className="reset-overlay">
          <span>{CONFIG.copy.escHoldHint}</span>
        </div>
      )}
    </>
  )
}
