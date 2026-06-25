import { useState, useEffect } from 'react'
import { isSoundOn, setSoundOn, playTick } from '../lib/sound'

// Floating, unobtrusive sound toggle. Off by default; persists choice.
export default function SoundToggle() {
  const [on, setOn] = useState(isSoundOn())

  useEffect(() => {
    const sync = () => setOn(isSoundOn())
    window.addEventListener('san4-sound-changed', sync)
    return () => window.removeEventListener('san4-sound-changed', sync)
  }, [])

  function toggle() {
    const next = !on
    setSoundOn(next)
    setOn(next)
    if (next) playTick('select')
  }

  return (
    <button
      onClick={toggle}
      aria-label={on ? 'Mute interface sounds' : 'Enable interface sounds'}
      className="fixed bottom-5 right-5 z-[80] flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold transition-all hover:opacity-90"
      style={{
        background: on ? 'rgba(139,92,246,0.18)' : 'rgba(8,14,26,0.8)',
        border: `1px solid ${on ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.12)'}`,
        color: on ? '#A78BFA' : 'rgba(255,255,255,0.5)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <span>{on ? '🔊' : '🔇'}</span>
      <span className="hidden sm:inline">Sound {on ? 'on' : 'off'}</span>
    </button>
  )
}
