import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth }    from '../hooks/useAuth'
import { useProgress } from '../hooks/useProgress'
import { supabase }   from '../lib/supabase'
import { analyzeCEFRAssessment } from '../lib/gemini'
import { generateShareCard, shareCard } from '../lib/shareCard'
import { saveCommScore, scoreBand } from '../lib/san4Score'
import { LANGUAGES, getLang, setLang, hasChosenLang, t } from '../lib/onboardingCopy'
import Navbar    from '../components/Navbar'
import VakMascot from '../components/VakMascot'

// ── The 2-minute task ─────────────────────────────────────────────────────────
const PASSAGE = `Good communication is not about using big words. It is about being understood. When you speak clearly and with confidence, people trust you more. They listen, they remember, and they act on what you say. The best speakers are not the loudest in the room. They are the ones who say the right thing, at the right time, in the simplest possible way.`

const QUESTION = `Now, in your own words: describe a recent project or task you worked on, and what you found most challenging about it.`

// ── CEFR visual scale ─────────────────────────────────────────────────────────
const CEFR_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
const CEFR_COLOR = {
  A1: '#F87171', A2: '#FB923C', B1: '#F59E0B',
  B2: '#00C49A', C1: '#8B5CF6', C2: '#A78BFA',
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function arrayBufferToBase64(buf) {
  const bytes = new Uint8Array(buf); let bin = ''; const c = 8192
  for (let i = 0; i < bytes.length; i += c) bin += String.fromCharCode(...bytes.subarray(i, i + c))
  return btoa(bin)
}
function pickMime() {
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg']
    .find(t => MediaRecorder.isTypeSupported(t)) || 'audio/webm'
}
function scoreColor(v) {
  if (v >= 80) return '#00C49A'
  if (v >= 60) return '#FF6B35'
  return '#F87171'
}
function fmt(s) { const m = Math.floor(s / 60); return `${m}:${String(s % 60).padStart(2, '0')}` }

// ── Sub-score bar ─────────────────────────────────────────────────────────────
function Bar({ label, value, icon }) {
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-semibold text-white">{icon} {label}</span>
        <span className="text-sm font-black" style={{ color: scoreColor(value) }}>{value}</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, background: scoreColor(value) }} />
      </div>
    </div>
  )
}

