import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getCommScore, scoreBand } from '../lib/san4Score'
import { parseResumeFile, generateResume, condenseResume } from '../lib/gemini'
import { track, EV } from '../lib/analytics'
import MarketingHeader from '../components/MarketingHeader'
import ResumeDocument from '../components/ResumeDocument'

const DRAFT_KEY = 'san4_resume_draft'

// ── One-page fit math ────────────────────────────────────────────────────────
// A4 is 297mm tall; at 96 CSS px/inch that's 1122px. The print stylesheet uses
// a 12mm @page margin (top+bottom = 24mm ≈ 91px) and 24px vertical padding on
// the page element, so the usable content height is:
const PX_PER_MM   = 96 / 25.4
const A4_H        = 297 * PX_PER_MM              // ≈ 1122px
const PAGE_MARGIN = 24 * PX_PER_MM               // 12mm top + 12mm bottom
const PRINT_PAD   = 48                           // 24px top + 24px bottom in print
const SCREEN_PAD  = 80                           // 40px top + 40px bottom on screen
const CONTENT_LIMIT = A4_H - PAGE_MARGIN - PRINT_PAD   // ≈ 984px of real content
const SAFETY = 12                                // small buffer for font rounding
const BLANK_EXP = () => ({ role: '', company: '', sub: '', start: '', end: '', bullets: '' })
const BLANK = {
  name: '', title: '', location: '', email: '', phone: '', linkedin: '', github: '', portfolio: '',
  summary: '', experience: [BLANK_EXP()], skills: '', education: '', certifications: '', achievements: '',
  jobDescription: '',
}

// UI atoms
const Field = ({ label, ...p }) => (
  <label className="block">
    <span className="block text-xs font-semibold mb-1" style={{ color: '#94A3B8' }}>{label}</span>
    <input {...p} className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }} />
  </label>
)
const Area = ({ label, hint, ...p }) => (
  <label className="block">
    <span className="block text-xs font-semibold mb-1" style={{ color: '#94A3B8' }}>{label}{hint && <span className="font-normal" style={{ color: '#6B8CAE' }}> · {hint}</span>}</span>
    <textarea {...p} className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none resize-y"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', minHeight: 72 }} />
  </label>
)

