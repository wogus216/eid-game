# 리허설 피드백 반영 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 데시벨 게이지를 운영자가 Enter로 시작하게 만들고, 돌림판을 3명씩 2라운드(1차 선물·2차 선물)로 바꾼다.

**Architecture:** 두 변경 모두 `showMachine.ts`의 `step` 해석을 바꾸는 것이 중심이다. 데시벨은 시도당 step을 2칸(준비/함성)으로 늘리고, 돌림판은 `step`을 라운드 인덱스로 쓴다. `reduce`의 NEXT/BACK은 지금처럼 `step ± 1`이라 상태 전이 로직 자체는 거의 그대로다. 화면 컴포넌트는 `step`을 해석하는 순수 함수(`attemptIndexOf`, `isRunningStep`, `roundStartOf`)를 통해서만 단계를 읽는다.

**Tech Stack:** React 19, TypeScript, Vite 8, Vitest 4, oxlint. 순수 CSS(`src/styles/stage.css`).

## Global Constraints

- 상태기계 로직은 `src/state/showMachine.ts`의 순수 함수로만 표현한다. 컴포넌트는 `step`을 직접 산술하지 않고 헬퍼를 쓴다.
- 관객이 읽는 문구는 전부 꾸미의 말이고, 운영자용 문구(큐 칩·버튼)만 시스템 말투다. 새 문구는 모두 `CONFIG.copy`에 둔다.
- 경품명은 화면에 넣지 않는다. 라운드 라벨은 `1차 선물` / `2차 선물`.
- 데시벨 임계값(92/98/104dB), 시도 횟수(3), 기존 대사는 바꾸지 않는다.
- 각 태스크 끝에서 `npm test`, `npm run typecheck`, `npm run lint`가 모두 통과해야 한다.
- 컴포넌트 단위 테스트 인프라(jsdom)는 이 저장소에 없다. 화면 동작은 `npm run dev` + 브라우저 수동 검증으로 확인하며, 각 태스크에 확인 절차를 적어뒀다.
- 작업 브랜치: `feat/rehearsal-feedback` (main에서 분기).

---

### Task 0: 작업 브랜치 만들기

**Files:** 없음

- [ ] **Step 1: main 최신 상태에서 브랜치 생성**

```bash
cd /Users/kwonjaehyeon/Programming/sancho/eid_game
git checkout main
git pull --ff-only
git checkout -b feat/rehearsal-feedback
```

- [ ] **Step 2: 기준선 확인**

Run: `npm test && npm run typecheck && npm run lint`
Expected: 전부 통과 (변경 전 상태가 깨끗한지 확인)

---

### Task 1: 데시벨 step을 시도당 2단계로 (상태기계)

시도 하나가 `준비 → 함성` 두 step을 차지하게 만든다. 이 태스크는 상태기계와 테스트만 다루고 화면은 건드리지 않는다. 화면은 `DECIBEL_LAST_STEP`만 참조하므로 이 태스크만으로도 컴파일과 기존 테스트가 통과한다(3차까지 진행하는 데 Enter가 6번 필요해질 뿐이다).

**Files:**
- Modify: `src/state/showMachine.ts:22` (`DECIBEL_LAST_STEP` 및 헬퍼 추가)
- Test: `src/state/showMachine.test.ts` (decibel describe 블록)

**Interfaces:**
- Produces:
  - `DECIBEL_LAST_STEP: number` — 값이 `CONFIG.attempts.length * 2`(=6)로 바뀐다
  - `attemptIndexOf(step: number): number` — step에서 0-based 시도 인덱스
  - `isRunningStep(step: number): boolean` — 함성(재생) 단계면 true

- [ ] **Step 1: 실패하는 테스트를 작성한다**

`src/state/showMachine.test.ts`의 import 줄을 다음으로 바꾼다.

```ts
import {
  reduce,
  initialState,
  DECIBEL_LAST_STEP,
  attemptIndexOf,
  isRunningStep,
  type ShowState,
} from './showMachine'
```

그리고 기존 `describe('decibel', ...)` 블록 전체(45~53줄)를 아래로 교체한다.

```ts
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
```

- [ ] **Step 2: 테스트가 실패하는지 확인한다**

Run: `npm test`
Expected: FAIL — `attemptIndexOf`, `isRunningStep`가 export되지 않아 타입/실행 에러

- [ ] **Step 3: 상태기계에 헬퍼를 추가한다**

`src/state/showMachine.ts`의 22번째 줄을 아래로 교체한다.

```ts
// step 0=인트로, 홀수=k차 준비, 짝수=k차 함성. 시도 하나가 두 칸을 쓴다.
export const DECIBEL_LAST_STEP = CONFIG.attempts.length * 2

// step 해석은 여기서만 한다 — 화면과 큐 문구가 같은 규칙을 보게 하기 위해서다.
export function attemptIndexOf(step: number): number {
  return Math.ceil(step / 2) - 1
}

export function isRunningStep(step: number): boolean {
  return step > 0 && step % 2 === 0
}
```

`reduce`의 `NEXT`/`BACK` 분기는 손대지 않는다. 이미 `step ± 1`로 동작한다.

- [ ] **Step 4: 테스트가 통과하는지 확인한다**

Run: `npm test && npm run typecheck && npm run lint`
Expected: 전부 PASS

- [ ] **Step 5: 커밋**

```bash
git add src/state/showMachine.ts src/state/showMachine.test.ts
git commit -m "feat: 데시벨 시도를 준비/함성 두 단계로 나눔"
```

---

### Task 2: 데시벨 화면 — 준비 단계에서 대기, Enter로 함성 시작

