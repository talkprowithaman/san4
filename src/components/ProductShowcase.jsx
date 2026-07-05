import { useState, useEffect, useRef } from 'react'
import VakMascot from './VakMascot'
import { playTick } from '../lib/sound'

// ─────────────────────────────────────────────────────────────────────────────
// ProductShowcase — one sticky phone whose screen changes as you scroll. A
// vertical step indicator on the left shows progress (the active dot grows,
// the others stay small) and is clickable to jump. Desktop uses sticky-scroll;
// mobile falls back to a tap-driven panel with the same single phone.
// ─────────────────────────────────────────────────────────────────────────────

function Phone({ children }) {
  return (
    <div className="relative shrink-0" style={{ width: 260 }}>
      <div className="absolute inset-0 -z-10 blur-3xl opacity-20 rounded-full"
        style={{ background: 'radial-gradient(circle, #7B5EA7, transparent 70%)' }} />
      <div className="relative overflow-hidden"
        style={{ width: 260, height: 520, borderRadius: 44, background: '#060E1A',
          border: '8px solid rgba(255,255,255,0.10)', boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 60px 120px rgba(15,23,42,0.5)' }}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 rounded-b-2xl z-10" style={{ background: 'rgba(0,0,0,0.6)' }} />
        <div className="absolute inset-0 pt-9 px-3.5 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  )
}

function Bar({ label, value, color }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span style={{ color: '#94A3B8' }}>{label}</span>
        <span style={{ color }}>{value}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  )
}

// ── Screen content (rendered inside the shared Phone) ────────────────────────
function CefrContent() {
  const CEFR = ['A1','A2','B1','B2','C1','C2']
  return (
    <div className="flex flex-col gap-2.5 h-full">
      <div className="text-center text-xs font-bold uppercase tracking-widest" style={{ color: '#6B8CAE' }}>Your CEFR level</div>
      <div className="rounded-2xl p-4 text-center"
        style={{ background: 'linear-gradient(160deg, rgba(0,196,154,0.18), #0B1220)', border: '1px solid rgba(0,196,154,0.4)' }}>
        <div className="font-black leading-none" style={{ fontSize: '3rem', color: '#00C49A' }}>B2</div>
        <div className="text-white font-bold text-sm mt-1">Upper Intermediate</div>
        <div className="flex justify-center gap-1 mt-3">
          {CEFR.map(l => (
            <div key={l} className="px-1.5 py-0.5 rounded text-xs font-bold"
              style={{ background: l === 'B2' ? '#00C49A' : 'rgba(255,255,255,0.06)', color: l === 'B2' ? '#0B1220' : '#6B8CAE' }}>{l}</div>
          ))}
        </div>
      </div>
      <div className="rounded-2xl p-3.5 flex flex-col gap-2.5" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <Bar label="🗣️ Pronunciation" value={74} color="#00C49A" />
        <Bar label="📝 Grammar"       value={68} color="#FF6B35" />
        <Bar label="📚 Vocabulary"    value={81} color="#00C49A" />
        <Bar label="🌊 Fluency"       value={71} color="#FF6B35" />
      </div>
    </div>
  )
}

function SessionContent() {
  return (
    <div className="flex flex-col gap-2.5 h-full">
      <div className="flex items-center gap-2 pb-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0" style={{ background: 'rgba(139,92,246,0.2)' }}>🇬🇧</div>
        <div className="min-w-0">
          <div className="text-white text-xs font-semibold leading-tight">James Whitfield</div>
          <div className="text-xs" style={{ color: '#6B8CAE' }}>British exec · Salary Negotiation</div>
        </div>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <div className="animate-float"><VakMascot level={3} size={84} /></div>
        <div className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: 'rgba(255,107,53,0.15)', color: '#FF6B35' }}>🎤 Listening…</div>
        <div className="w-full rounded-2xl px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <div className="text-xs mb-1" style={{ color: '#6B8CAE' }}>James says</div>
          <p className="text-white text-xs leading-relaxed">"Right, let's talk numbers. What figure did you have in mind?"</p>
        </div>
        <div className="w-full rounded-xl px-3 py-2" style={{ background: 'rgba(255,107,53,0.08)', border: '1px solid rgba(255,107,53,0.25)' }}>
          <span className="text-xs italic" style={{ color: '#FF9D6F' }}>🎤 "Based on my impact this year, I'm looking for…"</span>
        </div>
      </div>
      <div className="flex justify-center pb-1">
        <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
          style={{ background: 'linear-gradient(135deg, #FF6B35, #FF4500)', boxShadow: '0 0 24px rgba(255,107,53,0.5)' }}>⏹</div>
      </div>
    </div>
  )
}

