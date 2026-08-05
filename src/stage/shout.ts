// 함성 세기를 세계 전체에 흘려보내는 통로.
// React state로 올리면 매 프레임 전체 리렌더가 일어나므로,
// :root의 CSS 변수를 직접 갱신하고 반응은 CSS에 맡긴다.

let quakeTimer: ReturnType<typeof setTimeout> | null = null
let flashTimer: ReturnType<typeof setTimeout> | null = null

/** level 0..1 — 나무·꽃의 흔들림 폭과 화면 진동이 이 값에 비례한다. */
export function setShout(level: number) {
  if (typeof document === 'undefined') return
  const v = Math.max(0, Math.min(1, level))
  const root = document.documentElement
  root.style.setProperty('--shout', String(v))
  // 값이 0에 가까우면 애니메이션 자체를 꺼서 유휴 상태에서 낭비하지 않는다
  root.classList.toggle('shouting', v > 0.02)
}

/** 돌파 순간 — 세계가 한 번 크게 휜다. */
/**
 * 시도가 거듭될수록 세계가 조여든다. level 0..1 —
 * 하늘이 노을로 물들고 주변이 어두워져 게이지에 시선이 모인다.
 */
export function setTension(level: number) {
  if (typeof document === 'undefined') return
  const v = Math.max(0, Math.min(1, level))
  document.documentElement.style.setProperty('--tension', String(v))
}

/** 돌파 — 조여든 세계가 한꺼번에 밝아진다. */
export function flash(ms = 800) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (flashTimer) clearTimeout(flashTimer)
  root.classList.remove('flash')
  void root.offsetWidth
  root.classList.add('flash')
  flashTimer = setTimeout(() => {
    root.classList.remove('flash')
    flashTimer = null
  }, ms)
}

/** 개별 요소의 지연(최대 0.7s) + 휨 애니메이션(약 1.4s)을 모두 덮는 길이. */
export function quake(ms = 2400) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (quakeTimer) clearTimeout(quakeTimer)
  root.classList.remove('quake')
  // 클래스를 다시 붙여 애니메이션을 처음부터 재생시킨다
  void root.offsetWidth
  root.classList.add('quake')
  quakeTimer = setTimeout(() => {
    root.classList.remove('quake')
    quakeTimer = null
  }, ms)
}
