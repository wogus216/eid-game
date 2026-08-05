import { CONFIG } from '../data/config'
import { drawOne, secureRandomInt } from '../logic/draw'

export type SceneId = 'standby' | 'decibel' | 'roulette' | 'result'

export interface ShowState {
  scene: SceneId
  step: number
  entryCount: number
  winners: number[]
  drawnHistory: number[]
}

export type ShowAction =
  | { type: 'NEXT' }
  | { type: 'BACK' }
  | { type: 'ADJUST_ENTRY'; delta: number }
  | { type: 'REDRAW_LAST' }
  | { type: 'RESET' }
  | { type: 'RESTART' }

// step 0=인트로, 홀수=k차 준비, 짝수=k차 함성. 시도 하나가 두 칸을 쓴다.
export const DECIBEL_LAST_STEP = CONFIG.attempts.length * 2

// step 해석은 여기서만 한다 — 화면과 큐 문구가 같은 규칙을 보게 하기 위해서다.
export function attemptIndexOf(step: number): number {
  return Math.ceil(step / 2) - 1
}

export function isRunningStep(step: number): boolean {
  return step > 0 && step % 2 === 0
}

export const initialState: ShowState = {
  scene: 'standby',
  step: 0,
  entryCount: CONFIG.defaultEntry,
  winners: [],
  drawnHistory: [],
}

const SCENE_ORDER: SceneId[] = ['standby', 'decibel', 'roulette', 'result']

function lastStepOf(scene: SceneId): number {
  return scene === 'decibel' ? DECIBEL_LAST_STEP : 0
}

export function reduce(
  state: ShowState,
  action: ShowAction,
  randInt: (maxExclusive: number) => number = secureRandomInt,
): ShowState {
  switch (action.type) {
    case 'RESET':
      return initialState

    case 'RESTART':
      // 다시하기: 입장 인원은 유지한 채 처음(대기)으로
      return { ...initialState, entryCount: state.entryCount }

    case 'ADJUST_ENTRY': {
      if (state.scene !== 'standby') return state
      const entryCount = Math.min(CONFIG.maxEntry, Math.max(CONFIG.winnerCount, state.entryCount + action.delta))
      return { ...state, entryCount }
    }

    case 'NEXT': {
      switch (state.scene) {
        case 'standby':
          return { ...state, scene: 'decibel', step: 0 }
        case 'decibel':
          if (state.step < DECIBEL_LAST_STEP) return { ...state, step: state.step + 1 }
          return { ...state, scene: 'roulette', step: 0 }
        case 'roulette': {
          if (state.winners.length >= CONFIG.winnerCount) {
            return { ...state, scene: 'result', step: 0 }
          }
          if (state.drawnHistory.length >= state.entryCount) return state
          const n = drawOne(state.entryCount, new Set(state.drawnHistory), randInt)
          return { ...state, winners: [...state.winners, n], drawnHistory: [...state.drawnHistory, n] }
        }
        case 'result':
          return state
      }
      return state
    }

    case 'BACK': {
      if (state.step > 0) return { ...state, step: state.step - 1 }
      const idx = SCENE_ORDER.indexOf(state.scene)
      if (idx === 0) return state
      const prev = SCENE_ORDER[idx - 1]
      return { ...state, scene: prev, step: lastStepOf(prev) }
    }

    case 'REDRAW_LAST': {
      if (state.scene !== 'roulette' || state.winners.length === 0) return state
      if (state.drawnHistory.length >= state.entryCount) return state
      const winners = state.winners.slice(0, -1)
      const n = drawOne(state.entryCount, new Set(state.drawnHistory), randInt)
      return { ...state, winners: [...winners, n], drawnHistory: [...state.drawnHistory, n] }
    }
  }
}
