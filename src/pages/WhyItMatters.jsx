import { Link } from 'react-router-dom'
import MarketingHeader from '../components/MarketingHeader'

const STATS = [
  ['93%', 'of Indian graduates are not considered industry-ready'],
  ['78%', 'of hiring managers rank communication as the #1 skill gap'],
  ['0', 'AI coaches built specifically for India. Until now.'],
]

const PILLARS = [
  { icon: '💡', title: 'Built for India', body: 'Accent-neutral AI trained on Indian English, Hindi-English code-switching, and regional speech. It understands you, not a textbook American voice. And it guides you in your mother tongue while you practise in English.' },
  { icon: '🎯', title: 'Real situations, not drills', body: 'HR rounds, group discussions, client pitches, salary negotiations. Each one plays out like the real thing, with a counterpart who pushes back, so practice actually transfers to the moment that counts.' },
  { icon: '📈', title: 'Measurable growth', body: 'Track filler words, confidence, pace, and structure across every session. Your progress becomes the San4 Score, a number that climbs, not a vague feeling that you are getting better.' },
  { icon: '🔒', title: 'Private by design', body: 'We never store your audio after analysis. Practise the awkward stuff freely, negotiations, tough conversations, interviews, with no human listening and nothing to be embarrassed about.' },
]

export default function WhyItMatters() {
  return (
    <div className="min-h-screen" style={{ background: '#050810', color: '#F1F5F9' }}>
      <MarketingHeader />

      {/* Hero */}
      <section className="px-6 lg:px-10 pt-20 pb-12 text-center">
        <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#6B8CAE' }}>Why it matters</p>
        <h1 className="font-black text-white leading-tight mb-4 max-w-3xl mx-auto" style={{ fontSize: 'clamp(30px,5.5vw,52px)', fontFamily: 'Outfit, sans-serif' }}>
          No shortcuts. <span className="grad-text">Real skills.</span>
        </h1>
        <p className="text-lg max-w-2xl mx-auto" style={{ color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>
          India produces millions of graduates every year. Only a fraction can communicate confidently under pressure, and that gap decides who gets hired, heard, and promoted. San4 is built to close it.
        </p>
      </section>

      {/* Stats */}
      <section className="px-6 lg:px-10 py-10">
        <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-10 text-center">
          {STATS.map(([n, label]) => (
            <div key={label}>
              <div className="font-black grad-text mb-2" style={{ fontSize: 'clamp(2.5rem,5vw,4rem)' }}>{n}</div>
              <p className="text-sm leading-relaxed" style={{ color: '#6B8CAE' }}>{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pillars */}
      <section className="px-6 lg:px-10 py-14" style={{ background: 'linear-gradient(180deg,#050810,#06091C)' }}>
        <div className="max-w-4xl mx-auto grid sm:grid-cols-2 gap-4">
          {PILLARS.map(p => (
            <div key={p.title} className="rounded-2xl p-6" style={{ background: 'linear-gradient(145deg,#0F1929,#070C18)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="text-3xl mb-3">{p.icon}</div>
              <h3 className="text-white font-bold mb-2">{p.title}</h3>
              <p className="text-sm" style={{ color: '#94A3B8', lineHeight: 1.55 }}>{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 lg:px-10 py-20 text-center">
        <h2 className="text-3xl font-black text-white mb-3">Close your gap.</h2>
        <p className="text-base mb-7 max-w-md mx-auto" style={{ color: '#94A3B8' }}>Start with a 2-minute test and see exactly where you stand.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/assessment" className="btn-aura inline-block text-base font-bold text-white px-8 py-4 rounded-full"
            style={{ background: 'linear-gradient(135deg,#7B5EA7,#9B7EC8)' }}>
            Get your San4 Score →
          </Link>
          <Link to="/how-it-works" className="inline-block text-base font-semibold px-8 py-4 rounded-full"
            style={{ color: 'white', border: '1px solid rgba(255,255,255,0.25)' }}>
            See how it works
          </Link>
        </div>
        <div className="mt-6"><Link to="/" className="text-sm" style={{ color: '#6B8CAE' }}>← Back to home</Link></div>
      </section>
    </div>
  )
}
