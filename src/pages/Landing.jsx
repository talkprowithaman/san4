// Landing.jsx — Homepage v2 (Nocturne). Goal: get visitors to take the free San4 Score.
import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, ArrowUpRight, Headphones,
  XLogo, InstagramLogo, LinkedinLogo, YoutubeLogo,
} from '@phosphor-icons/react'
import VakMascot from '../components/VakMascot'
import './landing.css'

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// `_` marks a filler word; `~` is a space inside a multi-word filler.
const P = s => s.split(' ').map(w => w.startsWith('_') ? [w.slice(1).replace(/~/g, ' '), 1] : [w, 0])
const SENTENCES = [
  { tag: 'Job interview',      w: P('So _umm, the project was _matlab really hard, _you~know, but we _like finished it.') },
  { tag: 'Team meeting',       w: P('_Basically the numbers are _aah up this week, _jaise~ki ten percent.') },
  { tag: 'Asking for a raise', w: P('I _actually feel, _haan, I have done _kind~of more than my role.') },
  { tag: 'Client call',        w: P('_So~yeah, our plan is, _kya~kehte~hain, faster and _like cheaper.') },
]
const LEVEL_NAMES = ['Hesitant', 'Aware', 'Expressive', 'Influential', 'Vaksiddha']

const STATS = [
  { n: 67, suffix: '%', cap: 'of all jobs will need strong soft skills by 2030.', src: 'Deloitte Access Economics',
    href: 'https://www.deloitte.com/au/en/services/economics/perspectives/soft-skills-business-success.html' },
  { hash: true, n: 1, cap: 'Communication is the most wanted skill at work.', src: 'LinkedIn, Most In-Demand Skills 2024',
    href: 'https://www.cnbc.com/2024/02/09/the-no-1-soft-skill-you-need-to-get-hired-now-according-to-linkedin.html' },
  { n: 59, suffix: '%', cap: 'of companies have no set way to measure it.', src: 'LinkedIn, Global Talent Trends 2019',
    href: 'https://www.linkedin.com/business/talent/blog/talent-strategy/global-recruiting-trends' },
  { n: 57, suffix: '%', cap: 'of Indian graduates are not job-ready.', src: 'Mercer Mettl, Graduate Skill Index 2025',
    href: 'https://www.business-standard.com/industry/news/india-job-market-graduate-skill-gap-ai-automation-employability-2025-125021800437_1.html' },
]

const SOCIALS = [
  ['X', 'https://x.com/talkprowithaman', XLogo],
  ['Instagram', 'https://instagram.com/talkprowithaman', InstagramLogo],
  ['LinkedIn', 'https://linkedin.com/in/amann-jindal', LinkedinLogo],
  ['YouTube', 'https://youtube.com/@talkprowithaman', YoutubeLogo],
]

// ── Voice wave canvas ────────────────────────────────────────────────────────
// Returns a cleanup function.
function initWave(c, reduced) {
  const ctx = c.getContext('2d')
  const css = getComputedStyle(document.documentElement)
  const cols = ['--a300', '--color-accent', '--a600', '--n400']
    .map(v => css.getPropertyValue(v).trim() || '#9184d9')
  let mx = -1, energy = 0.15, target = 0.15, raf = 0

  const onMove = e => {
    const r = c.getBoundingClientRect()
    const inY = e.clientY > r.top - 400 && e.clientY < r.bottom
    mx = (e.clientX - r.left) / r.width
    target = inY ? 1 : 0.15
  }

  const draw = t => {
    const dpr = window.devicePixelRatio || 1, w = c.clientWidth, h = c.clientHeight
    if (c.width !== w * dpr) { c.width = w * dpr; c.height = h * dpr }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h)
    energy += (target - energy) * 0.04
    ctx.globalCompositeOperation = 'lighter'
    for (let k = 0; k < 4; k++) {
      ctx.beginPath()
      for (let x = 0; x <= w; x += 4) {
        const u = x / w, edge = Math.sin(Math.PI * u)
        const near = mx < 0 ? 0 : Math.exp(-Math.pow((u - mx) * 4, 2))
        const amp = h * 0.32 * edge * (0.18 + energy * (0.35 + near * 0.9))
        const y = h / 2 + amp * Math.sin(u * (6 + k * 1.7) + t / (700 - k * 90) + k) * Math.sin(u * 2.3 + t / 1900 + k * 0.6)
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.strokeStyle = cols[k]; ctx.globalAlpha = k === 3 ? 0.25 : 0.55; ctx.lineWidth = k === 1 ? 1.6 : 1
      ctx.shadowColor = cols[k]; ctx.shadowBlur = 14; ctx.stroke()
    }
    if (!reduced) raf = requestAnimationFrame(draw)
  }

  if (reduced) {
    draw(1500) // one static frame
    const redraw = () => draw(1500)
    window.addEventListener('resize', redraw)
    return () => window.removeEventListener('resize', redraw)
  }
  window.addEventListener('mousemove', onMove)
  raf = requestAnimationFrame(draw)
  return () => { cancelAnimationFrame(raf); window.removeEventListener('mousemove', onMove) }
}

