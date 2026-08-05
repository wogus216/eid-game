import type { ShowState } from './showMachine'

// v1은 당첨자 4명 시절 구조 — 리허설 때 저장된 상태가 새 구조로 복구되지 않게 키를 올린다
const KEY = 'eid-decibel-game-v2'
const SCENES = ['standby', 'decibel', 'roulette', 'result']

export function save(state: ShowState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // localStorage 사용 불가(사파리 프라이빗 모드, 용량 초과 등) 시 무시
  }
}

export function load(): ShowState | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as ShowState
    if (!SCENES.includes(s.scene)) return null
    if (!Array.isArray(s.winners) || !Array.isArray(s.drawnHistory)) return null
    if (typeof s.entryCount !== 'number' || typeof s.step !== 'number') return null
    return s
  } catch {
    return null
  }
}

export function clear(): void {
  localStorage.removeItem(KEY)
}
