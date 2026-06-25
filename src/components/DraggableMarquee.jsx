import { useEffect, useRef } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// DraggableMarquee — an auto-scrolling row of pills you can grab and fling.
// rAF-driven translateX (not CSS animation) so manual drag and auto-scroll
// share one transform. On release it keeps the throw's velocity, decays it,
// then hands back to auto-scroll. Items are duplicated once; offset wraps at
// half-width for a seamless loop. touch-action:pan-y keeps vertical page
// scroll working on mobile.
// ─────────────────────────────────────────────────────────────────────────────
export default function DraggableMarquee({ items, accent = '#A78BFA', direction = 'left', speed = 40 }) {
  const wrapRef  = useRef(null)
  const trackRef = useRef(null)
  const s = useRef({ offset: 0, half: 0, dragging: false, lastX: 0, vel: 0, settle: 0 })

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const measure = () => { s.current.half = track.scrollWidth / 2 }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(track)

    const dir = direction === 'left' ? -1 : 1
    let raf, last = performance.now()
    const loop = now => {
      const dt = Math.min((now - last) / 1000, 0.05); last = now
      const st = s.current
      if (st.dragging) {
        // position set directly in onMove
      } else if (Math.abs(st.vel) > 4) {
        st.offset += st.vel * dt
        st.vel *= 0.94               // inertia decay after a throw
      } else {
        st.offset += dir * speed * dt // auto-scroll
      }
      if (st.half > 0) {
        if (st.offset <= -st.half) st.offset += st.half
        if (st.offset > 0)         st.offset -= st.half
      }
      track.style.transform = `translate3d(${st.offset}px,0,0)`
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(raf); ro.disconnect() }
  }, [direction, speed])

  const onDown = e => {
    const st = s.current
    st.dragging = true; st.lastX = e.clientX; st.vel = 0
    wrapRef.current?.setPointerCapture?.(e.pointerId)
    if (wrapRef.current) wrapRef.current.style.cursor = 'grabbing'
  }
  const onMove = e => {
    const st = s.current
    if (!st.dragging) return
    const dx = e.clientX - st.lastX
    st.lastX = e.clientX
    st.offset += dx
    st.vel = dx * 55               // carry the throw velocity
  }
  const onUp = e => {
    const st = s.current
    if (!st.dragging) return
    st.dragging = false
    wrapRef.current?.releasePointerCapture?.(e.pointerId)
    if (wrapRef.current) wrapRef.current.style.cursor = 'grab'
  }

  return (
    <div
      ref={wrapRef}
      className="ticker-wrap drag-marquee"
      style={{ height: 44, cursor: 'grab', touchAction: 'pan-y' }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      <div ref={trackRef} className="flex gap-3 w-max" style={{ willChange: 'transform' }}>
        {[...items, ...items].map((label, i) => (
          <div key={`${label}-${i}`}
            className="shrink-0 text-sm font-medium px-5 py-2 whitespace-nowrap select-none"
            style={{
              background: `${accent}0f`,
              border: `1px solid ${accent}33`,
              borderRadius: 100,
              color: accent,
              pointerEvents: 'none',   // let drag flow to the wrap
            }}>
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}
