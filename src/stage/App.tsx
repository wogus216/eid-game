import { useCallback, useEffect, useReducer, useRef, useState, type ReactNode } from 'react'
import { reduce, initialState, type ShowState, type ShowAction } from '../state/showMachine'
import { save, load, clear } from '../state/persistence'
import { CONFIG } from '../data/config'
import { StandbyScene } from './scenes/StandbyScene'
import { DecibelScene } from './scenes/DecibelScene'
import { RouletteScene } from './scenes/RouletteScene'
import '../styles/tokens.css'
import '../styles/base.css'
import '../styles/stage.css'

export interface SceneProps {
  state: ShowState
  setBusy: (busy: boolean) => void
}

export function App() {
  const [state, dispatch] = useReducer(
    (s: ShowState, a: ShowAction) => reduce(s, a),
    undefined,
    () => load() ?? initialState,
  )
  const busyRef = useRef(false)
  const escTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [escHolding, setEscHolding] = useState(false)

  useEffect(() => save(state), [state])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return
      switch (e.key) {
        case 'Enter':
          if (!busyRef.current) dispatch({ type: 'NEXT' })
          break
        case 'ArrowLeft':
          if (!busyRef.current) dispatch({ type: 'BACK' })
          break
        case 'ArrowUp':
          dispatch({ type: 'ADJUST_ENTRY', delta: +1 })
          break
        case 'ArrowDown':
          dispatch({ type: 'ADJUST_ENTRY', delta: -1 })
          break
        case 'r':
        case 'R':
          if (!busyRef.current) dispatch({ type: 'REDRAW_LAST' })
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
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      if (escTimer.current) clearTimeout(escTimer.current)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  const setBusy = useCallback((busy: boolean) => {
    busyRef.current = busy
  }, [])

  const scenes: Record<ShowState['scene'], ReactNode> = {
    standby: <StandbyScene state={state} setBusy={setBusy} />,
    decibel: <DecibelScene state={state} setBusy={setBusy} />,
    roulette: <RouletteScene state={state} setBusy={setBusy} />,
    result: <div className="scene">RESULT (Task 8)</div>,
  }

  return (
    <>
      {scenes[state.scene]}
      {escHolding && <div className="reset-overlay">{CONFIG.copy.escHoldHint}</div>}
    </>
  )
}
