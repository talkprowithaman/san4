import { useEffect } from 'react'
import Lenis from 'lenis'

// ─────────────────────────────────────────────────────────────────────────────
// useSmoothScroll — Lenis momentum scrolling, desktop only.
//
// Touch devices keep native scroll (syncTouch off + a fine-pointer gate), and
// users with prefers-reduced-motion get native scroll too. This gives the
// landing page that "gliding" inertia feel without degrading mobile — where
// most of our signups happen and where scroll-hijacking hurts most.
// ─────────────────────────────────────────────────────────────────────────────
export function useSmoothScroll() {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const fine    = window.matchMedia('(pointer: fine)').matches
    if (reduced || !fine) return

    const lenis = new Lenis({
      duration: 1.1,
      easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      syncTouch: false,
    })

    let rafId
    const loop = time => { lenis.raf(time); rafId = requestAnimationFrame(loop) }
    rafId = requestAnimationFrame(loop)

    // Smooth-scroll in-page anchor links (#features etc.)
    const onClick = e => {
      const a = e.target.closest('a[href^="#"]')
      if (!a) return
      const href = a.getAttribute('href')
      if (href.length <= 1) return
      const target = document.querySelector(href)
      if (target) { e.preventDefault(); lenis.scrollTo(target, { offset: -64 }) }
    }
    document.addEventListener('click', onClick)

    return () => {
      cancelAnimationFrame(rafId)
      document.removeEventListener('click', onClick)
      lenis.destroy()
    }
  }, [])
}
