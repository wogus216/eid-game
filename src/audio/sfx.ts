// 효과음 — 전부 코드로 합성한다(음원 파일 없음 → 라이선스 문제 없음,
// 오프라인 동작, 로딩 없음). 브라우저 자동재생 정책 때문에 AudioContext는
// 첫 키 입력(unlock) 전까지 소리를 내지 않는다.

type WindowWithWebkit = Window & { webkitAudioContext?: typeof AudioContext }

let ctx: AudioContext | null = null
let master: GainNode | null = null
let muted = false

const MASTER_GAIN = 0.32

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as WindowWithWebkit).webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
    master = ctx.createGain()
    master.gain.value = muted ? 0 : MASTER_GAIN
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return muted ? null : ctx
}

/** freq에서 시작해 (slideTo가 있으면) 미끄러지는 한 음. */
function tone(
  freq: number,
  dur: number,
  opts: { type?: OscillatorType; gain?: number; slideTo?: number; delay?: number } = {},
) {
  const c = ac()
  if (!c || !master) return
  const { type = 'triangle', gain = 0.5, slideTo, delay = 0 } = opts
  const t0 = c.currentTime + delay
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(slideTo, 1), t0 + dur)
  // 클릭음 방지를 위해 0에서 올렸다가 0으로 내린다
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain, t0 + Math.min(0.02, dur * 0.2))
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(g).connect(master)
  osc.start(t0)
  osc.stop(t0 + dur + 0.05)
}

function noiseBuffer(c: AudioContext, dur: number) {
  const buf = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * dur)), c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  return buf
}

function noise(
  dur: number,
  opts: { gain?: number; freq?: number; q?: number; type?: BiquadFilterType; delay?: number } = {},
) {
  const c = ac()
  if (!c || !master) return
  const { gain = 0.4, freq = 1400, q = 1, type = 'bandpass', delay = 0 } = opts
  const t0 = c.currentTime + delay
  const src = c.createBufferSource()
  src.buffer = noiseBuffer(c, dur)
  const filter = c.createBiquadFilter()
  filter.type = type
  filter.frequency.value = freq
  filter.Q.value = q
  const g = c.createGain()
  g.gain.setValueAtTime(gain, t0)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  src.connect(filter).connect(g).connect(master)
  src.start(t0)
  src.stop(t0 + dur + 0.05)
}

// ── 지속음: 함성이 커지는 느낌 (필터 노이즈 + 옅은 톤) ──────────────
let rise: { noiseGain: GainNode; toneOsc: OscillatorNode; toneGain: GainNode; filter: BiquadFilterNode } | null = null

function riseStart() {
  const c = ac()
  if (!c || !master || rise) return
  const src = c.createBufferSource()
  src.buffer = noiseBuffer(c, 2)
  src.loop = true
  const filter = c.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 420
  const noiseGain = c.createGain()
  noiseGain.gain.value = 0.0001
  src.connect(filter).connect(noiseGain).connect(master)
  src.start()

  const toneOsc = c.createOscillator()
  toneOsc.type = 'sine'
  toneOsc.frequency.value = 180
  const toneGain = c.createGain()
  toneGain.gain.value = 0.0001
  toneOsc.connect(toneGain).connect(master)
  toneOsc.start()

  rise = { noiseGain, toneOsc, toneGain, filter }
}

/** level 0..1 — 게이지 값에 맞춰 함성 크기와 음높이를 올린다. */
function riseLevel(level: number) {
  const c = ctx
  if (!c || !rise) return
  const v = Math.max(0, Math.min(1, level))
  const t = c.currentTime
  rise.noiseGain.gain.setTargetAtTime(0.0001 + v * v * 0.5, t, 0.06)
  rise.filter.frequency.setTargetAtTime(360 + v * 1500, t, 0.06)
  rise.toneGain.gain.setTargetAtTime(0.0001 + v * v * 0.1, t, 0.06)
  rise.toneOsc.frequency.setTargetAtTime(150 + v * 190, t, 0.08)
}

function riseStop() {
  const c = ctx
  if (!c || !rise) return
  const { noiseGain, toneGain, toneOsc } = rise
  const t = c.currentTime
  noiseGain.gain.setTargetAtTime(0.0001, t, 0.05)
  toneGain.gain.setTargetAtTime(0.0001, t, 0.05)
  try {
    toneOsc.stop(t + 0.5)
  } catch {
    /* 이미 정지된 경우 무시 */
  }
  rise = null
}

// ── 개별 효과음 ────────────────────────────────────────────────
const sfx = {
  /** 첫 키 입력에서 호출 — 자동재생 정책 해제 */
  unlock() {
    ac()
  },

  toggleMute(): boolean {
    muted = !muted
    if (master && ctx) master.gain.setTargetAtTime(muted ? 0 : MASTER_GAIN, ctx.currentTime, 0.02)
    return muted
  },

  /** 돌림판 틱 — 나무 래칫에 걸리는 소리 */
  tick() {
    noise(0.035, { gain: 0.28, freq: 2200, q: 2.4 })
    tone(880, 0.04, { type: 'square', gain: 0.09 })
  },

  /** 시도 실패 — 아쉽게 내려가는 소리 */
  fail() {
    tone(392, 0.5, { type: 'triangle', gain: 0.3, slideTo: 175 })
    tone(196, 0.55, { type: 'sine', gain: 0.22, slideTo: 98 })
    noise(0.3, { gain: 0.12, freq: 500, q: 0.7, type: 'lowpass', delay: 0.02 })
  },

  /** 목표 돌파 — 저음 폭발 + 상승 휘슬 + 장3화음 아르페지오 */
  breakthrough() {
    noise(0.7, { gain: 0.5, freq: 220, q: 0.6, type: 'lowpass' })
    noise(0.35, { gain: 0.3, freq: 3200, q: 0.8 })
    tone(70, 0.75, { type: 'sine', gain: 0.55, slideTo: 42 })
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5] // C5 E5 G5 C6 E6
    notes.forEach((f, i) => {
      tone(f, 0.55, { type: 'triangle', gain: 0.34, delay: 0.06 + i * 0.075 })
    })
  },

  /** 당첨 번호 공개 — 밝은 두 음 챠임 */
  reveal() {
    tone(783.99, 0.28, { type: 'triangle', gain: 0.34 })
    tone(1174.66, 0.45, { type: 'triangle', gain: 0.3, delay: 0.09 })
    noise(0.25, { gain: 0.14, freq: 4200, q: 1.2, delay: 0.02 })
  },

  /** 결과 화면 — 축하 팡파레 */
  celebrate() {
    const notes = [523.25, 659.25, 783.99, 1046.5]
    notes.forEach((f, i) => tone(f, 0.4, { type: 'triangle', gain: 0.3, delay: i * 0.11 }))
    tone(1046.5, 0.9, { type: 'triangle', gain: 0.26, delay: 0.46 })
    tone(1567.98, 0.9, { type: 'sine', gain: 0.16, delay: 0.46 })
    noise(0.5, { gain: 0.2, freq: 3600, q: 0.9, delay: 0.44 })
  },

  /** 카드 한 장 등장 */
  cardPop(index: number) {
    const scale = [523.25, 587.33, 659.25, 783.99]
    tone(scale[index % scale.length], 0.22, { type: 'triangle', gain: 0.3 })
  },

  riseStart,
  riseLevel,
  riseStop,
}

export { sfx }
