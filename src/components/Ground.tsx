// 지면 — 원근이 적용된 잔디 텍스처와 전경 프레이밍.
// 밴드는 아래(가까움)로 갈수록 삼각형이 커지고 진해진다. 각 밴드 상단을
// 페이드시켜 크기 전환의 이음매를 감춘다.
const BANDS = [
  { top: 0, height: 28, size: 34, opacity: 0.45 },
  { top: 18, height: 32, size: 50, opacity: 0.58 },
  { top: 42, height: 34, size: 70, opacity: 0.7 },
  { top: 70, height: 32, size: 96, opacity: 0.82 },
]

const TUFTS = [
  { x: 60, s: 1.0 },
  { x: 250, s: 0.78 },
  { x: 430, s: 1.12 },
  { x: 700, s: 0.86 },
  { x: 960, s: 1.05 },
  { x: 1180, s: 0.8 },
  { x: 1400, s: 1.15 },
  { x: 1550, s: 0.9 },
]

const FLOWERS = [
  { x: 150, y: 214, s: 1.0, c: '#ff9ab5' },
  { x: 340, y: 226, s: 1.2, c: '#fff0f4' },
  { x: 560, y: 208, s: 0.9, c: '#ffd166' },
  { x: 840, y: 224, s: 1.15, c: '#ff9ab5' },
  { x: 1080, y: 210, s: 0.95, c: '#fff0f4' },
  { x: 1300, y: 228, s: 1.1, c: '#ffd166' },
  { x: 1500, y: 212, s: 0.88, c: '#ff9ab5' },
]

function Tuft({ x, s }: { x: number; s: number }) {
  return (
    <g transform={`translate(${x} 236) scale(${s})`} stroke="#4e9b3b" strokeWidth="9" fill="none" strokeLinecap="round">
      <path d="M0 0 Q -8 -32 -26 -54" />
      <path d="M0 0 Q -3 -40 -10 -72" stroke="#5cae46" />
      <path d="M0 0 Q 4 -44 7 -78" />
      <path d="M0 0 Q 11 -36 26 -58" stroke="#5cae46" />
    </g>
  )
}

function Flower({ x, y, s, c }: { x: number; y: number; s: number; c: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 40 L0 -34" stroke="#4e9b3b" strokeWidth="7" strokeLinecap="round" fill="none" />
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx="0" cy="-50" rx="10" ry="14" fill={c} transform={`rotate(${a} 0 -36)`} />
      ))}
      <circle cx="0" cy="-36" r="8" fill="#ffd166" />
    </g>
  )
}

export function Ground() {
  return (
    <div className="ground-plane" aria-hidden>
      {BANDS.map((b, i) => (
        <span
          key={i}
          style={{
            top: `${b.top}%`,
            height: `${b.height}%`,
            backgroundSize: `${b.size}px ${b.size}px`,
            opacity: b.opacity,
          }}
        />
      ))}
      <svg className="foreground" viewBox="0 0 1600 250" preserveAspectRatio="xMidYMax slice">
        {TUFTS.map((t, i) => (
          <Tuft key={i} {...t} />
        ))}
        {FLOWERS.map((f, i) => (
          <Flower key={i} {...f} />
        ))}
      </svg>
    </div>
  )
}
