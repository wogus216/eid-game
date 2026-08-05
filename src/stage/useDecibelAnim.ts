import { useEffect, useRef, useState } from 'react'

// t(0..1) 구간별 목표 dB 키프레임을 선형 보간 + sin 지터
const KEYFRAMES = [
  { t: 0, v: 20 },
  { t: 0.25, v: 60 },
  { t: 0.55, v: 0.8 },   // v<=1이면 peak 비율로 해석
  { t: 0.8, v: 0.97 },
  { t: 1, v: 1 },
]
const DURATION_MS = 3200
// 준비 단계의 숨소리 — 화면이 죽어 보이지 않을 만큼만, 절대 오르지는 않게
const IDLE_DB = 1.5
const IDLE_SWING = 1.5

export function useDecibelAnim(
  attemptKey: number,
  peakDb: number,
  running: boolean,
  onDone: () => void,
) {
  const [db, setDb] = useState(0)
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  useEffect(() => {
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      // 준비 단계 — 운영자가 Enter를 누를 때까지 바닥에서 떨기만 한다
      if (!running) {
        setDb(Math.max(0, IDLE_DB + Math.sin(now / 620) * IDLE_SWING))
        raf = requestAnimationFrame(tick)
        return
      }
      const t = Math.min(1, (now - start) / DURATION_MS)
      let base = peakDb
      for (let i = 1; i < KEYFRAMES.length; i++) {
        if (t <= KEYFRAMES[i].t) {
          const a = KEYFRAMES[i - 1]
          const b = KEYFRAMES[i]
          const f = (t - a.t) / (b.t - a.t)
          const va = a.v <= 1 ? a.v * peakDb : a.v
          const vb = b.v <= 1 ? b.v * peakDb : b.v
          base = va + (vb - va) * f
          break
        }
      }
      const jitter = t < 1 ? Math.sin(now / 45) * 2.5 + Math.sin(now / 130) * 1.5 : 0
      setDb(Math.max(0, base + jitter))
      if (t < 1) raf = requestAnimationFrame(tick)
      else doneRef.current()
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [attemptKey, peakDb, running])

  return db
}
