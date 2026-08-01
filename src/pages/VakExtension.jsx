import { Link } from 'react-router-dom'
import MarketingHeader from '../components/MarketingHeader'
import VakMascot from '../components/VakMascot'

// TODO: replace with the published Chrome Web Store listing URL once live.
const CHROME_STORE_URL = 'https://chromewebstore.google.com/'

const STEPS = [
  { icon: '🎥', title: 'Join any Google Meet', body: 'Vak appears in the corner and asks if it can coach this call. Only your microphone is used.' },
  { icon: '🎙️', title: 'Talk like you normally would', body: 'A live meter shows Vak is listening to you, and only you. Nothing is added to the call.' },
  { icon: '📊', title: 'Get coached the second you stop', body: 'A rating, your filler words, the exact lines to fix, and short videos to improve, right there.' },
]

export default function VakExtension() {
  return (
    <div className="min-h-screen" style={{ background: '#050810', color: '#F1F5F9' }}>
      <MarketingHeader />

      {/* Hero */}
      <section className="relative overflow-hidden px-6 lg:px-10 pt-16 pb-20">
        <div className="absolute pointer-events-none" style={{ top: '-8%', left: '-6%', width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle,rgba(0,196,154,0.20),transparent 70%)', filter: 'blur(30px)' }} />
        <div className="absolute pointer-events-none" style={{ bottom: '-14%', right: '-6%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle,rgba(123,94,167,0.26),transparent 70%)', filter: 'blur(30px)' }} />

        <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-12 items-center relative">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4 text-xs font-bold"
              style={{ background: 'rgba(0,196,154,0.14)', color: '#34E0B0', border: '1px solid rgba(0,196,154,0.3)' }}>
              🎧 Live Coach for Chrome
            </div>
            <h1 className="font-black text-white mb-4" style={{ fontSize: 'clamp(32px,5vw,52px)', lineHeight: 1.05, fontFamily: 'Outfit, sans-serif' }}>
              Coach your <span style={{ background: 'linear-gradient(135deg,#00C49A,#4FACFE)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>real calls</span>, live.
            </h1>
            <p className="text-lg mb-7" style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
              Add Vak to Chrome. On any Google Meet, Vak listens to how <b className="text-white">you</b> speak and coaches you the moment you're done, your rating, filler words, the lines to fix, and exactly what to watch next.
            </p>
            <a href={CHROME_STORE_URL} target="_blank" rel="noopener noreferrer"
              className="btn-aura inline-flex items-center gap-2 text-base font-bold text-white px-8 py-4 rounded-full transition-all hover:opacity-90 active:scale-95"
              style={{ background: 'linear-gradient(135deg,#7B5EA7,#00C49A)' }}>
              <span style={{ fontSize: 20 }}>➕</span> Add Vak now
            </a>
            <div className="flex flex-wrap gap-2 mt-5">
              {['✅ Free', '🎥 Google Meet', '🔒 Only your voice', '⚡ Instant report'].map(p => (
                <span key={p} className="text-xs font-semibold px-3 py-1.5 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.1)' }}>{p}</span>
              ))}
            </div>
          </div>

          <div className="relative flex justify-center">
            <div className="animate-float"><VakMascot level={4} size={200} mood="listening" /></div>
            <div className="absolute -bottom-2 right-0 rounded-2xl px-4 py-3 shadow-2xl"
              style={{ background: '#0B1220', border: '1px solid rgba(255,255,255,0.12)', minWidth: 190 }}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#F87171', animation: 'pulse 1s infinite' }} />
                <span className="text-xs font-bold text-white">Listening…</span>
              </div>
              <div className="text-2xl font-black" style={{ color: '#00C49A' }}>84<span className="text-sm" style={{ color: '#6B8CAE' }}>/100</span></div>
              <div className="text-xs mt-0.5" style={{ color: '#6B8CAE' }}>2 fillers · clear + confident</div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 lg:px-10 py-16" style={{ background: 'linear-gradient(180deg,#050810,#06091C)' }}>
        <h2 className="text-2xl font-black text-white text-center mb-10">Three taps to better calls</h2>
        <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-5">
          {STEPS.map((s, i) => (
            <div key={i} className="rounded-2xl p-6" style={{ background: 'linear-gradient(145deg,#0F1929,#070C18)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="text-3xl mb-3">{s.icon}</div>
              <div className="text-xs font-bold mb-2" style={{ color: '#7B5EA7' }}>STEP {i + 1}</div>
              <h3 className="text-white font-bold mb-1.5">{s.title}</h3>
              <p className="text-sm" style={{ color: '#94A3B8', lineHeight: 1.5 }}>{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Privacy + coverage */}
      <section className="px-6 lg:px-10 py-16 max-w-3xl mx-auto">
        <div className="rounded-2xl p-6 mb-4" style={{ background: 'rgba(0,196,154,0.06)', border: '1px solid rgba(0,196,154,0.22)' }}>
          <h3 className="font-bold text-white mb-1.5">🔒 Only your voice. Nobody else's.</h3>
          <p className="text-sm" style={{ color: '#94A3B8', lineHeight: 1.6 }}>
            Vak records your microphone, not the meeting's audio of other people. Echo cancellation keeps other participants out, and the AI only coaches the primary speaker, you. On headphones it's airtight. Your audio is analysed once and not stored after scoring.
          </p>
        </div>
        <p className="text-sm text-center" style={{ color: '#6B8CAE' }}>
          Works on Google Meet today. Zoom and FaceTime are coming to the San4 desktop app.
        </p>
      </section>

      {/* CTA */}
      <section className="px-6 lg:px-10 py-20 text-center">
        <h2 className="text-3xl font-black text-white mb-3">Ready when your next call is.</h2>
        <p className="text-base mb-7 max-w-md mx-auto" style={{ color: '#94A3B8' }}>Free, private, and instant. Add Vak and let your real calls start coaching you.</p>
        <a href={CHROME_STORE_URL} target="_blank" rel="noopener noreferrer"
          className="btn-aura inline-flex items-center gap-2 text-base font-bold text-white px-8 py-4 rounded-full"
          style={{ background: 'linear-gradient(135deg,#7B5EA7,#00C49A)' }}>
          <span style={{ fontSize: 20 }}>➕</span> Add Vak now
        </a>
        <div className="mt-6"><Link to="/" className="text-sm" style={{ color: '#6B8CAE' }}>← Back to home</Link></div>
      </section>
    </div>
  )
}
