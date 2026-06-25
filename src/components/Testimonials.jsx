// ─────────────────────────────────────────────────────────────────────────────
// Testimonials — section UI. The quotes below are PLACEHOLDERS. Replace each
// entry with a real, attributable testimonial before relying on this as social
// proof. Do not ship fabricated reviews to production.
// ─────────────────────────────────────────────────────────────────────────────
const PLACEHOLDER = true

const TESTIMONIALS = [
  { quote: 'I used to freeze in interviews. After two weeks of daily reps with Vak, I walked into my HR round and actually enjoyed it.',
    name: 'Replace with real name', role: 'Software engineer · Bengaluru', initial: 'R' },
  { quote: 'The feedback is brutally specific. It told me exactly which filler words I lean on, and now I catch them mid-sentence.',
    name: 'Replace with real name', role: 'Product manager · Pune', initial: 'R' },
  { quote: 'Practising salary negotiation against the British exec persona was scarily real. I asked for 20% more and got it.',
    name: 'Replace with real name', role: 'Consultant · Gurugram', initial: 'R' },
]

function Stars() {
  return <div style={{ color: '#F59E0B', letterSpacing: 2 }} aria-hidden="true">★★★★★</div>
}

export default function Testimonials() {
  return (
    <section className="py-24 px-6 lg:px-10" style={{ background: 'linear-gradient(180deg,#050810,#06091C)' }}>
      <div className="max-w-3xl mx-auto text-center mb-12">
        <p className="sa text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#6B8CAE' }}>
          Loved by people who used to dread speaking up
        </p>
        <h2 className="sa font-black text-white" data-delay="100" style={{ fontSize: 'clamp(28px,4.5vw,46px)', lineHeight: 1.1 }}>
          Confidence you can hear.
        </h2>
        {PLACEHOLDER && (
          <p className="sa text-xs mt-4 inline-block px-3 py-1.5 rounded-full" data-delay="160"
            style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.25)' }}>
            ⚠️ Placeholder quotes — replace with real testimonials before launch
          </p>
        )}
      </div>

      <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-5">
        {TESTIMONIALS.map((t, i) => (
          <div key={i} className="sa-sc rounded-2xl p-6 flex flex-col" data-delay={i * 90}
            style={{ background: 'linear-gradient(145deg,#0F1929,#070C18)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <Stars />
            <p className="text-sm leading-relaxed my-4 flex-1" style={{ color: '#CBD5E1' }}>“{t.quote}”</p>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                style={{ background: 'rgba(139,92,246,0.2)', color: '#A78BFA' }}>{t.initial}</div>
              <div className="min-w-0">
                <div className="text-white font-semibold text-sm truncate">{t.name}</div>
                <div className="text-xs truncate" style={{ color: '#6B8CAE' }}>{t.role}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Real trust line — confirm the number before launch */}
      <p className="sa text-center text-sm mt-12" style={{ color: '#6B8CAE' }}>
        Built by <span className="text-white font-semibold">Talk Pro with Aman</span>, a 600K+ communication community.
      </p>
    </section>
  )
}