**Files:**
- Modify: `src/stage/useDecibelAnim.ts` (전체)
- Modify: `src/stage/scenes/DecibelScene.tsx:47-123`
- Modify: `src/data/config.ts:36` (`copy.cue.attempt` → `attemptReady`/`attemptStart`)
- Modify: `src/stage/App.tsx:26-31` (`nextCue`의 decibel 분기), `src/stage/App.tsx:167-170` (씬 `key`)

**Interfaces:**
- Consumes: `attemptIndexOf(step)`, `isRunningStep(step)`, `DECIBEL_LAST_STEP` (Task 1)
- Produces:
  - `useDecibelAnim(attemptKey: number, peakDb: number, running: boolean, onDone: () => void): number`
  - `CONFIG.copy.cue.attemptReady(n: number): string`, `CONFIG.copy.cue.attemptStart(n: number): string`

- [ ] **Step 1: `useDecibelAnim`에 `running` 플래그를 추가한다**

`src/stage/useDecibelAnim.ts` 전체를 아래로 교체한다.

```ts
import { useEffect, useRef, useState } from 'react'

// t(0..1) 구간별 목표 dB 키프레임을 선형 보간 + sin 지터
const KEYFRAMES = [
  { t: 0, v: 20 },
  { t: 0.25, v: 60 },
  { t: 0.55, v: 0.8 },   // v<=1이면 peak 비율로 해석
  { t: 0.8, v: 0.97 },
  { t: 1, v: 1 },
]
const DURATION_MS = 3200
// 준비 단계의 숨소리 — 화면이 죽어 보이지 않을 만큼만, 절대 오르지는 않게
const IDLE_DB = 1.5
const IDLE_SWING = 1.5

export function useDecibelAnim(
  attemptKey: number,
  peakDb: number,
  running: boolean,
  onDone: () => void,
) {
  const [db, setDb] = useState(0)
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  useEffect(() => {
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      // 준비 단계 — 운영자가 Enter를 누를 때까지 바닥에서 떨기만 한다
      if (!running) {
        setDb(Math.max(0, IDLE_DB + Math.sin(now / 620) * IDLE_SWING))
        raf = requestAnimationFrame(tick)
        return
      }
      const t = Math.min(1, (now - start) / DURATION_MS)
      let base = peakDb
      for (let i = 1; i < KEYFRAMES.length; i++) {
        if (t <= KEYFRAMES[i].t) {
          const a = KEYFRAMES[i - 1]
          const b = KEYFRAMES[i]
          const f = (t - a.t) / (b.t - a.t)
          const va = a.v <= 1 ? a.v * peakDb : a.v
          const vb = b.v <= 1 ? b.v * peakDb : b.v
          base = va + (vb - va) * f
          break
        }
      }
      const jitter = t < 1 ? Math.sin(now / 45) * 2.5 + Math.sin(now / 130) * 1.5 : 0
      setDb(Math.max(0, base + jitter))
      if (t < 1) raf = requestAnimationFrame(tick)
      else doneRef.current()
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [attemptKey, peakDb, running])

  return db
}
```

`running`이 false→true로 바뀌면 effect가 다시 돌아 `start`가 그 순간으로 잡힌다. 그래서 Enter를 누른 시점부터 3.2초가 센다.

- [ ] **Step 2: `DecibelScene`이 준비/함성을 구분하게 한다**

`src/stage/scenes/DecibelScene.tsx`의 `Attempt` 함수(47~103줄)와 `DecibelScene` 함수(105~123줄)를 아래로 교체한다. `Gauge`와 `AttemptDots`는 그대로 둔다.

```tsx
function Attempt({
  index,
  running,
  setBusy,
}: {
  index: number
  running: boolean
  setBusy: (b: boolean) => void
}) {
  const spec = CONFIG.attempts[index]
  const [finished, setFinished] = useState(false)
  useEffect(() => {
    // 준비 단계에서는 진행을 막지 않는다 — 운영자가 Enter로 함성을 시작해야 한다
    setBusy(running)
    setFinished(false)
    // 1차 0 → 2차 0.5 → 3차 1. 시도가 거듭될수록 세계가 조여든다.
    setTension(index / Math.max(1, CONFIG.attempts.length - 1))
    if (running) sfx.riseStart() // 함성이 커지는 지속음 — 게이지와 같이 자란다
    return () => {
      sfx.riseStop()
      setShout(0)
      setTension(0)
    }
  }, [index, running, setBusy])
  const db = useDecibelAnim(index, spec.peakDb, running, () => {
    setFinished(true)
    setBusy(false)
    sfx.riseStop()
    if (spec.success) {
      sfx.breakthrough()
      quake() // 세계가 한 번 크게 휜다
      flash() // 조여든 어둠이 한꺼번에 밝아진다
      setTension(0)
    } else {
      sfx.fail()
    }
  })
  // 소리와 세계의 반응은 같은 값을 본다. 준비 단계에서는 바람도 일지 않는다.
  useEffect(() => {
    if (!running) return
    sfx.riseLevel(db / 110)
    setShout(finished ? 0 : db / 110)
  }, [db, finished, running])
  const breakthrough = finished && spec.success
  return (
    <div className={`scene ${breakthrough ? 'breakthrough' : ''}`}>
      {breakthrough && <Confetti count={80} />}
      <div className="sky-layer">
        <SpeechBubble>{finished ? spec.done : spec.say}</SpeechBubble>
        <AttemptDots index={index} finished={finished} />
      </div>
      <div className="ground-layer">
        <Gauge db={db} target={CONFIG.targetDb} burst={breakthrough} />
        <div className={`db-readout grounded ${breakthrough ? 'success' : ''}`}>
          {Math.round(db)}
          <span className="db-unit">dB</span>
        </div>
        <div className="mascot-stand">
          <Mascot
            size={200}
            mood={breakthrough ? 'excited' : finished ? 'sad' : 'tense'}
          />
        </div>
      </div>
    </div>
  )
}

export function DecibelScene({ state, setBusy }: SceneProps) {
  if (state.step === 0) {
    return (
      <div className="scene">
        <div className="sky-layer">
          <SpeechBubble>{CONFIG.copy.decibelIntro}</SpeechBubble>
          <AttemptDots index={-1} finished={false} />
        </div>
        <div className="ground-layer">
          <Gauge db={0} target={CONFIG.targetDb} />
          <div className="mascot-stand">
            <Mascot size={220} mood="idle" />
          </div>
        </div>
      </div>
    )
  }
  return (
    <Attempt
      index={attemptIndexOf(state.step)}
      running={isRunningStep(state.step)}
      setBusy={setBusy}
    />
  )
}
```

