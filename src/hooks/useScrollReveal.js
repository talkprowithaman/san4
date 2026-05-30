import { useEffect } from 'react'

/**
 * Global scroll-reveal — observes every .reveal element and adds .in-view
 * when it enters the viewport. Call this once at the top of each page component.
 */
export function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal:not(.in-view)')
    if (!els.length) return

    const obs = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('in-view')
          obs.unobserve(e.target)
        }
      }),
      { threshold: 0.07, rootMargin: '-12px 0px' }
    )

    els.forEach(el => obs.observe(el))
    return () => obs.disconnect()
  })   // re-run after every render so new .reveal elements (route changes) get picked up
}