export default function Landing() {
  const rootRef = useRef(null)
  const waveRef = useRef(null)
  const vakRef = useRef(null)
  const statsRef = useRef(null)
  const [reduced] = useState(reducedMotion)
  const [{ tick, si }, setTs] = useState({ tick: 0, si: 0 })
  const [lvl, setLvl] = useState(reduced ? 5 : 1)
  const [stats, setStats] = useState(reduced ? 1 : 0)

  // Transcript loop
  useEffect(() => {
    if (reduced) return
    const id = setInterval(() => setTs(s =>
      s.tick >= SENTENCES[s.si].w.length + 10
        ? { tick: 0, si: (s.si + 1) % SENTENCES.length }
        : { ...s, tick: s.tick + 1 }), 420)
    return () => clearInterval(id)
  }, [reduced])

  // Vak level cycle
  useEffect(() => {
    if (reduced) return
    const id = setInterval(() => setLvl(l => (l >= 5 ? 1 : l + 1)), 2400)
    return () => clearInterval(id)
  }, [reduced])

  // Wave canvas
  useEffect(() => {
    const c = waveRef.current
    return c ? initWave(c, reduced) : undefined
  }, [reduced])

  // Scroll reveal + stats count-up
  useEffect(() => {
    if (reduced) return
    let raf = 0
    const countUp = () => {
      const t0 = performance.now()
      const step = now => {
        const p = Math.min((now - t0) / 2200, 1)
        setStats(1 - Math.pow(1 - p, 3))
        if (p < 1) raf = requestAnimationFrame(step)
      }
      raf = requestAnimationFrame(step)
    }
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return
      if (e.target === statsRef.current) countUp()
      else e.target.classList.add('in')
      io.unobserve(e.target)
    }), { threshold: 0.2 })
    rootRef.current.querySelectorAll('[data-reveal]').forEach(el => io.observe(el))
    if (statsRef.current) io.observe(statsRef.current)
    return () => { io.disconnect(); cancelAnimationFrame(raf) }
  }, [reduced])

  // Vak cursor parallax
  useEffect(() => {
    if (reduced) return
    const onMove = e => {
      const v = vakRef.current; if (!v) return
      const r = v.getBoundingClientRect()
      const dx = (e.clientX - (r.left + r.width / 2)) / window.innerWidth
      const dy = (e.clientY - (r.top + r.height / 2)) / window.innerHeight
      v.style.transform = `translate(${dx * 24}px, ${dy * 18}px) rotate(${dx * 4}deg)`
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [reduced])

  // Transcript state. Reduced motion: final cleaned sentence, statically.
  const cur = SENTENCES[reduced ? 0 : si]
  const t = reduced ? cur.w.length + 10 : tick
  let caught = 0, kept = 0
  const words = cur.w.map(([text, f], i) => {
    const shown = i < t, struck = f && t - i > 2, gone = f && t - i > 5
    if (struck) caught++
    if (shown && !f) kept++
    return { text, struck, gone, shown }
  })

  return (
    <div ref={rootRef} className="hp">
      {/* ── Nav ── */}
      <nav className="nav">
        <div className="wrap nav-in">
          <Link to="/" className="brand">
            <img src="/san4-icon.png" alt="San4" width={24} height={24} />
            <span>SAN<b>4</b></span>
          </Link>
          <div className="nav-links">
            <Link to="/san4-score">San4 Score</Link>
            <Link to="/how-it-works">How it works</Link>
            <Link to="/pricing">Pricing</Link>
            <Link to="/extension"><Headphones size={15} aria-hidden="true" />Vak Extension</Link>
          </div>
          <div className="nav-right">
            <Link to="/auth" className="signin">Sign in</Link>
            <Link to="/assessment" className="btn btn-primary btn-sm">Get your score</Link>
          </div>
        </div>
        <div className="rule" />
      </nav>

      {/* ── Hero ── */}
      <section className="hero">
        <div className="hero-stack">
          <span className="overline">The AI speaking coach</span>
          <h1 className="h1">
            <span className="l1">One Coach.</span>
            <span className="l2">Every Voice.</span>
          </h1>
          <p className="hero-sub">Talk. Vak listens. You get better.</p>
          <div className="hero-btns">
            <Link to="/assessment" className="btn btn-primary btn-glow">Get your San4 Score<ArrowRight size={16} aria-hidden="true" /></Link>
            <Link to="/auth?mode=signup" className="btn btn-secondary">Start practising</Link>
          </div>
          <span className="micro">Free · 2 minutes · Private</span>
        </div>
        <div className="wave-box">
          <canvas ref={waveRef} className="wave" aria-hidden="true" />
          <span className="wave-cap">Move to speak</span>
        </div>
      </section>

      {/* ── Filler words ── */}
      <section className="fill">
        <div className="fill-head" data-reveal>
          <span className="overline acc">Live, as you talk</span>
          <h2 className="fill-h2">Stop saying “umm”.</h2>
          <p className="fill-sub">Vak hears the words you don't.</p>
        </div>
        <div className="card" data-reveal>
          <div className="card-head">
            <span className="dot" aria-hidden="true"><s /><i /></span>
            Listening
            <span className="scene">{cur.tag}</span>
          </div>
          <div className="transcript" aria-live="off">
            {words.map((w, i) => (
              <span key={`${si}-${i}`} className="w" style={{
                maxWidth: w.gone || !w.shown ? 0 : '8em',
                marginRight: w.gone || !w.shown ? 0 : '0.28em',
                opacity: w.gone || !w.shown ? 0 : 1,
                color: w.struck ? 'var(--a400)' : 'var(--n100)',
                textDecoration: w.struck ? 'line-through' : 'none',
              }}>{w.text}</span>
            ))}
          </div>
          <div className="rule" />
          <div className="card-foot">
            <div className="counts">
              <div className="count"><b>{caught}</b><span>Fillers caught</span></div>
              <div className="count"><b>{kept}</b><span>Words that matter</span></div>
            </div>
            <span className="card-note">Knowing is not enough. Say it well.</span>
          </div>
        </div>
      </section>

      {/* ── Meet Vak ── */}
      <section className="vak">
        <div className="stage" data-reveal>
          <div className="glow" />
          <div className="ring r1" />
          <div className="ring r2" />
          <div ref={vakRef} className="par">
            <div className="flt">
              <div className="grow" style={{ transform: `scale(${0.82 + lvl * 0.045})` }}>
                <VakMascot size={280} level={lvl} mood={lvl === 5 ? 'celebrating' : lvl >= 3 ? 'proud' : 'neutral'} />
              </div>
            </div>
          </div>
          <div className="lvl">
            <div className="bars">
              {[1, 2, 3, 4, 5].map(n => <i key={n} className={n <= lvl ? 'on' : ''} />)}
            </div>
            <span>Level {lvl} · <b>{LEVEL_NAMES[lvl - 1]}</b></span>
          </div>
        </div>
        <div className="vak-copy" data-reveal>
          <span className="overline acc">Your coach</span>
          <h2 className="vak-h2">Meet Vak.<br /><small>वाक् means speech.</small></h2>
          <p className="vak-p">Honest tips. Never fake praise. Vak grows as you do.</p>
        </div>
      </section>

      {/* ── Stats ── */}
      <section ref={statsRef} className="stats">
        <div className="stats-in">
          <div className="stats-head">
            <h2 className="stats-h2">The most wanted skill has no score.</h2>
            <p className="stats-sub">Until now. <Link to="/san4-score">Meet the San4 Score.</Link></p>
          </div>
          <div className="stat-grid">
            {STATS.map(s => (
              <div className="stat" key={s.src}>
                <span className="stat-n">
                  {s.hash
                    ? <><em className="hash">#</em>1</>
                    : <>{Math.round(s.n * stats)}<em>{s.suffix}</em></>}
                </span>
                <div className="stat-rule" />
                <span className="stat-cap">{s.cap}</span>
                <a className="stat-src" href={s.href} target="_blank" rel="noopener noreferrer">
                  {s.src}<ArrowUpRight size={13} aria-hidden="true" />
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="cta">
        <div className="cta-in" data-reveal>
          <h2 className="cta-h2">Speak with<br />confidence.</h2>
          <p className="cta-sub">Your score in 2 minutes. Free.</p>
          <Link to="/assessment" className="btn btn-primary btn-glow">Get your San4 Score<ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="foot">
        <div className="foot-grid">
          <div className="foot-brand">
            <Link to="/" className="brand">
              <img src="/san4-icon.png" alt="San4" width={28} height={28} />
              <span>SAN<b>4</b></span>
            </Link>
            <p className="foot-tag">The AI speaking coach made for India.</p>
          </div>
          <div className="foot-col">
            <h3>Product</h3>
            <Link to="/how-it-works">How it works</Link>
            <Link to="/san4-score">San4 Score</Link>
            <Link to="/extension">Vak Extension</Link>
            <Link to="/resume-builder">Free resume builder</Link>
            <Link to="/pricing">Pricing</Link>
          </div>
          <div className="foot-col">
            <h3>Legal</h3>
            <Link to="/terms">Terms</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/responsible-ai">Responsible AI</Link>
          </div>
          <div className="foot-col">
            <h3>Follow</h3>
            <div className="socials">
              {SOCIALS.map(([label, href, Icon]) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}>
                  <Icon size={17} aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>
        </div>
        <div className="foot-bottom">
          <div className="rule" />
          <div className="foot-bar">
            <span>© 2026 San4 Inc. Made in India.</span>
            <span>Built under India's DPDP Act.</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
