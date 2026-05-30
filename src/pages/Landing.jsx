import { useRef, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  motion,
  useScroll,
  useTransform,
  useInView,
  useSpring,
  useMotionValue,
  AnimatePresence,
} from 'framer-motion'
import { supabase }  from '../lib/supabase'
import VakMascot     from '../components/VakMascot'

// ── Palette ───────────────────────────────────────────────────────────────────
const navy   = '#050810'
const blue   = '#FF6B35'   // "blue" var kept for compat — now brand orange
const green  = '#00C49A'
const gold   = '#F59E0B'
const purple = '#8B5CF6'
const bg     = '#050810'
const text   = '#F1F5F9'

// ── Easing ────────────────────────────────────────────────────────────────────
const ease = [0.25, 0.1, 0.25, 1]

// ── Fade-up animation preset ─────────────────────────────────────────────────
function FadeUp({ children, delay = 0, className = '' }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, delay, ease }}
    >
      {children}
    </motion.div>
  )
}

// ── Phone mockup screens — gamified ──────────────────────────────────────────
const PHONE_SCREENS = [
  {
    // Screen 1: Live practice session with Vak
    content: (
      <div className="flex flex-col gap-2.5 p-3 h-full overflow-hidden">
        <div className="flex items-center justify-between pb-2 border-b border-white/5">
          <span className="text-xs text-slate-400">HR Interview · 3:42</span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold" style={{ color: '#FF6B35' }}>🔥 3</span>
            <span className="text-xs font-bold" style={{ color: '#F59E0B' }}>⭐ 450</span>
          </div>
        </div>
        {/* Vak message */}
        <div className="flex items-start gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-base"
            style={{ background: 'rgba(139,92,246,0.2)' }}>
            🦢
          </div>
          <div className="bg-slate-700/60 rounded-2xl rounded-tl-sm p-2.5 max-w-[75%]">
            <p className="text-white text-xs leading-relaxed">
              Tell me about a time you handled a difficult stakeholder.
            </p>
          </div>
        </div>
        {/* User reply */}
        <div className="rounded-2xl rounded-tr-sm p-2.5 max-w-[75%] self-end"
          style={{ background: '#FF6B35' }}>
          <p className="text-white text-xs leading-relaxed">
            In my last role, I had a client who kept changing scope…
          </p>
        </div>
        <div className="flex items-start gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-base"
            style={{ background: 'rgba(139,92,246,0.2)' }}>
            🦢
          </div>
          <div className="bg-slate-700/60 rounded-2xl rounded-tl-sm p-2.5 max-w-[75%]">
            <p className="text-white text-xs leading-relaxed">
              Good structure. What was the outcome?
            </p>
          </div>
        </div>
        <div className="mt-auto border border-white/10 rounded-xl px-3 py-2 flex items-center gap-2">
          <span className="text-slate-500 text-xs flex-1">Your response…</span>
          <div className="w-6 h-6 rounded-full flex items-center justify-center"
            style={{ background: '#FF6B35' }}>
            <span className="text-white text-xs">↑</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    // Screen 2: Dashboard with Vak mascot + gamified stats
    content: (
      <div className="flex flex-col gap-2 p-3 h-full overflow-hidden">
        {/* Mini Vak + level */}
        <div className="text-center pt-1">
          <div className="text-3xl">🦢</div>
          <div className="text-xs font-black text-white mt-0.5">Vak · Expressive 💎</div>
        </div>
        {/* XP bar */}
        <div className="px-1">
          <div className="flex justify-between text-xs mb-1" style={{ color: 'rgba(107,140,174,0.8)' }}>
            <span>450 XP</span><span>→ Influential ⚡</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div className="h-full rounded-full" style={{ width: '25%', background: 'linear-gradient(90deg, #8B5CF6aa, #8B5CF6)' }}/>
          </div>
        </div>
        {/* Stats */}
        <div className="grid grid-cols-3 gap-1.5">
          {[['🔥','3d','Streak'],['⭐','450','XP'],['🎭','6','Done']].map(([ic,v,l])=>(
            <div key={l} className="rounded-xl p-2 text-center" style={{ background: 'rgba(255,255,255,0.07)' }}>
              <div className="text-sm">{ic}</div>
              <div className="text-white font-black text-sm">{v}</div>
              <div className="text-xs" style={{ color: '#6B8CAE' }}>{l}</div>
            </div>
          ))}
        </div>
        {/* Play */}
        <div className="rounded-2xl py-2.5 text-center text-white font-bold text-sm"
          style={{ background: 'linear-gradient(135deg, #FF6B35, #FF8F4F)' }}>
          🎮 Start Practice
        </div>
        {/* Missions */}
        <div className="rounded-xl p-2.5" style={{ background: 'rgba(255,255,255,0.07)' }}>
          <div className="text-xs font-bold text-white mb-1.5">📋 Daily Missions</div>
          {[['Complete a session','#00C49A',true],[' Score 75%+','#F59E0B',false]].map(([m,c,done])=>(
            <div key={m} className="flex items-center gap-1.5 mb-1">
              <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-xs"
                style={{ border: `1.5px solid ${done ? c : 'rgba(255,255,255,0.2)'}`, color: c }}>
                {done ? '✓' : ''}
              </div>
              <span className="text-xs" style={{ color: done ? '#6B8CAE' : 'white', textDecoration: done ? 'line-through' : 'none' }}>
                {m}
              </span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    // Screen 3: Session report with XP reward
    content: (
      <div className="flex flex-col gap-2 p-3 h-full overflow-hidden">
        <div className="text-xs text-slate-400 pb-1.5 border-b border-white/5">
          Session Complete · HR Interview
        </div>
        {/* XP earned */}
        <div className="rounded-xl p-3 text-center"
          style={{ background: 'rgba(255,107,53,0.1)', border: '1px solid rgba(255,107,53,0.25)' }}>
          <div className="text-2xl font-black" style={{ color: '#FF6B35' }}>+176 XP</div>
          <div className="text-xs font-semibold mt-0.5" style={{ color: '#FF6B35' }}>🔥 4-day streak!</div>
        </div>
        {/* Scores */}
        <div className="grid grid-cols-3 gap-1.5">
          {[['84%','#00C49A','Overall'],['78%','#FF6B35','Confidence'],['91%','#00C49A','Pacing']].map(([v,c,l])=>(
            <div key={l} className="rounded-xl p-2 text-center" style={{ background: 'rgba(255,255,255,0.07)' }}>
              <div className="font-black text-sm" style={{ color: c }}>{v}</div>
              <div className="text-slate-500 text-xs">{l}</div>
            </div>
          ))}
        </div>
        {/* Filler words */}
        <div className="rounded-xl p-2.5" style={{ background: 'rgba(255,255,255,0.07)' }}>
          <div className="text-slate-400 text-xs mb-0.5">Filler words</div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black" style={{ color: '#00C49A' }}>3</span>
            <span className="text-slate-500 text-xs">vs 14 last week</span>
          </div>
        </div>
        {/* Action item */}
        <div className="rounded-xl p-2.5"
          style={{ background: 'rgba(255,107,53,0.08)', border: '1px solid rgba(255,107,53,0.2)' }}>
          <div className="text-xs font-semibold mb-0.5" style={{ color: '#FF6B35' }}>🎯 Action item</div>
          <p className="text-white text-xs leading-relaxed">
            Pause 2 seconds before answering. Your best answers came after a pause.
          </p>
        </div>
      </div>
    ),
  },
]

// ── Phone component with 3-D cursor tilt ─────────────────────────────────────
function PhoneMockup({ activeIndex, scale = 1 }) {
  const containerRef = useRef(null)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const rotX = useSpring(mouseY, { stiffness: 200, damping: 25 })
  const rotY = useSpring(mouseX, { stiffness: 200, damping: 25 })

  function handleMouseMove(e) {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = (e.clientX - cx) / (rect.width / 2)
    const dy = (e.clientY - cy) / (rect.height / 2)
    mouseX.set(dx * 14)
    mouseY.set(-dy * 9)
  }

  function handleMouseLeave() {
    mouseX.set(0)
    mouseY.set(0)
  }

  return (
    <motion.div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX: rotX, rotateY: rotY, scale, transformPerspective: 1200 }}
      className="relative"
    >
      {/* Blue glow */}
      <div
        className="absolute inset-0 rounded-[44px] blur-3xl opacity-25 -z-10"
        style={{ background: `radial-gradient(circle, ${blue} 0%, transparent 70%)` }}
      />
      {/* Frame */}
      <div
        className="relative overflow-hidden"
        style={{
          width: 260,
          height: 520,
          borderRadius: 44,
          background: navy,
          border: '8px solid rgba(255,255,255,0.10)',
          boxShadow:
            '0 0 0 1px rgba(255,255,255,0.04), 0 60px 120px rgba(15,23,42,0.45), inset 0 1px 0 rgba(255,255,255,0.08)',
        }}
      >
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-black/60 rounded-b-2xl z-10" />
        {/* Screen */}
        <div className="absolute inset-0 pt-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIndex}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4, ease }}
              className="h-full"
            >
              {PHONE_SCREENS[activeIndex].content}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}

// ── Counter animation ─────────────────────────────────────────────────────────
function Counter({ to, suffix = '' }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const [val, setVal] = useState(0)

  useEffect(() => {
    if (!inView) return
    const start = Date.now()
    const duration = 1800
    const tick = () => {
      const p = Math.min((Date.now() - start) / duration, 1)
      setVal(Math.round((1 - Math.pow(1 - p, 3)) * to))
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [inView, to])

  return <span ref={ref}>{val.toLocaleString('en-IN')}{suffix}</span>
}

// ── Features data ─────────────────────────────────────────────────────────────
const FEATURES = [
  {
    title: 'Practice with AI',
    desc:  'Pick a scenario. The AI plays the other person and responds like a real human. End the session and get a detailed coaching report.',
  },
  {
    title: 'Prep your talking points',
    desc:  'Paste your meeting agenda. Get six to eight prioritised talking points with delivery tips in under two minutes.',
  },
  {
    title: 'See yourself improve',
    desc:  'Every session is tracked. Watch your filler words drop, your confidence score rise, and your pacing improve week by week.',
  },
]

// ── Pain-point card data (headline + expand content) ─────────────────────────
const PROBLEMS = [
  {
    emoji: '😰',
    headline: 'You go blank',
    body: 'Five things to say. The meeting starts. You remember two.',
    expandTitle: 'Why you freeze up',
    bullets: [
      'Adrenaline shuts down the part of the brain that forms sentences',
      'You rehearsed answers, not real back-and-forth conversations',
      'Without pressure reps, confidence cannot be built before the day',
    ],
  },
  {
    emoji: '🔇',
    headline: 'No real feedback',
    body: '"Be more confident" is not something you can act on.',
    expandTitle: 'Why vague advice fails you',
    bullets: [
      '"Speak slower" and "be confident" give you nothing to actually practise',
      'You cannot hear yourself the way a room hears you',
      'One bad round quietly shakes your confidence for the next three',
    ],
  },
  {
    emoji: '🌍',
    headline: 'Wrong tools',
    body: 'Every coaching app was built for California, not Bengaluru.',
    expandTitle: 'Why they were not built for you',
    bullets: [
      'Calibrated for US English and American interview formats',
      'No scenarios for Indian MNCs, startups, or group discussions',
      'Dollar pricing, Western examples, zero local context',
    ],
  },
]

// ── Feature block — IntersectionObserver activates each one as it scrolls
//    into the centre of the viewport. No sticky, no scroll events, no rAF. ────
function FeatureBlock({ feat, index, isActive, setActive }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // rootMargin shrinks the "visible zone" to the middle 40% of the viewport,
    // so each block fires when it is centred on screen, not just in view.
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setActive(index) },
      { rootMargin: '-30% 0px -30% 0px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [index, setActive])

  return (
    <motion.div
      ref={ref}
      className="py-14 lg:min-h-screen lg:flex lg:items-center lg:py-24"
      animate={{ opacity: isActive ? 1 : 0.2 }}
      transition={{ duration: 0.5, ease }}
    >
      <div>
        <motion.div
          animate={{
            background: isActive ? blue : 'rgba(255,107,53,0.08)',
            color:      isActive ? 'white' : 'rgba(255,107,53,0.4)',
          }}
          transition={{ duration: 0.4 }}
          className="w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-black mb-8"
        >
          {index + 1}
        </motion.div>

        <h3
          className="text-3xl lg:text-4xl font-black mb-5"
          style={{ color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.25)', transition: 'color 0.4s' }}
        >
          {feat.title}
        </h3>

        <p className="text-lg leading-relaxed max-w-sm" style={{ color: '#6B8CAE' }}>
          {feat.desc}
        </p>
      </div>
    </motion.div>
  )
}

// ── Landing page ──────────────────────────────────────────────────────────────
export default function Landing() {
  const [email,     setEmail]     = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [openCard,  setOpenCard]  = useState(null)   // which pain-point card is expanded

  // Hero parallax
  const { scrollY }  = useScroll()
  const phoneY       = useTransform(scrollY, [0, 700], [0, -60])
  const heroOpacity  = useTransform(scrollY, [0, 500], [1, 0])

  const [activeFeature, setActiveFeature] = useState(0)

  async function handleWaitlist(e) {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    await supabase.from('waitlist').insert({ email }).single()
    setSubmitted(true)
    setLoading(false)
  }

  return (
    <div style={{ background: bg, color: text }}>

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <motion.nav
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease }}
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 h-16 border-b"
        style={{
          background: 'rgba(4,8,16,0.85)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderColor: 'rgba(255,255,255,0.07)',
        }}
      >
        <span className="text-xl font-black tracking-tight text-white">
          San<span style={{ color: blue }}>4</span>
        </span>
        <div className="flex items-center gap-3">
          <Link
            to="/auth"
            className="text-sm font-medium transition-colors px-4 py-2"
            style={{ color: 'rgba(255,255,255,0.5)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'white'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
          >
            Sign in
          </Link>
          <Link
            to="/auth?mode=signup"
            className="text-sm font-bold text-white px-5 py-2 rounded-full transition-all active:scale-95 hover:opacity-90"
            style={{ background: blue, boxShadow: '0 4px 18px rgba(255,107,53,0.4)' }}
          >
            Try free →
          </Link>
        </div>
      </motion.nav>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section
        className="relative min-h-screen flex items-center pt-16 px-8 overflow-hidden"
        style={{ background: '#040810' }}
      >
        {/* Grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
            backgroundSize: '72px 72px',
          }}
        />
        {/* Large vivid orange bloom — top right */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: '-250px', right: '-200px',
            width: '900px', height: '900px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,107,53,0.28) 0%, rgba(255,107,53,0.08) 40%, transparent 70%)',
          }}
        />
        {/* Large vivid purple bloom — bottom left */}
        <div
          className="absolute pointer-events-none"
          style={{
            bottom: '-300px', left: '-200px',
            width: '900px', height: '800px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(139,92,246,0.2) 0%, rgba(139,92,246,0.06) 45%, transparent 70%)',
          }}
        />
        {/* Teal bloom — center bottom */}
        <div
          className="absolute pointer-events-none"
          style={{
            bottom: '-100px', left: '50%', transform: 'translateX(-50%)',
            width: '600px', height: '400px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0,196,154,0.08) 0%, transparent 70%)',
          }}
        />

        <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-16 items-center relative z-10">
          {/* Text */}
          <div>
            {/* Vak mascot floating — hero centrepiece */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.05, ease }}
              className="flex items-center gap-5 mb-6"
            >
              <div className="animate-float relative">
                {/* Glow behind Vak */}
                <div className="absolute inset-0 pointer-events-none -z-10"
                  style={{
                    background: 'radial-gradient(circle, rgba(139,92,246,0.3) 0%, transparent 60%)',
                    transform: 'scale(1.4)',
                  }} />
                <VakMascot level={3} size={130} />
              </div>
              <div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-2xl font-black text-white">Vak</span>
                  <span className="text-lg font-semibold" style={{ color: '#8B5CF6' }}>वाक्</span>
                </div>
                <div
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full mb-1.5"
                  style={{ background: 'rgba(255,107,53,0.15)', border: '1px solid rgba(255,107,53,0.3)', color: '#FF8F4F' }}
                >
                  🦢 Your AI communication coach
                </div>
                <div
                  className="text-xs font-semibold tracking-widest uppercase"
                  style={{ color: 'rgba(107,140,174,0.6)' }}
                >
                  India's first · Built for Indian voices
                </div>
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease }}
              className="text-6xl lg:text-7xl font-black leading-[1.05] tracking-tight mb-6 text-white"
            >
              Speak with<br />
              <span style={{ color: '#00C49A' }}>confidence</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.35, ease }}
              className="text-lg leading-relaxed mb-10 max-w-md"
              style={{ color: 'rgba(255,255,255,0.55)' }}
            >
              Practice interviews, meetings, and negotiations with AI.
              Earn XP, build streaks, level up your communication.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.5, ease }}
              className="flex flex-col sm:flex-row gap-3 max-w-md"
            >
              {submitted ? (
                <div className="flex items-center gap-3 font-semibold" style={{ color: green }}>
                  <span className="text-xl">✓</span> You're on the list.
                </div>
              ) : (
                <>
                  <input
                    type="email"
                    placeholder="you@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="flex-1 text-white rounded-full px-5 py-3 text-sm focus:outline-none transition-colors"
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.15)',
                    }}
                  />
                  <button
                    onClick={handleWaitlist}
                    disabled={loading || !email}
                    className="font-bold px-6 py-3 rounded-full text-sm transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap hover:opacity-90"
                    style={{ background: blue, color: 'white' }}
                  >
                    {loading ? '…' : 'Join free →'}
                  </button>
                </>
              )}
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="text-xs mt-4"
              style={{ color: 'rgba(255,255,255,0.25)' }}
            >
              No credit card. 3 free sessions included. ⭐ +150 XP on signup.
            </motion.p>

            {/* iOS + Android teaser */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.9, ease }}
              className="flex items-center gap-2 mt-5"
            >
              <span
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-full"
                style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)', color: '#A78BFA' }}
              >
                📱 Coming to iOS & Android
              </span>
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>Live meeting feedback in your pocket</span>
            </motion.div>
          </div>

          {/* Phone */}
          <motion.div
            style={{ y: phoneY, opacity: heroOpacity }}
            className="hidden lg:flex justify-center items-center"
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3, ease }}
          >
            <PhoneMockup activeIndex={0} />
          </motion.div>
        </div>

        {/* Scroll cue */}
        <motion.div
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
          style={{ opacity: heroOpacity }}
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="w-px h-12 bg-gradient-to-b from-transparent to-white/25 mx-auto"
          />
        </motion.div>
      </section>

      {/* ── Meet Vak ──────────────────────────────────────────────────────── */}
      <section className="py-28 px-8 relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #060C1C 0%, #040810 100%)' }}>
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[700px] h-[700px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 60%)' }} />
        <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(255,107,53,0.12) 0%, transparent 60%)' }} />

        <div className="max-w-6xl mx-auto">

          {/* Two-column: Vak + story */}
          <div className="grid lg:grid-cols-2 gap-16 items-center mb-20">

            {/* Left — big Vak floating */}
            <FadeUp className="flex flex-col items-center justify-center">
              <div className="relative flex justify-center">
                {/* Glow aura ring */}
                <div className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'radial-gradient(circle, rgba(139,92,246,0.22) 0%, transparent 60%)',
                    transform: 'scale(1.6)',
                  }} />
                <div className="animate-float relative z-10">
                  <VakMascot level={4} size={220} />
                </div>
              </div>
              <div className="mt-5 text-center">
                <div className="flex items-baseline justify-center gap-3">
                  <span className="text-4xl font-black text-white tracking-tight">Vak</span>
                  <span className="text-2xl font-bold" style={{ color: '#8B5CF6' }}>वाक्</span>
                </div>
                <p className="text-sm mt-1.5 font-medium" style={{ color: '#6B8CAE' }}>
                  Sanskrit · <em>"Speech"</em> · Vehicle of Saraswati
                </p>
              </div>
            </FadeUp>

            {/* Right — story */}
            <FadeUp delay={0.15}>
              <div
                className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full mb-6"
                style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.28)', color: '#A78BFA' }}
              >
                🦢 The Hamsa of Saraswati
              </div>

              <h2 className="text-4xl lg:text-5xl font-black text-white leading-tight mb-6">
                Your AI coach,<br />
                <span style={{ color: blue }}>built for Indian voices</span>
              </h2>

              <p className="text-lg leading-relaxed mb-5" style={{ color: '#6B8CAE' }}>
                The Hamsa, the sacred swan, is the mount of Saraswati, goddess of speech,
                learning, and expression. In ancient tradition, the swan separates milk from water,
                truth from noise.
              </p>

              <p className="text-lg leading-relaxed mb-8" style={{ color: '#6B8CAE' }}>
                We named our AI coach <strong className="text-white font-bold">Vak</strong>, the
                Sanskrit word for speech, because great communication isn't a Western import.
                It's ancient, it's Indian, and it starts with your voice.
              </p>

              <div className="flex flex-wrap gap-3">
                {[
                  { icon: '🎓', text: 'Built for Indian professionals' },
                  { icon: '🗣️', text: 'Knows GD rounds & MNC culture' },
                  { icon: '🌏', text: 'Indian scenarios, not US formats' },
                ].map(item => (
                  <div key={item.text}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
                    style={{
                      background: 'linear-gradient(160deg, #10192E 0%, #0B1220 100%)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: '#CBD5E1',
                    }}>
                    <span>{item.icon}</span> {item.text}
                  </div>
                ))}
              </div>
            </FadeUp>
          </div>

          {/* Level progression — Vak evolution */}
          <FadeUp delay={0.25}>
            <div
              className="rounded-3xl p-8"
              style={{
                background: 'linear-gradient(160deg, #10192E 0%, #0B1220 100%)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <p className="text-center text-sm font-semibold mb-2 text-white">
                Vak grows as you practice
              </p>
              <p className="text-center text-xs mb-10" style={{ color: '#6B8CAE' }}>
                Every session earns XP. Watch your swan spread its wings.
              </p>
              <div className="grid grid-cols-5 gap-3 sm:gap-6">
                {[
                  { level: 1, name: 'Hesitant',   xp: '0 XP',    color: '#6B8CAE' },
                  { level: 2, name: 'Aware',       xp: '300 XP',  color: '#00C49A' },
                  { level: 3, name: 'Expressive',  xp: '800 XP',  color: '#FF6B35' },
                  { level: 4, name: 'Influential', xp: '1,800 XP', color: '#8B5CF6' },
                  { level: 5, name: 'Vaksiddha',  xp: '4,000 XP', color: '#F59E0B' },
                ].map(({ level, name, xp, color }, i) => (
                  <motion.div
                    key={level}
                    className="flex flex-col items-center gap-2"
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.1, ease }}
                  >
                    {/* Subtle glow under each swan */}
                    <div className="relative flex justify-center">
                      <div className="absolute bottom-0 w-12 h-4 rounded-full blur-md"
                        style={{ background: color, opacity: 0.25 }} />
                      <VakMascot level={level} size={68} />
                    </div>
                    <div className="text-xs font-bold text-center hidden sm:block" style={{ color }}>
                      {name}
                    </div>
                    <div className="text-xs font-bold text-center sm:hidden" style={{ color }}>
                      Lv{level}
                    </div>
                    <div className="text-xs text-center" style={{ color: 'rgba(107,140,174,0.6)' }}>
                      {xp}
                    </div>
                    {i < 4 && (
                      <div className="hidden sm:block text-xs mt-1" style={{ color: 'rgba(255,255,255,0.1)' }}>
                        →
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── Problem ────────────────────────────────────────────────────────── */}
      <section className="py-20 lg:py-40 px-8" style={{ background: '#040810' }}>
        <div className="max-w-4xl mx-auto text-center">
          <FadeUp>
            <p className="text-xs font-semibold uppercase tracking-widest mb-10" style={{ color: '#6B8CAE' }}>
              The problem
            </p>
          </FadeUp>
          <FadeUp delay={0.1}>
            <h2 className="text-4xl lg:text-5xl font-black leading-tight mb-5 text-white">
              Most training tells you{' '}
              <span style={{ color: blue }}>what</span> to do.
            </h2>
          </FadeUp>
          <FadeUp delay={0.2}>
            <h2 className="text-4xl lg:text-5xl font-black leading-tight text-white">
              San4 makes you{' '}
              <span style={{ color: blue }}>actually do it.</span>
            </h2>
          </FadeUp>
        </div>
      </section>

      {/* ── Pain points — expandable accordion cards ───────────────────────── */}
      <section className="pb-16 lg:pb-40 px-8" style={{ background: '#040810' }}>
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6 items-start">
          {PROBLEMS.map((card, i) => {
            const isOpen = openCard === i
            return (
              <FadeUp key={card.headline} delay={i * 0.12}>
                <motion.div
                  className="rounded-2xl overflow-hidden cursor-pointer select-none"
                  style={{
                    background: 'linear-gradient(160deg, #10192E 0%, #0B1220 100%)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: isOpen ? '1px solid rgba(255,107,53,0.3)' : '1px solid rgba(255,255,255,0.07)',
                    boxShadow: isOpen ? '0 16px 48px rgba(255,107,53,0.1)' : 'none',
                  }}
                  onClick={() => setOpenCard(isOpen ? null : i)}
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.99 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Card header */}
                  <div className="p-7">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-3xl mb-4">{card.emoji}</div>
                        <h3 className="text-base font-bold mb-2 text-white">
                          {card.headline}
                        </h3>
                        <p className="text-sm leading-relaxed" style={{ color: '#6B8CAE' }}>{card.body}</p>
                      </div>

                      {/* + / − toggle icon */}
                      <motion.div
                        animate={{ rotate: isOpen ? 45 : 0 }}
                        transition={{ duration: 0.25, ease }}
                        className="flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center mt-0.5"
                        style={{
                          borderColor: isOpen ? blue : '#E2E8F0',
                          color:       isOpen ? blue : '#CBD5E1',
                        }}
                      >
                        {/* Plus icon (rotates 45° to become × ) */}
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                          <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                        </svg>
                      </motion.div>
                    </div>
                  </div>

                  {/* Expandable bullets */}
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key="expand"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.32, ease }}
                        className="overflow-hidden"
                      >
                        <div className="px-7 pb-7">
                          <div className="pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                            <p className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: blue }}>
                              {card.expandTitle}
                            </p>
                            <ul className="space-y-3">
                              {card.bullets.map((b, j) => (
                                <li key={j} className="flex items-start gap-3">
                                  <span
                                    className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-black text-white mt-0.5"
                                    style={{ background: blue }}
                                  >
                                    {j + 1}
                                  </span>
                                  <span className="text-sm leading-relaxed" style={{ color: '#94A3B8' }}>{b}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </FadeUp>
            )
          })}
        </div>
      </section>

      {/* ── How it works — two-column: sticky phone + IO-driven feature blocks ── */}
      {/*
          Architecture: the phone column uses position:sticky inside a normal
          flex row. Each feature block uses IntersectionObserver to fire when
          it enters the centre of the viewport — no scroll events, no rAF,
          no 400vh height hacks. Works regardless of any parent overflow.
      */}
      <section style={{ background: '#040810' }}>
        <div className="max-w-7xl mx-auto px-8">

          {/* Section label */}
          <div className="pt-32 pb-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6B8CAE' }}>
              How it works
            </p>
          </div>

          {/* Two-column layout */}
          <div className="lg:flex lg:gap-20 lg:items-start">

            {/* Left — sticky phone (desktop only) */}
            <div
              className="hidden lg:flex justify-center flex-shrink-0"
              style={{ position: 'sticky', top: 'calc(50vh - 260px)' }}
            >
              <PhoneMockup activeIndex={activeFeature} />
            </div>

            {/* Right — one FeatureBlock per feature, each ~100vh */}
            <div className="flex-1 pb-32">
              {FEATURES.map((feat, i) => (
                <FeatureBlock
                  key={feat.title}
                  feat={feat}
                  index={i}
                  isActive={activeFeature === i}
                  setActive={setActiveFeature}
                />
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* ── Numbers ────────────────────────────────────────────────────────── */}
      <section className="py-40 px-8" style={{ background: '#040810' }}>
        <div className="max-w-5xl mx-auto">
          <FadeUp className="text-center mb-20">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6B8CAE' }}>
              Why San4
            </p>
          </FadeUp>

          <div className="grid md:grid-cols-3 gap-16 text-center">
            {[
              { number: 600, suffix: 'K+', label: 'People in the community',  sub: 'built on trust, not ads' },
              { number: 91,  suffix: '%',  label: 'Of Indian employers',       sub: 'say communication is the top skill gap' },
              { number: 0,   suffix: '',   label: 'Indian AI coaches',          sub: 'built for Indian professionals. Until now.' },
            ].map(({ number, suffix, label, sub }, i) => (
              <FadeUp key={label} delay={i * 0.1}>
                <div className="text-6xl font-black mb-3" style={{ color: blue }}>
                  <Counter to={number} suffix={suffix} />
                </div>
                <div className="font-semibold mb-1 text-white">{label}</div>
                <div className="text-sm" style={{ color: '#6B8CAE' }}>{sub}</div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── Scenarios strip ────────────────────────────────────────────────── */}
      <section className="py-20 overflow-hidden" style={{ background: '#040810' }}>
        <FadeUp className="text-center mb-12 px-8">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6B8CAE' }}>
            What you can practice
          </p>
        </FadeUp>

        <div className="relative select-none">
          <motion.div
            className="flex gap-4 w-max px-4"
            animate={{ x: ['0%', '-50%'] }}
            transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
          >
            {[...Array(2)].flatMap(() =>
              [
                '💼 HR Interview', '📊 Client Presentation', '💰 Salary Negotiation',
                '⭐ Performance Review', '👥 Team Meeting', '🗣️ Group Discussion',
                '💬 Social Conversation', '❤️ First Date', '📞 Cold Call', '🚀 Project Kickoff',
              ].map((s, i) => (
                <div
                  key={`${s}-${i}`}
                  className="whitespace-nowrap text-sm font-medium px-6 py-3 rounded-full border"
                  style={{
                    background:   `${blue}0C`,
                    borderColor:  `${blue}22`,
                    color:        blue,
                  }}
                >
                  {s}
                </div>
              ))
            )}
          </motion.div>
        </div>
      </section>

      {/* ── Founder ────────────────────────────────────────────────────────── */}
      <section className="py-40 px-8" style={{ background: '#040810' }}>
        <div className="max-w-3xl mx-auto text-center">
          <FadeUp>
            <div className="relative inline-block mb-10">
              <img
                src="/aman.jpg"
                alt="Aman Jindal"
                className="w-28 h-28 rounded-full object-cover object-top mx-auto"
                style={{
                  border:     `4px solid ${blue}45`,
                  boxShadow:  `0 0 48px ${blue}28`,
                }}
              />
              <div
                className="absolute inset-0 rounded-full blur-2xl opacity-25 -z-10 scale-125"
                style={{ background: `radial-gradient(circle, ${blue} 0%, transparent 70%)` }}
              />
            </div>
          </FadeUp>

          <FadeUp delay={0.1}>
            <h2 className="text-4xl font-black mb-6 text-white">
              Built by Aman
            </h2>
          </FadeUp>

          <FadeUp delay={0.2}>
            <p className="text-lg leading-relaxed max-w-xl mx-auto" style={{ color: '#6B8CAE' }}>
              A teacher and a student of communication. San4 brings years of coaching,
              communication frameworks, and hiring insights into one AI copilot designed
              to help you speak smarter, interview better, and get hired faster.
            </p>
          </FadeUp>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────────── */}
      <section className="py-40 px-8" style={{ background: '#040810' }}>
        <div className="max-w-2xl mx-auto text-center">
          <FadeUp>
            <h2 className="text-6xl lg:text-7xl font-black mb-4 text-white">
              Ready?
            </h2>
          </FadeUp>

          <FadeUp delay={0.1}>
            <p className="text-lg mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Three free sessions. No card needed.
            </p>
          </FadeUp>
          <FadeUp delay={0.15}>
            <div className="flex items-center justify-center gap-3 mb-10">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-full"
                style={{ background: 'rgba(0,196,154,0.12)', border: '1px solid rgba(0,196,154,0.25)', color: '#00C49A' }}>
                🔥 Streaks · ⭐ XP · 🏆 Levels
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-full"
                style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)', color: '#A78BFA' }}>
                📱 iOS & Android coming soon
              </span>
            </div>
          </FadeUp>

          <FadeUp delay={0.2}>
            {submitted ? (
              <div className="font-semibold text-xl" style={{ color: green }}>
                ✓ You're on the list. We'll be in touch.
              </div>
            ) : (
              <form
                onSubmit={handleWaitlist}
                className="flex flex-col sm:flex-row gap-3 justify-center"
              >
                <input
                  type="email"
                  placeholder="you@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="text-white rounded-full px-6 py-4 text-sm focus:outline-none transition-colors sm:w-72"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border:     '1px solid rgba(255,255,255,0.15)',
                  }}
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="font-bold px-8 py-4 rounded-full text-sm text-white transition-all active:scale-95 hover:opacity-90 disabled:opacity-50"
                  style={{ background: blue }}
                >
                  {loading ? '…' : 'Start practicing'}
                </button>
              </form>
            )}
          </FadeUp>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer
        className="py-10 px-8 text-center"
        style={{ background: navy, borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center justify-center gap-3 mb-2">
          <VakMascot level={2} size={36} />
          <span className="text-lg font-black text-white">
            San<span style={{ color: blue }}>4</span>
          </span>
        </div>
        <p className="text-xs" style={{ color: '#374151' }}>
          Powered by Vak (वाक्) · Sanchaar (सञ्चार) · Communicate with Confidence · Made in India 🇮🇳
        </p>

        {/* Social links */}
        <div className="flex items-center justify-center gap-5 mt-8">
          {/* YouTube */}
          <a
            href="https://youtube.com/@talkprowithaman"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="YouTube"
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
            style={{ background: 'rgba(255,255,255,0.06)', color: '#94A3B8' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#FF0000'; e.currentTarget.style.color = 'white' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#94A3B8' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
          </a>

          {/* Instagram */}
          <a
            href="https://www.instagram.com/talkprowithaman"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
            style={{ background: 'rgba(255,255,255,0.06)', color: '#94A3B8' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#E1306C'; e.currentTarget.style.color = 'white' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#94A3B8' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
          </a>

          {/* LinkedIn */}
          <a
            href="https://www.linkedin.com/in/amann-jindal"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
            style={{ background: 'rgba(255,255,255,0.06)', color: '#94A3B8' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#0A66C2'; e.currentTarget.style.color = 'white' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#94A3B8' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
          </a>
        </div>

        <div className="flex items-center justify-center gap-6 mt-6 text-xs text-slate-600">
          <Link to="/auth" className="hover:text-slate-300 transition-colors">Sign in</Link>
          <Link to="/auth?mode=signup" className="hover:text-slate-300 transition-colors">Sign up</Link>
        </div>
      </footer>

    </div>
  )
}