같은 파일 상단 import에 헬퍼를 추가한다.

```tsx
import { attemptIndexOf, isRunningStep } from '../../state/showMachine'
```

- [ ] **Step 3: 큐 문구를 준비/시작으로 나눈다**

`src/data/config.ts`의 `cue` 객체에서 `attempt: (n: number) => \`${n}차 시도\`,` 줄을 아래 두 줄로 교체한다.

```ts
      attemptReady: (n: number) => `${n}차 준비`,
      attemptStart: (n: number) => `${n}차 함성 시작!`,
```

- [ ] **Step 4: `nextCue`가 다음 step 기준으로 문구를 고르게 한다**

`src/stage/App.tsx`의 `nextCue` 안 `case 'decibel':` 분기(28~30줄)를 아래로 교체한다.

```ts
    case 'decibel': {
      if (s.step === DECIBEL_LAST_STEP) return CONFIG.copy.cue.toRoulette
      const next = s.step + 1
      const n = attemptIndexOf(next) + 1
      return isRunningStep(next)
        ? CONFIG.copy.cue.attemptStart(n)
        : CONFIG.copy.cue.attemptReady(n)
    }
```

App.tsx 상단 import를 아래로 바꾼다.

```tsx
import {
  reduce,
  initialState,
  DECIBEL_LAST_STEP,
  attemptIndexOf,
  isRunningStep,
  type ShowState,
  type ShowAction,
} from '../state/showMachine'
```

- [ ] **Step 5: 준비→함성 전환에서 화면이 페이드되지 않게 한다**

`src/stage/App.tsx`의 씬 `key`(168줄)를 아래로 교체한다. 지금은 step마다 재마운트라 같은 시도 안에서도 화면이 한 번 사라졌다 나온다.

```tsx
        key={
          state.scene === 'decibel'
            ? state.step === 0
              ? 'decibel-intro'
              : `decibel-a${attemptIndexOf(state.step)}`
            : state.scene
        }
```

- [ ] **Step 6: 정적 검사**

Run: `npm test && npm run typecheck && npm run lint`
Expected: 전부 PASS

- [ ] **Step 7: 브라우저에서 수동 확인**

Run: `npm run dev` → 브라우저에서 접속 후 아래를 확인한다.

1. Enter → 인트로. 좌하단 큐 칩이 `Enter ▶ 1차 준비`
2. Enter → 1차 준비 화면. **게이지가 바닥에서 미세하게만 떨리고 올라가지 않는다.** 꾸미가 "자, 다 같이 소리 질러!"를 말하고, 큐 칩은 `Enter ▶ 1차 함성 시작!`
3. Enter → 게이지가 차오르고 92dB에서 멈춘다. 끝나면 "오— 좋았어! 근데 더 할 수 있지?", 큐 칩은 `Enter ▶ 2차 준비`
4. 준비 화면과 함성 화면 사이에 화면 전체가 페이드아웃되지 않는다 (시도가 바뀔 때만 페이드)
5. ← 를 누르면 방금 시도의 준비 화면으로 돌아가고, Enter로 같은 시도를 다시 재생할 수 있다
6. 3차 돌파 시 섬광·폭죽·하늘 복귀가 예전과 동일하다

- [ ] **Step 8: 커밋**

```bash
git add src/stage/useDecibelAnim.ts src/stage/scenes/DecibelScene.tsx src/data/config.ts src/stage/App.tsx
git commit -m "feat: 함성을 Enter로 시작하도록 데시벨 화면 변경"
```

---

### Task 3: 선물 라운드 도입 (config + 상태기계)

`winnerCount: 4`를 `prizeRounds`로 바꾸고, `roulette` 씬의 `step`을 라운드 인덱스로 쓴다. `winnerCount`를 참조하던 화면 코드도 이 태스크에서 함께 고쳐야 컴파일이 유지된다(연출은 Task 4에서).

**Files:**
- Modify: `src/data/config.ts:5` (`winnerCount` 제거, `prizeRounds` 추가), `src/data/config.ts:36` (`cue.nextRound` 추가), `src/data/config.ts:43` (타입 export 추가)
- Modify: `src/state/showMachine.ts` (헬퍼 3개, `ADJUST_ENTRY`, `NEXT`의 roulette 분기, `REDRAW_LAST`, `lastStepOf`)
- Modify: `src/stage/App.tsx:31-33` (`nextCue`의 roulette 분기)
- Modify: `src/stage/scenes/RouletteScene.tsx:95` (빈칸 개수)
- Test: `src/state/showMachine.test.ts` (roulette / standby / RESTART describe 블록)

**Interfaces:**
- Produces:
  - `CONFIG.prizeRounds: readonly { label: string; count: number }[]`
  - `TOTAL_WINNERS: number` — 전체 당첨 인원(6)
  - `roundStartOf(round: number): number` — 그 라운드가 시작되는 `winners` 인덱스
  - `filledInRound(state: ShowState): number` — 현재 라운드에서 이미 뽑힌 수
  - `canRedraw(state: ShowState): boolean` — 재추첨 버튼 표시 조건 (Task 5에서 사용)

