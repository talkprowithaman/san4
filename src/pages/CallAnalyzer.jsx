import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth }         from '../hooks/useAuth'
import { useSubscription } from '../hooks/useSubscription'
import { supabase }        from '../lib/supabase'
import { analyzeMeetingRecording } from '../lib/gemini'
import Navbar    from '../components/Navbar'
import VakMascot from '../components/VakMascot'

const MAX_MB = 18 // inline Gemini payload ceiling (base64 inflates ~33%)

function scoreColor(v) {
  if (v >= 80) return '#00C49A'
  if (v >= 60) return '#FF6B35'
  return '#F87171'
}
function arrayBufferToBase64(buf) {
  const bytes = new Uint8Array(buf); let bin = ''; const c = 8192
  for (let i = 0; i < bytes.length; i += c) bin += String.fromCharCode(...bytes.subarray(i, i + c))
  return btoa(bin)
}

export default function CallAnalyzer() {
  const { user }      = useAuth()
  const { isProPlus } = useSubscription()

  // phases: upload | analyzing | report
  const [phase,   setPhase]   = useState('upload')
  const [file,    setFile]    = useState(null)
  const [context, setContext] = useState('')
  const [report,  setReport]  = useState(null)
  const [error,   setError]   = useState(null)
  const inputRef = useRef(null)

  function onPick(e) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`That file is ${(f.size / 1024 / 1024).toFixed(0)} MB. Please upload a clip under ${MAX_MB} MB (trim to the key 5–10 minutes, audio-only is smaller).`)
      return
    }
    setError(null)
    setFile(f)
  }

  async function analyze() {
    if (!file) return
    setPhase('analyzing')
    try {
      const buf    = await file.arrayBuffer()
      const base64 = arrayBufferToBase64(buf)
      // Gemini accepts audio/* and video/* inline; pass the file's own type.
      const mime   = file.type || 'audio/mpeg'
      const result = await analyzeMeetingRecording(base64, mime, context)

      if (!result) { setError('Analysis failed — try a shorter or audio-only clip.'); setPhase('upload'); return }

      if (user) {
        await supabase.from('practice_sessions').insert({
          user_id:          user.id,
          scenario_id:      'call_analyzer',
          scenario_title:   '📞 Real Meeting Analysis',
          overall_score:    result.overall_score,
          confidence_score: result.confidence_score,
          pacing_score:     result.clarity_score,
          filler_word_count: result.filler_word_count || 0,
          feedback:         result.summary,
          action_item:      result.action_items?.[0] || '',
          messages:         [],
        }).then(() => {}, () => {})
      }
      setReport(result)
      setPhase('report')
    } catch (err) {
      setError('Could not read that file. MP3, M4A, WAV, MP4 and WebM work best.')
      setPhase('upload')
    }
  }

  // ── Elite gate ───────────────────────────────────────────────────────────────
  if (!isProPlus) {
    return (
      <div className="min-h-screen" style={{ background: '#060E1A' }}>
        <Navbar />
        <main className="max-w-lg mx-auto px-4 py-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4 text-sm font-semibold"
            style={{ background: 'rgba(139,92,246,0.12)', color: '#A78BFA', border: '1px solid rgba(139,92,246,0.3)' }}>
            💎 Vak Elite
          </div>
          <div className="text-5xl mb-4">📞</div>
          <h1 className="text-2xl font-black text-white mb-2">Call Analyzer</h1>
          <p className="text-sm mb-6" style={{ color: '#6B8CAE' }}>
            Upload a recording of a real Zoom, Google Meet, or Microsoft Teams call and get
            executive-grade coaching on how <em>you</em> showed up — talk-time, clarity, filler
            words, key moments, and exactly what to say differently next time.
          </p>

          <div className="rounded-2xl p-5 mb-6 text-left space-y-3"
            style={{ background: 'linear-gradient(160deg,#10192E,#0B1220)', border: '1px solid rgba(139,92,246,0.2)' }}>
            {[
              ['🎙️', 'Upload any meeting recording — audio or video'],
              ['📊', 'Talk-ratio, clarity & confidence scoring'],
              ['💬', 'Filler-word count and key moments'],
              ['✍️', '"Say it this way instead" rewrites'],
              ['🔴', 'Live in-meeting assist — joining Zoom/Meet/Teams (rolling out)'],
            ].map(([ic, t]) => (
              <div key={t} className="flex items-start gap-3">
                <span>{ic}</span><span className="text-sm" style={{ color: '#E2E8F0' }}>{t}</span>
              </div>
            ))}
          </div>

          <Link to="/pricing" className="btn-primary w-full block text-center py-4">
            Unlock with Vak Elite · ₹999/mo →
          </Link>
          <p className="text-xs mt-3" style={{ color: '#6B8CAE' }}>30-day money-back guarantee. Cancel anytime.</p>
        </main>
      </div>
    )
  }

  // ── UPLOAD ──────────────────────────────────────────────────────────────────
  if (phase === 'upload') {
    return (
      <div className="min-h-screen" style={{ background: '#060E1A' }}>
        <Navbar />
        <main className="max-w-lg mx-auto px-4 py-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(139,92,246,0.15)', color: '#A78BFA' }}>💎 Elite</span>
          </div>
          <h1 className="text-2xl font-black text-white mb-1">📞 Call Analyzer</h1>
          <p className="text-sm mb-6" style={{ color: '#6B8CAE' }}>
            Upload a recording of a real meeting. Vak reviews how you communicated and coaches you.
          </p>

          {error && (
            <div className="rounded-2xl px-4 py-3 mb-5 text-sm"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.3)' }}>
              {error}
            </div>
          )}

          {/* Drop zone */}
          <button
            onClick={() => inputRef.current?.click()}
            className="w-full rounded-2xl p-8 mb-4 text-center transition-all"
            style={{ background: file ? 'rgba(0,196,154,0.06)' : 'rgba(255,255,255,0.03)',
                     border: `2px dashed ${file ? 'rgba(0,196,154,0.4)' : 'rgba(255,255,255,0.15)'}` }}>
            <div className="text-4xl mb-3">{file ? '✅' : '⬆️'}</div>
            {file ? (
              <>
                <div className="text-white font-bold text-sm">{file.name}</div>
                <div className="text-xs mt-1" style={{ color: '#6B8CAE' }}>{(file.size / 1024 / 1024).toFixed(1)} MB · tap to change</div>
              </>
            ) : (
              <>
                <div className="text-white font-bold text-sm">Tap to choose a recording</div>
                <div className="text-xs mt-1" style={{ color: '#6B8CAE' }}>MP3, M4A, WAV, MP4, WebM · under {MAX_MB} MB</div>
              </>
            )}
          </button>
          <input ref={inputRef} type="file" accept="audio/*,video/*" className="hidden" onChange={onPick} />

          {/* Context */}
          <div className="mb-5">
            <label className="block text-sm font-semibold text-white mb-2">
              What was this meeting? <span style={{ color: '#6B8CAE' }}>(optional, sharpens feedback)</span>
            </label>
            <textarea value={context} onChange={e => setContext(e.target.value)} rows={3}
              className="input w-full" placeholder="e.g. Client status call where I presented the Q2 roadmap and handled pushback on timelines."
              style={{ resize: 'vertical' }} />
          </div>

          <button onClick={analyze} disabled={!file} className="btn-primary w-full py-4 text-base"
            style={{ opacity: file ? 1 : 0.5 }}>
            🔍 Analyze my meeting →
          </button>

          <div className="mt-6 rounded-2xl px-4 py-3 flex items-start gap-3"
            style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <span>🔴</span>
            <p className="text-xs leading-relaxed" style={{ color: '#6B8CAE' }}>
              <strong className="text-white">Coming soon:</strong> live in-meeting assist — Vak joins your
              Zoom/Meet/Teams call and coaches you in real time. Upload-based analysis is available now.
            </p>
          </div>
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
          <div className="text-white font-bold text-xl mb-2">Reviewing your meeting…</div>
          <div style={{ color: '#6B8CAE' }}>Listening for talk-ratio, clarity, fillers and key moments</div>
        </div>
        <div className="flex gap-2">
          {[0,1,2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full animate-bounce"
              style={{ background: '#8B5CF6', animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
        <p className="text-xs px-4 py-2 rounded-full" style={{ background: 'rgba(0,196,154,0.06)', color: '#6B8CAE', border: '1px solid rgba(0,196,154,0.15)' }}>
          Longer recordings can take 30–60 seconds
        </p>
      </div>
    )
  }

  // ── REPORT ──────────────────────────────────────────────────────────────────
  if (phase === 'report' && report) {
    return (
      <div className="min-h-screen" style={{ background: '#060E1A' }}>
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 py-8 animate-slide-up">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3 animate-float"><VakMascot level={report.overall_score >= 80 ? 5 : 4} size={84} /></div>
            <h2 className="text-white font-black text-2xl mb-1">Meeting Analysis</h2>
          </div>

          <div className="rounded-3xl p-6 mb-5 text-center"
            style={{ background: 'linear-gradient(145deg,#0F1E35,#091522)', border: `1px solid ${scoreColor(report.overall_score)}40` }}>
            <div className="text-5xl font-black mb-1" style={{ color: scoreColor(report.overall_score) }}>{report.overall_score}%</div>
            <div className="text-white font-semibold mb-2">Overall communication</div>
            <p className="text-sm leading-relaxed" style={{ color: '#94A3B8' }}>{report.summary}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-5">
            {[
              ['Clarity', report.clarity_score],
              ['Confidence', report.confidence_score],
            ].map(([label, v]) => (
              <div key={label} className="card text-center">
                <div className="text-3xl font-black" style={{ color: scoreColor(v) }}>{v}%</div>
                <div className="text-xs mt-1" style={{ color: '#6B8CAE' }}>{label}</div>
              </div>
            ))}
          </div>

          {report.talk_ratio_note && (
            <div className="card mb-4" style={{ background: 'rgba(59,130,246,0.06)', borderColor: 'rgba(59,130,246,0.2)' }}>
              <div className="flex gap-3"><span className="text-xl">🗣️</span>
                <div><div className="text-white font-semibold text-sm mb-0.5">Talk time</div>
                  <p className="text-sm" style={{ color: '#94A3B8' }}>{report.talk_ratio_note}</p></div></div>
            </div>
          )}

          <div className="card mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-semibold text-sm">Filler words</h3>
              <span className="font-black text-xl" style={{ color: scoreColor(100 - (report.filler_word_count || 0) * 5) }}>{report.filler_word_count ?? 0}</span>
            </div>
            {report.top_filler_words?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {report.top_filler_words.map(w => (
                  <span key={w} className="text-xs px-3 py-1 rounded-full"
                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#F87171' }}>"{w}"</span>
                ))}
              </div>
            )}
          </div>

          {report.key_moments?.length > 0 && (
            <div className="card mb-4">
              <h3 className="text-white font-semibold text-sm mb-3">🔑 Key moments</h3>
              <ul className="space-y-2">
                {report.key_moments.map((m, i) => (
                  <li key={i} className="text-sm flex gap-2" style={{ color: '#94A3B8' }}><span style={{ color: '#8B5CF6' }}>•</span> {m}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-3 mb-4">
            <div className="card">
              <h3 className="font-semibold text-sm mb-3" style={{ color: '#00C49A' }}>✅ What worked</h3>
              <ul className="space-y-2">{report.strengths?.map((s, i) => (
                <li key={i} className="text-sm flex gap-2" style={{ color: '#94A3B8' }}><span style={{ color: '#00C49A' }}>•</span> {s}</li>))}</ul>
            </div>
            <div className="card">
              <h3 className="font-semibold text-sm mb-3" style={{ color: '#FF6B35' }}>↑ Work on this</h3>
              <ul className="space-y-2">{report.improvements?.map((s, i) => (
                <li key={i} className="text-sm flex gap-2" style={{ color: '#94A3B8' }}><span style={{ color: '#FF6B35' }}>•</span> {s}</li>))}</ul>
            </div>
          </div>

          {report.what_to_say_differently && (
            <div className="card mb-4" style={{ background: 'rgba(139,92,246,0.06)', borderColor: 'rgba(139,92,246,0.2)' }}>
              <h3 className="font-semibold text-sm mb-1" style={{ color: '#A78BFA' }}>✍️ Say it this way instead</h3>
              <p className="text-sm italic" style={{ color: '#E2E8F0' }}>"{report.what_to_say_differently}"</p>
            </div>
          )}

          {report.action_items?.length > 0 && (
            <div className="card mb-6" style={{ background: 'rgba(0,196,154,0.07)', border: '1px solid rgba(0,196,154,0.25)' }}>
              <h3 className="font-semibold text-sm mb-2" style={{ color: '#00C49A' }}>🎯 For your next meeting</h3>
              <ul className="space-y-1.5">{report.action_items.map((a, i) => (
                <li key={i} className="text-sm flex gap-2 text-white"><span style={{ color: '#00C49A' }}>{i+1}.</span> {a}</li>))}</ul>
            </div>
          )}

          <button onClick={() => { setReport(null); setFile(null); setContext(''); setError(null); setPhase('upload') }}
            className="btn-primary w-full py-3">📞 Analyze another meeting →</button>
          <div className="h-8" />
        </main>
      </div>
    )
  }

  return null
}
