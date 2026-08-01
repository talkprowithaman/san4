import { Link } from 'react-router-dom'
import MarketingHeader from '../components/MarketingHeader'

const AXES = [
  ['Clarity', 78, '#00C49A', 'Is your point easy to follow, one idea at a time?'],
  ['Confidence', 71, '#7B5EA7', 'Assured and steady, or hedging and trailing off?'],
  ['Structure', 69, '#F59E0B', 'Do you lead with the point, or ramble to it?'],
  ['Delivery', 77, '#4FACFE', 'Pace, pauses, energy, and filler discipline.'],
]

export default function San4Score() {
  return (
    <div className="min-h-screen" style={{ background: '#050810', color: '#F1F5F9' }}>
      <MarketingHeader />

      {/* Hero */}
      <section className="px-6 lg:px-10 pt-16 pb-14" style={{ background: 'linear-gradient(180deg,#06091C,#050810)' }}>
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#7B5EA7' }}>The San4 Score</p>
            <h1 className="font-black text-white leading-tight mb-4" style={{ fontSize: 'clamp(30px,5vw,48px)', fontFamily: 'Outfit, sans-serif' }}>
              One number for how you communicate.
            </h1>
            <p className="text-base leading-relaxed mb-4" style={{ color: '#94A3B8' }}>
              CIBIL scores your credit. IELTS scores your English. Nothing scores the skill that actually decides your interviews, appraisals, and promotions: how you <strong className="text-white">communicate</strong>.
            </p>
            <p className="text-base leading-relaxed mb-6" style={{ color: '#94A3B8' }}>
              The San4 Score measures your clarity, confidence, structure, and delivery, in any language you speak. It updates with every practice session. Put it on your LinkedIn. Put it on your CV. Watch it climb.
            </p>
            <Link to="/assessment"
              className="inline-block text-sm font-bold text-white px-7 py-4 rounded-full transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg,#7B5EA7,#9B7EC8)' }}>
              Get your San4 Score in 2 minutes →
            </Link>
          </div>

          {/* Mock card */}
          <div className="flex justify-center">
            <div className="w-full max-w-xs rounded-3xl p-8 text-center"
              style={{ background: 'linear-gradient(160deg,#10192E,#0B1220)', border: '1px solid rgba(123,94,167,0.4)', boxShadow: '0 0 60px rgba(123,94,167,0.15)' }}>
              <div className="flex items-center justify-center gap-2 mb-6">
                <img src="/san4-icon.png" alt="" width={28} height={28} className="rounded-lg" />
                <span className="font-black text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>SAN<span style={{ color: '#7B5EA7' }}>4</span> SCORE</span>
              </div>
              <div className="font-black" style={{ fontSize: '5rem', lineHeight: 1, color: '#00C49A' }}>74</div>
              <div className="text-white font-bold mb-1">Confident</div>
              <div className="text-xs mb-6" style={{ color: '#6B8CAE' }}>Communicates clearly under pressure</div>
              <div className="space-y-2 text-left">
                {AXES.map(([label, v, c]) => (
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

      {/* The four axes */}
      <section className="px-6 lg:px-10 py-16">
        <h2 className="text-2xl font-black text-white text-center mb-3">What it actually measures</h2>
        <p className="text-sm text-center mb-10 max-w-xl mx-auto" style={{ color: '#6B8CAE' }}>
          Judged on how you communicate, not your grammar or accent. Someone with broken English can score higher than a fluent rambler, that contrast is the whole point.
        </p>
        <div className="max-w-4xl mx-auto grid sm:grid-cols-2 gap-4">
          {AXES.map(([label, , c, desc]) => (
            <div key={label} className="rounded-2xl p-5" style={{ background: 'linear-gradient(145deg,#0F1929,#070C18)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="font-bold mb-1" style={{ color: c }}>{label}</div>
              <p className="text-sm" style={{ color: '#94A3B8', lineHeight: 1.5 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why it's different */}
      <section className="px-6 lg:px-10 py-14" style={{ background: 'linear-gradient(180deg,#050810,#06091C)' }}>
        <div className="max-w-3xl mx-auto">
          <ul className="space-y-3">
            {[
              'Language-independent: judged on how you communicate, not your grammar',
              'A living score: every daily rep and session moves it',
              'Built to share: one tap to LinkedIn, WhatsApp, or your CV',
            ].map(t => (
              <li key={t} className="flex gap-3 text-base" style={{ color: '#94A3B8' }}>
                <span style={{ color: '#00C49A' }}>✓</span> {t}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 lg:px-10 py-20 text-center">
        <h2 className="text-3xl font-black text-white mb-3">Find your number.</h2>
        <p className="text-base mb-7 max-w-md mx-auto" style={{ color: '#94A3B8' }}>A 2-minute voice test. No signup needed to see your score.</p>
        <Link to="/assessment" className="btn-aura inline-block text-base font-bold text-white px-8 py-4 rounded-full"
          style={{ background: 'linear-gradient(135deg,#7B5EA7,#9B7EC8)' }}>
          Get your San4 Score →
        </Link>
        <div className="mt-6"><Link to="/" className="text-sm" style={{ color: '#6B8CAE' }}>← Back to home</Link></div>
      </section>
    </div>
  )
}