- [ ] **Step 1: 실패하는 테스트를 작성한다**

`src/state/showMachine.test.ts`의 import 줄에 새 심볼을 더한다.

```ts
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
```

`describe('standby', ...)` 안의 `clamps entryCount to at least CONFIG.winnerCount` 테스트(24~30줄)를 아래로 교체한다.

```ts
  it('clamps entryCount to at least the total winner count', () => {
    let s = initialState
    s = reduce(s, { type: 'ADJUST_ENTRY', delta: -(CONFIG.defaultEntry - TOTAL_WINNERS + 1) })
    expect(s.entryCount).toBe(TOTAL_WINNERS)
    s = reduce(s, { type: 'ADJUST_ENTRY', delta: -1 })
    expect(s.entryCount).toBe(TOTAL_WINNERS) // 더 내려가지 않는다
  })
```

`describe('roulette', ...)` 블록 전체(55~110줄)를 아래로 교체한다.

```ts
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
    s = reduce(s, { type: 'NEXT' }, seq(0))
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
```

`describe('RESTART', ...)` 안의 고정 상태(114~120줄)를 라운드 구조에 맞게 바꾼다.

```ts
    const s: ShowState = {
      scene: 'result',
      step: 0,
      entryCount: 87,
      winners: [1, 2, 3, 4, 5, 6],
      drawnHistory: [1, 2, 3, 4, 5, 6, 7],
    }
```

`describe('BACK', ...)`의 `keeps winners when going back from roulette`는 그대로 둔다 — `advanceTo('roulette')` 직후 step 0에서 BACK이므로 decibel로 돌아간다.

- [ ] **Step 2: 테스트가 실패하는지 확인한다**

Run: `npm test`
Expected: FAIL — `TOTAL_WINNERS`, `roundStartOf`, `filledInRound`, `canRedraw`, `CONFIG.prizeRounds`가 없음

- [ ] **Step 3: config를 라운드 구조로 바꾼다**

`src/data/config.ts`의 `winnerCount: 4,` 줄을 아래로 교체한다.

```ts
  // 선물은 1차 3개 + 2차 3개. 돌림판은 3명을 뽑아 발표하고, 한 번 멈췄다 다음 3명을 뽑는다.
  prizeRounds: [
    { label: '1차 선물', count: 3 },
    { label: '2차 선물', count: 3 },
  ],
```

`cue` 객체에 라운드 전환 문구를 더한다 (`toResult` 바로 위).

```ts
      nextRound: (label: string) => `${label} 추첨`,
```

파일 맨 아래 타입 export 옆에 라운드 타입을 더한다.

```ts
export type PrizeRound = (typeof CONFIG.prizeRounds)[number]
```

- [ ] **Step 4: 상태기계를 라운드 기준으로 바꾼다**

`src/state/showMachine.ts`에 헬퍼를 추가한다 (`DECIBEL_LAST_STEP` 및 데시벨 헬퍼 아래).

```ts
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
```

`lastStepOf`를 아래로 교체한다.

```ts
function lastStepOf(scene: SceneId): number {
  if (scene === 'decibel') return DECIBEL_LAST_STEP
  if (scene === 'roulette') return CONFIG.prizeRounds.length - 1
  return 0
}
```

`ADJUST_ENTRY`의 하한을 바꾼다.

```ts
      const entryCount = Math.min(CONFIG.maxEntry, Math.max(TOTAL_WINNERS, state.entryCount + action.delta))
```

`NEXT`의 `case 'roulette':` 분기를 아래로 교체한다.

```ts
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
```

`REDRAW_LAST` 분기를 아래로 교체한다.

```ts
    case 'REDRAW_LAST': {
      if (!canRedraw(state)) return state
      const winners = state.winners.slice(0, -1)
      const n = drawOne(state.entryCount, new Set(state.drawnHistory), randInt)
      return { ...state, winners: [...winners, n], drawnHistory: [...state.drawnHistory, n] }
    }
```

- [ ] **Step 5: `winnerCount`를 쓰던 화면 코드를 고친다**

`src/stage/App.tsx`의 `nextCue` 안 `case 'roulette':` 분기(31~33줄)를 아래로 교체한다.

```ts
    case 'roulette': {
      const round = CONFIG.prizeRounds[s.step]
      const filled = s.winners.length - roundStartOf(s.step)
      if (round && filled < round.count) return CONFIG.copy.cue.draw(filled + 1)
      const next = CONFIG.prizeRounds[s.step + 1]
      return next ? CONFIG.copy.cue.nextRound(next.label) : CONFIG.copy.cue.toResult
    }
```

App.tsx의 showMachine import에 `roundStartOf`를 추가한다.

`src/stage/scenes/RouletteScene.tsx`의 빈칸 렌더(95줄)를 아래로 교체한다. 연출은 Task 4에서 다듬고, 여기서는 컴파일만 통과시킨다.

```tsx
          {Array.from({ length: CONFIG.prizeRounds[state.step].count - revealed }, (_, i) => (
```

`state`는 이미 props로 들어와 있으므로 상단 `const { winners, entryCount } = state`는 그대로 둔다. 이 상태에서는 1차 라운드까지만 화면이 맞고 2차에서는 빈칸 수가 틀어지는데, Task 4에서 `revealed`를 라운드 안으로 가두면서 바로잡는다.

- [ ] **Step 6: 테스트가 통과하는지 확인한다**

Run: `npm test && npm run typecheck && npm run lint`
Expected: 전부 PASS

- [ ] **Step 7: 커밋**

```bash
git add src/data/config.ts src/state/showMachine.ts src/state/showMachine.test.ts src/stage/App.tsx src/stage/scenes/RouletteScene.tsx
git commit -m "feat: 돌림판을 3명씩 두 라운드로 나눔"
```

