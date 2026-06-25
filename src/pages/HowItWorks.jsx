import { Link } from 'react-router-dom'
import './landing.css'

const FEATS = [
  { icon:'🎙️', title:'Real-time speech analysis',
    desc:'Vak transcribes and scores your delivery as you speak. Pace, filler words, confidence markers, structure. Instant and specific.' },
  { icon:'🧠', title:'Gemini-powered coaching',
    desc:'After each answer you get one targeted note. Not a wall of text. The one thing that matters most right now.' },
  { icon:'📈', title:'Progress that compounds',
    desc:'Every session updates your skill profile. Vak remembers what you fixed and what still needs work, so feedback sharpens over time.' },
]

const STEPS = [
  { n:'1', icon:'🎭', title:'Pick a scenario',  desc:'HR round, pitch, tough conversation. Choose who you face.' },
  { n:'2', icon:'🎙️', title:'Speak naturally',  desc:'Vak plays the other person and responds like a real human.' },
  { n:'3', icon:'📊', title:'Get scored live',  desc:'Pace, fillers, confidence and structure, tracked as you talk.' },
  { n:'4', icon:'🎯', title:'Get one clear fix', desc:'End the session and walk away with a single thing to improve.' },
]

function AiPhone() {
  return (
    <div className="relative" style={{ width: 260 }}>
      <div className="absolute inset-0 -z-10 blur-3xl opacity-20 rounded-full"
        style={{ background: 'radial-gradient(circle, #7B5EA7, transparent 70%)' }} />
      <div className="relative overflow-hidden"
        style={{ width:260, height:520, borderRadius:44, background:'#050810',
          border:'8px solid rgba(255,255,255,0.10)', boxShadow:'0 0 0 1px rgba(255,255,255,0.04), 0 60px 120px rgba(15,23,42,0.5)' }}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 rounded-b-2xl z-10" style={{ background:'rgba(0,0,0,0.6)' }} />
        <div className="absolute inset-0 pt-8 px-3 flex flex-col gap-2.5 overflow-hidden">
          <div className="flex items-center gap-2 pb-2" style={{ borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-base shrink-0" style={{ background:'rgba(139,92,246,0.2)' }}>🦢</div>
            <span className="text-xs font-semibold text-white">Feedback · HR Interview</span>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background:'rgba(0,196,154,0.1)', border:'1px solid rgba(0,196,154,0.25)' }}>
            <div className="text-2xl font-black" style={{ color:'#00C49A' }}>84%</div>
            <div className="text-xs font-semibold mt-0.5" style={{ color:'#00C49A' }}>Overall Score</div>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {[['3','#F87171','Fillers'],['Good','#00C49A','Pace'],['Strong','#8B5CF6','Structure']].map(([v,c,l])=>(
              <div key={l} className="rounded-xl p-2 text-center" style={{ background:'rgba(255,255,255,0.07)' }}>
                <div className="font-black text-sm" style={{ color:c }}>{v}</div>
                <div className="text-xs" style={{ color:'#6B8CAE' }}>{l}</div>
              </div>
            ))}
          </div>
          <div className="rounded-xl p-2.5" style={{ background:'rgba(123,94,167,0.08)', border:'1px solid rgba(123,94,167,0.2)' }}>
            <div className="text-xs font-semibold mb-0.5" style={{ color:'#7B5EA7' }}>🎯 Action item</div>
            <p className="text-white text-xs leading-relaxed">Pause 2 seconds before answering. Your best answers came after a pause.</p>
          </div>
          {[['Clarity','#7B5EA7',84],['Confidence','#00C49A',78],['Pacing','#F59E0B',91]].map(([l,c,v])=>(
            <div key={l}>
              <div className="flex justify-between text-xs mb-1"><span style={{ color:'#94A3B8' }}>{l}</span><span style={{ color:c }}>{v}%</span></div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,0.08)' }}>
                <div className="h-full rounded-full" style={{ width:`${v}%`, background:c }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="badge-float-up absolute -top-3 -right-4 px-3 py-1.5 rounded-xl text-xs font-bold text-white whitespace-nowrap"
        style={{ background:'rgba(123,94,167,0.25)', border:'1px solid rgba(123,94,167,0.4)', backdropFilter:'blur(8px)' }}>🎯 Clarity +12%</div>
      <div className="badge-float-down absolute -bottom-3 -left-4 px-3 py-1.5 rounded-xl text-xs font-bold text-white whitespace-nowrap"
        style={{ background:'rgba(255,107,53,0.2)', border:'1px solid rgba(255,107,53,0.35)', backdropFilter:'blur(8px)' }}>🔥 Streak Day 4</div>
    </div>
  )
}

export default function HowItWorks() {
  return (
    <div style={{ background:'#050810', color:'#F1F5F9' }}>
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 lg:px-10 h-16"
        style={{ background:'rgba(4,8,16,0.88)', backdropFilter:'blur(24px)', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
        <Link to="/" className="text-xl font-black tracking-tight text-white">San<span style={{ color:'#7B5EA7' }}>4</span></Link>
        <div className="flex items-center gap-3">
          <Link to="/" className="text-sm font-medium px-4 py-2 transition-colors" style={{ color:'rgba(255,255,255,0.5)' }}>← Home</Link>
          <Link to="/auth?mode=signup" className="text-sm font-bold text-white px-5 py-2 rounded-full"
            style={{ background:'#7B5EA7', boxShadow:'0 4px 18px rgba(123,94,167,0.4)' }}>Try free →</Link>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 lg:px-10 pt-32 pb-24">

        {/* Hero */}
        <p className="text-xs font-bold uppercase tracking-widest text-center mb-5" style={{ color:'#6B8CAE' }}>Under the hood</p>
        <div className="grid lg:grid-cols-2 gap-16 items-center mb-24">
          <div>
            <h1 className="font-black leading-[1.1] mb-6" style={{ fontSize:'clamp(30px,4.5vw,52px)' }}>
              <span className="text-white">The first AI coach built </span>
              <span className="grad-text grad-flow">for Indian voices.</span>
            </h1>
            <p className="text-base leading-relaxed mb-10 max-w-lg" style={{ color:'rgba(255,255,255,0.55)' }}>
              Vak listens, transcribes, scores, and coaches in real time. No human reviews your sessions.
              No judgment. Just data and a clear next step.
            </p>
            <div className="space-y-7">
              {FEATS.map(f => (
                <div key={f.title} className="flex gap-5 items-start">
                  <div className="shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                    style={{ background:'rgba(139,92,246,0.12)', border:'1px solid rgba(139,92,246,0.22)' }}>{f.icon}</div>
                  <div>
                    <h3 className="text-white font-bold text-sm mb-1">{f.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color:'#6B8CAE' }}>{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="hidden lg:flex justify-center items-center"><AiPhone /></div>
        </div>

        {/* How a session works */}
        <h2 className="text-white font-black text-center mb-10" style={{ fontSize:'clamp(24px,3vw,38px)' }}>How a session works</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-20">
          {STEPS.map(s => (
            <div key={s.n} className="rounded-2xl p-5"
              style={{ background:'linear-gradient(145deg,#0F1929,#070C18)', border:'1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">{s.icon}</span>
                <span className="text-xs font-black w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background:'rgba(139,92,246,0.15)', color:'#A78BFA' }}>{s.n}</span>
              </div>
              <h3 className="text-white font-bold text-sm mb-1">{s.title}</h3>
              <p className="text-xs leading-relaxed" style={{ color:'#6B8CAE' }}>{s.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link to="/auth?mode=signup"
            className="btn-aura inline-block text-base font-bold text-white px-10 py-5 rounded-full transition-all hover:opacity-90 active:scale-95"
            style={{ background:'linear-gradient(135deg,#7B5EA7,#9B7EC8)' }}>
            Start practising free →
          </Link>
        </div>
      </main>
    </div>
  )
}
