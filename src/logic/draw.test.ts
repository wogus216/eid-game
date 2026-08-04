import { describe, it, expect } from 'vitest'
import { drawOne, secureRandomInt } from './draw'

describe('secureRandomInt', () => {
  it('returns values in [0, max)', () => {
    for (let i = 0; i < 1000; i++) {
      const v = secureRandomInt(7)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(7)
    }
  })
})

describe('drawOne', () => {
  it('returns a number in [1, entryCount]', () => {
    for (let i = 0; i < 500; i++) {
      const v = drawOne(87, new Set())
      expect(v).toBeGreaterThanOrEqual(1)
      expect(v).toBeLessThanOrEqual(87)
    }
  })

  it('never returns excluded numbers', () => {
    const exclude = new Set([1, 2, 3])
    for (let i = 0; i < 500; i++) {
      expect(exclude.has(drawOne(5, exclude))).toBe(false)
    }
  })

  it('is deterministic with an injected randInt', () => {
    // pool of 1..5 minus {2} = [1,3,4,5]; index 2 -> 4
    expect(drawOne(5, new Set([2]), () => 2)).toBe(4)
  })

  it('throws when no numbers remain', () => {
    expect(() => drawOne(2, new Set([1, 2]))).toThrow()
  })
})
