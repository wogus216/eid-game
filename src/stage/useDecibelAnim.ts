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

export function useDecibelAnim(attemptKey: number, peakDb: number, onDone: () => void) {
  const [db, setDb] = useState(0)
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  useEffect(() => {
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
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
  }, [attemptKey, peakDb])

  return db
}