---

### Task 4: 돌림판 화면 — 3칸 보드와 라운드 라벨

**Files:**
- Modify: `src/stage/scenes/RouletteScene.tsx` (전체)
- Modify: `src/data/config.ts` (`copy.rouletteTitleNext` 추가)
- Modify: `src/styles/stage.css:529` 근처 (`.board-label` 추가)

**Interfaces:**
- Consumes: `roundStartOf(round)` (Task 3), `CONFIG.prizeRounds`

- [ ] **Step 1: 2차 진입 대사를 추가한다**

`src/data/config.ts`의 `rouletteTitle` 아래에 한 줄 더한다.

```ts
    rouletteTitleNext: '한 번 더 간다! 두근두근',
```

- [ ] **Step 2: `RouletteScene`을 현재 라운드만 보여주도록 바꾼다**

`src/stage/scenes/RouletteScene.tsx` 전체를 아래로 교체한다.

```tsx
import { useEffect, useRef, useState } from 'react'
import { CONFIG } from '../../data/config'
import { roundStartOf } from '../../state/showMachine'
import { Mascot } from '../../components/Mascot'
import { SpeechBubble } from '../../components/SpeechBubble'
import { sfx } from '../../audio/sfx'
import type { SceneProps } from '../App'

const SPIN_MS = 3800
const ALMOST_MS = 1400 // 멈추기 전 "나와라 나와라…!" 구간

export function RouletteScene({ state, setBusy }: SceneProps) {
  const { winners, entryCount, step } = state
  const round = CONFIG.prizeRounds[step]
  // 보드에는 현재 라운드에서 뽑힌 번호만 올라간다
  const roundWinners = winners.slice(roundStartOf(step))
  const [spinning, setSpinning] = useState(false)
  const [almost, setAlmost] = useState(false)
  const [flick, setFlick] = useState<number | null>(null) // 스핀 중 스쳐가는 번호
  const [revealed, setRevealed] = useState(roundWinners.length) // 새로고침 복구 시 전부 공개 상태
  const lastSeen = useRef(winners.join(','))

  useEffect(() => {
    const key = winners.join(',')
    if (key !== lastSeen.current && winners.length > 0) {
      lastSeen.current = key
      const filled = winners.length - roundStartOf(step)
      setSpinning(true)
      setAlmost(false)
      setRevealed(filled - 1)
      setBusy(true)

      // 번호 플리커 — 바퀴의 감속 곡선과 같은 리듬으로 간격을 벌린다
      let elapsed = 0
      let tickTimer: ReturnType<typeof setTimeout> | null = null
      const tick = () => {
        setFlick(1 + Math.floor(Math.random() * entryCount))
        sfx.tick()
        const t = Math.min(1, elapsed / SPIN_MS)
        const delay = 42 + 430 * t ** 3
        elapsed += delay
        if (elapsed < SPIN_MS - 140) tickTimer = setTimeout(tick, delay)
      }
      tick()

      const almostTimer = setTimeout(() => setAlmost(true), SPIN_MS - ALMOST_MS)
      const doneTimer = setTimeout(() => {
        setSpinning(false)
        setAlmost(false)
        setFlick(null)
        setRevealed(filled)
        setBusy(false)
        sfx.reveal()
      }, SPIN_MS)

      return () => {
        if (tickTimer) clearTimeout(tickTimer)
        clearTimeout(almostTimer)
        clearTimeout(doneTimer)
        setBusy(false)
      }
    }
  }, [winners, entryCount, step, setBusy])

  // 라운드가 바뀌면 winners는 그대로인 채 보드만 비워진다 — revealed를 라운드 안으로 가둔다
  const shown = Math.min(revealed, roundWinners.length)
  const current = roundWinners[roundWinners.length - 1]
  const showCard = roundWinners.length > 0 && shown >= roundWinners.length

  return (
    <div className="scene">
      <div className="sky-layer">
        <SpeechBubble>
          {step > 0 ? CONFIG.copy.rouletteTitleNext : CONFIG.copy.rouletteTitle}
        </SpeechBubble>
      </div>
      <div className="ground-layer">
        <div className="grounded wheel-stand">
          <div className="wheel-pointer" aria-hidden />
          <div
            className={`wheel ${spinning ? 'spinning' : ''}`}
            style={spinning ? { animationDuration: `${SPIN_MS}ms` } : undefined}
          >
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i} className="wheel-spoke" style={{ transform: `rotate(${i * 30}deg)` }} />
            ))}
          </div>
          <div className="wheel-center">
            {spinning ? (
              <span className={`wheel-flick ${almost ? 'almost' : ''}`}>{flick ?? '?'}</span>
            ) : showCard ? (
              <span className="wheel-number">{current}</span>
            ) : (
              '?'
            )}
          </div>
        </div>
        <div className="winner-board grounded">
          <div className="board-label">{round.label}</div>
          {roundWinners.slice(0, shown).map((n, i) => (
            <div key={`${n}-${i}`} className="winner-chip">
              {i + 1}번째 · <strong>{n}번</strong>
            </div>
          ))}
          {Array.from({ length: round.count - shown }, (_, i) => (
            <div key={`empty-${i}`} className="winner-chip empty">
              ?
            </div>
          ))}
        </div>
        <div className="mascot-stand">
          <Mascot size={170} mood={spinning ? 'nervous' : 'idle'} />
        </div>
      </div>
      {/* 구호 슬롯은 항상 렌더링해 레이아웃 점프를 막는다 */}
      <div className={`chant ${spinning ? '' : 'hidden'} ${almost ? 'almost' : ''}`}>
        {almost ? CONFIG.copy.rouletteAlmost : CONFIG.copy.rouletteChant}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 보드 라벨 스타일을 추가한다**

`src/styles/stage.css`의 `.winner-chip.empty { … }` 블록 바로 뒤(556줄 다음)에 추가한다.

```css
/* 게시판 제목 — 지금 뽑고 있는 선물 라운드 */
.board-label {
  text-align: center;
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--choco);
  opacity: 0.75;
  letter-spacing: 0.02em;
}
```

- [ ] **Step 4: 정적 검사**

Run: `npm test && npm run typecheck && npm run lint`
Expected: 전부 PASS

- [ ] **Step 5: 브라우저에서 수동 확인**

Run: `npm run dev` → 데시벨을 끝까지 진행한 뒤 돌림판에서 확인한다.

1. 보드 제목이 `1차 선물`, 빈칸이 **3개**
2. Enter 3번에 3칸이 모두 찬다. 큐 칩이 `Enter ▶ 1번째 추첨` → `2번째` → `3번째`로 바뀐다
3. 3칸이 찬 뒤 큐 칩은 `Enter ▶ 2차 선물 추첨`. **Enter를 눌러도 추첨이 돌지 않고** 보드가 비면서 제목이 `2차 선물`로 바뀐다. 꾸미 대사는 "한 번 더 간다! 두근두근"
4. Enter 3번에 2차 3칸이 찬다. 1차에 나온 번호가 다시 나오지 않는다
5. 큐 칩이 `Enter ▶ 결과 발표`가 되고 Enter로 결과 화면에 간다
6. 라운드 전환 직후 새로고침(F5) → 2차 라운드, 빈칸 3개 상태로 복구된다

- [ ] **Step 6: 커밋**

```bash
git add src/stage/scenes/RouletteScene.tsx src/data/config.ts src/styles/stage.css
git commit -m "feat: 돌림판 보드를 라운드별 3칸으로"
```

---

### Task 5: 재추첨 버튼

**Files:**
- Modify: `src/stage/App.tsx` (버튼 렌더)
- Modify: `src/data/config.ts` (`copy.redrawButton`)
- Modify: `src/styles/stage.css:200` 근처 (`.redraw-btn` 추가)

**Interfaces:**
- Consumes: `canRedraw(state)` (Task 3), `CONFIG.copy.redrawButton`

- [ ] **Step 1: 버튼 문구를 추가한다**

`src/data/config.ts`의 `restartButton: '다시하기',` 아래에 더한다.

```ts
    redrawButton: '다시 뽑기',
