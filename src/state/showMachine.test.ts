import { describe, it, expect } from 'vitest'
import { reduce, initialState, DECIBEL_LAST_STEP, type ShowState } from './showMachine'
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

  it('clamps entryCount to at least CONFIG.winnerCount', () => {
    let s = initialState
    s = reduce(s, { type: 'ADJUST_ENTRY', delta: -(CONFIG.defaultEntry - CONFIG.winnerCount + 1) })
    expect(s.entryCount).toBe(CONFIG.winnerCount)
    s = reduce(s, { type: 'ADJUST_ENTRY', delta: -1 })
    expect(s.entryCount).toBe(CONFIG.winnerCount) // doesn't go below
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
  it('steps through attempts then moves to roulette', () => {
    let s = reduce(initialState, { type: 'NEXT' }) // decibel step 0
    for (let i = 0; i < DECIBEL_LAST_STEP; i++) s = reduce(s, { type: 'NEXT' })
    expect(s.scene).toBe('decibel')
    expect(s.step).toBe(DECIBEL_LAST_STEP)
    s = reduce(s, { type: 'NEXT' })
    expect(s.scene).toBe('roulette')
  })
})

describe('roulette', () => {
  it('draws one winner per NEXT until winnerCount, then result', () => {
    let s = advanceTo('roulette')
    for (let i = 0; i < CONFIG.winnerCount; i++) {
      s = reduce(s, { type: 'NEXT' }, seq(0))
      expect(s.winners.length).toBe(i + 1)
    }
    expect(new Set(s.winners).size).toBe(CONFIG.winnerCount) // 중복 없음
    s = reduce(s, { type: 'NEXT' })
    expect(s.scene).toBe('result')
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

  it('REDRAW_LAST is a no-op once the draw pool is exhausted after all winners are drawn', () => {
    let s = initialState
    s = reduce(s, { type: 'ADJUST_ENTRY', delta: -(CONFIG.defaultEntry - CONFIG.winnerCount) })
    expect(s.entryCount).toBe(CONFIG.winnerCount)
    while (s.scene !== 'roulette') s = reduce(s, { type: 'NEXT' }, seq(0))
    for (let i = 0; i < CONFIG.winnerCount; i++) s = reduce(s, { type: 'NEXT' }, seq(0))
    expect(s.winners.length).toBe(CONFIG.winnerCount)
    expect(s.drawnHistory.length).toBe(s.entryCount)
    const before = s
    s = reduce(s, { type: 'REDRAW_LAST' }, seq(0))
    expect(s).toEqual(before)
  })

  it('NEXT is a no-op once the draw pool is exhausted via redraws', () => {
    let s = initialState
    s = reduce(s, { type: 'ADJUST_ENTRY', delta: -(CONFIG.defaultEntry - CONFIG.winnerCount) })
    while (s.scene !== 'roulette') s = reduce(s, { type: 'NEXT' }, seq(0))
    for (let i = 0; i < CONFIG.winnerCount - 1; i++) s = reduce(s, { type: 'NEXT' }, seq(0))
    expect(s.winners.length).toBe(CONFIG.winnerCount - 1)
    s = reduce(s, { type: 'REDRAW_LAST' }, seq(0)) // consumes the last remaining number in the pool
    expect(s.drawnHistory.length).toBe(s.entryCount)
    expect(s.winners.length).toBe(CONFIG.winnerCount - 1)
    const before = s
    s = reduce(s, { type: 'NEXT' }, seq(0)) // would draw the final winner but the pool is exhausted
    expect(s).toEqual(before)
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
