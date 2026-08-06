import { useState } from 'react'
import { CONFIG } from '../data/config'
import { Mascot } from '../components/Mascot'
import { useIdleDecibelLoop } from './useIdleDecibelLoop'
import '../styles/tokens.css'
import '../styles/base.css'
import '../styles/join.css'

type Stage = 'form' | 'success' | 'decibel'

function JoinDecibel() {
  const db = useIdleDecibelLoop()
  const [tense, setTense] = useState(false)
  if (!tense && db >= 68) setTense(true)
  if (tense && db <= 62) setTense(false)

  return (
    <div className="join join-decibel">
      <h1 className="join-title">{CONFIG.copy.joinDecibelTitle}</h1>
      <div className="decibel-row">
        <Mascot size={140} mood={tense ? 'tense' : 'idle'} />
        <div className="decibel-readout">
          {Math.round(db)}
          <span className="decibel-unit">dB</span>
        </div>
      </div>
    </div>
  )
}

export function JoinApp() {
  const [stage, setStage] = useState<Stage>('form')
  const [name, setName] = useState('')
  const [shake, setShake] = useState(false)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim() === '') {
      setShake(true)
      setTimeout(() => setShake(false), 500)
      return
    }
    setStage('success')
  }

  if (stage === 'decibel') {
    return <JoinDecibel />
  }

  if (stage === 'success') {
    return (
      <div className="join success">
        <Mascot size={180} mood="cheer" />
        <h1 className="join-title">{CONFIG.copy.joinSuccess(name.trim())}</h1>
        <p className="join-sub">{CONFIG.copy.joinWelcome}</p>
        <button type="button" onClick={() => setStage('decibel')}>
          {CONFIG.copy.joinStartButton}
        </button>
      </div>
    )
  }

  return (
    <div className="join">
      <Mascot size={160} mood="wave" />
      <h1 className="join-title">{CONFIG.copy.joinTitle}</h1>
      <form onSubmit={submit} className={shake ? 'shake' : ''}>
        <input
          autoFocus
          value={name}
          maxLength={10}
          placeholder={shake ? CONFIG.copy.joinEmpty : CONFIG.copy.joinPlaceholder}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit">{CONFIG.copy.joinButton}</button>
      </form>
    </div>
  )
}
