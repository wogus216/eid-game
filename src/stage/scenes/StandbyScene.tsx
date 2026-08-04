import { CONFIG } from '../../data/config'
import { Mascot } from '../../components/Mascot'
import type { SceneProps } from '../App'

export function StandbyScene({ state }: SceneProps) {
  return (
    <div className="scene">
      <Mascot size={280} />
      <h1 className="scene-title">{CONFIG.copy.standbyTitle}</h1>
      <div className="entry-count">입장 {state.entryCount}명</div>
    </div>
  )
}
