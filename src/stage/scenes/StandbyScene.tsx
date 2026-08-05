import { CONFIG } from '../../data/config'
import { Mascot } from '../../components/Mascot'
import { SpeechBubble } from '../../components/SpeechBubble'
import type { SceneProps } from '../App'

export function StandbyScene({ state }: SceneProps) {
  return (
    <div className="scene">
      <div className="sky-layer">
        <SpeechBubble tail="center">{CONFIG.copy.standbyTitle}</SpeechBubble>
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
