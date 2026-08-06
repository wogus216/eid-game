import { useEffect, useState } from 'react'

// 시작·종료 없이 영원히 오르내리는 장식용 dB 값.
// 느린 파형(큰 진폭)이 전체 오르내림을 만들고, 빠른 파형(작은 진폭)이
// 값에 질감을 준다 — useDecibelAnim의 지터와 같은 결.
const MIN_DB = 20
const MAX_DB = 105
const CENTER = (MIN_DB + MAX_DB) / 2
const SWING = (MAX_DB - MIN_DB) / 2

export function useIdleDecibelLoop(): number {
  const [db, setDb] = useState(CENTER)

  useEffect(() => {
    let raf = 0
    const tick = (now: number) => {
      const slow = Math.sin(now / 2600)
      const jitter = Math.sin(now / 340) * 4 + Math.sin(now / 95) * 2
      setDb(Math.min(MAX_DB, Math.max(MIN_DB, CENTER + slow * SWING + jitter)))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return db
}
