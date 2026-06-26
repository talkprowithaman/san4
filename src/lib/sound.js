// ─────────────────────────────────────────────────────────────────────────────
// sound.js — tiny opt-in UI sound layer. Off by default. No audio files: ticks
// are synthesised with Web Audio, so there's nothing to host and nothing to
// autoplay. The AudioContext is created only on the user gesture that enables
// sound (browsers require this), and the preference persists in localStorage.
// ─────────────────────────────────────────────────────────────────────────────
const KEY = 'san4_sound'
let enabled = false
let ctx = null

try { enabled = localStorage.getItem(KEY) === 'on' } catch {}

function ensureCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (AC) ctx = new AC()
  }
  if (ctx && ctx.state === 'suspended') ctx.resume()
  return ctx
}

export function isSoundOn() { return enabled }

export function setSoundOn(val) {
  enabled = val
  try { localStorage.setItem(KEY, val ? 'on' : 'off') } catch {}
  if (val) ensureCtx()  // must be created on the enabling gesture
  window.dispatchEvent(new Event('san4-sound-changed'))
}

// kind: 'select' (click) | 'hover' (quieter, higher) | 'tick'
export function playTick(kind = 'tick') {
  if (!enabled) return
  const c = ensureCtx()
  if (!c) return
  const now  = c.currentTime
  const osc  = c.createOscillator()
  const gain = c.createGain()
  const peak = kind === 'hover' ? 0.025 : 0.05
  const freq = kind === 'select' ? 620 : kind === 'hover' ? 880 : 520
  osc.type = 'sine'
  osc.frequency.setValueAtTime(freq, now)
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(peak, now + 0.005)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12)
  osc.connect(gain).connect(c.destination)
  osc.start(now)
  osc.stop(now + 0.14)
}
