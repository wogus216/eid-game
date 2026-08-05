import { useCallback, useEffect, useReducer, useRef, useState, type ReactNode } from 'react'
import {
  reduce,
  initialState,
  DECIBEL_LAST_STEP,
  attemptIndexOf,
  isRunningStep,
  roundStartOf,
  canRedraw,
  type ShowState,
  type ShowAction,
} from '../state/showMachine'
import { save, load, clear } from '../state/persistence'
import { CONFIG } from '../data/config'
import { Scenery } from '../components/Scenery'
import { Ground } from '../components/Ground'
import { sfx } from '../audio/sfx'
import { useShowGuards } from './useShowGuards'
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
    case 'decibel': {
      if (s.step === DECIBEL_LAST_STEP) return CONFIG.copy.cue.toRoulette
      const next = s.step + 1
      const n = attemptIndexOf(next) + 1
      return isRunningStep(next)
        ? CONFIG.copy.cue.attemptStart(n)
        : CONFIG.copy.cue.attemptReady(n)
    }
    case 'roulette': {
      const round = CONFIG.prizeRounds[s.step]
      const filled = s.winners.length - roundStartOf(s.step)
      if (round && filled < round.count) return CONFIG.copy.cue.draw(filled + 1)
      const next = CONFIG.prizeRounds[s.step + 1]
      return next ? CONFIG.copy.cue.nextRound(next.label) : CONFIG.copy.cue.toResult
    }
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
  const [muted, setMuted] = useState(false)

  useEffect(() => save(state), [state])

  // 대기 화면에서는 잃을 진행이 없으므로 이탈 확인을 걸지 않는다
  useShowGuards(state.scene !== 'standby')

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return
      sfx.unlock() // 브라우저 자동재생 정책 — 첫 키 입력에서 오디오 해제
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
        case 'm':
        case 'M':
          setMuted(sfx.toggleMute())
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
      sfx.unlock()
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
    <div className="world">
      <Scenery />
      <Ground />
      {/* 하늘 물듦은 오브젝트 아래 — 게이지와 꾸미는 물들지 않는다 */}
      <div className="tension-sky" aria-hidden />
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
        key={
          state.scene === 'decibel'
            ? state.step === 0
              ? 'decibel-intro'
              : `decibel-a${attemptIndexOf(state.step)}`
            : state.scene
        }
        className="scene-fade"
      >
        {scenes[state.scene]}
      </div>
      {/* 비네트와 섬광은 오브젝트 위 — 주변을 눌러 시선을 모은다 */}
      <div className="tension-vignette" aria-hidden />
      <div className="flash-layer" aria-hidden />
      {cue && !busyUi && !escHolding && (
        <div className="cue-chip">
          {CONFIG.copy.cuePrefix} {cue}
        </div>
      )}
      {canRedraw(state) && !busyUi && !escHolding && (
        <button
          type="button"
          className="redraw-btn"
          // window pointerdown 핸들러가 터치 탭을 NEXT로 해석한다 — 여기서 끊지 않으면
          // 터치로 누를 때 재추첨과 다음 추첨이 함께 나간다
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            // 포커스가 남으면 다음 Enter가 진행이 아니라 이 버튼을 다시 누른다
            e.currentTarget.blur()
            dispatch({ type: 'REDRAW_LAST' })
          }}
        >
          {CONFIG.copy.redrawButton}
        </button>
      )}
      {muted && <div className="muted-chip">{CONFIG.copy.mutedHint}</div>}
      {escHolding && (
        <div className="reset-overlay">
          <span>{CONFIG.copy.escHoldHint}</span>
        </div>
      )}
    </div>
  )
}
