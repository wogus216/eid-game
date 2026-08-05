// 지평선 원경 — 먼 언덕과 나무 실루엣. 대기원근으로 채도를 낮춰
// 근경(잔디 위 오브젝트)과 거리를 벌린다.
const TREES = [
  { x: 70, s: 0.86, blossom: false },
  { x: 200, s: 1.0, blossom: true },
  { x: 330, s: 0.78, blossom: false },
  { x: 470, s: 0.92, blossom: false },
  { x: 610, s: 0.82, blossom: true },
  { x: 760, s: 1.04, blossom: false },
  { x: 910, s: 0.8, blossom: false },
  { x: 1040, s: 0.94, blossom: true },
  { x: 1190, s: 0.84, blossom: false },
  { x: 1330, s: 1.0, blossom: false },
  { x: 1470, s: 0.8, blossom: true },
]

export function Scenery() {
  return (
    <svg
      className="scenery"
      viewBox="0 0 1600 240"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden
    >
      {/* 먼 언덕 2겹 — 대기원근으로 하늘색이 섞인 옅은 톤 */}
      <path
        d="M0 240 L0 168 Q180 118 380 156 Q560 190 760 142 Q980 92 1200 148 Q1400 196 1600 150 L1600 240 Z"
        fill="#cfe7cb"
      />
      <path
        d="M0 240 L0 196 Q220 160 420 192 Q640 226 860 186 Q1080 146 1300 190 Q1460 220 1600 194 L1600 240 Z"
        fill="#bcdfb2"
      />
      {TREES.map((t, i) => {
        const canopy = t.blossom ? '#efd3dc' : '#aad3a1'
        const canopyLit = t.blossom ? '#f7e3ea' : '#bbdfb2'
        return (
          <g key={i} transform={`translate(${t.x} 232) scale(${t.s * 0.82})`}>
            <rect x="-7" y="-38" width="14" height="40" rx="6" fill="#bcae9c" />
            <circle cx="-24" cy="-50" r="24" fill={canopy} />
            <circle cx="24" cy="-50" r="24" fill={canopy} />
            <circle cx="0" cy="-66" r="30" fill={canopyLit} />
          </g>
        )
      })}
    </svg>
  )
}
