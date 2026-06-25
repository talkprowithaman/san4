import { useState, useEffect } from 'react'
import VakMascot from './VakMascot'

// ─────────────────────────────────────────────────────────────────────────────
// IntroReveal — a sub-1.3s branded reveal on the first landing visit of a
// session. Vak fades in over a drawing "voice equalizer", a counter runs to
// 100%, then the curtain lifts to the hero. Skippable (tap anywhere), shown
// once per session (sessionStorage), and skipped entirely under reduced-motion.
//
// Phase is seeded synchronously so there's no flash of the hero before the
// overlay paints.
// ─────────────────────────────────────────────────────────────────────────────
export default function IntroReveal() {
  const [phase, setPhase] = useState(() => {
    try {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (reduced) return 'done'
      if (sessionStorage.getItem('san4_intro_seen') === '1') return 'done'
    } catch {}
    return 'playing'
  })
  const [pct, setPct] = useState(0)

  useEffect(() => {
    if (phase !== 'playing') return
    try { sessionStorage.setItem('san4_intro_seen', '1') } catch {}
    const start = performance.now()
    const DUR = 1050
    let raf
    const tick = now => {
      const p = Math.min((now - start) / DUR, 1)
      setPct(Math.round(p * 100))
      if (p < 1) raf = requestAnimationFrame(tick)
      else setTimeout(() => setPhase('exit'), 130)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [phase])

  useEffect(() => {
    if (phase !== 'exit') return
    const t = setTimeout(() => setPhase('done'), 650)
    return () => clearTimeout(t)
  }, [phase])

  if (phase === 'done') return null

  const skip = () => setPhase('exit')

  return (
    <div
      className={`intro-reveal${phase === 'exit' ? ' intro-exit' : ''}`}
      onClick={skip}
      role="presentation"
    >
      <div className="intro-inner">
        <div className="animate-float">
          <VakMascot level={5} size={120} />
        </div>

        {/* Drawing equalizer */}
        <div className="intro-eq" aria-hidden="true">
          {[0,1,2,3,4,5,6].map(i => (
            <span key={i} style={{ animationDelay: `${i * 0.08}s` }} />
          ))}
        </div>

        <div className="intro-word">
          San<span style={{ color: '#7B5EA7' }}>4</span>
        </div>

        {/* Progress */}
        <div className="intro-track">
          <div className="intro-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="intro-pct">{pct}%</div>
      </div>

      <div className="intro-skip">tap to skip</div>
    </div>
  )
}
