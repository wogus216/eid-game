# 참가 화면 데시벨 루프 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 참가자가 `join.html`에서 로그인을 완료한 뒤 "스타트" 버튼을 누르면, 데시벨 숫자가 계속 오르락내리락하고 옆에 꾸미(마스코트)가 함께 반응하는 장식용 화면으로 전환한다.

**Architecture:** `JoinApp`의 상태를 `submitted: boolean`에서 `stage: 'form' | 'success' | 'decibel'` 3단계로 확장한다. 새 순수 애니메이션 훅 `useIdleDecibelLoop`가 시작·종료 개념 없이 20~105dB 범위를 영원히 오르내리는 값을 만들고, `decibel` 단계 화면이 그 값에 따라 큰 숫자와 꾸미 mood(`idle`/`tense`)를 렌더링한다. 무대 쪽 `showMachine`/localStorage와는 연동하지 않는다.

**Tech Stack:** React 19 + TypeScript, Vite, 순수 CSS(애니메이션은 클래스 토글 + 인라인 스타일), Vitest(이번 변경분은 신규 유닛 테스트 없음 — 스펙의 "테스트" 섹션 참조).

## Global Constraints

- 참가 화면(`join.html`/`JoinApp`)은 무대 쪽 `showMachine`/localStorage(`eid-decibel-game-v2`)와 연동하지 않는다 — 스펙 "배경" 섹션.
- 실제 마이크 입력, 목표 dB 판정, 시도 횟수 등 실제 게임 로직은 만들지 않는다 — 스펙 "범위 밖".
- 완료 화면의 기존 카피("OO, 반가워!", "로그인 완료! 이따 EID플랫폼에서 만나자")는 변경하지 않는다 — 스펙 "범위 밖".
- dB 범위는 20~105, mood 임계값은 오를 때 68dB / 내릴 때 62dB 히스테리시스 — 스펙 "화면 구성".
- 무대용 `stage.css`의 게이지·스파크 이펙트는 가져오지 않는다 — 스펙 "스타일".

---

### Task 1: config.ts에 카피 추가

**Files:**
- Modify: `src/data/config.ts` (28번째 줄 `joinButton: '로그인',` 다음)

**Interfaces:**
- Produces: `CONFIG.copy.joinStartButton: string`, `CONFIG.copy.joinDecibelTitle: string` — Task 3에서 그대로 참조한다.

- [ ] **Step 1: `copy` 객체에 두 항목 추가**

`src/data/config.ts`의 `joinButton: '로그인',` 줄 바로 아래에 추가:

```ts
    joinStartButton: '스타트',
    joinDecibelTitle: '얼마나 커질까? 두근두근!',
```

- [ ] **Step 2: 타입체크로 확인**

Run: `npm run typecheck`
Expected: 에러 없이 통과 (아직 아무도 이 항목을 참조하지 않으므로 unused 경고도 없음)

- [ ] **Step 3: Commit**

```bash
git add src/data/config.ts
git commit -m "feat: 참가 화면 데시벨 루프용 카피 추가"
```

---

### Task 2: `useIdleDecibelLoop` 훅 작성

**Files:**
- Create: `src/join/useIdleDecibelLoop.ts`

**Interfaces:**
- Produces: `useIdleDecibelLoop(): number` — 인자 없이 호출하면 20~105 범위의 dB 값을 반환하고, 호출한 컴포넌트가 마운트되어 있는 동안 값이 계속 바뀐다(리렌더를 유발하는 `useState`). Task 3의 `JoinDecibel` 컴포넌트가 이 훅을 사용한다.

기존 `src/stage/useDecibelAnim.ts`와 달리 `attemptKey`/`peakDb`/`running`/`onDone` 인자가 전혀 없다 — 시작도 끝도 없는 순수 장식용 루프이기 때문이다. 유닛 테스트는 만들지 않는다(스펙의 "테스트" 섹션 — `useDecibelAnim`도 테스트가 없다).

- [ ] **Step 1: 훅 구현**

`src/join/useIdleDecibelLoop.ts`:

