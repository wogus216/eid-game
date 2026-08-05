import type { CSSProperties } from 'react'
import { CONFIG } from '../../data/config'
import { Mascot } from '../../components/Mascot'
import { Confetti } from '../../components/Confetti'
import type { SceneProps } from '../App'

// 폭죽 링: 위치/색/타이밍 고정 배치 (파스텔 톤)
const FIREWORKS = [
  { x: '12%', y: '22%', c: '#f2b23c', d: '0s' },
  { x: '86%', y: '18%', c: '#f39ab7', d: '0.6s' },
  { x: '8%', y: '52%', c: '#57b8ff', d: '1.1s' },
  { x: '90%', y: '48%', c: '#f2b23c', d: '1.7s' },
  { x: '50%', y: '12%', c: '#f39ab7', d: '2.3s' },
]

export function ResultScene({ state, onRestart }: SceneProps & { onRestart?: () => void }) {
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
        <h1 className="scene-title result-title">{CONFIG.copy.resultTitle}</h1>
      </div>
      <div className="ground-layer tight">
        {state.winners.map((n, i) => (
          <div
            key={`${n}-${i}`}
            className="card-stand grounded"
            style={{ '--i': i } as CSSProperties}
          >
            <div className="result-card">
              {n}
              <span className="result-card-label">번</span>
            </div>
          </div>
        ))}
        <div className="mascot-stand">
          <Mascot size={190} className="cheer" />
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
