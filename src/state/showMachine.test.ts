import { describe, it, expect } from 'vitest'
import {
  reduce,
  initialState,
  DECIBEL_LAST_STEP,
  attemptIndexOf,
  isRunningStep,
  TOTAL_WINNERS,
  roundStartOf,
  filledInRound,
  canRedraw,
  type ShowState,
} from './showMachine'
import { CONFIG } from '../data/config'

const seq = (...values: number[]) => {
  let i = 0
  return () => values[i++ % values.length]
}

function advanceTo(scene: string): ShowState {
  let s = initialState
  while (s.scene !== scene) s = reduce(s, { type: 'NEXT' }, seq(0))
  return s
}

describe('standby', () => {
  it('adjusts entryCount with clamping', () => {
    let s = reduce(initialState, { type: 'ADJUST_ENTRY', delta: -20 })
    expect(s.entryCount).toBe(80)
    s = reduce(s, { type: 'ADJUST_ENTRY', delta: +50 })
    expect(s.entryCount).toBe(CONFIG.maxEntry)
  })

  it('clamps entryCount to at least the total winner count', () => {
    let s = initialState
    s = reduce(s, { type: 'ADJUST_ENTRY', delta: -(CONFIG.defaultEntry - TOTAL_WINNERS + 1) })
    expect(s.entryCount).toBe(TOTAL_WINNERS)
    s = reduce(s, { type: 'ADJUST_ENTRY', delta: -1 })
    expect(s.entryCount).toBe(TOTAL_WINNERS) // 더 내려가지 않는다
  })

  it('NEXT moves to decibel', () => {
    expect(reduce(initialState, { type: 'NEXT' }).scene).toBe('decibel')
  })

  it('ADJUST_ENTRY outside standby is a no-op', () => {
    let s = reduce(initialState, { type: 'NEXT' }) // move to decibel
    const before = s.entryCount
    s = reduce(s, { type: 'ADJUST_ENTRY', delta: -50 })
    expect(s.entryCount).toBe(before)
  })
})

describe('decibel', () => {
  it('gives each attempt a ready step and a shout step', () => {
    expect(DECIBEL_LAST_STEP).toBe(CONFIG.attempts.length * 2)
    // 1차: 준비=1, 함성=2
    expect(attemptIndexOf(1)).toBe(0)
    expect(isRunningStep(1)).toBe(false)
    expect(attemptIndexOf(2)).toBe(0)
    expect(isRunningStep(2)).toBe(true)
    // 3차: 준비=5, 함성=6
    expect(attemptIndexOf(5)).toBe(2)
    expect(isRunningStep(5)).toBe(false)
    expect(attemptIndexOf(6)).toBe(2)
    expect(isRunningStep(6)).toBe(true)
  })

  it('reaches roulette after two NEXTs per attempt', () => {
    let s = reduce(initialState, { type: 'NEXT' }) // decibel step 0 (인트로)
    for (let i = 0; i < CONFIG.attempts.length * 2; i++) s = reduce(s, { type: 'NEXT' })
    expect(s.scene).toBe('decibel')
    expect(s.step).toBe(DECIBEL_LAST_STEP)
    s = reduce(s, { type: 'NEXT' })
    expect(s.scene).toBe('roulette')
  })

  it('BACK returns from a shout step to its own ready step', () => {
    let s = reduce(initialState, { type: 'NEXT' }) // 인트로
    s = reduce(s, { type: 'NEXT' }) // 1차 준비
    s = reduce(s, { type: 'NEXT' }) // 1차 함성
    expect(isRunningStep(s.step)).toBe(true)
    s = reduce(s, { type: 'BACK' })
    expect(s.step).toBe(1)
    expect(isRunningStep(s.step)).toBe(false)
    expect(attemptIndexOf(s.step)).toBe(0) // 같은 시도로 돌아온다
  })
})

