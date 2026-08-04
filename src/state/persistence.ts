import type { ShowState } from './showMachine'

const KEY = 'eid-decibel-game-v1'
const SCENES = ['standby', 'decibel', 'roulette', 'result']

export function save(state: ShowState): void {
  localStorage.setItem(KEY, JSON.stringify(state))
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
