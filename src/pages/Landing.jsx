import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const FEATURES = [
  {
    icon: '🎭',
    title: 'Practice with AI',
    desc:  'Roleplay interviews, client meetings, appraisals, and negotiations with an AI that responds like a real person.',
  },
  {
    icon: '💬',
    title: 'Live Meeting Overlay',
    desc:  'A floating bubble inside Google Meet shows your talking points and auto-ticks them as you speak. Visible only to you.',
  },
  {
    icon: '📊',
    title: 'Coaching Reports',
    desc:  'After every session: filler word count, pacing score, confidence rating, and one specific action item to work on.',
  },
]

const PAIN_POINTS = [
  {
    emoji: '😰',
    title: 'You go blank in important meetings',
    desc:  'You had 5 things to say. The meeting started. You remembered 2.',
  },
  {
    emoji: '🔇',
    title: 'No one gives you specific feedback',
    desc:  '"Be more confident" is not feedback. You need to know exactly what to fix.',
  },
  {
    emoji: '🌍',
    title: 'Western tools were not built for you',
    desc:  'Poised, Yoodli — all built for California. None of them understand Indian English or Indian professional context.',
  },
]

const SCENARIOS = ['HR Interview', 'Client Presentation', 'Salary Negotiation', 'Team Meeting', 'Performance Review', 'Group Discussion']

export default function Landing() {
  const [email, setEmail]     = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleWaitlist(e) {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    // Save to Supabase waitlist table (we'll create this)
    await supabase.from('waitlist').insert({ email }).single()
    setSubmitted(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-navy-900">
      {/* ── Navbar ── */}
      <header className="border-b border-navy-600/50 sticky top-0 z-50 bg-navy-900/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <span className="text-2xl font-black text-white">
            San<span className="text-primary">4</span>
          </span>
          <div className="flex items-center gap-3">
            <Link to="/auth" className="btn-ghost text-sm">Sign in</Link>
            <Link to="/auth?mode=signup" className="btn-primary text-sm py-2 px-4">
              Join Beta →
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="max-w-6xl mx-auto px-4 pt-20 pb-16 text-center">
        <div className="badge-orange mb-6 inline-flex">
          🇮🇳 Built for India's Professionals
        </div>

        <h1 className="text-5xl md:text-7xl font-black text-white leading-tight mb-6">
          Practice with AI.<br />
          <span className="text-primary">Speak with Confidence.</span>
        </h1>

        <p className="text-xl text-muted max-w-2xl mx-auto mb-10 leading-relaxed">
          San4 is India's first AI communication coach. Practice before your meetings,
          get guided during them, and improve after every one.
        </p>

        {/* Waitlist form */}
        {submitted ? (
          <div className="card inline-block px-8 py-5 text-center">
            <div className="text-3xl mb-2">🎉</div>
            <div className="text-white font-semibold">You're on the list!</div>
            <div className="text-muted text-sm mt-1">We'll email you when beta opens.</div>
          </div>
        ) : (
          <form onSubmit={handleWaitlist} className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="input flex-1"
              required
            />
            <button type="submit" className="btn-primary whitespace-nowrap" disabled={loading}>
              {loading ? 'Joining…' : 'Join Beta Free →'}
            </button>
          </form>
        )}

        <div className="flex flex-wrap gap-4 justify-center mt-5 text-sm text-muted">
          <span>✓ No credit card needed</span>
          <span>✓ 3 free practice sessions</span>
          <span>✓ Built for Indian English</span>
        </div>

        {/* Scenario pills */}
        <div className="flex flex-wrap gap-2 justify-center mt-10">
          {SCENARIOS.map(s => (
            <span key={s} className="bg-navy-700 border border-navy-600 text-muted text-sm px-4 py-1.5 rounded-full">
              {s}
            </span>
          ))}
        </div>
      </section>

      {/* ── Pain points ── */}
      <section className="bg-navy-800/50 border-y border-navy-600/50 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <p className="text-center text-muted text-sm font-semibold uppercase tracking-widest mb-2">The Problem</p>
          <h2 className="text-3xl md:text-4xl font-black text-white text-center mb-12">
            Brilliant people losing opportunities<br />
            <span className="text-muted font-normal text-2xl">because no one taught them how to communicate.</span>
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {PAIN_POINTS.map(({ emoji, title, desc }) => (
              <div key={title} className="card hover:border-navy-500 transition-all">
                <div className="text-3xl mb-4">{emoji}</div>
                <h3 className="text-white font-bold mb-2">{title}</h3>
                <p className="text-muted text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-16 max-w-6xl mx-auto px-4">
        <p className="text-center text-muted text-sm font-semibold uppercase tracking-widest mb-2">The Solution</p>
        <h2 className="text-3xl md:text-4xl font-black text-white text-center mb-12">
          One product. Three unfair advantages.
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {FEATURES.map(({ icon, title, desc }, i) => (
            <div
              key={title}
              className="card hover:border-primary/40 transition-all group"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="text-4xl mb-4">{icon}</div>
              <h3 className="text-white font-bold text-lg mb-2 group-hover:text-primary transition-colors">{title}</h3>
              <p className="text-muted text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="bg-navy-800/50 border-y border-navy-600/50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { num: '600K+', label: 'Community members' },
              { num: '91%',   label: 'Employers say communication is the #1 skill gap' },
              { num: '₹0',   label: 'To get started' },
              { num: '0',     label: 'Indian AI communication coaches before San4' },
            ].map(({ num, label }) => (
              <div key={label}>
                <div className="text-3xl font-black text-primary mb-1">{num}</div>
                <div className="text-muted text-xs leading-tight">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Built by Aman ── */}
      <section className="py-16 max-w-3xl mx-auto px-4 text-center">
        <div className="card">
          <div className="text-4xl mb-4">👋</div>
          <h3 className="text-white font-bold text-xl mb-3">Built by Talk Pro with Aman</h3>
          <p className="text-muted leading-relaxed">
            I've spent years helping 600,000+ of you get better at interviews and professional communication.
            San4 is everything I know — distilled into an AI that's available whenever you need it.
            No booking a coach. No waiting. Just practice.
          </p>
          <div className="mt-4 badge-orange">Talk Pro with Aman — 600K+ followers</div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="pb-20 px-4 text-center">
        <h2 className="text-3xl font-black text-white mb-4">Ready to communicate differently?</h2>
        <p className="text-muted mb-8">Join the beta. 3 free sessions. No card needed.</p>
        <Link to="/auth?mode=signup" className="btn-primary text-lg px-8 py-4">
          Start Practicing Free →
        </Link>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-navy-600 py-8 text-center text-muted text-sm">
        <span className="font-black text-white">San<span className="text-primary">4</span></span>
        {' '}· Sanchaar (सञ्चार) · Communicate with Confidence
        <br />
        <span className="text-xs mt-1 block">© 2026 Talk Pro with Aman. Made in India 🇮🇳</span>
      </footer>
    </div>
  )
}