function ProgressionContent() {
  const levels = [
    { lv: 3, icon: '👥', name: 'Daily Standup',     state: 'done',      score: 82, pass: 68, color: '#00C49A' },
    { lv: 4, icon: '⭐', name: 'Performance Review', state: 'available', score: 0,  pass: 70, color: '#00C49A' },
    { lv: 5, icon: '🗣️', name: 'Group Discussion',   state: 'locked',    score: 0,  pass: 72, color: '#6B8CAE' },
  ]
  return (
    <div className="flex flex-col gap-2.5 h-full">
      <div className="grid grid-cols-3 gap-1.5">
        {[['🔥','4d','Streak','#FF6B35'],['⭐','1,240','XP','#F59E0B'],['🏆','3/10','Cleared','#00C49A']].map(([ic,v,l,c]) => (
          <div key={l} className="rounded-xl p-2 text-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <div className="text-sm">{ic}</div>
            <div className="font-black text-xs" style={{ color: c }}>{v}</div>
            <div className="text-xs" style={{ color: '#6B8CAE' }}>{l}</div>
          </div>
        ))}
      </div>
      <div className="text-xs font-bold uppercase tracking-wider text-center py-1" style={{ color: '#00C49A' }}>🌲 Lower Slopes</div>
      <div className="flex flex-col gap-2">
        {levels.map(l => (
          <div key={l.lv} className="rounded-xl p-2.5" style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${l.state==='available' ? 'rgba(0,196,154,0.35)' : 'rgba(255,255,255,0.07)'}`, opacity: l.state==='locked' ? 0.55 : 1 }}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-base">{l.state==='locked' ? '🔒' : l.icon}</span>
              <span className="text-white text-xs font-bold flex-1">{l.name}</span>
              {l.state==='done' && <span className="text-xs font-bold px-1.5 rounded-full" style={{ background: 'rgba(0,196,154,0.15)', color: '#00C49A' }}>✓</span>}
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div className="h-full rounded-full" style={{ width: `${l.state==='done' ? l.score : l.pass*0.3}%`, background: l.state==='locked' ? '#6B8CAE' : l.color }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ReportContent() {
  return (
    <div className="flex flex-col gap-2.5 h-full">
      <div className="text-center text-xs" style={{ color: '#6B8CAE' }}>Session complete · HR Interview</div>
      <div className="rounded-2xl p-4 text-center"
        style={{ background: 'linear-gradient(160deg, rgba(123,94,167,0.18), #0B1220)', border: '1px solid rgba(123,94,167,0.4)' }}>
        <div className="font-black leading-none" style={{ fontSize: '2.6rem', color: '#A78BFA' }}>84%</div>
        <div className="text-white font-bold text-xs mt-1">Overall communication</div>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {[['Confidence','78%','#00C49A'],['Pacing','91%','#00C49A'],['Fillers','3','#FF6B35']].map(([l,v,c]) => (
          <div key={l} className="rounded-xl px-1 py-2 text-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <div className="font-black text-sm" style={{ color: c }}>{v}</div>
            <div className="leading-tight" style={{ color: '#6B8CAE', fontSize: 10.5 }}>{l}</div>
          </div>
        ))}
      </div>
      <div className="rounded-xl p-2.5" style={{ background: 'rgba(0,196,154,0.06)', border: '1px solid rgba(0,196,154,0.2)' }}>
        <div className="text-xs font-semibold mb-0.5" style={{ color: '#00C49A' }}>✓ What worked</div>
        <p className="text-white text-xs leading-relaxed">Clear STAR structure on the stakeholder question.</p>
      </div>
      <div className="rounded-xl p-2.5" style={{ background: 'rgba(123,94,167,0.08)', border: '1px solid rgba(123,94,167,0.2)' }}>
        <div className="text-xs font-semibold mb-0.5" style={{ color: '#A78BFA' }}>🎯 Action item</div>
        <p className="text-white text-xs leading-relaxed">Pause 2 seconds before answering. Your best answers came after a pause.</p>
      </div>
    </div>
  )
}

const STEPS = [
  { kicker: 'Free 2-minute assessment',        title: 'Know exactly where you stand.',
    body: 'A short speaking test scores your pronunciation, grammar, vocabulary, and fluency, then places you on the global CEFR scale. You know your level in two minutes, not two months.',
    Content: CefrContent },
  { kicker: 'Real scenarios, real accents',     title: 'Practise with anyone, in any accent.',
    body: 'Rehearse interviews, negotiations, and hard conversations against a coach who pushes back. Face a British exec, an American founder, or an Indian HR lead. The pressure is real, the room is safe.',
    Content: SessionContent },
  { kicker: 'Ten free levels, earned not given', title: 'Watch yourself climb.',
    body: 'Every session earns XP and unlocks the next level. Clear each one by scoring above the bar, and the mountain does not lie about your progress.',
    Content: ProgressionContent },
  { kicker: 'Honest feedback, every time',       title: 'Walk away knowing one thing to fix.',
    body: 'Every session ends with a clear report: your scores, what worked, and the single highest-impact thing to change next time. No wall of text, just one fix that matters.',
    Content: ReportContent },
]

// ── Step indicator dots (active grows) ───────────────────────────────────────
function Dots({ active, onPick, vertical }) {
  return (
    <div className={`flex ${vertical ? 'flex-col' : 'flex-row justify-center'} gap-3 items-center`}>
      {STEPS.map((_, i) => {
        const on = i === active
        return (
          <button key={i} onClick={() => { playTick('select'); onPick(i) }} aria-label={`Step ${i + 1}`}
            className="rounded-full transition-all duration-300 flex items-center justify-center shrink-0"
            style={{
              width:  on ? 32 : 12,
              height: on ? 32 : 12,
              background: on ? 'rgba(139,92,246,0.18)' : 'rgba(255,255,255,0.18)',
              border: on ? '1px solid rgba(139,92,246,0.6)' : '1px solid transparent',
              color: '#A78BFA', fontSize: 12, fontWeight: 800,
            }}>
            {on ? i + 1 : ''}
          </button>
        )
      })}
    </div>
  )
}

export default function ProductShowcase() {
  const [active, setActive] = useState(0)
  const stepRefs = useRef([])

  // Desktop: scroll position drives the active step
  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const idx = Number(e.target.dataset.idx)
          if (!Number.isNaN(idx)) setActive(idx)
        }
      })
    }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 })
    stepRefs.current.forEach(el => el && obs.observe(el))
    return () => obs.disconnect()
  }, [])

  function jump(i) {
    setActive(i)
    stepRefs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const ActiveContent = STEPS[active].Content

  return (
    <section className="py-24 px-6 lg:px-10" style={{ background: '#050810' }}>
      <div className="max-w-3xl mx-auto text-center mb-14">
        <p className="sa text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#6B8CAE' }}>Inside San4</p>
        <h2 className="sa font-black text-white" data-delay="100" style={{ fontSize: 'clamp(28px,4.5vw,48px)', lineHeight: 1.1 }}>
          See it before you sign up.
        </h2>
      </div>

      {/* ── Mobile: tap-driven single phone ──────────────────────────────── */}
      <div className="lg:hidden max-w-md mx-auto">
        <Dots active={active} onPick={setActive} vertical={false} />
        <div className="flex justify-center my-6">
          <Phone><div key={active} className="screen-swap h-full">{<ActiveContent />}</div></Phone>
        </div>
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#A78BFA' }}>{STEPS[active].kicker}</p>
          <h3 className="font-black text-white mb-3" style={{ fontSize: 'clamp(22px,6vw,30px)', lineHeight: 1.15 }}>{STEPS[active].title}</h3>
          <p className="text-base leading-relaxed mx-auto" style={{ color: 'rgba(255,255,255,0.55)', maxWidth: 440 }}>{STEPS[active].body}</p>
        </div>
      </div>

      {/* ── Desktop: sticky phone + scroll-driven steps ──────────────────── */}
      <div className="hidden lg:grid max-w-6xl mx-auto"
        style={{ gridTemplateColumns: '40px 1fr 320px', columnGap: '3rem' }}>

        {/* Indicator rail (sticky) */}
        <div className="flex justify-center">
          <div className="sticky" style={{ top: 'calc(50vh - 70px)', height: 'fit-content' }}>
            <Dots active={active} onPick={jump} vertical />
          </div>
        </div>

        {/* Scrollable step texts */}
        <div>
          {STEPS.map((s, i) => (
            <div key={i} data-idx={i} ref={el => (stepRefs.current[i] = el)}
              className="flex flex-col justify-center" style={{ minHeight: '105vh' }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-3 transition-colors"
                style={{ color: i === active ? '#A78BFA' : 'rgba(167,139,250,0.4)' }}>{s.kicker}</p>
              <h3 className="font-black mb-4 transition-colors" style={{ fontSize: 'clamp(26px,3.2vw,40px)', lineHeight: 1.15, color: i === active ? '#fff' : 'rgba(255,255,255,0.35)' }}>{s.title}</h3>
              <p className="text-base leading-relaxed transition-colors" style={{ color: i === active ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)', maxWidth: 460 }}>{s.body}</p>
            </div>
          ))}
        </div>

        {/* Sticky phone */}
        <div>
          <div className="sticky flex justify-center" style={{ top: 'calc(50vh - 260px)' }}>
            <Phone><div key={active} className="screen-swap h-full">{<ActiveContent />}</div></Phone>
          </div>
        </div>
      </div>
    </section>
  )
}
