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

// roulette 씬에서 step은 '현재 선물 라운드 인덱스'를 뜻한다.
export const TOTAL_WINNERS = CONFIG.prizeRounds.reduce((sum, r) => sum + r.count, 0)

export function roundStartOf(round: number): number {
  return CONFIG.prizeRounds.slice(0, round).reduce((sum, r) => sum + r.count, 0)
}

export function filledInRound(state: ShowState): number {
  return state.winners.length - roundStartOf(state.step)
}

// 재추첨은 현재 라운드에서 뽑은 게 있고 뽑을 번호가 남아 있을 때만 가능하다
export function canRedraw(state: ShowState): boolean {
  return (
    state.scene === 'roulette' &&
    filledInRound(state) > 0 &&
    state.drawnHistory.length < state.entryCount
  )
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
  if (scene === 'decibel') return DECIBEL_LAST_STEP
  if (scene === 'roulette') return CONFIG.prizeRounds.length - 1
  return 0
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
      const entryCount = Math.min(CONFIG.maxEntry, Math.max(TOTAL_WINNERS, state.entryCount + action.delta))
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
          const round = CONFIG.prizeRounds[state.step]
          if (round && filledInRound(state) < round.count) {
            if (state.drawnHistory.length >= state.entryCount) return state
            const n = drawOne(state.entryCount, new Set(state.drawnHistory), randInt)
            return { ...state, winners: [...state.winners, n], drawnHistory: [...state.drawnHistory, n] }
          }
          // 정원이 찼다 — 다음 라운드가 있으면 뽑지 않고 넘어가 선물 전달 시간을 준다
          if (state.step < CONFIG.prizeRounds.length - 1) {
            return { ...state, step: state.step + 1 }
          }
          return { ...state, scene: 'result', step: 0 }
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
      if (!canRedraw(state)) return state
      const winners = state.winners.slice(0, -1)
      const n = drawOne(state.entryCount, new Set(state.drawnHistory), randInt)
      return { ...state, winners: [...winners, n], drawnHistory: [...state.drawnHistory, n] }
    }
  }
}
