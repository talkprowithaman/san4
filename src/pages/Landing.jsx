import { useRef, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  motion,
  useScroll,
  useTransform,
  useInView,
  useSpring,
  AnimatePresence,
} from 'framer-motion'
import { supabase } from '../lib/supabase'

// ── Easing ────────────────────────────────────────────────────────────────────
const ease = [0.25, 0.1, 0.25, 1]

// ── Fade-up animation preset ─────────────────────────────────────────────────
function FadeUp({ children, delay = 0, className = '' }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease }}
    >
      {children}
    </motion.div>
  )
}

// ── Phone mockup ──────────────────────────────────────────────────────────────
const PHONE_SCREENS = [
  {
    label: 'Practice',
    content: (
      <div className="flex flex-col gap-3 p-4 h-full overflow-hidden">
        <div className="text-xs text-slate-400 font-medium text-center pb-2 border-b border-white/5">
          HR Interview · 3:42
        </div>
        <div className="bg-slate-700/60 rounded-2xl rounded-tl-sm p-3 max-w-[80%]">
          <p className="text-white text-xs leading-relaxed">Tell me about a time you handled a difficult stakeholder. Walk me through it.</p>
        </div>
        <div className="bg-[#FF6B35] rounded-2xl rounded-tr-sm p-3 max-w-[80%] self-end">
          <p className="text-white text-xs leading-relaxed">In my last project at Deloitte, I had a client who kept changing scope...</p>
        </div>
        <div className="bg-slate-700/60 rounded-2xl rounded-tl-sm p-3 max-w-[80%]">
          <p className="text-white text-xs leading-relaxed">Good. What was the outcome, and what would you do differently?</p>
        </div>
        <div className="mt-auto border border-white/10 rounded-xl px-3 py-2 flex items-center gap-2">
          <span className="text-slate-500 text-xs flex-1">Your response…</span>
          <div className="w-6 h-6 bg-[#FF6B35] rounded-full flex items-center justify-center">
            <span className="text-white text-xs">↑</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    label: 'Prepare',
    content: (
      <div className="flex flex-col gap-3 p-4 h-full overflow-hidden">
        <div className="text-xs text-slate-400 font-medium pb-2 border-b border-white/5">
          Q3 Client Review · 6 talking points
        </div>
        {[
          { p: 'Open with delivery summary', t: 'Lead with the win before the challenges', high: true },
          { p: 'Address the Q2 delay directly', t: 'Name it before they do', high: true },
          { p: 'Present the revised Q3 plan', t: 'Show three options, not one', high: true },
          { p: 'Confirm budget alignment', t: 'Ask, do not assume', high: false },
        ].map((item, i) => (
          <div key={i} className={`border-l-2 ${item.high ? 'border-[#FF6B35]' : 'border-slate-600'} pl-3`}>
            <p className="text-white text-xs font-medium">{item.p}</p>
            <p className="text-slate-500 text-xs mt-0.5">{item.t}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    label: 'Improve',
    content: (
      <div className="flex flex-col gap-3 p-4 h-full overflow-hidden">
        <div className="text-xs text-slate-400 font-medium pb-2 border-b border-white/5">
          Session report · HR Interview
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Overall', val: '84%', color: '#00C49A' },
            { label: 'Confidence', val: '78%', color: '#FF6B35' },
            { label: 'Pacing', val: '91%', color: '#00C49A' },
          ].map(s => (
            <div key={s.label} className="bg-white/5 rounded-xl p-2 text-center">
              <div className="text-base font-black" style={{ color: s.color }}>{s.val}</div>
              <div className="text-slate-500 text-xs">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="bg-white/5 rounded-xl p-3">
          <div className="text-slate-400 text-xs mb-1">Filler words</div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-[#00C49A]">3</span>
            <span className="text-slate-500 text-xs">this session vs 14 last week</span>
          </div>
        </div>
        <div className="bg-[#FF6B35]/10 border border-[#FF6B35]/20 rounded-xl p-3">
          <div className="text-[#FF6B35] text-xs font-semibold mb-1">Action item</div>
          <p className="text-white text-xs">Pause before answering. Your best answers came after a 2-second pause.</p>
        </div>
      </div>
    ),
  },
]

function PhoneMockup({ activeIndex, rotateY = 0, scale = 1 }) {
  return (
    <motion.div
      style={{ rotateY, scale, transformPerspective: 1200 }}
      className="relative"
    >
      {/* Glow */}
      <div
        className="absolute inset-0 rounded-[44px] blur-3xl opacity-20 -z-10"
        style={{ background: 'radial-gradient(circle, #FF6B35 0%, transparent 70%)' }}
      />
      {/* Frame */}
      <div
        className="relative overflow-hidden"
        style={{
          width: 260,
          height: 520,
          borderRadius: 44,
          background: '#0A1628',
          border: '8px solid rgba(255,255,255,0.10)',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 60px 120px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
        }}
      >
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-black/60 rounded-b-2xl z-10" />
        {/* Screen content */}
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
function Counter({ to, suffix = '', prefix = '' }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const [val, setVal] = useState(0)

  useEffect(() => {
    if (!inView) return
    const start = Date.now()
    const duration = 1800
    const frame = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setVal(Math.round(eased * to))
      if (progress < 1) requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  }, [inView, to])

  return (
    <span ref={ref}>
      {prefix}{val.toLocaleString('en-IN')}{suffix}
    </span>
  )
}

// ── Main landing page ─────────────────────────────────────────────────────────
export default function Landing() {
  const [email, setEmail]         = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading]     = useState(false)

  // Hero parallax
  const heroRef    = useRef(null)
  const { scrollY } = useScroll()
  const phoneY      = useTransform(scrollY, [0, 700], [0, -60])
  const heroOpacity = useTransform(scrollY, [0, 500], [1, 0])

  // Apple-style sticky section
  const featuresRef = useRef(null)
  const { scrollYProgress: featProg } = useScroll({
    target: featuresRef,
    offset: ['start start', 'end end'],
  })
  const smoothProg  = useSpring(featProg, { stiffness: 80, damping: 20 })
  const phoneRotate = useTransform(smoothProg, [0, 0.5, 1], [6, 0, -6])
  const phoneScale  = useTransform(smoothProg, [0, 0.15, 0.85, 1], [0.92, 1, 1, 0.92])
  const [activeFeature, setActiveFeature] = useState(0)

  useEffect(() => {
    return featProg.on('change', v => {
      if (v < 0.33)      setActiveFeature(0)
      else if (v < 0.66) setActiveFeature(1)
      else               setActiveFeature(2)
    })
  }, [featProg])

  async function handleWaitlist(e) {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    await supabase.from('waitlist').insert({ email }).single()
    setSubmitted(true)
    setLoading(false)
  }

  return (
    <div className="bg-[#070D1A] text-white overflow-x-hidden">

      {/* ── Navbar ── */}
      <motion.nav
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease }}
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 h-16"
        style={{ background: 'rgba(7,13,26,0.80)', backdropFilter: 'blur(20px)' }}
      >
        <span className="text-xl font-black tracking-tight">
          San<span className="text-[#FF6B35]">4</span>
        </span>
        <div className="flex items-center gap-4">
          <Link to="/auth" className="text-sm text-slate-400 hover:text-white transition-colors">
            Sign in
          </Link>
          <Link
            to="/auth?mode=signup"
            className="text-sm font-semibold bg-[#FF6B35] text-white px-5 py-2 rounded-full hover:bg-orange-500 transition-all active:scale-95"
          >
            Try free
          </Link>
        </div>
      </motion.nav>

      {/* ── Hero ── */}
      <section
        ref={heroRef}
        className="relative min-h-screen flex items-center pt-16 px-8 overflow-hidden"
      >
        {/* Background glow */}
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] rounded-full opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, #FF6B35 0%, transparent 65%)' }}
        />

        <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-16 items-center">
          {/* Left — text */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease }}
              className="inline-flex items-center gap-2 text-xs font-semibold text-[#FF6B35] tracking-widest uppercase mb-8"
            >
              <span className="w-4 h-px bg-[#FF6B35]" />
              India's first AI communication coach
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease }}
              className="text-6xl lg:text-7xl font-black leading-[1.05] tracking-tight mb-6"
            >
              Speak with<br />
              <span className="text-[#FF6B35]">confidence.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.35, ease }}
              className="text-lg text-slate-400 leading-relaxed mb-10 max-w-md"
            >
              Practice interviews, meetings, and negotiations with AI.
              Get better every session.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.5, ease }}
              className="flex flex-col sm:flex-row gap-3 max-w-md"
            >
              {submitted ? (
                <div className="flex items-center gap-3 text-[#00C49A] font-semibold">
                  <span className="text-xl">✓</span> You're on the list.
                </div>
              ) : (
                <>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="flex-1 bg-white/5 border border-white/10 text-white placeholder-slate-500 rounded-full px-5 py-3 text-sm focus:outline-none focus:border-[#FF6B35] transition-colors"
                  />
                  <button
                    onClick={handleWaitlist}
                    disabled={loading || !email}
                    className="bg-[#FF6B35] text-white font-semibold px-6 py-3 rounded-full text-sm hover:bg-orange-500 transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap"
                  >
                    {loading ? '…' : 'Join free'}
                  </button>
                </>
              )}
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="text-xs text-slate-600 mt-4"
            >
              No credit card. 3 free sessions included.
            </motion.p>
          </div>

          {/* Right — phone with parallax */}
          <motion.div
            style={{ y: phoneY, opacity: heroOpacity }}
            className="hidden lg:flex justify-center items-center"
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3, ease }}
          >
            <PhoneMockup activeIndex={0} rotateY={4} />
          </motion.div>
        </div>

        {/* Scroll cue */}
        <motion.div
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          style={{ opacity: heroOpacity }}
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            className="w-px h-10 bg-gradient-to-b from-transparent to-white/20"
          />
        </motion.div>
      </section>

      {/* ── The gap ── */}
      <section className="py-40 px-8">
        <div className="max-w-4xl mx-auto text-center">
          <FadeUp>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-8">
              The problem
            </p>
          </FadeUp>
          <FadeUp delay={0.1}>
            <h2 className="text-4xl lg:text-5xl font-black leading-tight mb-6">
              Most training tells you{' '}
              <span className="text-slate-500">what</span> to do.
            </h2>
          </FadeUp>
          <FadeUp delay={0.2}>
            <h2 className="text-4xl lg:text-5xl font-black leading-tight">
              San4 makes you{' '}
              <span className="text-[#FF6B35]">actually do it.</span>
            </h2>
          </FadeUp>
        </div>
      </section>

      {/* ── Three pain points ── */}
      <section className="pb-40 px-8">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-px bg-white/5 rounded-3xl overflow-hidden">
          {[
            { emoji: '😰', headline: 'You go blank.', body: 'Five things to say. The meeting starts. You remember two.' },
            { emoji: '🔇', headline: 'No real feedback.', body: '"Be more confident" is not something you can act on.' },
            { emoji: '🌍', headline: 'Wrong tools.', body: 'Every coaching app was built for California, not Bengaluru.' },
          ].map(({ emoji, headline, body }, i) => (
            <FadeUp key={headline} delay={i * 0.12} className="bg-[#0D1828] p-10">
              <div className="text-3xl mb-6">{emoji}</div>
              <h3 className="text-xl font-bold text-white mb-3">{headline}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{body}</p>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ── Apple scroll: sticky feature section ── */}
      <section ref={featuresRef} style={{ height: '300vh' }} className="relative">
        <div className="sticky top-0 h-screen flex items-center overflow-hidden">
          <div className="max-w-7xl mx-auto w-full px-8 grid lg:grid-cols-2 gap-16 items-center">

            {/* Left: phone */}
            <div className="hidden lg:flex justify-center">
              <PhoneMockup
                activeIndex={activeFeature}
                rotateY={phoneRotate}
                scale={phoneScale}
              />
            </div>

            {/* Right: feature list */}
            <div className="space-y-10">
              <FadeUp>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-12">
                  How it works
                </p>
              </FadeUp>

              {PHONE_SCREENS.map((feat, i) => (
                <motion.div
                  key={feat.label}
                  animate={{
                    opacity: activeFeature === i ? 1 : 0.25,
                    x: activeFeature === i ? 0 : -8,
                  }}
                  transition={{ duration: 0.4, ease }}
                  className="cursor-default"
                >
                  <div className="flex items-center gap-4 mb-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black transition-colors"
                      style={{
                        background: activeFeature === i ? '#FF6B35' : 'rgba(255,255,255,0.05)',
                        color: activeFeature === i ? 'white' : '#64748b',
                      }}
                    >
                      {i + 1}
                    </div>
                    <h3
                      className="text-2xl font-black transition-colors"
                      style={{ color: activeFeature === i ? 'white' : '#334155' }}
                    >
                      {i === 0 && 'Practice with AI'}
                      {i === 1 && 'Prep your talking points'}
                      {i === 2 && 'See yourself improve'}
                    </h3>
                  </div>
                  <p
                    className="text-slate-500 text-base leading-relaxed pl-12 transition-colors"
                    style={{ opacity: activeFeature === i ? 1 : 0 }}
                  >
                    {i === 0 && 'Pick a scenario. The AI plays the other person and responds like a real human. End the session and get a detailed coaching report.'}
                    {i === 1 && 'Paste your meeting agenda. Get six to eight prioritised talking points with delivery tips in under two minutes.'}
                    {i === 2 && 'Every session is tracked. Watch your filler words drop, your confidence score rise, and your pacing improve week by week.'}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Numbers ── */}
      <section className="py-40 px-8">
        <div className="max-w-5xl mx-auto">
          <FadeUp className="text-center mb-20">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
              Why San4
            </p>
          </FadeUp>

          <div className="grid md:grid-cols-3 gap-16 text-center">
            {[
              {
                number: 600,
                suffix: 'K+',
                label: 'People in the community',
                sub: 'built on trust, not ads',
              },
              {
                number: 91,
                suffix: '%',
                label: 'Of Indian employers',
                sub: 'say communication is the top skill gap',
              },
              {
                number: 0,
                suffix: '',
                label: 'Indian AI coaches',
                sub: 'built for Indian professionals. Until now.',
              },
            ].map(({ number, suffix, label, sub }, i) => (
              <FadeUp key={label} delay={i * 0.1}>
                <div className="text-6xl font-black text-[#FF6B35] mb-3">
                  <Counter to={number} suffix={suffix} />
                </div>
                <div className="text-white font-semibold mb-1">{label}</div>
                <div className="text-slate-500 text-sm">{sub}</div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── Scenarios strip ── */}
      <section className="py-20 overflow-hidden">
        <FadeUp className="text-center mb-12 px-8">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
            What you can practice
          </p>
        </FadeUp>

        {/* Infinite scroll strip */}
        <div className="relative">
          <motion.div
            className="flex gap-4 w-max"
            animate={{ x: ['0%', '-50%'] }}
            transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
          >
            {[...Array(2)].flatMap(() =>
              [
                'HR Interview', 'Client Presentation', 'Salary Negotiation',
                'Performance Review', 'Team Meeting', 'Group Discussion',
                'Cold Call', 'Project Kickoff', 'Stakeholder Update',
              ].map((s, i) => (
                <div
                  key={`${s}-${i}`}
                  className="whitespace-nowrap bg-white/5 border border-white/8 text-slate-300 text-sm font-medium px-6 py-3 rounded-full"
                >
                  {s}
                </div>
              ))
            )}
          </motion.div>
        </div>
      </section>

      {/* ── Aman section ── */}
      <section className="py-40 px-8">
        <div className="max-w-3xl mx-auto text-center">
          <FadeUp>
            <div className="w-16 h-16 rounded-full bg-[#FF6B35]/20 border border-[#FF6B35]/30 flex items-center justify-center text-2xl mx-auto mb-8">
              👋
            </div>
          </FadeUp>

          <FadeUp delay={0.1}>
            <h2 className="text-4xl font-black mb-6">
              Built by Aman Jindal.
            </h2>
          </FadeUp>

          <FadeUp delay={0.2}>
            <p className="text-slate-400 text-lg leading-relaxed max-w-xl mx-auto">
              I've spent years coaching people on professional communication. San4 is everything I know, available whenever you need it, for a fraction of what a coach would cost.
            </p>
          </FadeUp>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-40 px-8">
        <div className="max-w-2xl mx-auto text-center">
          <FadeUp>
            <h2 className="text-6xl lg:text-7xl font-black mb-4">
              Ready?
            </h2>
          </FadeUp>

          <FadeUp delay={0.1}>
            <p className="text-slate-400 text-lg mb-12">
              Three free sessions. No card needed.
            </p>
          </FadeUp>

          <FadeUp delay={0.2}>
            {submitted ? (
              <div className="text-[#00C49A] font-semibold text-xl">
                ✓ You're on the list. We'll be in touch.
              </div>
            ) : (
              <form
                onSubmit={handleWaitlist}
                className="flex flex-col sm:flex-row gap-3 justify-center"
              >
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="bg-white/5 border border-white/10 text-white placeholder-slate-600 rounded-full px-6 py-4 text-sm focus:outline-none focus:border-[#FF6B35] transition-colors sm:w-72"
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-[#FF6B35] text-white font-semibold px-8 py-4 rounded-full text-sm hover:bg-orange-500 transition-all active:scale-95"
                >
                  {loading ? '…' : 'Start practicing'}
                </button>
              </form>
            )}
          </FadeUp>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 py-10 px-8 text-center">
        <div className="text-lg font-black mb-2">
          San<span className="text-[#FF6B35]">4</span>
        </div>
        <p className="text-slate-600 text-xs">
          Sanchaar (सञ्चार) · Communicate with Confidence · Made in India 🇮🇳
        </p>
        <div className="flex items-center justify-center gap-6 mt-6 text-xs text-slate-600">
          <Link to="/auth" className="hover:text-slate-400 transition-colors">Sign in</Link>
          <Link to="/auth?mode=signup" className="hover:text-slate-400 transition-colors">Sign up</Link>
        </div>
      </footer>
    </div>
  )
}
