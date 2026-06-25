import { useEffect, useRef } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// RippleCursor — a soft "voice aura" follows the pointer and emits expanding
// ripples as it moves (sound propagating outward). Desktop fine-pointer only;
// the native cursor is kept (no accessibility surprises). Pure transform/opacity
// animation, throttled — negligible cost.
// ─────────────────────────────────────────────────────────────────────────────
export default function RippleCursor() {
  const auraRef = useRef(null)
  const layerRef = useRef(null)

  useEffect(() => {
    const fine    = window.matchMedia('(pointer: fine)').matches
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!fine || reduced) return

    const aura  = auraRef.current
    const layer = layerRef.current
    if (!aura || !layer) return

    let mx = window.innerWidth / 2, my = window.innerHeight / 2
    let ax = mx, ay = my
    let lastRipple = 0
    let lastX = mx, lastY = my
    let rafId

    const onMove = e => { mx = e.clientX; my = e.clientY }
    window.addEventListener('pointermove', onMove, { passive: true })

    const loop = () => {
      // Aura trails the pointer with easing
      ax += (mx - ax) * 0.18
      ay += (my - ay) * 0.18
      aura.style.transform = `translate(${ax}px, ${ay}px) translate(-50%, -50%)`

      // Emit a ripple when moving fast enough, capped to ~12/sec
      const now = performance.now()
      const dist = Math.hypot(mx - lastX, my - lastY)
      if (dist > 6 && now - lastRipple > 80) {
        lastRipple = now
        lastX = mx; lastY = my
        const r = document.createElement('span')
        r.className = 'vk-ripple'
        r.style.left = `${mx}px`
        r.style.top  = `${my}px`
        layer.appendChild(r)
        r.addEventListener('animationend', () => r.remove())
      }
      rafId = requestAnimationFrame(loop)
    }
    rafId = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('pointermove', onMove)
    }
  }, [])

  return (
    <div ref={layerRef} className="vk-cursor-layer" aria-hidden="true">
      <div ref={auraRef} className="vk-cursor-aura" />
    </div>
  )
}
