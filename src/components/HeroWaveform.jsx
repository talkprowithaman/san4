import { useEffect, useRef } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// HeroWaveform — the living centrepiece. Layered sine waves flow across the
// hero like a voice spectrum, in the San4 gradient (purple → teal → gold).
// The pointer bends them: amplitude swells near the cursor, phase shifts with
// cursor X. Single rAF loop, DPR-capped, pauses when off-screen / tab hidden,
// and renders a single static frame under prefers-reduced-motion.
//
// 2D canvas (not WebGL) — keeps the "alive" feel at near-zero perf cost, which
// matters far more than fidelity for a conversion page on mid-range mobile.
// ─────────────────────────────────────────────────────────────────────────────

const WAVES = [
  { color: '#A78BFA', amp: 26, freq: 1.4, speed: 0.6, yOff: -8,  width: 2.0, alpha: 0.55 },
  { color: '#00C49A', amp: 34, freq: 1.0, speed: 0.9, yOff: 6,   width: 2.4, alpha: 0.5  },
  { color: '#F59E0B', amp: 20, freq: 2.1, speed: 1.3, yOff: 18,  width: 1.6, alpha: 0.4  },
]

export default function HeroWaveform() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let W = 0, H = 0
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    // Pointer influence (normalised 0..1), eased
    let px = 0.5, py = 0.5, tx = 0.5, ty = 0.5

    function resize() {
      const rect = canvas.getBoundingClientRect()
      W = rect.width; H = rect.height
      canvas.width  = Math.floor(W * dpr)
      canvas.height = Math.floor(H * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    function onMove(e) {
      const rect = canvas.getBoundingClientRect()
      tx = (e.clientX - rect.left) / rect.width
      ty = (e.clientY - rect.top) / rect.height
    }
    window.addEventListener('pointermove', onMove, { passive: true })

    function drawFrame(t) {
      ctx.clearRect(0, 0, W, H)
      px += (tx - px) * 0.06
      py += (ty - py) * 0.06
      const midY = H * 0.62

      ctx.globalCompositeOperation = 'lighter'
      for (const w of WAVES) {
        ctx.beginPath()
        ctx.lineWidth = w.width
        ctx.strokeStyle = w.color
        ctx.globalAlpha = w.alpha
        const phase = t * 0.001 * w.speed + px * 6
        const step = 6
        for (let x = -step; x <= W + step; x += step) {
          const nx = x / W
          // Amplitude swells toward the pointer's X, and with pointer Y overall
          const prox = 1 - Math.min(1, Math.abs(nx - px) * 1.8)
          const amp = w.amp * (0.55 + 0.7 * prox) * (0.7 + py * 0.6)
          const y = midY + w.yOff
            + Math.sin(nx * Math.PI * 2 * w.freq + phase) * amp
            + Math.sin(nx * Math.PI * 2 * (w.freq * 2.3) + phase * 1.7) * amp * 0.25
          if (x === -step) ctx.moveTo(x, y); else ctx.lineTo(x, y)
        }
        ctx.stroke()
      }
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
    }

    let rafId = null
    let running = true
    function loop(t) {
      if (!running) return
      drawFrame(t)
      rafId = requestAnimationFrame(loop)
    }

    if (reduced) {
      drawFrame(0) // single static frame
    } else {
      rafId = requestAnimationFrame(loop)
    }

    // Pause when the hero scrolls off-screen or the tab is hidden
    const io = new IntersectionObserver(([entry]) => {
      if (reduced) return
      if (entry.isIntersecting && !running) { running = true; rafId = requestAnimationFrame(loop) }
      else if (!entry.isIntersecting && running) { running = false; cancelAnimationFrame(rafId) }
    }, { threshold: 0 })
    io.observe(canvas)

    function onVisibility() {
      if (reduced) return
      if (document.hidden) { running = false; cancelAnimationFrame(rafId) }
      else if (!running)   { running = true; rafId = requestAnimationFrame(loop) }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      running = false
      cancelAnimationFrame(rafId)
      ro.disconnect()
      io.disconnect()
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return <canvas ref={canvasRef} className="hero-waveform" aria-hidden="true" />
}