// Your score stays valid for this long; retake unlocks after, to measure real
// improvement rather than re-testing the same thing repeatedly.
const RETAKE_DAYS = 30
const cefrKey = (user) => `san4_cefr_${user?.id || 'guest'}`
function fmtDate(ts) {
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Minimal header for logged-out visitors taking the public score test.
function GuestHeader() {
  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between px-5 h-14"
      style={{ background: 'rgba(5,8,16,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <Link to="/" className="flex items-center gap-2">
        <img src="/san4-icon.png" alt="San4" width={26} height={26} className="rounded-lg" />
        <span className="text-lg font-black text-white tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
          SAN<span style={{ color: '#7B5EA7' }}>4</span>
        </span>
      </Link>
      <Link to="/auth" className="text-sm font-medium" style={{ color: '#6B8CAE' }}>Sign in</Link>
    </nav>
  )
}

// The category-defining line: language and communication are different skills.
function framingLine(comm, langOverall) {
  if (!Number.isFinite(comm) || !Number.isFinite(langOverall)) return null
  if (comm + 5 < langOverall)
    return "Your English isn't the problem. Your communication is. That's exactly what San4 trains."
  if (comm > langOverall + 5)
    return 'Your communication instincts are stronger than your English. Polish the language and you are unstoppable.'
  return 'Your English and your communication are level. Time to raise both.'
}

export default function Assessment() {
  const { user, profile } = useAuth()
  const { progress } = useProgress()
  const navigate = useNavigate()

  // phases: language | intro | step1cue | step1rec | step2cue | step2rec | analyzing | report
  // First-timers meet the mother-tongue picker; returning users skip straight to intro.
  const [phase,   setPhase]   = useState(() => (hasChosenLang() ? 'intro' : 'language'))
  const [lang,    setLangState] = useState(getLang)
  const c = t(lang)
  const [seconds, setSeconds] = useState(0)
  const [report,  setReport]  = useState(null)
  const [error,   setError]   = useState(null)
  const [lockedUntil, setLockedUntil] = useState(null) // retake gate timestamp
  // Guests have no account to store consent against, so we gate the public
  // score test on an explicit tick (DPDP: affirmative consent, not a notice).
  // Signed-in users already consented at signup, so this only shows for guests.
  const [guestConsent, setGuestConsent] = useState(false)

  // ── Restore a previously saved score so the level persists across visits ──
  useEffect(() => {
    try {
      const raw = localStorage.getItem(cefrKey(user))
      if (!raw) return
      const saved = JSON.parse(raw)
      if (saved?.result && saved?.takenAt) {
        setReport(saved.result)
        setLockedUntil(saved.takenAt + RETAKE_DAYS * 86400000)
        setPhase('report')
      }
    } catch { /* ignore */ }
  }, [user])

  const mediaRecRef    = useRef(null)
  const audioChunksRef = useRef([])
  const audioStreamRef = useRef(null)
  const audioMimeRef   = useRef('audio/webm')
  const timerRef       = useRef(null)

  useEffect(() => () => {
    audioStreamRef.current?.getTracks().forEach(t => t.stop())
    clearInterval(timerRef.current)
  }, [])

  // ── Two-step capture: step 1 = read-aloud, step 2 = spontaneous answer ────
  // Each step is its OWN recording with its own start/stop button, so the
  // model can weigh reading vs spontaneous speech properly, and users get a
  // breather between the two.
  const MIN_STEP_SECONDS = 8
  const step1ClipRef = useRef(null)
  const [recOn, setRecOn] = useState(false)

  async function beginCapture() {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioStreamRef.current = stream
      const mime = pickMime()
      audioMimeRef.current = mime
      const rec = new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 40000 })
      audioChunksRef.current = []
      rec.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      rec.start(1000)
      mediaRecRef.current = rec
      setSeconds(0)
      setRecOn(true)
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000)
    } catch {
      setError('We need microphone access to score your speaking. Click the lock icon in your address bar, allow the mic, then try again.')
    }
  }

  async function endCapture() {
    clearInterval(timerRef.current)
    setRecOn(false)
    await new Promise(resolve => {
      const rec = mediaRecRef.current
      if (!rec || rec.state === 'inactive') { resolve(); return }
      rec.onstop = resolve; rec.stop()
    })
    audioStreamRef.current?.getTracks().forEach(t => t.stop())
    if (audioChunksRef.current.length === 0) return null
    const blob = new Blob(audioChunksRef.current, { type: audioMimeRef.current })
    const buf  = await blob.arrayBuffer()
    audioChunksRef.current = []
    return { base64: arrayBufferToBase64(buf), mimeType: audioMimeRef.current.split(';')[0] }
  }

  async function handleStepButton(step) {
    if (!recOn) { beginCapture(); return }

    if (seconds < MIN_STEP_SECONDS) {
      // Too short: keep recording, nudge instead of discarding their take
      setError(step === 1
        ? 'Keep going, read the full passage aloud.'
        : 'Give it a fuller answer. A few sentences at least.')
      return
    }

    const payload = await endCapture()
    if (!payload) {
      setError('We could not capture any audio. Please try again.')
      return
    }

    if (step === 1) {
      step1ClipRef.current = payload
      setError(null)
      setSeconds(0)
      setPhase('step2cue')
      return
    }

    runAnalysis([step1ClipRef.current, payload])
  }

  async function runAnalysis(clips) {
    setPhase('analyzing')

    const result = await analyzeCEFRAssessment(
      clips,
      'describe a recent project or task they worked on and what they found most challenging'
    )

    if (!result) {
      setError('Scoring failed. Please try again in a moment. Your Step 1 recording is saved, so just redo your answer.')
      setPhase('step2cue')
      return
    }

    // Persist the assessment as a session row so it shows in history
    if (user) {
      await supabase.from('practice_sessions').insert({
        user_id:          user.id,
        scenario_id:      'cefr_assessment',
        scenario_title:   `🎯 CEFR Assessment — ${result.cefr_level}`,
        overall_score:    result.overall_score,
        confidence_score: result.fluency,
        pacing_score:     result.pronunciation,
        duration_seconds: seconds,
        feedback:         result.band_description,
        action_item:      result.next_step,
        messages:         [],
      }).then(() => {}, () => {})
    }

    // Persist locally so the level stays consistent and we don't re-prompt the
    // test on every visit. Retake unlocks after RETAKE_DAYS.
    try {
      localStorage.setItem(cefrKey(user), JSON.stringify({ result, takenAt: Date.now() }))
    } catch { /* ignore */ }
    setLockedUntil(Date.now() + RETAKE_DAYS * 86400000)

    // Seed the living San4 Score with the assessment's communication axis
    if (Number.isFinite(result.communication_score)) {
      saveCommScore(user?.id, result.communication_score)
    }

    setReport(result)
    setPhase('report')
  }

  // ── LANGUAGE — the mother-tongue welcome, the first thing a nervous user sees ─
  // We greet them in every script so they instantly spot their own, then guide
  // the whole assessment in that language. They still speak & get scored in English.
  function chooseLanguage(code) {
    setLang(code)
    setLangState(code)
    if (user) {
      // Best-effort persist to profile; column may not exist yet (localStorage is source of truth)
      supabase.from('profiles').update({ preferred_language: code }).eq('id', user.id).then(() => {}, () => {})
    }
    setPhase('intro')
  }
  if (phase === 'language') {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: '#060E1A' }}>
        {user ? <Navbar /> : <GuestHeader />}
        <main className="flex-1 max-w-lg mx-auto w-full px-4 py-8 flex flex-col">
          <div className="flex justify-center mb-4 animate-float"><VakMascot level={3} size={78} mood="encouraging" /></div>
          <h1 className="text-2xl font-black text-white text-center mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
            {c.chooseTitle}
          </h1>
          <p className="text-sm text-center mb-6" style={{ color: '#6B8CAE' }}>{c.chooseSub}</p>

          <div className="grid grid-cols-2 gap-2.5">
            {LANGUAGES.map(l => {
              const active = l.code === lang
              return (
                <button
                  key={l.code}
                  onClick={() => { setLang(l.code); setLangState(l.code) }}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left transition-all active:scale-[0.98]"
                  style={{
                    background: active ? 'rgba(139,92,246,0.16)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${active ? 'rgba(139,92,246,0.55)' : 'rgba(255,255,255,0.08)'}`,
                  }}
                >
                  <span style={{ fontSize: 22 }}>{l.flag}</span>
                  <span className="flex flex-col leading-tight">
                    <span className="text-base font-bold text-white">{l.nativeName}</span>
                    <span className="text-xs" style={{ color: '#6B8CAE' }}>{l.label}</span>
                  </span>
                </button>
              )
            })}
          </div>

          <button onClick={() => chooseLanguage(lang)} className="btn-primary w-full py-4 text-base mt-6">
            {c.continue}
          </button>
        </main>
      </div>
    )
  }

  // ── INTRO ──────────────────────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div className="min-h-screen" style={{ background: '#060E1A' }}>
        {user ? <Navbar /> : <GuestHeader />}
        <main className="max-w-lg mx-auto px-4 py-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold"
              style={{ background: 'rgba(139,92,246,0.12)', color: '#A78BFA', border: '1px solid rgba(139,92,246,0.25)' }}>
              {c.badge}
            </div>
            {/* Mother-tongue switcher — tap to change the language guiding you */}
            <button onClick={() => setPhase('language')}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold"
              style={{ background: 'rgba(255,255,255,0.05)', color: '#6B8CAE', border: '1px solid rgba(255,255,255,0.1)' }}>
              🌐 {LANGUAGES.find(l => l.code === lang)?.nativeName || 'English'} ▾
            </button>
          </div>
          <div className="flex justify-center mb-3 animate-float"><VakMascot level={3} size={90} /></div>
          <h1 className="text-2xl font-black text-white mb-2">{c.title}</h1>
          {lang === 'en-US' ? (
            <p className="text-sm mb-6" style={{ color: '#6B8CAE' }}>
              Read a short passage aloud, then answer one question. You get two numbers: your <strong className="text-white">San4 Score</strong> (how you communicate, the number worth putting on your CV) and your English level (CEFR). Vak assesses your
              <strong className="text-white"> pronunciation, grammar, vocabulary and fluency</strong> and
              gives you a CEFR level (A1–C2), the global standard.
            </p>
          ) : (
            <p className="text-sm mb-6" style={{ color: '#6B8CAE' }}>{c.intro}</p>
          )}

          {error && (
            <div className="rounded-2xl px-4 py-3 mb-5 text-sm text-left"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.3)' }}>
              {error}
            </div>
          )}

          <div className="rounded-2xl p-5 mb-4 text-left"
            style={{ background: 'linear-gradient(160deg,#10192E,#0B1220)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#8B5CF6' }}>{c.step1Label}</div>
            <p className="text-sm leading-relaxed mb-4" style={{ color: '#E2E8F0' }}>{PASSAGE}</p>
            <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#00C49A' }}>{c.step2Label}</div>
            <p className="text-sm leading-relaxed" style={{ color: '#E2E8F0' }}>{QUESTION}</p>
            {c.qgloss && <p className="text-xs leading-relaxed mt-2" style={{ color: '#8FA3BF' }}>{c.qgloss}</p>}
          </div>

          {/* Guest consent (DPDP) — signed-in users already consented at signup */}
          {!user && (
            <label className="w-full mb-4 flex items-start gap-2.5 text-xs leading-relaxed cursor-pointer select-none px-4 py-3 rounded-2xl text-left"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#6B8CAE' }}>
              <input
                type="checkbox"
                checked={guestConsent}
                onChange={e => { setGuestConsent(e.target.checked); setError('') }}
                className="mt-0.5 shrink-0"
                style={{ accentColor: '#7B5EA7' }}
                required
              />
              <span>
                I consent to San4 recording my voice for this test and sending it to our
                AI processor (Google Gemini) to score my speech. See the{' '}
                <Link to="/privacy" target="_blank" className="font-semibold hover:text-white transition-colors"
                  style={{ color: '#7B5EA7' }}>Privacy Policy</Link>.
              </span>
            </label>
          )}

          <button
            onClick={() => {
              if (!user && !guestConsent) { setError('Please tick the consent box to start.'); return }
              setError(null); setPhase('step1cue')
            }}
            disabled={!user && !guestConsent}
            className="btn-primary w-full py-4 text-base"
            style={!user && !guestConsent ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
          >
            {c.start}
          </button>
          <p className="text-xs mt-3" style={{ color: '#6B8CAE' }}>
            {c.footer}
          </p>
        </main>
      </div>
    )
  }

  // Shared step-progress chips
  const StepChips = ({ activeStep }) => (
    <div className="flex items-center gap-2">
      {[1, 2].map(n => {
        const active = n === activeStep
        const done = n < activeStep
        const c = n === 1 ? '#8B5CF6' : '#00C49A'
        return (
          <span key={n} className="text-xs font-bold px-3 py-1.5 rounded-full"
            style={{
              background: active ? `${c}22` : 'rgba(255,255,255,0.05)',
              color:      active ? c : done ? '#00C49A' : '#6B8CAE',
              border:     `1px solid ${active ? `${c}55` : 'rgba(255,255,255,0.1)'}`,
            }}>
            {done ? '✓ ' : ''}Step {n}
          </span>
        )
      })}
    </div>
  )

  // ── CUE PAGES — read the task, then tap "Let's go" to the mic ─────────────
  const cueStep = phase === 'step1cue' ? 1 : phase === 'step2cue' ? 2 : null
  if (cueStep) {
    const isOne = cueStep === 1
    const accent = isOne ? '#8B5CF6' : '#00C49A'
    return (
      <div className="min-h-screen flex flex-col" style={{ background: '#060E1A' }}>
        {user ? <Navbar /> : <GuestHeader />}
        <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6 flex flex-col">
          <div className="mb-6"><StepChips activeStep={cueStep} /></div>

          {isOne ? (
            /* Step 1 cue: read-aloud passage */
            <div className="flex-1 flex flex-col justify-center">
              <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: accent }}>
                {c.s1kicker}
              </div>
              <div className="rounded-3xl p-6"
                style={{ background: 'linear-gradient(160deg,#10192E,#0B1220)', border: `1px solid ${accent}44` }}>
                <p className="text-lg leading-relaxed" style={{ color: '#FFFFFF' }}>{PASSAGE}</p>
              </div>
              <p className="text-sm mt-4 text-center" style={{ color: '#6B8CAE' }}>
                {c.s1hint}
              </p>
            </div>
          ) : (
            /* Step 2 cue: THE question, the highlight of the screen */
            <div className="flex-1 flex flex-col justify-center text-center">
              <div className="text-xs font-bold uppercase tracking-widest mb-6" style={{ color: accent }}>
                {c.s2kicker}
              </div>
              <div className="text-5xl mb-6">🎤</div>
              <h1 className="text-2xl sm:text-3xl font-black text-white leading-snug mb-4 px-2"
                style={{ fontFamily: 'Outfit, sans-serif' }}>
                {QUESTION}
              </h1>
              {c.qgloss && (
                <p className="text-sm leading-relaxed mb-4 px-2" style={{ color: '#8FA3BF' }}>{c.qgloss}</p>
              )}
              <p className="text-sm" style={{ color: '#6B8CAE' }}>
                {c.s2hint}
              </p>
            </div>
          )}

          <button
            onClick={() => { setError(null); setSeconds(0); setPhase(isOne ? 'step1rec' : 'step2rec') }}
            className="btn-primary w-full py-4 text-base mt-6"
            style={{ background: `linear-gradient(135deg, ${accent}, #9B7EC8)` }}
          >
            {c.letsGo}
          </button>
        </main>
      </div>
    )
  }

  // ── RECORD PAGES — the MIC is the hero, nothing else competes ─────────────
  const recStep = phase === 'step1rec' ? 1 : phase === 'step2rec' ? 2 : null
  if (recStep) {
    const isOne = recStep === 1
    return (
      <div className="min-h-screen flex flex-col" style={{ background: '#050810' }}>
        {/* Minimal top: just step + timer, no nav to avoid distraction */}
        <div className="px-4 py-4 flex items-center justify-between">
          <StepChips activeStep={recStep} />
          {recOn && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)' }}>
              <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: '#F87171' }} />
              <span className="text-sm font-bold tabular-nums" style={{ color: '#F87171' }}>{fmt(seconds)}</span>
            </div>
          )}
        </div>

        <main className="flex-1 flex flex-col items-center justify-center px-6 w-full max-w-lg mx-auto text-center">
          {/* Step 1 needs the passage visible to read; keep it, but muted so the mic dominates */}
          {isOne && (
            <div className="w-full max-h-44 overflow-y-auto rounded-2xl px-4 py-3 mb-8"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-sm leading-relaxed" style={{ color: '#94A3B8' }}>{PASSAGE}</p>
            </div>
          )}
          {!isOne && (
            <div className="mb-10 px-4">
              <p className="text-sm" style={{ color: '#6B8CAE' }}>{QUESTION}</p>
              {c.qgloss && <p className="text-xs mt-1.5" style={{ color: '#54697F' }}>{c.qgloss}</p>}
            </div>
          )}

          {/* THE MIC — big, glowing, unmistakable */}
          <button
            onClick={() => handleStepButton(recStep)}
            className="relative flex items-center justify-center rounded-full transition-all active:scale-95"
            style={{
              width: 128, height: 128,
              background: recOn
                ? 'linear-gradient(135deg, #F87171, #EF4444)'
                : 'linear-gradient(135deg, #7B5EA7, #9B7EC8)',
              boxShadow: recOn
                ? '0 0 60px rgba(239,68,68,0.55)'
                : '0 0 55px rgba(123,94,167,0.5)',
            }}
          >
            {recOn && <span className="absolute inset-0 rounded-full animate-ping" style={{ background: 'rgba(239,68,68,0.3)' }} />}
            <span className="relative" style={{ fontSize: 52 }}>{recOn ? '⏹' : '🎤'}</span>
          </button>

          <p className="text-base font-semibold text-white mt-6">
            {recOn
              ? (isOne ? 'Reading… tap when you finish' : 'Speaking… tap when you finish')
              : (isOne ? 'Tap to start reading' : 'Tap to start speaking')}
          </p>
          {recOn && seconds < MIN_STEP_SECONDS && (
            <p className="text-xs mt-2" style={{ color: '#6B8CAE' }}>
              Keep going for at least {MIN_STEP_SECONDS} seconds
            </p>
          )}

          {error && (
            <div className="rounded-2xl px-4 py-3 mt-6 text-sm w-full"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.3)' }}>
              {error}
            </div>
          )}
        </main>
        <div className="h-10" />
      </div>
    )
  }

  // ── ANALYZING ──────────────────────────────────────────────────────────────
  if (phase === 'analyzing') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6" style={{ background: '#060E1A' }}>
        <div className="animate-float"><VakMascot level={4} size={100} mood="thinking" /></div>
        <div className="text-center">
          <div className="text-white font-bold text-xl mb-2">{c.scoring}</div>
          <div style={{ color: '#6B8CAE' }}>{c.scoringSub}</div>
        </div>
        <div className="flex gap-2">
          {[0,1,2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full animate-bounce"
              style={{ background: '#8B5CF6', animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    )
  }

  // ── REPORT ──────────────────────────────────────────────────────────────────
  if (phase === 'report' && report) {
    const band  = report.cefr_level
    const bColor = CEFR_COLOR[band] || '#8B5CF6'
    const comm  = Number.isFinite(report.communication_score) ? report.communication_score : null
    const commBand = comm != null ? scoreBand(comm) : null
    const framing = framingLine(comm, report.overall_score)
    return (
      <div className="min-h-screen" style={{ background: '#060E1A' }}>
        {user ? <Navbar /> : <GuestHeader />}
        <main className="max-w-lg mx-auto px-4 py-8 animate-slide-up">

          {/* ── The San4 Score: the anchor ─────────────────────────────────── */}
          {comm != null && (
            <div className="rounded-3xl p-6 mb-4 text-center"
              style={{ background: `linear-gradient(160deg, ${commBand.color}22, #0B1220)`, border: `1px solid ${commBand.color}55`, boxShadow: `0 0 50px ${commBand.color}22` }}>
              <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#6B8CAE' }}>Your San4 Score</div>
              <div className="font-black mb-1" style={{ fontSize: '4.5rem', lineHeight: 1, color: commBand.color }}>{comm}</div>
              <div className="text-lg font-bold text-white">{commBand.name}</div>
              <p className="text-xs mt-1" style={{ color: '#6B8CAE' }}>{commBand.blurb}</p>
              {framing && (
                <p className="text-sm font-semibold leading-relaxed mt-4 px-2" style={{ color: '#E2E8F0' }}>
                  {framing}
                </p>
              )}
              <p className="text-xs mt-3" style={{ color: '#6B8CAE' }}>
                One number for how you communicate. Every rep and session moves it.
              </p>
            </div>
          )}

          {/* Communication breakdown */}
          {comm != null && (
            <div className="card mb-4">
              <h3 className="text-white font-bold text-sm mb-4">How you communicate</h3>
              <Bar icon="💡" label="Clarity"    value={report.clarity} />
              <Bar icon="🦁" label="Confidence" value={report.confidence} />
              <Bar icon="🧱" label="Structure"  value={report.structure} />
              <Bar icon="🎙️" label="Delivery"   value={report.delivery} />
            </div>
          )}

          {/* ── English level (CEFR): the familiar yardstick ────────────────── */}
          <div className="rounded-3xl p-5 mb-4 text-center"
            style={{ background: `linear-gradient(160deg, ${bColor}18, #0B1220)`, border: `1px solid ${bColor}44` }}>
            <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#6B8CAE' }}>Your English Level</div>
            <div className="flex items-center justify-center gap-3">
              <div className="font-black" style={{ fontSize: '3rem', lineHeight: 1, color: bColor }}>{band}</div>
              <div className="text-left">
                <div className="text-white font-bold">{report.cefr_label}</div>
                <div className="text-xs" style={{ color: '#6B8CAE' }}>CEFR, the global standard</div>
              </div>
            </div>
            <div className="flex justify-center gap-1 mt-3">
              {CEFR_ORDER.map(l => (
                <div key={l} className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all"
                  style={{
                    background: l === band ? bColor : 'rgba(255,255,255,0.06)',
                    color:      l === band ? '#0B1220' : '#6B8CAE',
                    transform:  l === band ? 'scale(1.1)' : 'scale(1)',
                  }}>{l}</div>
              ))}
            </div>
            <p className="text-sm leading-relaxed mt-3" style={{ color: '#94A3B8' }}>{report.band_description}</p>
          </div>

          {/* Language breakdown */}
          <div className="card mb-5">
            <h3 className="text-white font-bold text-sm mb-4">Your English breakdown</h3>
            <Bar icon="🗣️" label="Pronunciation" value={report.pronunciation} />
            <Bar icon="📝" label="Grammar"       value={report.grammar} />
            <Bar icon="📚" label="Vocabulary"    value={report.vocabulary} />
            <Bar icon="🌊" label="Fluency"       value={report.fluency} />
          </div>

          {/* Guest: save the score by signing up */}
          {!user && (
            <div className="card mb-5 text-center"
              style={{ background: 'linear-gradient(135deg, rgba(123,94,167,0.15), rgba(0,196,154,0.08))', border: '1px solid rgba(123,94,167,0.4)' }}>
              <p className="text-white font-bold mb-1">Don't lose this score</p>
              <p className="text-sm mb-4" style={{ color: '#94A3B8' }}>
                Create a free account to save it, train with Vak daily, and watch your San4 Score climb.
              </p>
              <Link to="/auth?mode=signup" className="btn-primary inline-block px-8 py-3">
                Save my score, it's free →
              </Link>
            </div>
          )}

          {/* Transcripts — one box per recording */}
          {report.transcript_reading && (
            <div className="card mb-3" style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.2)' }}>
              <h3 className="text-white font-bold text-sm mb-2">📖 Step 1 · The passage, as Vak heard you read it</h3>
              <p className="text-sm italic leading-relaxed" style={{ color: '#94A3B8' }}>"{report.transcript_reading}"</p>
            </div>
          )}
          {report.transcript_answer && (
            <div className="card mb-5" style={{ background: 'rgba(0,196,154,0.05)', border: '1px solid rgba(0,196,154,0.2)' }}>
              <h3 className="text-white font-bold text-sm mb-2">🗣️ Step 2 · Your answer, as Vak heard it</h3>
              <p className="text-sm italic leading-relaxed" style={{ color: '#94A3B8' }}>"{report.transcript_answer}"</p>
            </div>
          )}
          {/* Old saved reports (single combined transcript) */}
          {!report.transcript_reading && !report.transcript_answer && report.transcript && (
            <div className="card mb-5" style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.2)' }}>
              <h3 className="text-white font-bold text-sm mb-2">📝 What Vak heard</h3>
              <p className="text-sm italic leading-relaxed" style={{ color: '#94A3B8' }}>"{report.transcript}"</p>
            </div>
          )}

          {/* Strengths + improvements */}
          <div className="grid sm:grid-cols-2 gap-3 mb-5">
            <div className="card">
              <h3 className="font-semibold text-sm mb-3" style={{ color: '#00C49A' }}>✅ Strengths</h3>
              <ul className="space-y-2">
                {report.strengths?.map((s, i) => (
                  <li key={i} className="text-sm flex gap-2" style={{ color: '#94A3B8' }}><span style={{ color: '#00C49A' }}>•</span> {s}</li>
                ))}
              </ul>
            </div>
            <div className="card">
              <h3 className="font-semibold text-sm mb-3" style={{ color: '#FF6B35' }}>↑ Improve</h3>
              <ul className="space-y-2">
                {report.improvements?.map((s, i) => (
                  <li key={i} className="text-sm flex gap-2" style={{ color: '#94A3B8' }}><span style={{ color: '#FF6B35' }}>•</span> {s}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Next step → funnel into practice */}
          <div className="card mb-6"
            style={{ background: `linear-gradient(135deg, ${bColor}18, rgba(139,92,246,0.06))`, border: `1px solid ${bColor}40` }}>
            <h3 className="font-bold text-sm mb-1" style={{ color: bColor }}>🎯 Your path to the next band</h3>
            <p className="text-sm mb-4" style={{ color: '#E2E8F0' }}>{report.next_step}</p>
            <Link to={user ? '/practice' : '/auth?mode=signup'} className="btn-primary w-full text-center block py-3">
              Start climbing. Practise free →
            </Link>
          </div>

          {(() => {
            const locked = lockedUntil && Date.now() < lockedUntil
            return (
              <>
                {locked && (
                  <p className="text-xs text-center mb-3" style={{ color: '#6B8CAE' }}>
                    🔒 Your score is saved and valid till <strong style={{ color: '#94A3B8' }}>{fmtDate(lockedUntil)}</strong>.
                    Keep practising — retake then to see how much you've improved.
                  </p>
                )}
                <div className="flex gap-3">
                  {locked ? (
                    <button disabled
                      className="flex-1 py-3 rounded-2xl font-bold text-sm cursor-not-allowed"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#6B8CAE' }}>
                      🔒 Retake on {fmtDate(lockedUntil)}
                    </button>
                  ) : (
                    <button onClick={() => { setReport(null); setError(null); setPhase('intro') }}
                      className="flex-1 py-3 rounded-2xl font-bold text-sm transition-all hover:opacity-90"
                      style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)', color: '#A78BFA' }}>
                      🔁 Retake
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      const blob = await generateShareCard({
                        big: comm != null ? String(comm) : band,
                        bigColor: comm != null ? commBand.color : bColor,
                        label: comm != null ? 'My San4 Score' : 'My English level',
                        sub: comm != null
                          ? `${commBand.name} communicator · English ${band} (${report.cefr_label})`
                          : report.cefr_label,
                        streak: progress?.streak_count ?? 0,
                        name: profile?.name || '',
                      })
                      shareCard(blob, comm != null
                        ? `My San4 Score is ${comm} (${commBand.name}) 🎤 One number for how you communicate. Get yours free: san4.vercel.app`
                        : `I'm ${band} (${report.cefr_label}) on the San4 English assessment 🦢 Find your level free: san4.vercel.app`)
                    }}
                    className="flex-1 py-3 rounded-2xl font-bold text-sm text-white transition-all hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg,#7B5EA7,#9B7EC8)' }}>
                    📲 Share my score
                  </button>
                </div>
              </>
            )
          })()}
          <div className="h-8" />
        </main>
      </div>
    )
  }

  return null
}
