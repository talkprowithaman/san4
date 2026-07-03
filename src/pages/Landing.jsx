// Landing.jsx — Full redesign
// Pure React + CSS animations (IntersectionObserver, no framer-motion).
import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import VakMascot       from '../components/VakMascot'
import RippleCursor    from '../components/RippleCursor'
import HeroWaveform    from '../components/HeroWaveform'
import IntroReveal     from '../components/IntroReveal'
import DraggableMarquee from '../components/DraggableMarquee'
import ProductShowcase  from '../components/ProductShowcase'
import FillerWords      from '../components/FillerWords'
import Testimonials     from '../components/Testimonials'
import SoundToggle      from '../components/SoundToggle'
import { playTick }     from '../lib/sound'
import { useSmoothScroll } from '../hooks/useSmoothScroll'
import { useParallax }     from '../hooks/useParallax'
import './landing.css'

// ── Count-up stat ─────────────────────────────────────────────────────────────
function CountUp({ to, suffix = '' }) {
  const ref = useRef(null)
  const [val, setVal] = useState(0)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      obs.disconnect()
      const t0  = performance.now()
      const dur = 2000
      const tick = now => {
        const p = Math.min((now - t0) / dur, 1)
        setVal(Math.round((1 - Math.pow(1 - p, 3)) * to))
        if (p < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }, { threshold: 0.5 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [to])
  return <span ref={ref}>{val.toLocaleString('en-IN')}{suffix}</span>
}

// ── Scenario ticker data ──────────────────────────────────────────────────────
const ROW1 = ['💼 HR Interview','💰 Salary Negotiation','📊 Client Presentation','👥 Daily Standup','⭐ Performance Review','🗣️ Group Discussion','🤝 Cold Networking']
const ROW2 = ['📈 Leadership Update','🎯 Pitch to a Skeptic','🚫 Say No Professionally','⚖️ Conflict Mediation','💬 Sensitive Conversation','❤️ First Date','📜 Script Reading']

// ── India stats ───────────────────────────────────────────────────────────────
const STATS = [
  { to:93, suf:'%', label:'% of Indian graduates not industry-ready' },
  { to:78, suf:'%', label:'% of hiring managers rank communication as the #1 skill gap' },
  { to:0,  suf:'',  label:'AI coaches built specifically for India. Until now.' },
]

// ── Context cards (expandable) ─────────────────────────────────────────────────
const CTX = [
  { icon:'💡', title:'Built for Bharat', short:'Tuned to how India speaks.',
    more:'Accent-neutral AI trained on Indian English, Hindi-English code-switching, and regional speech. It understands you, not a textbook American voice.' },
  { icon:'🎯', title:'Scenario library', short:'14 real situations, not drills.',
    more:'HR rounds, group discussions, client pitches, salary negotiations. Each one plays out like the real thing, with a counterpart who pushes back.' },
  { icon:'📈', title:'Measurable growth', short:'See yourself get sharper.',
    more:'Track filler words, confidence, pace, and structure across every session. Your progress becomes a number that climbs, not a vague feeling.' },
  { icon:'🔒', title:'Private by design', short:'Your voice stays yours.',
    more:'We never store your audio after analysis. Practise the awkward stuff freely, with no human listening and nothing to be embarrassed about.' },
]

// ── Expandable context card — click to read more, saves space ────────────────
function ExpandCard({ item, open, onToggle }) {
  return (
    <button onClick={onToggle}
      className="w-full text-left rounded-2xl p-5 transition-all"
      style={{ background:'linear-gradient(145deg,#0F1929,#070C18)',
        border:`1px solid ${open ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.07)'}` }}>
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <span className="text-2xl">{item.icon}</span>
        <span className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold transition-transform"
          style={{ background:'rgba(139,92,246,0.15)', color:'#A78BFA',
            transform: open ? 'rotate(45deg)' : 'rotate(0deg)' }}>+</span>
      </div>
      <h3 className="text-white font-bold text-sm mb-1">{item.title}</h3>
      <p className="text-xs" style={{ color:'#8B95A8' }}>{item.short}</p>
      <div style={{ maxHeight: open ? 320 : 0, overflow:'hidden', transition:'max-height 0.4s ease' }}>
        <p className="text-xs leading-relaxed mt-3 pt-3"
          style={{ color:'#6B8CAE', borderTop:'1px solid rgba(255,255,255,0.07)' }}>{item.more}</p>
      </div>
      {!open && (
        <span className="text-xs font-semibold mt-2.5 inline-flex items-center gap-1" style={{ color:'#A78BFA' }}>
          Read more <span style={{ fontSize:'0.9em' }}>↓</span>
        </span>
      )}
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Landing() {
  const [openCtx, setOpenCtx] = useState(null)

  useSmoothScroll()  // Lenis momentum scroll (desktop only)
  useParallax()      // subtle scroll-depth on [data-parallax] elements

  // ── Scroll animator — observes all .sa/.clip-line/.ai-feat elements ───────
  useEffect(() => {
    const sel = '.sa,.sa-sc,.sa-l,.sa-r,.clip-line,.ai-feat'
    const els = document.querySelectorAll(sel)
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return
        const delay = Number(e.target.dataset.delay || 0)
        setTimeout(() => e.target.classList.add('in'), delay)
        obs.unobserve(e.target)
      })
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' })
    els.forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])


  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ background:'#050810', color:'#F1F5F9' }}>

      {/* Branded intro reveal (first visit per session) */}
      <IntroReveal />

      {/* Opt-in UI sound toggle (off by default) */}
      <SoundToggle />

      {/* Cinematic overlays: pointer aura + ripples, and film grain */}
      <RippleCursor />
      <div className="film-grain" aria-hidden="true" />

      {/* ══ NAVBAR ════════════════════════════════════════════════════════ */}
      <nav className="landing-nav fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 lg:px-10 h-16"
        style={{
          background:'rgba(4,8,16,0.88)',
          backdropFilter:'blur(24px)',
          WebkitBackdropFilter:'blur(24px)',
          borderBottom:'1px solid rgba(255,255,255,0.07)',
        }}>
        <span className="flex items-center gap-2 text-xl font-black tracking-tight text-white" style={{ fontFamily:'Outfit, sans-serif' }}>
          <img src="/san4-icon.png" alt="San4" width={30} height={30} className="rounded-lg" />
          <span>SAN<span style={{ color:'#7B5EA7' }}>4</span></span>
        </span>

        <div className="hidden md:flex items-center gap-8">
          {[['How it works','/how-it-works'],['Pricing','/pricing']].map(([t, to]) => (
            <Link key={t} to={to} className="text-sm transition-colors"
              style={{ color:'rgba(255,255,255,0.45)' }}
              onMouseEnter={e=>e.currentTarget.style.color='white'}
              onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,0.45)'}>
              {t}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Link to="/auth"
            className="hidden sm:block text-sm font-medium px-4 py-2 transition-colors"
            style={{ color:'rgba(255,255,255,0.5)' }}
            onMouseEnter={e=>e.currentTarget.style.color='white'}
            onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,0.5)'}>
            Sign in
          </Link>
          <Link to="/auth?mode=signup"
            className="text-sm font-bold text-white px-5 py-2 rounded-full transition-all hover:opacity-90 active:scale-95"
            style={{ background:'#7B5EA7', boxShadow:'0 4px 18px rgba(123,94,167,0.4)' }}>
            Try free →
          </Link>
        </div>
      </nav>

      {/* ══ HERO ══════════════════════════════════════════════════════════ */}
      <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
        {/* Ambient orbs */}
        <div className="amb-orb-1 absolute pointer-events-none"
          style={{ top:-220, right:-180, width:750, height:750, borderRadius:'50%',
            background:'radial-gradient(circle, rgba(123,94,167,0.22) 0%, transparent 65%)' }}/>
        <div className="amb-orb-2 absolute pointer-events-none"
          style={{ bottom:-220, left:-120, width:650, height:650, borderRadius:'50%',
            background:'radial-gradient(circle, rgba(139,92,246,0.14) 0%, transparent 65%)' }}/>
        {/* Grid texture */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:'linear-gradient(rgba(255,255,255,0.018) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.018) 1px,transparent 1px)',
            backgroundSize:'72px 72px',
          }}/>

        {/* Living voice waveform */}
        <HeroWaveform />

        <div className="max-w-7xl mx-auto px-6 lg:px-10 w-full grid lg:grid-cols-2 gap-12 items-center py-24 relative z-10">

          {/* ── Left column ─────────────────────────────────────────────── */}
          <div>
            {/* Headline */}
            <h1 className="font-black leading-[1.05] tracking-tight mb-6"
              style={{ fontSize:'clamp(52px,7vw,88px)' }}>
              <div className="sa" data-delay="0">
                <span className="text-white">One Coach.</span>
              </div>
              <div className="sa grad-text grad-flow" data-delay="250">
                Every Voice.
              </div>
            </h1>

            {/* Body */}
            <p className="sa text-lg leading-relaxed mb-8 max-w-lg" data-delay="440"
              style={{ color:'rgba(255,255,255,0.55)' }}>
              Your AI practice partner for interviews, meetings, and tough conversations.
              Honest, specific feedback instead of empty praise. The more you practise,
              the sharper it gets.
            </p>

            {/* CTA row */}
            <div className="sa flex flex-wrap gap-3 mb-8 hero-btns" data-delay="600">
              <Link to="/assessment"
                onMouseEnter={() => playTick('hover')}
                className="btn-aura text-sm font-bold text-white px-7 py-4 rounded-full transition-all hover:opacity-90 active:scale-95"
                style={{ background:'linear-gradient(135deg,#7B5EA7,#9B7EC8)' }}>
                🎯 Get your San4 Score, free →
              </Link>
              <Link to="/auth?mode=signup"
                className="text-sm font-semibold px-7 py-4 rounded-full transition-all hover:opacity-80"
                style={{ color:'rgba(255,255,255,0.7)', border:'1px solid rgba(255,255,255,0.2)' }}>
                Start practising free
              </Link>
            </div>

            {/* Tag pills */}
            <div className="sa flex flex-wrap gap-2 mb-12" data-delay="730">
              {['✅ Free to start','🇮🇳 Built for India','🎯 AI feedback','🔒 Private sessions'].map(p=>(
                <span key={p} className="glass-chip text-xs font-semibold px-4 py-1.5"
                  style={{ color:'rgba(255,255,255,0.7)' }}>
                  {p}
                </span>
              ))}
            </div>

            {/* ── Scenario reel (drag to explore) ──────────────────────────── */}
            <div className="sa" data-delay="900">
              <p className="text-xs font-bold uppercase tracking-widest mb-4 text-center"
                style={{ color:'rgba(107,140,174,0.75)' }}>
                14 scenarios to practise · drag to explore
              </p>
              <div className="mb-3">
                <DraggableMarquee items={ROW1} accent="#A78BFA" direction="left"  speed={42} />
              </div>
              <DraggableMarquee items={ROW2} accent="#00C49A" direction="right" speed={36} />
            </div>
          </div>

          {/* ── Right column: Vak + evolution cards ────────────────────── */}
          <div className="hero-right-col flex flex-col items-center gap-6" data-parallax="0.05">

            {/* Vak character */}
            <div className="relative flex flex-col items-center">
              <div className="absolute inset-0 pointer-events-none"
                style={{
                  background:'radial-gradient(circle, rgba(139,92,246,0.28) 0%, transparent 60%)',
                  transform:'scale(1.7)',
                }}/>
              <div className="animate-float relative z-10">
                <VakMascot level={5} size={190} />
              </div>

              {/* Name tag */}
              <div className="flex items-baseline justify-center gap-3 mt-4 relative z-10">
                <span className="font-black text-white" style={{ fontSize:'1.6rem' }}>Vak</span>
                <span className="font-semibold" style={{ fontSize:'1.1rem', color:'#A78BFA' }}>वाक्</span>
              </div>
              <p className="text-xs mt-1 text-center relative z-10" style={{ color:'#6B8CAE' }}>
                Sanskrit · "Speech" · Vehicle of Saraswati
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ══ FILLER WORDS — the problem we catch ════════════════════════════ */}
      <FillerWords />

      {/* ══ THE SAN4 SCORE — the anchor: a CIBIL-style score for speaking ══ */}
      <section className="py-24 px-6 lg:px-10" style={{ background: 'linear-gradient(180deg,#06091C,#050810)' }}>
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#7B5EA7' }}>
              THE SAN4 SCORE
            </p>
            <h2 className="text-3xl md:text-4xl font-black text-white leading-tight mb-4">
              One number for how you communicate.
            </h2>
            <p className="text-base leading-relaxed mb-4" style={{ color: '#94A3B8' }}>
              CIBIL scores your credit. IELTS scores your English. Nothing scores the skill
              that actually decides your interviews, appraisals, and promotions: how you
              <strong className="text-white"> communicate</strong>.
            </p>
            <p className="text-base leading-relaxed mb-6" style={{ color: '#94A3B8' }}>
              The San4 Score measures your clarity, confidence, structure, and delivery,
              in any language you speak. It updates with every practice session. Put it on
              your LinkedIn. Put it on your CV. Watch it climb.
            </p>
            <ul className="space-y-2 mb-8">
              {[
                'Language-independent: judged on how you communicate, not your grammar',
                'A living score: every daily rep and session moves it',
                'Built to share: one tap to LinkedIn, WhatsApp, or your CV',
              ].map(t => (
                <li key={t} className="flex gap-2 text-sm" style={{ color: '#94A3B8' }}>
                  <span style={{ color: '#00C49A' }}>✓</span> {t}
                </li>
              ))}
            </ul>
            <Link to="/assessment"
              className="inline-block text-sm font-bold text-white px-7 py-4 rounded-full transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg,#7B5EA7,#9B7EC8)' }}>
              Get your San4 Score in 2 minutes →
            </Link>
          </div>

          {/* Mock score card */}
          <div className="flex justify-center">
            <div className="w-full max-w-xs rounded-3xl p-8 text-center"
              style={{ background: 'linear-gradient(160deg,#10192E,#0B1220)', border: '1px solid rgba(123,94,167,0.4)', boxShadow: '0 0 60px rgba(123,94,167,0.15)' }}>
              <div className="flex items-center justify-center gap-2 mb-6">
                <img src="/san4-icon.png" alt="" width={28} height={28} className="rounded-lg" />
                <span className="font-black text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  SAN<span style={{ color: '#7B5EA7' }}>4</span> SCORE
                </span>
              </div>
              <div className="font-black" style={{ fontSize: '5rem', lineHeight: 1, color: '#00C49A' }}>74</div>
              <div className="text-white font-bold mb-1">Confident</div>
              <div className="text-xs mb-6" style={{ color: '#6B8CAE' }}>Communicates clearly under pressure</div>
              <div className="space-y-2 text-left">
                {[
                  ['Clarity', 78, '#00C49A'],
                  ['Confidence', 71, '#7B5EA7'],
                  ['Structure', 69, '#F59E0B'],
                  ['Delivery', 77, '#4FACFE'],
                ].map(([label, v, c]) => (
                  <div key={label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: '#94A3B8' }}>{label}</span>
                      <span className="font-bold" style={{ color: c }}>{v}</span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
                      <div className="h-full rounded-full" style={{ width: `${v}%`, background: c }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 text-xs" style={{ color: '#6B8CAE' }}>🔥 12-day streak · ↑ 9 this month</div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ PRODUCT SHOWCASE — see the app before signing up ═══════════════ */}
      <ProductShowcase />

      {/* ══ SECTION 4 — WHY IT MATTERS ════════════════════════════════════ */}
      <section className="py-28 px-6 lg:px-10 relative overflow-hidden"
        style={{ background:'linear-gradient(180deg,#050810 0%,#06091C 100%)' }}>

        <p className="sa text-xs font-bold uppercase tracking-widest text-center mb-5"
          style={{ color:'#6B8CAE' }}>Why it matters</p>

        <div className="text-center mb-16">
          <h2 className="sa font-black leading-tight" data-delay="0"
            style={{ fontSize:'clamp(30px,5vw,56px)', color:'white' }}>
            No shortcuts.{' '}
            <span className="grad-text">Real skills.</span>
          </h2>
          <p className="sa text-lg mt-4 max-w-xl mx-auto" data-delay="140"
            style={{ color:'rgba(255,255,255,0.5)' }}>
            India produces millions of graduates every year. Only a fraction can communicate
            confidently under pressure. San4 is built to close that gap.
          </p>
        </div>


        {/* ── Stat counters ──────────────────────────────────────────────── */}
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-12 text-center mb-16">
          {STATS.map(({ to, suf, label }, i) => (
            <div key={label} className="sa" data-delay={i * 120}>
              <div className="font-black grad-text mb-2"
                style={{ fontSize:'clamp(2.5rem,5vw,4rem)' }}>
                <CountUp to={to} suffix={suf} />
              </div>
              <p className="text-sm leading-relaxed" style={{ color:'#6B8CAE' }}>{label}</p>
            </div>
          ))}
        </div>

        {/* ── Context cards (click to expand) ───────────────────────────── */}
        <div className="max-w-5xl mx-auto grid sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {CTX.map((c, i) => (
            <div key={c.title} className="sa-sc" data-delay={i * 80}>
              <ExpandCard item={c} open={openCtx === i} onToggle={() => setOpenCtx(openCtx === i ? null : i)} />
            </div>
          ))}
        </div>
      </section>

      {/* ══ TESTIMONIALS ═══════════════════════════════════════════════════ */}
      <Testimonials />

      {/* ══ SECTION 7 — CTA ═════════════════════════════════════════════════ */}
      <section className="py-40 px-6 lg:px-10 relative text-center overflow-hidden"
        style={{ background:'#050810' }}>

        {/* Radial purple glow */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div style={{
            width:700, height:700, borderRadius:'50%',
            background:'radial-gradient(circle, rgba(139,92,246,0.13) 0%, transparent 65%)',
          }}/>
        </div>

        <div className="relative z-10 max-w-3xl mx-auto">
          <h2 className="sa-sc font-black mb-6"
            style={{ fontSize:'clamp(36px,6.5vw,82px)', lineHeight:1.05 }}>
            <span className="grad-text">Speak with Confidence.</span>
            <br />
            <span className="text-white">Starting Today.</span>
          </h2>

          <p className="sa text-lg mb-8 max-w-xl mx-auto" data-delay="150"
            style={{ color:'rgba(255,255,255,0.5)' }}>
            Join thousands of Indian professionals practising with Vak,
            the AI coach that actually gets you.
          </p>

          {/* Tag pills */}
          <div className="sa flex flex-wrap justify-center gap-2 mb-10" data-delay="250">
            {['✅ Free to start','🇮🇳 Built for India','🎯 AI feedback','🔒 Private sessions'].map(p=>(
              <span key={p} className="text-xs font-semibold px-4 py-1.5"
                style={{ border:'1px solid rgba(255,255,255,0.15)', color:'rgba(255,255,255,0.6)', borderRadius:100 }}>
                {p}
              </span>
            ))}
          </div>

          {/* CTA buttons */}
          <div className="sa flex flex-wrap justify-center gap-4 cta-btns" data-delay="350">
            <Link to="/auth?mode=signup"
              className="btn-aura text-base font-bold text-white px-10 py-5 rounded-full transition-all hover:opacity-90 active:scale-95"
              style={{ background:'linear-gradient(135deg,#7B5EA7,#9B7EC8)' }}>
              Start practising free →
            </Link>
            <Link to="/how-it-works"
              className="text-base font-semibold px-10 py-5 rounded-full transition-all hover:opacity-80"
              style={{ color:'white', border:'1px solid rgba(255,255,255,0.25)' }}>
              See how it works
            </Link>
          </div>

          {/* Quiet link to the technical breakdown */}
          <Link to="/how-it-works"
            className="sa inline-block mt-8 text-sm transition-colors" data-delay="450"
            style={{ color:'rgba(255,255,255,0.4)' }}
            onMouseEnter={e=>e.currentTarget.style.color='rgba(255,255,255,0.75)'}
            onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,0.4)'}>
            Curious what powers Vak? See what's under the hood →
          </Link>
        </div>

        {/* Deco phone (desktop only) */}
        <div className="deco-phone absolute left-8 bottom-14 opacity-55 hidden lg:block"
          style={{ width:130, height:260, borderRadius:28,
            background:'rgba(8,14,26,0.85)', border:'5px solid rgba(255,255,255,0.09)' }}/>

        {/* Deco cards (desktop only) */}
        <div className="deco-card absolute hidden lg:block" style={{ left:80, top:'28%' }}>
          <div className="deco-card-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white whitespace-nowrap"
            style={{ background:'rgba(123,94,167,0.22)', border:'1px solid rgba(123,94,167,0.38)', backdropFilter:'blur(8px)' }}>
            🏆 Top performer this week
          </div>
        </div>
        <div className="deco-card absolute hidden lg:block" style={{ left:48, top:'55%' }}>
          <div className="deco-card-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white whitespace-nowrap"
            style={{ background:'rgba(0,196,154,0.14)', border:'1px solid rgba(0,196,154,0.3)', backdropFilter:'blur(8px)' }}>
            +176 XP · Session complete
          </div>
        </div>
      </section>

      {/* ══ FOOTER ═════════════════════════════════════════════════════════ */}
      <footer style={{ background:'#08080e', borderTop:'1px solid rgba(255,255,255,0.07)' }}>
        <div className="max-w-6xl mx-auto px-6 lg:px-10 py-16 grid md:grid-cols-[2fr_1fr_1fr] gap-12 lg:gap-16">

          {/* Col 1 — brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img src="/san4-icon.png" alt="San4" width={40} height={40} className="rounded-xl" />
              <span className="text-xl font-black text-white" style={{ fontFamily:'Outfit, sans-serif' }}>
                SAN<span style={{ color:'#7B5EA7' }}>4</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed max-w-xs" style={{ color:'#6B8CAE' }}>
              The AI communication coach built for Indian professionals.
              Powered by Gemini.
            </p>
          </div>

          {/* Col 2 — Product links */}
          <div>
            <h4 className="text-white font-bold text-xs uppercase tracking-widest mb-5">Product</h4>
            <ul className="space-y-3">
              {[['How it works','/how-it-works'],['Pricing','/pricing'],['Get your score','/assessment'],['Sign in','/auth']].map(([t, to])=>(
                <li key={t}>
                  <Link to={to} className="text-sm transition-colors"
                    style={{ color:'#6B8CAE' }}
                    onMouseEnter={e=>e.currentTarget.style.color='white'}
                    onMouseLeave={e=>e.currentTarget.style.color='#6B8CAE'}>
                    {t}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3 — Social */}
          <div>
            <h4 className="text-white font-bold text-xs uppercase tracking-widest mb-5">Social</h4>
            <div className="flex flex-wrap gap-2">
              {[
                { label:'X',  href:'https://x.com/talkprowithaman',            icon:'𝕏' },
                { label:'IG', href:'https://instagram.com/talkprowithaman',    icon:'📸' },
                { label:'LI', href:'https://linkedin.com/in/amann-jindal',     icon:'💼' },
                { label:'DC', href:'#',                                         icon:'💬' },
                { label:'YT', href:'https://youtube.com/@talkprowithaman',     icon:'▶' },
              ].map(({ label, href, icon }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                  aria-label={label}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all"
                  style={{ background:'rgba(255,255,255,0.06)', color:'#94A3B8', border:'1px solid rgba(255,255,255,0.08)' }}
                  onMouseEnter={e=>{
                    e.currentTarget.style.background='rgba(139,92,246,0.2)'
                    e.currentTarget.style.borderColor='rgba(139,92,246,0.4)'
                    e.currentTarget.style.color='#A78BFA'
                    e.currentTarget.style.transform='translateY(-2px)'
                  }}
                  onMouseLeave={e=>{
                    e.currentTarget.style.background='rgba(255,255,255,0.06)'
                    e.currentTarget.style.borderColor='rgba(255,255,255,0.08)'
                    e.currentTarget.style.color='#94A3B8'
                    e.currentTarget.style.transform=''
                  }}>
                  {icon}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="max-w-6xl mx-auto px-6 lg:px-10 pb-8">
          <div className="pt-6 flex flex-wrap items-center justify-between gap-3"
            style={{ borderTop:'1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs" style={{ color:'rgba(107,140,174,0.45)' }}>
              © 2025 San4 Inc. All rights reserved. Made in India 🇮🇳
            </p>
            <div className="flex items-center gap-5">
              <Link to="/privacy" className="text-xs transition-colors"
                style={{ color:'rgba(107,140,174,0.45)' }}
                onMouseEnter={e=>e.currentTarget.style.color='rgba(255,255,255,0.6)'}
                onMouseLeave={e=>e.currentTarget.style.color='rgba(107,140,174,0.45)'}>
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}