describe('roulette', () => {
  it('fills one round at a time, switching rounds without drawing', () => {
    let s = advanceTo('roulette')
    expect(s.step).toBe(0)
    // 1차 3명
    for (let i = 0; i < CONFIG.prizeRounds[0].count; i++) {
      s = reduce(s, { type: 'NEXT' }, seq(0))
      expect(s.winners.length).toBe(i + 1)
    }
    // 정원이 찼으면 다음 NEXT는 추첨 없이 라운드만 넘긴다
    const afterFirstRound = s.winners.length
    s = reduce(s, { type: 'NEXT' }, seq(0))
    expect(s.step).toBe(1)
    expect(s.winners.length).toBe(afterFirstRound)
    expect(filledInRound(s)).toBe(0)
    // 2차 3명
    for (let i = 0; i < CONFIG.prizeRounds[1].count; i++) {
      s = reduce(s, { type: 'NEXT' }, seq(0))
    }
    expect(s.winners.length).toBe(TOTAL_WINNERS)
    expect(new Set(s.winners).size).toBe(TOTAL_WINNERS) // 라운드 간에도 중복 없음
    s = reduce(s, { type: 'NEXT' }, seq(0))
    expect(s.scene).toBe('result')
  })

  it('roundStartOf marks each round boundary', () => {
    expect(roundStartOf(0)).toBe(0)
    expect(roundStartOf(1)).toBe(CONFIG.prizeRounds[0].count)
    expect(roundStartOf(CONFIG.prizeRounds.length)).toBe(TOTAL_WINNERS)
  })

  it('REDRAW_LAST replaces last winner and never repeats history', () => {
    let s = advanceTo('roulette')
    s = reduce(s, { type: 'NEXT' }, seq(0)) // winner: 1
    const first = s.winners[0]
    s = reduce(s, { type: 'REDRAW_LAST' }, seq(0))
    expect(s.winners.length).toBe(1)
    expect(s.winners[0]).not.toBe(first)      // 밀려난 번호 다시 안 나옴
    expect(s.drawnHistory).toContain(first)   // history에는 남음
  })

  it('REDRAW_LAST with empty winners is a no-op', () => {
    let s = advanceTo('roulette')
    s = reduce(s, { type: 'REDRAW_LAST' }, seq(0))
    expect(s.winners.length).toBe(0)
    expect(s.scene).toBe('roulette')
  })

  it('REDRAW_LAST right after a round switch never touches the previous round', () => {
    let s = advanceTo('roulette')
    for (let i = 0; i < CONFIG.prizeRounds[0].count; i++) s = reduce(s, { type: 'NEXT' }, seq(0))
    s = reduce(s, { type: 'NEXT' }, seq(0)) // 2차로 전환
    expect(s.step).toBe(1)
    expect(canRedraw(s)).toBe(false)
    const before = s
    s = reduce(s, { type: 'REDRAW_LAST' }, seq(0))
    expect(s).toEqual(before) // 1차 당첨자는 그대로
  })

  it('REDRAW_LAST is a no-op once the draw pool is exhausted', () => {
    let s = initialState
    s = reduce(s, { type: 'ADJUST_ENTRY', delta: -(CONFIG.defaultEntry - TOTAL_WINNERS) })
    expect(s.entryCount).toBe(TOTAL_WINNERS)
    while (s.scene !== 'roulette') s = reduce(s, { type: 'NEXT' }, seq(0))
    // 6명을 다 뽑는다 (중간에 라운드 전환 NEXT 한 번이 더 필요하다)
    while (s.winners.length < TOTAL_WINNERS) s = reduce(s, { type: 'NEXT' }, seq(0))
    expect(s.drawnHistory.length).toBe(s.entryCount)
    const before = s
    s = reduce(s, { type: 'REDRAW_LAST' }, seq(0))
    expect(s).toEqual(before)
  })

  it('NEXT is a no-op once the draw pool is exhausted via redraws', () => {
    let s = initialState
    s = reduce(s, { type: 'ADJUST_ENTRY', delta: -(CONFIG.defaultEntry - TOTAL_WINNERS) })
    while (s.scene !== 'roulette') s = reduce(s, { type: 'NEXT' }, seq(0))
    while (s.winners.length < TOTAL_WINNERS - 1) s = reduce(s, { type: 'NEXT' }, seq(0))
    s = reduce(s, { type: 'REDRAW_LAST' }, seq(0)) // 풀의 마지막 번호를 소진시킨다
    expect(s.drawnHistory.length).toBe(s.entryCount)
    expect(s.winners.length).toBe(TOTAL_WINNERS - 1)
    const before = s
    s = reduce(s, { type: 'NEXT' }, seq(0)) // 마지막 한 명을 뽑으려 하지만 풀이 비었다
    expect(s).toEqual(before)
  })
})

describe('RESTART', () => {
  it('returns to standby keeping entryCount, clearing winners and history', () => {
    const s: ShowState = {
      scene: 'result',
      step: 0,
      entryCount: 87,
      winners: [1, 2, 3, 4, 5, 6],
      drawnHistory: [1, 2, 3, 4, 5, 6, 7],
    }
    const next = reduce(s, { type: 'RESTART' })
    expect(next.scene).toBe('standby')
    expect(next.entryCount).toBe(87)
    expect(next.winners).toEqual([])
    expect(next.drawnHistory).toEqual([])
  })
})

describe('BACK', () => {
  it('keeps winners when going back from roulette', () => {
    let s = advanceTo('roulette')
    s = reduce(s, { type: 'NEXT' }, seq(0))
    const winners = s.winners
    s = reduce(s, { type: 'BACK' })
    expect(s.scene).toBe('decibel')
    expect(s.step).toBe(DECIBEL_LAST_STEP)
    expect(s.winners).toEqual(winners)
  })

  it('BACK at standby step 0 is a no-op', () => {
    const s = reduce(initialState, { type: 'BACK' })
    expect(s.scene).toBe('standby')
    expect(s.step).toBe(0)
  })
})

describe('result', () => {
  it('NEXT in result is a no-op', () => {
    let s = advanceTo('result')
    const before = s
    s = reduce(s, { type: 'NEXT' })
    expect(s.scene).toBe('result')
    expect(s.step).toBe(0)
    expect(s).toEqual(before)
  })
})
