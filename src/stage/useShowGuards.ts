import { useEffect } from 'react'

// 본행사 사고 방지. 디자인이 아니라 운영 보험이다.
//  1) 절전으로 화면이 꺼지면 무대가 암전된다 → Wake Lock으로 막는다
//  2) 진행 중 실수로 새로고침·이탈하면 흐름이 끊긴다 → 확인창을 띄운다

type WakeLockSentinelLike = { released: boolean; release: () => Promise<void> }
type NavigatorWithWakeLock = Navigator & {
  wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> }
}

/** @param guardExit 대기 화면처럼 잃을 것이 없는 상태에서는 이탈 확인을 걸지 않는다. */
export function useShowGuards(guardExit: boolean) {
  useEffect(() => {
    const wakeLock = (navigator as NavigatorWithWakeLock).wakeLock
    if (!wakeLock) return

    let sentinel: WakeLockSentinelLike | null = null
    let cancelled = false

    const acquire = async () => {
      try {
        const held = await wakeLock.request('screen')
        if (cancelled) {
          void held.release()
          return
        }
        sentinel = held
      } catch {
        // 사용자가 거부했거나 배터리 절약 모드 — 잠금 없이 진행한다
      }
    }
    void acquire()

    // 탭이 백그라운드로 갔다 오면 잠금이 풀리므로 다시 잡는다
    const onVisible = () => {
      if (document.visibilityState === 'visible' && (!sentinel || sentinel.released)) {
        void acquire()
      }
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      if (sentinel && !sentinel.released) void sentinel.release()
    }
  }, [])

  useEffect(() => {
    if (!guardExit) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [guardExit])
}