```ts
import { useEffect, useState } from 'react'

// 시작·종료 없이 영원히 오르내리는 장식용 dB 값.
// 느린 파형(큰 진폭)이 전체 오르내림을 만들고, 빠른 파형(작은 진폭)이
// 값에 질감을 준다 — useDecibelAnim의 지터와 같은 결.
const MIN_DB = 20
const MAX_DB = 105
const CENTER = (MIN_DB + MAX_DB) / 2
const SWING = (MAX_DB - MIN_DB) / 2

export function useIdleDecibelLoop(): number {
  const [db, setDb] = useState(CENTER)

  useEffect(() => {
    let raf = 0
    const tick = (now: number) => {
      const slow = Math.sin(now / 2600)
      const jitter = Math.sin(now / 340) * 4 + Math.sin(now / 95) * 2
      setDb(Math.min(MAX_DB, Math.max(MIN_DB, CENTER + slow * SWING + jitter)))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return db
}
```

- [ ] **Step 2: 타입체크로 확인**

Run: `npm run typecheck`
Expected: 에러 없이 통과 (아직 아무도 import하지 않으므로 unused export 경고도 없음)

- [ ] **Step 3: Commit**

```bash
git add src/join/useIdleDecibelLoop.ts
git commit -m "feat: 참가 화면용 순수 장식 데시벨 루프 훅 추가"
```

---

### Task 3: `JoinApp`을 3단계 상태로 확장하고 데시벨 화면 추가

**Files:**
- Modify: `src/join/JoinApp.tsx` (전체)

**Interfaces:**
- Consumes: `CONFIG.copy.joinStartButton`, `CONFIG.copy.joinDecibelTitle` (Task 1), `useIdleDecibelLoop(): number` (Task 2), 기존 `Mascot` (`size: number`, `mood?: MascotMood`).
- Produces: 없음(최상위 컴포넌트).

mood 임계값은 오를 때 68dB, 내릴 때 62dB로 히스테리시스를 둔다 — 두 임계값 사이를 오갈 때 mood가 떨리지 않게, 현재 mood를 `useState`로 들고 넘을 때만 바꾼다.

- [ ] **Step 1: `JoinApp.tsx` 전체를 3단계 구조로 교체**

`src/join/JoinApp.tsx` 전체를 아래로 교체:

