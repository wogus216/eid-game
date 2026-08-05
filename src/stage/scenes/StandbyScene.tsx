import { CONFIG } from '../../data/config'
import { Mascot } from '../../components/Mascot'
import type { SceneProps } from '../App'

export function StandbyScene({ state }: SceneProps) {
  return (
    <div className="scene">
      <div className="sky-layer">
        <h1 className="scene-title">{CONFIG.copy.standbyTitle}</h1>
      </div>
      <div className="ground-layer">
        <div className="mascot-stand">
          <Mascot size={260} mood="wave" />
        </div>
      </div>
      <div className="entry-count">{CONFIG.copy.entryCountLabel(state.entryCount)}</div>
    </div>
  )
}
