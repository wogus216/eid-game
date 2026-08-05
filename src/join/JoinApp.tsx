import { useState } from 'react'
import { CONFIG } from '../data/config'
import { Mascot } from '../components/Mascot'
import '../styles/tokens.css'
import '../styles/base.css'
import '../styles/join.css'

export function JoinApp() {
  const [name, setName] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [shake, setShake] = useState(false)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim() === '') {
      setShake(true)
      setTimeout(() => setShake(false), 500)
      return
    }
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="join success">
        <Mascot size={180} mood="cheer" />
        <h1 className="join-title">{CONFIG.copy.joinSuccess(name.trim())}</h1>
        <p className="join-sub">{CONFIG.copy.joinWelcome}</p>
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
