import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth }    from '../hooks/useAuth'
import { useProgress } from '../hooks/useProgress'
import { supabase }   from '../lib/supabase'
import { analyzeCEFRAssessment } from '../lib/gemini'
import { generateShareCard, shareCard } from '../lib/shareCard'
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

export default function Assessment() {
  const { user, profile } = useAuth()
  const { progress } = useProgress()
  const navigate = useNavigate()

  // phases: intro | recording | analyzing | report
  const [phase,   setPhase]   = useState('intro')
  const [seconds, setSeconds] = useState(0)
  const [report,  setReport]  = useState(null)
  const [error,   setError]   = useState(null)
  const [lockedUntil, setLockedUntil] = useState(null) // retake gate timestamp

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

  async function startRecording() {
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
      setPhase('recording')
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000)
    } catch {
      setError('We need microphone access to score your speaking. Click the lock icon in your address bar, allow the mic, then try again.')
    }
  }

  async function finishRecording() {
    clearInterval(timerRef.current)
    setPhase('analyzing')

    // Stop + collect audio
    let payload = null
    await new Promise(resolve => {
      const rec = mediaRecRef.current
      if (!rec || rec.state === 'inactive') { resolve(); return }
      rec.onstop = resolve; rec.stop()
    })
    audioStreamRef.current?.getTracks().forEach(t => t.stop())
    if (audioChunksRef.current.length > 0) {
      const blob = new Blob(audioChunksRef.current, { type: audioMimeRef.current })
      const buf  = await blob.arrayBuffer()
      payload = { base64: arrayBufferToBase64(buf), mimeType: audioMimeRef.current.split(';')[0] }
    }

    if (!payload) {
      setError('We could not capture any audio. Please try again.')
      setPhase('intro')
      return
    }

    const result = await analyzeCEFRAssessment(
      payload.base64, payload.mimeType,
      'read a short passage aloud and then describe a recent project in their own words'
    )

    if (!result) {
      setError('Scoring failed. Please try again in a moment.')
      setPhase('intro')
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

    setReport(result)
    setPhase('report')
  }

  // ── INTRO ──────────────────────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div className="min-h-screen" style={{ background: '#060E1A' }}>
        <Navbar />
        <main className="max-w-lg mx-auto px-4 py-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4 text-sm font-semibold"
            style={{ background: 'rgba(139,92,246,0.12)', color: '#A78BFA', border: '1px solid rgba(139,92,246,0.25)' }}>
            🎯 Free 2-minute assessment
          </div>
          <div className="flex justify-center mb-3 animate-float"><VakMascot level={3} size={90} /></div>
          <h1 className="text-2xl font-black text-white mb-2">Get your English speaking score</h1>
          <p className="text-sm mb-6" style={{ color: '#6B8CAE' }}>
            Read a short passage aloud, then answer one question. Vak scores your
            <strong className="text-white"> pronunciation, grammar, vocabulary and fluency</strong> and
            gives you a CEFR level (A1–C2) — the global standard.
          </p>

          {error && (
            <div className="rounded-2xl px-4 py-3 mb-5 text-sm text-left"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.3)' }}>
              {error}
            </div>
          )}

          <div className="rounded-2xl p-5 mb-4 text-left"
            style={{ background: 'linear-gradient(160deg,#10192E,#0B1220)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#8B5CF6' }}>Step 1 · Read aloud</div>
            <p className="text-sm leading-relaxed mb-4" style={{ color: '#E2E8F0' }}>{PASSAGE}</p>
            <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#00C49A' }}>Step 2 · Then answer</div>
            <p className="text-sm leading-relaxed" style={{ color: '#E2E8F0' }}>{QUESTION}</p>
          </div>

          <button onClick={startRecording} className="btn-primary w-full py-4 text-base">
            🎙️ Start the assessment →
          </button>
          <p className="text-xs mt-3" style={{ color: '#6B8CAE' }}>
            Takes ~2 minutes. Your audio is analysed once and not stored after scoring.
          </p>
        </main>
      </div>
    )
  }

  // ── RECORDING ──────────────────────────────────────────────────────────────
  if (phase === 'recording') {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: '#060E1A' }}>
        <Navbar />
        <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
              <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: '#F87171' }} />
              <span className="text-sm font-bold" style={{ color: '#F87171' }}>Recording {fmt(seconds)}</span>
            </div>
            <div className="animate-float"><VakMascot level={3} size={52} /></div>
          </div>

          <div className="flex-1 overflow-y-auto rounded-2xl p-5 mb-4"
            style={{ background: 'linear-gradient(160deg,#10192E,#0B1220)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#8B5CF6' }}>Read this aloud</div>
            <p className="text-base leading-relaxed mb-5" style={{ color: '#FFFFFF' }}>{PASSAGE}</p>
            <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#00C49A' }}>Then answer in your own words</div>
            <p className="text-base leading-relaxed" style={{ color: '#FFFFFF' }}>{QUESTION}</p>
          </div>

          <button onClick={finishRecording} className="btn-primary w-full py-4 text-base"
            style={{ opacity: seconds < 10 ? 0.6 : 1 }} disabled={seconds < 10}>
            {seconds < 10 ? `Keep speaking… (${10 - seconds}s)` : '✓ Done, score me →'}
          </button>
        </main>
      </div>
    )
  }

  // ── ANALYZING ──────────────────────────────────────────────────────────────
  if (phase === 'analyzing') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6" style={{ background: '#060E1A' }}>
        <div className="animate-float"><VakMascot level={4} size={100} /></div>
        <div className="text-center">
          <div className="text-white font-bold text-xl mb-2">Scoring your English…</div>
          <div style={{ color: '#6B8CAE' }}>Assessing pronunciation, grammar, vocabulary and fluency</div>
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
    return (
      <div className="min-h-screen" style={{ background: '#060E1A' }}>
        <Navbar />
        <main className="max-w-lg mx-auto px-4 py-8 animate-slide-up">

          {/* Big CEFR badge */}
          <div className="rounded-3xl p-6 mb-5 text-center"
            style={{ background: `linear-gradient(160deg, ${bColor}22, #0B1220)`, border: `1px solid ${bColor}55`, boxShadow: `0 0 50px ${bColor}22` }}>
            <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#6B8CAE' }}>Your CEFR Level</div>
            <div className="font-black mb-1" style={{ fontSize: '4.5rem', lineHeight: 1, color: bColor }}>{band}</div>
            <div className="text-lg font-bold text-white">{report.cefr_label}</div>

            {/* CEFR scale strip */}
            <div className="flex justify-center gap-1 mt-4">
              {CEFR_ORDER.map(l => (
                <div key={l} className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all"
                  style={{
                    background: l === band ? bColor : 'rgba(255,255,255,0.06)',
                    color:      l === band ? '#0B1220' : '#6B8CAE',
                    transform:  l === band ? 'scale(1.1)' : 'scale(1)',
                  }}>{l}</div>
              ))}
            </div>
            <p className="text-sm leading-relaxed mt-4" style={{ color: '#94A3B8' }}>{report.band_description}</p>
          </div>

          {/* Sub-scores */}
          <div className="card mb-5">
            <h3 className="text-white font-bold text-sm mb-4">Your breakdown</h3>
            <Bar icon="🗣️" label="Pronunciation" value={report.pronunciation} />
            <Bar icon="📝" label="Grammar"       value={report.grammar} />
            <Bar icon="📚" label="Vocabulary"    value={report.vocabulary} />
            <Bar icon="🌊" label="Fluency"       value={report.fluency} />
          </div>

          {/* Transcript */}
          {report.transcript && (
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
            <Link to="/practice" className="btn-primary w-full text-center block py-3">
              Start climbing — practise free →
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
                        big: band,
                        bigColor: bColor,
                        label: 'My English level',
                        sub: report.cefr_label,
                        streak: progress?.streak_count ?? 0,
                        name: profile?.name || '',
                      })
                      shareCard(blob, `I'm ${band} (${report.cefr_label}) on the San4 English assessment 🦢 Find your level free: san4.vercel.app`)
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
