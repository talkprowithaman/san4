// ─────────────────────────────────────────────────────────────────────────────
// Testimonials — real quotes from early users, lightly edited for typos only.
// ─────────────────────────────────────────────────────────────────────────────
const TESTIMONIALS = [
  { quote: 'I loved talking to Vak. He was so supportive and friendly that I could open up easily.',
    name: 'Priya', role: 'Delhi', initial: 'P' },
  { quote: 'The session was absolutely great. I got to know more about how I can upgrade my skills for better opportunities.',
    name: 'Abhishek Shukla', role: 'Gujarat', initial: 'A' },
  { quote: 'Just loved talking to Vak! It was a great experience, and I\'ll remember it for life because it was my first interview, and it was actually really good.',
    name: 'Ankush Mishra', role: 'Uttar Pradesh', initial: 'A' },
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

      <p className="sa text-center text-sm mt-12" style={{ color: '#6B8CAE' }}>
        Built by <span className="text-white font-semibold">Aman Jindal (@talkprowithaman)</span>, with 600K+ followers across social media.
      </p>
    </section>
  )
}
