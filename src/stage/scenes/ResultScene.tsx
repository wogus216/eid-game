import { CONFIG } from '../../data/config'
import { Mascot } from '../../components/Mascot'
import { Confetti } from '../../components/Confetti'
import type { SceneProps } from '../App'

export function ResultScene({ state }: SceneProps) {
  return (
    <div className="scene">
      <Confetti />
      <h1 className="scene-title">{CONFIG.copy.resultTitle}</h1>
      <div className="result-numbers">
        {state.winners.map((n, i) => (
          <div key={`${n}-${i}`} className="result-card">
            {n}
            <span className="result-card-label">번</span>
          </div>
        ))}
      </div>
      <Mascot size={200} className="cheer" />
    </div>
  )
}
