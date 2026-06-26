// ─────────────────────────────────────────────────────────────────────────────
// FillerWords — surfaces the verbal crutches San4 catches (English, Hindi,
// Hinglish), inside an Apple-style liquid-glass panel. The struck-through chips
// read as "caught and cut".
// ─────────────────────────────────────────────────────────────────────────────
const FILLERS = [
  { w: 'umm',           cut: true  },
  { w: 'jaise ki',      cut: true  },
  { w: 'like',          cut: false },
  { w: 'aah',           cut: true  },
  { w: 'kya kehte hain', cut: true },
  { w: 'bhai',          cut: false },
  { w: 'I was like',    cut: true  },
  { w: 'matlab',        cut: false },
  { w: 'you know',      cut: true  },
  { w: 'basically',     cut: false },
  { w: 'haan',          cut: true  },
  { w: 'actually',      cut: false },
]

export default function FillerWords() {
  return (
    <section className="relative py-24 px-6 lg:px-10 overflow-hidden" style={{ background: '#050810' }}>
      {/* Glow so the glass has something to refract */}
      <div className="absolute pointer-events-none" style={{
        top: '40%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 760, height: 420, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139,92,246,0.18) 0%, rgba(0,196,154,0.08) 45%, transparent 70%)',
      }} />

      <div className="max-w-5xl mx-auto relative z-10">
        <div className="text-center mb-10">
          <p className="sa text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#6B8CAE' }}>
            The habits you can't hear
          </p>
          <h2 className="sa font-black text-white" data-delay="100" style={{ fontSize: 'clamp(28px,4.5vw,48px)', lineHeight: 1.15 }}>
            Cut the <span className="grad-text">umm</span>, the <span className="grad-text">jaise ki</span>, the <span className="grad-text">bhai</span>.
          </h2>
          <p className="sa text-lg mt-4 max-w-xl mx-auto" data-delay="160" style={{ color: 'rgba(255,255,255,0.5)' }}>
            San4 counts every filler and verbal crutch, in English, Hindi, or Hinglish, so you finally hear your habits and break them.
          </p>
        </div>

        {/* Liquid-glass panel of filler chips */}
        <div className="sa-sc glass mx-auto max-w-3xl" data-delay="0" style={{ padding: '2rem 1.5rem' }}>
          <div className="flex flex-wrap gap-3 justify-center relative" style={{ zIndex: 1 }}>
            {FILLERS.map((f, i) => (
              <span key={f.w}
                className="filler-chip glass-chip text-sm font-semibold flex items-center gap-1.5"
                style={{
                  padding: '8px 16px',
                  color: f.cut ? 'rgba(255,255,255,0.45)' : '#fff',
                  textDecoration: f.cut ? 'line-through' : 'none',
                  textDecorationColor: 'rgba(0,196,154,0.7)',
                  animationDelay: `${(i % 6) * 0.4}s`,
                }}>
                {f.cut && <span style={{ color: '#00C49A' }}>✓</span>}
                "{f.w}"
              </span>
            ))}
          </div>
          <p className="text-center text-xs mt-7 relative" style={{ color: '#6B8CAE', zIndex: 1 }}>
            <span style={{ color: '#00C49A' }}>✓</span> caught and counted in your last session
          </p>
        </div>
      </div>
    </section>
  )
}
