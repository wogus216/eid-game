import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { save, load, clear } from './persistence'
import { initialState, type ShowState } from './showMachine'

const mockStorage: Record<string, string> = {}

beforeEach(() => {
  Object.keys(mockStorage).forEach(key => delete mockStorage[key])
  globalThis.localStorage = {
    getItem: (key: string) => mockStorage[key] ?? null,
    setItem: (key: string, value: string) => {
      mockStorage[key] = value
    },
    removeItem: (key: string) => {
      delete mockStorage[key]
    },
    clear: () => {
      Object.keys(mockStorage).forEach(key => delete mockStorage[key])
    },
    key: () => null,
    length: 0,
  } as Storage
})

afterEach(() => {
  Object.keys(mockStorage).forEach(key => delete mockStorage[key])
})

describe('persistence', () => {
  it('save and load roundtrip', () => {
    const state: ShowState = {
      scene: 'roulette',
      step: 2,
      entryCount: 50,
      winners: [1, 5, 12],
      drawnHistory: [1, 5, 12, 7],
    }
    save(state)
    const loaded = load()
    expect(loaded).toEqual(state)
  })

  it('load returns null when key missing', () => {
    expect(load()).toBeNull()
  })

  it('load returns null on malformed JSON', () => {
    globalThis.localStorage.setItem('eid-decibel-game-v2', 'not json')
    expect(load()).toBeNull()
  })

  it('load returns null on invalid scene string', () => {
    const badState = { ...initialState, scene: 'invalid' }
    globalThis.localStorage.setItem('eid-decibel-game-v2', JSON.stringify(badState))
    expect(load()).toBeNull()
  })

  it('load returns null when winners is not an array', () => {
    const badState = { ...initialState, winners: 'not an array' }
    globalThis.localStorage.setItem('eid-decibel-game-v2', JSON.stringify(badState))
    expect(load()).toBeNull()
  })

  it('load returns null when drawnHistory is not an array', () => {
    const badState = { ...initialState, drawnHistory: 123 }
    globalThis.localStorage.setItem('eid-decibel-game-v2', JSON.stringify(badState))
    expect(load()).toBeNull()
  })

  it('load returns null when entryCount is not a number', () => {
    const badState = { ...initialState, entryCount: 'not a number' }
    globalThis.localStorage.setItem('eid-decibel-game-v2', JSON.stringify(badState))
    expect(load()).toBeNull()
  })

  it('load returns null when step is not a number', () => {
    const badState = { ...initialState, step: null }
    globalThis.localStorage.setItem('eid-decibel-game-v2', JSON.stringify(badState))
    expect(load()).toBeNull()
  })

  it('clear removes the key', () => {
    save(initialState)
    expect(globalThis.localStorage.getItem('eid-decibel-game-v2')).not.toBeNull()
    clear()
    expect(globalThis.localStorage.getItem('eid-decibel-game-v2')).toBeNull()
    expect(load()).toBeNull()
  })
})