```

- [ ] **Step 2: 우하단에 버튼을 렌더한다**

`src/stage/App.tsx`의 `{muted && <div className="muted-chip">…</div>}` 줄 바로 위에 추가한다.

```tsx
      {canRedraw(state) && !busyUi && !escHolding && (
        <button
          type="button"
          className="redraw-btn"
          // window pointerdown 핸들러가 터치 탭을 NEXT로 해석한다 — 여기서 끊지 않으면
          // 터치로 누를 때 재추첨과 다음 추첨이 함께 나간다
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            // 포커스가 남으면 다음 Enter가 진행이 아니라 이 버튼을 다시 누른다
            e.currentTarget.blur()
            dispatch({ type: 'REDRAW_LAST' })
          }}
        >
          {CONFIG.copy.redrawButton}
        </button>
      )}
```

App.tsx의 showMachine import에 `canRedraw`를 추가한다.

- [ ] **Step 3: 큐 칩과 같은 톤의 스타일을 추가한다**

`src/styles/stage.css`의 `.muted-chip { … }` 블록 앞(200줄 직전)에 추가한다.

```css
/* 재추첨 — 큐 칩의 거울상. 사회자가 마우스로 누를 수 있는 유일한 운영 버튼 */
.redraw-btn {
  position: fixed;
  right: 1.2rem;
  bottom: 1.2rem;
  font-family: inherit;
  font-size: 0.98rem;
  font-weight: 700;
  color: var(--choco);
  background: rgba(255, 246, 221, 0.92);
  border: 2px solid rgba(176, 124, 76, 0.5);
  border-radius: 10px;
  padding: 0.35rem 0.85rem;
  cursor: pointer;
  animation: cue-in 0.35s ease-out;
  z-index: 5;
}
.redraw-btn:hover { background: rgba(255, 252, 240, 0.98); }
.redraw-btn:active { transform: translateY(1px); }
```

- [ ] **Step 4: 정적 검사**

Run: `npm test && npm run typecheck && npm run lint`
Expected: 전부 PASS

- [ ] **Step 5: 브라우저에서 수동 확인**

Run: `npm run dev` → 돌림판까지 진행해 확인한다.

1. 돌림판 진입 직후에는 버튼이 **없다** (아직 뽑은 사람이 없음)
2. Enter로 한 명 뽑는 동안(스핀 중)에는 버튼이 숨는다. 번호가 공개되면 우하단에 `다시 뽑기`가 뜬다
3. 버튼을 클릭하면 즉시 돌림판이 다시 돌고, 마지막 한 명만 바뀐다. 먼저 나왔던 번호는 다시 나오지 않는다
4. **버튼 클릭 직후 Enter를 누르면** 재추첨이 아니라 다음 추첨이 진행된다 (포커스가 버튼에 남지 않음)
5. 1차 3명을 채우고 라운드를 넘긴 직후에는 버튼이 사라진다. 2차 첫 번호가 나오면 다시 뜬다
6. R 키도 여전히 같은 동작을 한다

- [ ] **Step 6: 커밋**

```bash
git add src/stage/App.tsx src/data/config.ts src/styles/stage.css
git commit -m "feat: 돌림판 재추첨 버튼 추가"
```

---

### Task 6: 결과 화면 — 라운드별 카드 6장

**Files:**
- Modify: `src/stage/scenes/ResultScene.tsx:19-72`
- Modify: `src/styles/stage.css:636-651` (`.result-card` 치수), `:652-661` (`.card-num`), `.prize-group`/`.prize-cards` 추가

**Interfaces:**
- Consumes: `roundStartOf(round)` (Task 3), `CONFIG.prizeRounds`

- [ ] **Step 1: 카드를 라운드별로 묶어 렌더한다**

`src/stage/scenes/ResultScene.tsx`의 `ResultScene` 함수(19~72줄)를 아래로 교체한다. 상단 `FIREWORKS` 배열과 import는 그대로 두고, import에 `roundStartOf`만 더한다.

```tsx
import { roundStartOf } from '../../state/showMachine'
```

```tsx
export function ResultScene({ state, onRestart }: SceneProps & { onRestart?: () => void }) {
  const count = state.winners.length
  // 카드가 순차로 튀어나오는 리듬(0.22s 간격)에 맞춰 팝, 마지막에 팡파레
  useEffect(() => {
    const timers = Array.from({ length: count }, (_, i) =>
      setTimeout(() => sfx.cardPop(i), i * 220),
    )
    timers.push(setTimeout(() => sfx.celebrate(), count * 220 + 120))
    return () => timers.forEach(clearTimeout)
  }, [count])

  // 선물 라운드별로 묶는다. --i는 전체 순번이라 카드가 왼쪽부터 차례로 튀어나온다.
  const groups = CONFIG.prizeRounds.map((round, r) => {
    const start = roundStartOf(r)
    return {
      label: round.label,
      winners: state.winners.slice(start, start + round.count),
      start,
    }
  })

  return (
    <div className="scene">
      <div className="rays" aria-hidden />
      <Confetti count={120} />
      {FIREWORKS.map((f, i) => (
        <span
          key={i}
          className="firework"
          aria-hidden
          style={{ left: f.x, top: f.y, color: f.c, animationDelay: f.d }}
        />
      ))}
      <div className="sky-layer">
        <SpeechBubble className="result-title">{CONFIG.copy.resultTitle}</SpeechBubble>
      </div>
      <div className="ground-layer tight">
        {groups.map((g) => (
          <div key={g.label} className="prize-group">
            <div className="prize-label">{g.label}</div>
            <div className="prize-cards">
              {g.winners.map((n, i) => (
                <div
                  key={`${n}-${i}`}
                  className="card-stand grounded"
                  style={{ '--i': g.start + i } as CSSProperties}
                >
                  <div className="result-card">
                    <span className="card-rank">{i + 1}</span>
                    <span className="card-num">
                      {n}
                      <span className="result-card-label">번</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="mascot-stand">
          <Mascot size={190} mood="cheer" />
        </div>
      </div>
      {onRestart && (
        <button type="button" className="restart-btn" onClick={onRestart}>
          {CONFIG.copy.restartButton}
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 카드 6장이 들어가도록 치수를 줄이고 그룹 스타일을 추가한다**

`src/styles/stage.css`의 `.result-card`에서 `width: 212px; height: 280px;`를 아래로 바꾼다.

```css
  width: 172px;
  height: 232px;
```

`.card-num`의 `font-size: 6rem;`을 `font-size: 4.6rem;`으로, `.result-card-label`의 `font-size: 2rem;`을 `font-size: 1.5rem;`으로 바꾼다. `.card-rank`의 `width: 46px; height: 46px;`은 `38px`로, 그 안 `font-size: 1.5rem;`은 `1.25rem;`으로 줄인다.

그리고 `.card-stand { … }` 블록 앞에 그룹 스타일을 추가한다.

```css
/* 선물 라운드 묶음 — 1차와 2차를 눈으로 구분되게 띄운다 */
.prize-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.9rem;
}
.prize-label {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--choco);
  background: rgba(255, 246, 221, 0.92);
  border: 3px solid var(--wood);
  border-radius: 999px;
  padding: 0.25rem 1.4rem;
}
.prize-cards {
  display: flex;
  align-items: flex-end;
  gap: 1.4rem;
}
```

- [ ] **Step 3: 정적 검사**

Run: `npm test && npm run typecheck && npm run lint`
Expected: 전부 PASS

- [ ] **Step 4: 브라우저에서 수동 확인**

Run: `npm run dev` → 끝까지 진행해 결과 화면에서 확인한다.

1. `1차 선물` 3장 + `2차 선물` 3장, 총 6장이 한 줄에 들어가고 좌우로 잘리지 않는다
2. 카드가 왼쪽부터 순차로 튀어나오고 팡파레가 마지막에 울린다
3. 순번 배지가 각 그룹 안에서 1·2·3이다
4. 꾸미가 오른쪽에 남아 있고 겹치지 않는다
5. **브라우저 창을 1920×1080으로 맞춰(또는 F로 전체화면) 확인한다.** 좁으면 `.result-card` 치수와 `.prize-cards` gap을 더 줄인다
6. `다시하기` 버튼이 카드와 겹치지 않는다

- [ ] **Step 5: 커밋**

```bash
git add src/stage/scenes/ResultScene.tsx src/styles/stage.css
git commit -m "feat: 결과 화면을 선물 라운드별 6장 구성으로"
```

---

### Task 7: 저장 키 올리기 + 리허설 체크리스트 갱신 + 최종 점검

**Files:**
- Modify: `src/state/persistence.ts:3`
- Modify: `docs/rehearsal-checklist.md:25-46`

- [ ] **Step 1: localStorage 키를 v2로 올린다**

`src/state/persistence.ts`의 3번째 줄을 바꾼다. 리허설 중 저장된 4명 기준 상태가 새 구조로 복구되는 것을 막는다.

```ts
const KEY = 'eid-decibel-game-v2'
```

- [ ] **Step 2: 저장/복구 테스트가 여전히 통과하는지 확인한다**

Run: `npm test`
Expected: PASS (`persistence.test.ts`는 키 이름에 의존하지 않는다. 만약 하드코딩되어 있으면 v2로 함께 고친다)

- [ ] **Step 3: 리허설 체크리스트를 새 흐름으로 갱신한다**

`docs/rehearsal-checklist.md`에서 아래 세 부분을 교체한다.

`- [ ] **입장 인원 조절**` 블록의 마지막 줄:

```markdown
  - 최소 입장 인원: 6명 (1차 3명 + 2차 3명)
```

`- [ ] **데시벨 게임 3단계 (Enter로 진행)**` 블록 전체를 아래로 교체:

```markdown
- [ ] **데시벨 게임 3단계 (시도마다 Enter 2번)** — 문구는 모두 꾸미의 말풍선으로 나옵니다
  - 시도마다 **준비 화면 → (Enter) → 함성**의 두 박자입니다. 준비 화면에서는 게이지가
    바닥에서 미세하게 떨기만 하고 **올라가지 않습니다**. "소리 질러!"를 외치고 관객이
    숨을 들이켠 뒤 Enter를 누르세요.
  - 좌하단 큐 칩이 다음에 무슨 일이 일어나는지 알려줍니다 (`1차 준비` → `1차 함성 시작!`)
  - **1차 시도**: 92dB → "자, 다 같이 소리 질러!" → 종료 후 "오— 좋았어! 근데 더 할 수 있지?"
  - **2차 시도**: 98dB → "이번엔 진짜 크게!" → 종료 후 "앗! 정말 조금 남았어!"
    - 이때부터 **하늘이 절반쯤 노을로 물드는지** 확인
  - **3차 시도**: 104dB → "마지막이야. 준비됐어?" → 돌파 후 "해냈다!! 우리가 해냈어!"
    - **하늘이 완전히 저녁이 되고 주변이 어두워지는지**, 뒷줄에서 답답하지 않은지
    - 돌파 순간 섬광과 함께 낮으로 돌아오는지
  - 진행 중 Enter 연타 시 애니메이션 중복 무시 확인 (busy 플래그 작동)
  - ← 로 준비 화면에 돌아가 같은 시도를 다시 재생할 수 있는지 확인
  - 소리가 커질 때 **나무·꽃이 흔들리고 꾸미가 같이 들썩이는지**
```

`- [ ] **돌림판 추첨 (Roulette)**`과 `- [ ] **결과 화면 (Result)**` 블록을 아래로 교체:

```markdown
- [ ] **돌림판 추첨 (Roulette)** — 3명씩 두 라운드
  - 보드 제목이 `1차 선물`, 빈칸이 3개인지 확인
  - Enter 3번으로 1차 3명 추첨
  - 3명이 찬 뒤 Enter는 **추첨하지 않고** 2차로 넘어감 (보드가 비고 제목이 `2차 선물`)
    - **이 사이에 1차 선물을 전달하세요**
  - Enter 3번으로 2차 3명 추첨. 1차 당첨 번호가 다시 나오지 않는지 확인
  - 우하단 `다시 뽑기` 버튼으로 **현재 라운드의 마지막 당첨자만** 재추첨되는지 확인
    - 라운드를 넘긴 직후에는 버튼이 보이지 않아야 정상 (이전 라운드는 보호됨)
    - 버튼을 누른 뒤 Enter가 다음 추첨으로 정상 동작하는지 확인
  - R 키로도 같은 재추첨이 되는지 확인

- [ ] **결과 화면 (Result)**
  - `1차 선물` 3장 + `2차 선물` 3장, 총 6장이 잘리지 않고 표시되는지 확인
  - 사진 촬영 각도가 불편하지 않은지 확인
```

- [ ] **Step 4: 전체 검사와 빌드**

Run: `npm test && npm run typecheck && npm run lint && npm run build`
Expected: 전부 PASS

- [ ] **Step 5: 처음부터 끝까지 통짜로 한 번 돌려본다**

Run: `npm run dev` → 브라우저에서 아래 순서로 확인한다. 중간에 한 번 새로고침해 복구를 본다.

1. 대기 → ↓로 입장 인원을 6명 밑으로 못 내리는지 확인
2. Enter로 데시벨 인트로 → 시도마다 Enter 2번, 3차 돌파까지
3. Enter로 돌림판 → 1차 3명 → 라운드 전환 → 2차 3명
4. 2차 진행 중 F5 → 같은 지점으로 복구되는지
5. Enter로 결과 → 카드 6장
6. `다시하기` → 대기로 돌아가고 입장 인원이 유지되는지
7. Esc 1.5초 홀드 → 초기화

- [ ] **Step 6: 커밋**

```bash
git add src/state/persistence.ts docs/rehearsal-checklist.md
git commit -m "chore: 저장 키 v2, 리허설 체크리스트 갱신"
```

---

### Task 8: 배포

**Files:** 없음

- [ ] **Step 1: main에 병합하고 푸시한다**

```bash
git checkout main
git merge --no-ff feat/rehearsal-feedback -m "feat: 리허설 피드백 반영 — 함성 수동 시작, 선물 2라운드"
git push origin main
```

- [ ] **Step 2: GitHub Pages 배포를 확인한다**

`https://wogus216.github.io/eid-game/` 에 접속해 새 흐름(준비 화면, 3칸 보드, 재추첨 버튼)이 반영됐는지 확인한다. 배포 반영에 1~2분 걸린다.

**주의:** 배포된 페이지를 처음 열면 이전 버전의 localStorage가 남아 있을 수 있다. `v2`로 키를 올렸으므로 자동으로 무시되지만, 그래도 Esc 1.5초 홀드로 한 번 초기화하고 본행사에 들어간다.