```tsx
import { useState } from 'react'
import { CONFIG } from '../data/config'
import { Mascot } from '../components/Mascot'
import { useIdleDecibelLoop } from './useIdleDecibelLoop'
import '../styles/tokens.css'
import '../styles/base.css'
import '../styles/join.css'

type Stage = 'form' | 'success' | 'decibel'

function JoinDecibel() {
  const db = useIdleDecibelLoop()
  const [tense, setTense] = useState(false)
  if (!tense && db >= 68) setTense(true)
  if (tense && db <= 62) setTense(false)

  return (
    <div className="join join-decibel">
      <h1 className="join-title">{CONFIG.copy.joinDecibelTitle}</h1>
      <div className="decibel-row">
        <Mascot size={140} mood={tense ? 'tense' : 'idle'} />
        <div className="decibel-readout">
          {Math.round(db)}
          <span className="decibel-unit">dB</span>
        </div>
      </div>
    </div>
  )
}

export function JoinApp() {
  const [stage, setStage] = useState<Stage>('form')
  const [name, setName] = useState('')
  const [shake, setShake] = useState(false)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim() === '') {
      setShake(true)
      setTimeout(() => setShake(false), 500)
      return
    }
    setStage('success')
  }

  if (stage === 'decibel') {
    return <JoinDecibel />
  }

  if (stage === 'success') {
    return (
      <div className="join success">
        <Mascot size={180} mood="cheer" />
        <h1 className="join-title">{CONFIG.copy.joinSuccess(name.trim())}</h1>
        <p className="join-sub">{CONFIG.copy.joinWelcome}</p>
        <button type="button" onClick={() => setStage('decibel')}>
          {CONFIG.copy.joinStartButton}
        </button>
      </div>
    )
  }

  return (
    <div className="join">
      <Mascot size={160} mood="wave" />
      <h1 className="join-title">{CONFIG.copy.joinTitle}</h1>
      <form onSubmit={submit} className={shake ? 'shake' : ''}>
        <input
          autoFocus
          value={name}
          maxLength={10}
          placeholder={shake ? CONFIG.copy.joinEmpty : CONFIG.copy.joinPlaceholder}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit">{CONFIG.copy.joinButton}</button>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: 타입체크로 확인**

Run: `npm run typecheck`
Expected: 에러 없이 통과. (`.decibel-row`, `.decibel-readout`, `.join-decibel` 클래스는 Task 4에서 CSS를 추가하기 전까지는 스타일 없이도 렌더링 자체는 성공한다 — TSX에는 문제 없음.)

- [ ] **Step 3: Commit**

```bash
git add src/join/JoinApp.tsx
git commit -m "feat: 참가 화면에 스타트 버튼과 데시벨 루프 화면 추가"
```

---

### Task 4: `join.css`에 데시벨 화면 스타일 추가

**Files:**
- Modify: `src/styles/join.css` (파일 끝에 추가)

**Interfaces:**
- Consumes: Task 3에서 렌더링하는 `.join-decibel`, `.decibel-row`, `.decibel-readout`, `.decibel-unit` 클래스.

- [ ] **Step 1: 스타일 추가**

`src/styles/join.css` 끝에 추가:

```css
.decibel-row {
  display: flex;
  align-items: center;
  gap: 1.4rem;
}
.decibel-readout {
  font-size: 3.2rem;
  font-weight: 900;
  color: var(--choco);
  line-height: 1;
  display: flex;
  align-items: baseline;
  gap: 0.3rem;
}
.decibel-unit {
  font-size: 1.2rem;
  font-weight: 700;
  opacity: 0.7;
}
.mascot-idle { animation: join-idle-float 3s ease-in-out infinite; }
@keyframes join-idle-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
.mascot-tense { animation: join-tense-shake 0.26s ease-in-out infinite; }
@keyframes join-tense-shake {
  0%, 100% { transform: translateX(0) rotate(0deg); }
  25% { transform: translateX(-3px) rotate(-2deg); }
  75% { transform: translateX(3px) rotate(2deg); }
}
@media (prefers-reduced-motion: reduce) {
  .mascot-idle, .mascot-tense { animation: none; }
}
```

- [ ] **Step 2: 개발 서버로 시각 확인**

Run: `npm run dev` (백그라운드로 실행)

브라우저에서 `http://localhost:5173/join.html` 접속 → 이름 입력 → 로그인 → 완료 화면에서 "스타트" 버튼 확인 → 클릭 → 데시벨 숫자가 20~105 사이를 계속 오르내리고, 68dB 이상일 때 꾸미가 떨림(tense), 62dB 이하일 때 둥실둥실(idle)로 바뀌는지 확인한다.

- [ ] **Step 3: Commit**

```bash
git add src/styles/join.css
git commit -m "feat: 참가 화면 데시벨 루프 스타일 추가"
```

---

### Task 5: 전체 검증

**Files:** 없음(검증 전용 태스크)

- [ ] **Step 1: 타입체크 + 린트 + 테스트 전체 실행**

Run: `npm run typecheck && npm run lint && npm test`
Expected: 모두 통과. (`useIdleDecibelLoop`는 스펙상 유닛 테스트를 만들지 않으므로 새 테스트 실패는 없어야 한다 — 기존 `showMachine.test.ts`/`persistence.test.ts`/`draw.test.ts`만 그대로 통과하면 된다.)

- [ ] **Step 2: 빌드로 확인**

Run: `npm run build`
Expected: `join.html` 엔트리(`src/join/main.tsx`)가 에러 없이 빌드된다.

- [ ] **Step 3: 브라우저에서 전체 플로우 재확인**

`npm run preview` 또는 `npm run dev`로 띄운 뒤 `/join.html`에서 이름 입력 → 로그인 → 스타트 → 데시벨 화면까지 전체 플로우를 한 번 더 확인한다. 특히 페이지를 새로고침해도(즉 무대 쪽 상태와 무관하게) 정상 동작하는지 확인한다.
