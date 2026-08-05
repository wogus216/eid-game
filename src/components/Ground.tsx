// 지면 — 원근이 적용된 잔디 텍스처와 전경 프레이밍.
// 밴드는 아래(가까움)로 갈수록 삼각형이 커지고 진해진다. 각 밴드 상단을
// 페이드시켜 크기 전환의 이음매를 감춘다.
const BANDS = [
  { top: 0, height: 28, size: 34, opacity: 0.45 },
  { top: 18, height: 32, size: 50, opacity: 0.58 },
  { top: 42, height: 34, size: 70, opacity: 0.7 },
  { top: 70, height: 32, size: 96, opacity: 0.82 },
]

// 전경은 자연스러워야 하므로 간격·크기·높이를 일부러 불규칙하게 흩뿌린다.
// y가 클수록(=화면 아래) 가까우므로 크게, 작을수록 멀리 있어 작다.
const TUFTS = [
  { x: 40, y: 252, s: 1.35 },
  { x: 175, y: 232, s: 0.72 },
  { x: 232, y: 244, s: 1.0 },
  { x: 470, y: 226, s: 0.62 },
  { x: 596, y: 256, s: 1.42 },
  { x: 742, y: 236, s: 0.86 },
  { x: 900, y: 228, s: 0.66 },
  { x: 1044, y: 250, s: 1.22 },
  { x: 1096, y: 234, s: 0.8 },
  { x: 1288, y: 258, s: 1.45 },
  { x: 1452, y: 230, s: 0.7 },
  { x: 1566, y: 246, s: 1.08 },
]

const FLOWERS = [
  { x: 108, y: 236, s: 1.28, c: '#ff9ab5' },
  { x: 300, y: 196, s: 0.62, c: '#fff0f4' },
  { x: 356, y: 250, s: 1.42, c: '#ffd166' },
  { x: 528, y: 204, s: 0.7, c: '#ff9ab5' },
  { x: 680, y: 244, s: 1.2, c: '#fff0f4' },
  { x: 812, y: 192, s: 0.58, c: '#ffd166' },
  { x: 968, y: 258, s: 1.5, c: '#ff9ab5' },
  { x: 1160, y: 200, s: 0.66, c: '#fff0f4' },
  { x: 1232, y: 240, s: 1.15, c: '#ffd166' },
  { x: 1404, y: 254, s: 1.36, c: '#fff0f4' },
  { x: 1528, y: 198, s: 0.64, c: '#ff9ab5' },
]

// 배치(translate/scale)는 바깥 g가, 흔들림은 안쪽 g가 맡는다.
// SVG에서 CSS transform은 transform 속성을 덮어쓰므로 반드시 분리해야 한다.
function swayStyle(i: number) {
  return { animationDelay: `${(i % 5) * 0.17}s`, animationDuration: `${1.15 + (i % 3) * 0.3}s` }
}

function Tuft({ x, y, s, i }: { x: number; y: number; s: number; i: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g className="sway-item" style={swayStyle(i)} stroke="#4e9b3b" strokeWidth="9" fill="none" strokeLinecap="round">
        <path d="M0 0 Q -8 -32 -26 -54" />
        <path d="M0 0 Q -3 -40 -10 -72" stroke="#5cae46" />
        <path d="M0 0 Q 4 -44 7 -78" />
        <path d="M0 0 Q 11 -36 26 -58" stroke="#5cae46" />
      </g>
    </g>
  )
}

function Flower({ x, y, s, c, i }: { x: number; y: number; s: number; c: string; i: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g className="sway-item" style={swayStyle(i + 2)}>
        <path d="M0 40 L0 -34" stroke="#4e9b3b" strokeWidth="7" strokeLinecap="round" fill="none" />
        {[0, 72, 144, 216, 288].map((a) => (
          <ellipse key={a} cx="0" cy="-50" rx="10" ry="14" fill={c} transform={`rotate(${a} 0 -36)`} />
        ))}
        <circle cx="0" cy="-36" r="8" fill="#ffd166" />
      </g>
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
          <Tuft key={i} {...t} i={i} />
        ))}
        {FLOWERS.map((f, i) => (
          <Flower key={i} {...f} i={i} />
        ))}
      </svg>
    </div>
  )
}