export default function ResumeBuilder() {
  const { user } = useAuth()
  const [phase, setPhase] = useState('intro') // intro | form | generating | result
  const [form, setForm] = useState(BLANK)
  const [san4, setSan4] = useState(null)      // { score, band }
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [parsing, setParsing] = useState(false)
  const fileRef = useRef(null)

  // Live one-page fit: measure the rendered resume and keep it in sync with edits.
  const paperRef = useRef(null)
  const [fit, setFit] = useState(null)   // { content, overflow, overflowPct, fits }
  const [trimming, setTrimming] = useState(false)

  useEffect(() => {
    if (phase !== 'result') { setFit(null); return }
    const el = paperRef.current?.querySelector('#rd-page')
    if (!el) return
    const measure = () => {
      const content = el.scrollHeight - SCREEN_PAD
      const overflow = content - CONTENT_LIMIT
      setFit({
        content,
        overflow,
        overflowPct: Math.max(0, Math.round((overflow / CONTENT_LIMIT) * 100)),
        fits: overflow <= -SAFETY ? true : overflow <= 0,
      })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    // Fonts can settle after first paint and change the height.
    document.fonts?.ready?.then(measure).catch(() => {})
    return () => ro.disconnect()
  }, [phase, result])

  async function trim() {
    if (!result?.resume || trimming) return
    setTrimming(true); setError(null)
    const condensed = await condenseResume(result.resume, fit?.overflowPct || 15)
    if (!condensed) setError('Could not trim it automatically. Try shortening a bullet or two yourself.')
    else setResult(r => ({ ...r, resume: condensed }))
    setTrimming(false)
  }

  // Restore draft + read San4 score (also on tab refocus, for the /assessment round-trip)
  useEffect(() => {
    try { const d = localStorage.getItem(DRAFT_KEY); if (d) setForm({ ...BLANK, ...JSON.parse(d) }) } catch {}
    readScore()
    const onFocus = () => readScore()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [user])

  function readScore() {
    const s = getCommScore(user?.id)
    setSan4(s != null ? { score: s, band: scoreBand(s)?.name } : null)
  }

  function update(patch) {
    setForm(prev => { const next = { ...prev, ...patch }; try { localStorage.setItem(DRAFT_KEY, JSON.stringify(next)) } catch {}; return next })
  }
  function updateExp(i, patch) {
    const experience = form.experience.map((e, j) => j === i ? { ...e, ...patch } : e)
    update({ experience })
  }

  // ── Upload existing resume → parse → prefill the form ──────────────────────
  async function onFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 8 * 1024 * 1024) { setError('Please upload a resume under 8 MB.'); return }
    setError(null); setParsing(true)
    try {
      const base64 = await new Promise((res, rej) => { const r = new FileReader(); r.onloadend = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(f) })
      const parsed = await parseResumeFile(base64, f.type || 'application/pdf')
      if (!parsed) { setError('Could not read that file. Try a text-based PDF, or fill it in manually.'); setParsing(false); return }
      update({
        name: parsed.name || '', title: parsed.title || '', location: parsed.location || '',
        email: parsed.email || '', phone: parsed.phone || '', linkedin: parsed.linkedin || '',
        github: parsed.github || '', portfolio: parsed.portfolio || '', summary: parsed.summary || '',
        experience: (parsed.experience?.length ? parsed.experience : [BLANK_EXP()]).map(x => ({ ...BLANK_EXP(), ...x, bullets: Array.isArray(x.bullets) ? x.bullets.join('\n') : (x.bullets || '') })),
        skills: (parsed.skills || []).map(s => `${s.category}: ${(s.items || []).join(', ')}`).join('\n'),
        education: (parsed.education || []).map(e => `${e.degree} - ${e.institution} | ${e.meta || ''}`).join('\n'),
        certifications: (parsed.certifications || []).join('\n'),
        achievements: (parsed.achievements || []).join('\n'),
      })
      setPhase('form')
    } catch { setError('Something went wrong reading the file. Please fill it in manually.') }
    setParsing(false)
  }

  // ── Generate ────────────────────────────────────────────────────────────────
  async function generate() {
    if (!san4) { setError('Add your San4 Score first, it goes on your resume.'); return }
    setError(null); setPhase('generating')
    const profile = {
      name: form.name, title: form.title, location: form.location, email: form.email, phone: form.phone,
      linkedin: form.linkedin, github: form.github, portfolio: form.portfolio, summary: form.summary,
      experience: form.experience.filter(e => e.role || e.company).map(e => ({ ...e, bullets: e.bullets.split('\n').map(s => s.trim()).filter(Boolean) })),
      skills: form.skills, education: form.education, certifications: form.certifications, achievements: form.achievements,
    }
    const out = await generateResume({ profile, jobDescription: form.jobDescription })
    if (!out) { setError('Could not build the resume. Please try again in a moment.'); setPhase('form'); return }
    track(EV.RESUME_GENERATED, {
      ats_score: out.ats_score,
      has_job_description: !!form.jobDescription,
      years_experience: out.total_years_experience ?? null,
      san4_score: san4?.score ?? null,
    })

    setResult(out); setPhase('result')
    window.scrollTo(0, 0)
  }

  // ── San4 gate card ──────────────────────────────────────────────────────────
  const San4Gate = () => san4 ? (
    <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: 'rgba(0,196,154,0.08)', border: '1px solid rgba(0,196,154,0.3)' }}>
      <div className="text-3xl font-black" style={{ color: '#00C49A' }}>{san4.score}</div>
      <div className="flex-1">
        <div className="text-sm font-bold text-white">San4 Score added ✓ {san4.band ? `· ${san4.band}` : ''}</div>
        <div className="text-xs" style={{ color: '#6B8CAE' }}>This will appear on your resume, so recruiters can see how you communicate.</div>
      </div>
      <a href="/assessment" target="_blank" rel="noopener noreferrer" className="text-xs font-semibold underline" style={{ color: '#34E0B0' }}>Retake</a>
    </div>
  ) : (
    <div className="rounded-2xl p-4" style={{ background: 'rgba(255,107,53,0.08)', border: '1px solid rgba(255,107,53,0.3)' }}>
      <div className="text-sm font-bold text-white mb-1">🎯 One step before your resume: get your San4 Score</div>
      <div className="text-xs mb-3" style={{ color: '#94A3B8' }}>A 2-minute voice test. Your communication score goes on the resume, the thing employers can't see from a CV. Required to generate.</div>
      <div className="flex gap-2">
        <a href="/assessment" target="_blank" rel="noopener noreferrer" className="btn-primary text-sm px-5 py-2.5">Take the 2-min test ↗</a>
        <button onClick={readScore} className="text-sm px-4 py-2.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#cbd5e1' }}>I've done it — check</button>
      </div>
    </div>
  )

  // ── INTRO ───────────────────────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div className="min-h-screen" style={{ background: '#050810', color: '#F1F5F9' }}>
        <MarketingHeader />
        <main className="max-w-2xl mx-auto px-6 py-14 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4 text-xs font-bold" style={{ background: 'rgba(0,196,154,0.14)', color: '#34E0B0', border: '1px solid rgba(0,196,154,0.3)' }}>✅ Free · ATS-friendly</div>
          <h1 className="text-3xl font-black text-white mb-3" style={{ fontFamily: 'Outfit, sans-serif' }}>Free ATS-Friendly Resume Builder</h1>
          <p className="text-base mb-8 max-w-lg mx-auto" style={{ color: '#94A3B8' }}>
            Build a clean, recruiter-ready resume, tailored to the job, scored for ATS, and stamped with your San4 Communication Score. One page, no fluff.
          </p>
          {error && <div className="rounded-xl px-4 py-3 mb-5 text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.3)' }}>{error}</div>}
          <div className="grid sm:grid-cols-2 gap-4 text-left">
            <button onClick={() => fileRef.current?.click()} disabled={parsing}
              className="rounded-2xl p-6 transition-all hover:opacity-90 text-left" style={{ background: 'linear-gradient(145deg,#10192E,#0B1220)', border: '1px solid rgba(123,94,167,0.35)' }}>
              <div className="text-3xl mb-2">📄</div>
              <div className="font-bold text-white mb-1">{parsing ? 'Reading your resume…' : 'Upload your resume'}</div>
              <div className="text-xs" style={{ color: '#94A3B8' }}>We read it and fill everything in. You review, then get your San4 Score.</div>
            </button>
            <button onClick={() => setPhase('form')}
              className="rounded-2xl p-6 transition-all hover:opacity-90 text-left" style={{ background: 'linear-gradient(145deg,#10192E,#0B1220)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="text-3xl mb-2">✍️</div>
              <div className="font-bold text-white mb-1">Fill it in</div>
              <div className="text-xs" style={{ color: '#94A3B8' }}>Type your details. Takes a few minutes.</div>
            </button>
          </div>
          <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" hidden onChange={onFile} />
          <p className="text-xs mt-6" style={{ color: '#6B8CAE' }}>Your data is used only to build your resume. LinkedIn/GitHub links are shown on the resume; we don't log into them.</p>
        </main>
      </div>
    )
  }

  // ── RESULT ──────────────────────────────────────────────────────────────────
  if (phase === 'result' && result) {
    const ats = result.ats_score ?? 0
    const atsColor = ats >= 80 ? '#00C49A' : ats >= 60 ? '#FF6B35' : '#F87171'
    return (
      <div className="min-h-screen" style={{ background: '#050810', color: '#F1F5F9' }}>
        <MarketingHeader />
        <main className="max-w-5xl mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-[300px_1fr] gap-6">
            {/* ATS panel */}
            <aside className="lg:sticky lg:top-20 h-fit space-y-4">
              <div className="rounded-2xl p-5 text-center" style={{ background: 'linear-gradient(145deg,#10192E,#0B1220)', border: `1px solid ${atsColor}44` }}>
                <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#6B8CAE' }}>ATS Score</div>
                <div className="text-5xl font-black" style={{ color: atsColor }}>{ats}<span className="text-lg" style={{ color: '#6B8CAE' }}>/100</span></div>
                {result.ats_summary && <p className="text-xs mt-2" style={{ color: '#94A3B8' }}>{result.ats_summary}</p>}
              </div>
              {result.ats_tips?.length > 0 && (
                <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="text-xs font-bold mb-2" style={{ color: '#FF6B35' }}>↑ To score higher</div>
                  <ul className="space-y-1.5">{result.ats_tips.map((t, i) => <li key={i} className="text-xs flex gap-2" style={{ color: '#94A3B8' }}><span style={{ color: '#FF6B35' }}>•</span>{t}</li>)}</ul>
                </div>
              )}
              {result.missing_keywords?.length > 0 && (
                <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="text-xs font-bold mb-2" style={{ color: '#A78BFA' }}>Keywords to add (if true for you)</div>
                  <div className="flex flex-wrap gap-1.5">{result.missing_keywords.map((k, i) => <span key={i} className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(167,139,250,0.12)', color: '#C4B5FD' }}>{k}</span>)}</div>
                </div>
              )}
              {/* Live one-page fit indicator */}
              {fit && (
                <div className="rounded-2xl p-4" style={{
                  background: fit.fits ? 'rgba(0,196,154,0.08)' : 'rgba(255,107,53,0.08)',
                  border: `1px solid ${fit.fits ? 'rgba(0,196,154,0.32)' : 'rgba(255,107,53,0.35)'}`,
                }}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span style={{ fontSize: 16 }}>{fit.fits ? '✅' : '⚠️'}</span>
                    <span className="text-sm font-bold text-white">
                      {fit.fits ? 'Fits one page' : `Running long · ~${fit.overflowPct}% over`}
                    </span>
                  </div>
                  {/* Fill bar: how much of the page is used */}
                  <div className="h-1.5 rounded-full mb-2 overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <div className="h-full rounded-full transition-all duration-500" style={{
                      width: `${Math.min(100, Math.round((fit.content / CONTENT_LIMIT) * 100))}%`,
                      background: fit.fits ? '#00C49A' : '#FF6B35',
                    }} />
                  </div>
                  <p className="text-xs mb-2" style={{ color: '#94A3B8' }}>
                    {fit.fits
                      ? 'Your PDF will print on a single page.'
                      : 'This will spill onto a second page. Trim it so nothing gets lost.'}
                  </p>
                  {!fit.fits && (
                    <button onClick={trim} disabled={trimming}
                      className="w-full text-sm font-bold py-2.5 rounded-full transition-all"
                      style={{ background: trimming ? 'rgba(255,107,53,0.4)' : 'linear-gradient(135deg,#FF6B35,#F59E0B)', color: '#fff' }}>
                      {trimming ? 'Trimming…' : '✂️ Trim to one page'}
                    </button>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <button onClick={() => { track(EV.RESUME_DOWNLOADED, { ats_score: result.ats_score, fits_one_page: fit?.fits ?? null }); window.print() }} className="btn-primary py-3">⬇ Download PDF</button>
                <button onClick={() => setPhase('form')} className="text-sm py-2.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#cbd5e1' }}>← Edit details</button>
              </div>
            </aside>

            {/* The resume */}
            <div ref={paperRef} className="overflow-x-auto rounded-2xl" style={{ background: '#525659', padding: 16 }}>
              <ResumeDocument resume={result.resume} san4={san4} />
            </div>
          </div>
        </main>
      </div>
    )
  }

  // ── FORM (and generating) ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: '#050810', color: '#F1F5F9' }}>
      <MarketingHeader />
      <main className="max-w-2xl mx-auto px-5 py-10">
        <h1 className="text-2xl font-black text-white mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>Your details</h1>
        <p className="text-sm mb-6" style={{ color: '#6B8CAE' }}>We'll polish the wording and tailor it to the job. Just get the facts down.</p>

        {error && <div className="rounded-xl px-4 py-3 mb-5 text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.3)' }}>{error}</div>}

        <div className="mb-5"><San4Gate /></div>

        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Full name" value={form.name} onChange={e => update({ name: e.target.value })} placeholder="Priya Sharma" />
            <Field label="Headline" value={form.title} onChange={e => update({ title: e.target.value })} placeholder="Marketing Analyst | Google Ads Certified" />
            <Field label="Location" value={form.location} onChange={e => update({ location: e.target.value })} placeholder="Bengaluru, India" />
            <Field label="Email" value={form.email} onChange={e => update({ email: e.target.value })} placeholder="priya.sharma@example.com" />
            <Field label="Phone" value={form.phone} onChange={e => update({ phone: e.target.value })} placeholder="+91 98765 43210" />
            <Field label="LinkedIn" value={form.linkedin} onChange={e => update({ linkedin: e.target.value })} placeholder="linkedin.com/in/yourname" />
            <Field label="GitHub / Portfolio" value={form.github} onChange={e => update({ github: e.target.value })} placeholder="github.com/yourname or your portfolio URL" />
            <Field label="Other link" value={form.portfolio} onChange={e => update({ portfolio: e.target.value })} placeholder="optional" />
          </div>

          <Area label="Professional summary" value={form.summary} onChange={e => update({ summary: e.target.value })} placeholder="A few lines on who you are and what you do." />

          {/* Experience */}
          <div>
            <div className="text-xs font-semibold mb-2" style={{ color: '#94A3B8' }}>Experience</div>
            <div className="space-y-3">
              {form.experience.map((e, i) => (
                <div key={i} className="rounded-2xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="grid sm:grid-cols-2 gap-2 mb-2">
                    <Field label="Role" value={e.role} onChange={ev => updateExp(i, { role: ev.target.value })} placeholder="Marketing Analyst" />
                    <Field label="Company" value={e.company} onChange={ev => updateExp(i, { company: ev.target.value })} placeholder="Company name" />
                    <Field label="Start" value={e.start} onChange={ev => updateExp(i, { start: ev.target.value })} placeholder="Mar 2023" />
                    <Field label="End" value={e.end} onChange={ev => updateExp(i, { end: ev.target.value })} placeholder="Present" />
                  </div>
                  <Area label="What you did" hint="one point per line" value={e.bullets} onChange={ev => updateExp(i, { bullets: ev.target.value })} placeholder={'Led a campaign that grew signups by 30%\nBuilt a weekly dashboard used by the sales team'} />
                  {form.experience.length > 1 && (
                    <button onClick={() => update({ experience: form.experience.filter((_, j) => j !== i) })} className="text-xs mt-2" style={{ color: '#F87171' }}>Remove</button>
                  )}
                </div>
              ))}
            </div>
            <button onClick={() => update({ experience: [...form.experience, BLANK_EXP()] })} className="text-sm mt-2 font-semibold" style={{ color: '#A78BFA' }}>+ Add another role</button>
          </div>

          <Area label="Skills" hint="Category: skill, skill — one per line" value={form.skills} onChange={e => update({ skills: e.target.value })} placeholder={'Marketing: SEO, Campaign Strategy, Analytics\nTools: Excel, Google Analytics, Figma'} />
          <Area label="Education" hint="Degree - Institution | Years/CGPA — one per line" value={form.education} onChange={e => update({ education: e.target.value })} placeholder={'MBA (Marketing) - Your University | 2021-2023 | 8.2/10'} />
          <Area label="Certifications" hint="one per line" value={form.certifications} onChange={e => update({ certifications: e.target.value })} placeholder={'Google Analytics Certified - Google, 2024'} />
          <Area label="Achievements" hint="one per line" value={form.achievements} onChange={e => update({ achievements: e.target.value })} placeholder={'Best Performer Award - Your Company, 2024'} />

          <div className="pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <Area label="🎯 Target job description" hint="paste it to tailor the resume + get an ATS match score" value={form.jobDescription} onChange={e => update({ jobDescription: e.target.value })} placeholder="Paste the job description you're applying for (optional but recommended)." />
          </div>

          <button onClick={generate} disabled={phase === 'generating' || !san4}
            className="btn-primary w-full py-4 text-base" style={(!san4 || phase === 'generating') ? { opacity: 0.55, cursor: 'not-allowed' } : undefined}>
            {phase === 'generating' ? 'Building your resume…' : san4 ? '✨ Build my ATS resume' : 'Add your San4 Score to continue ↑'}
          </button>
        </div>
      </main>
    </div>
  )
}
