import { useEffect } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// useParallax — subtle scroll-driven depth. Any element with data-parallax="F"
// gets a translateY proportional to its distance from the viewport centre, so
// it drifts at a slightly different rate than the page. rAF-throttled, relative
// (bounded) offsets, and disabled under reduced-motion. Only put it on elements
// that don't already carry a CSS transform, to avoid fighting animations.
// ─────────────────────────────────────────────────────────────────────────────
export function useParallax() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const els = [...document.querySelectorAll('[data-parallax]')]
      .map(el => ({ el, f: parseFloat(el.dataset.parallax) || 0.06 }))
    if (!els.length) return

    let raf = null, ticking = false
    const update = () => {
      const vh = window.innerHeight
      for (const o of els) {
        const rect = o.el.getBoundingClientRect()
        const delta = (rect.top + rect.height / 2) - vh / 2
        o.el.style.transform = `translate3d(0, ${(delta * o.f).toFixed(1)}px, 0)`
      }
      ticking = false
    }
    const onScroll = () => { if (!ticking) { ticking = true; raf = requestAnimationFrame(update) } }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])
}
