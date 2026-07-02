import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth }     from '../hooks/useAuth'
import { useProgress } from '../hooks/useProgress'
import { supabase }    from '../lib/supabase'
import { analyzeDailyRep, synthesizeSpeech } from '../lib/gemini'
import { playPcmBase64, stopPlayback } from '../lib/voicePlayer'
import {
  getRep, getTodaysReps, getRepCompletions, saveRepCompletion, REPS_PER_DAY, REP_MAX_SECONDS,
} from '../lib/dailyReps'
import VakMascot from '../components/VakMascot'

// ── Helpers (same house patterns as Assessment.jsx) ──────────────────────────
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
  if (v >= 60) return '#F59E0B'
  return '#F87171'
}

// ── The 60-second rep: ready → recording → analyzing → feedback ──────────────
export default function DailyRep() {
  const { repId }   = useParams()
  const { user }    = useAuth()
  const { awardXP } = useProgress()
  const navigate    = useNavigate()

  const rep = getRep(repId)

  const [phase,    setPhase]    = useState('ready') // ready | recording | analyzing | feedback | failed
  const [left,     setLeft]     = useState(REP_MAX_SECONDS)
  const [result,   setResult]   = useState(null)
  const [xpGained, setXpGained] = useState(0)
  const [micError, setMicError] = useState(null)

  const mediaRecRef    = useRef(null)
  const audioChunksRef = useRef([])
  const audioStreamRef = useRef(null)
  const audioMimeRef   = useRef('audio/webm')
  const timerRef       = useRef(null)
  const startedAtRef   = useRef(null)
  const stoppingRef    = useRef(false)

  // Vak reads the challenge aloud on entry.
  useEffect(() => {
    if (!rep) return
    let cancelled = false
    ;(async () => {
      try {
        const { audioBase64, sampleRate } = await synthesizeSpeech(rep.prompt)
        if (!cancelled) playPcmBase64(audioBase64, sampleRate)
      } catch { /* silent — text is on screen */ }
    })()
    return () => { cancelled = true; stopPlayback() }
  }, [repId]) // eslint-disable-line

  useEffect(() => () => {
    clearInterval(timerRef.current)
    audioStreamRef.current?.getTracks().forEach(t => t.stop())
  }, [])

  if (!rep) {
    navigate('/today', { replace: true })
    return null
  }

  async function startRecording() {
    setMicError(null)
    stopPlayback()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioStreamRef.current = stream
      const mime = pickMime()
      audioMimeRef.current = mime
      const recorder = new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 40000 })
      audioChunksRef.current = []
      recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      recorder.start(1000)
      mediaRecRef.current = recorder
      startedAtRef.current = Date.now()
      stoppingRef.current = false
      setLeft(REP_MAX_SECONDS)
      setPhase('recording')
      timerRef.current = setInterval(() => {
        setLeft(prev => {
          if (prev <= 1) { finishRecording(); return 0 }
          return prev - 1
        })
      }, 1000)
    } catch {
      setMicError('Mic access needed — click the 🔒 lock icon in the address bar, allow the microphone, then try again.')
    }
  }

  async function finishRecording() {
    if (stoppingRef.current) return
    stoppingRef.current = true
    clearInterval(timerRef.current)

    const spokeSeconds = (Date.now() - startedAtRef.current) / 1000
    setPhase('analyzing')

    await new Promise(resolve => {
      const recorder = mediaRecRef.current
      if (!recorder || recorder.state === 'inactive') { resolve(); return }
      recorder.onstop = resolve; recorder.stop()
    })
    audioStreamRef.current?.getTracks().forEach(t => t.stop())

    if (spokeSeconds < 3 || audioChunksRef.current.length === 0) {
      setMicError("That was too short — take a breath and give it a real go.")
      setPhase('ready')
      return
    }

    const blob = new Blob(audioChunksRef.current, { type: audioMimeRef.current })
    const buf  = await blob.arrayBuffer()
    const analysis = await analyzeDailyRep(
      rep, arrayBufferToBase64(buf), audioMimeRef.current.split(';')[0]
    )

    if (!analysis) { setPhase('failed'); return }

    // Persist: local completion + streak/XP + session history. Final rep of the
    // day gets a completion bonus.
    const done = saveRepCompletion(user?.id, rep.id, analysis.score)
    const todays = getTodaysReps()
    const isDayComplete = todays.every(r => done.some(c => c.id === r.id))
    const xp = isDayComplete ? 35 : 20
    setXpGained(xp)
    awardXP(analysis.score, { fixedXP: xp })

    if (user) {
      supabase.from('practice_sessions').insert({
        user_id:           user.id,
        scenario_id:       'daily_rep',
        scenario_title:    `⚡ Daily Rep — ${rep.category}`,
        overall_score:     analysis.score,
        confidence_score:  analysis.score,
        pacing_score:      analysis.score,
        filler_word_count: analysis.filler_count ?? 0,
        duration_seconds:  Math.round(spokeSeconds),
        feedback:          analysis.win,
        action_item:       analysis.fix,
        messages:          [],
      }).then(() => {}, () => {})
    }

    setResult({ ...analysis, isDayComplete })
    setPhase('feedback')
  }

  function goNext() {
    const done = getRepCompletions(user?.id)
    const next = getTodaysReps().find(r => !done.some(c => c.id === r.id))
    if (next) navigate(`/daily-rep/${next.id}`, { replace: true })
    else navigate('/today')
    setPhase('ready'); setResult(null); setMicError(null)
  }

  // ── ANALYZING ───────────────────────────────────────────────────────────────
  if (phase === 'analyzing') return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5" style={{ background: '#050810' }}>
      <div className="animate-float"><VakMascot level={3} size={90} /></div>
      <p className="text-white font-bold">Vak is listening back…</p>
      <div className="flex gap-2">
        {[0,1,2].map(i => (
          <div key={i} className="w-2 h-2 rounded-full animate-bounce"
            style={{ background: '#7B5EA7', animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  )

  // ── FAILED (honest, no fabricated score) ────────────────────────────────────
  if (phase === 'failed') return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#050810' }}>
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-4">😕</div>
        <h2 className="text-white font-black text-xl mb-2">Couldn't score that one</h2>
        <p className="text-sm mb-6" style={{ color: '#6B8CAE' }}>
          Something went wrong while analysing. Your streak isn't affected — try the rep again.
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => { setPhase('ready'); setMicError(null) }} className="btn-primary px-5">Try again</button>
          <button onClick={() => navigate('/today')} className="btn-secondary px-5">Back to Today</button>
        </div>
      </div>
    </div>
  )

  // ── FEEDBACK — one score, one win, one fix ──────────────────────────────────
  if (phase === 'feedback' && result) return (
    <div className="min-h-screen" style={{ background: '#050810' }}>
      <main className="max-w-md mx-auto px-4 py-10 animate-slide-up text-center">
        <div className="flex justify-center mb-3 animate-float">
          <VakMascot level={result.score >= 80 ? 5 : result.score >= 60 ? 4 : 3} size={80} />
        </div>

        <div className="text-6xl font-black mb-1" style={{ color: scoreColor(result.score) }}>
          {result.score}%
        </div>
        <div className="inline-block text-xs font-bold px-3 py-1 rounded-full mb-6"
          style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.3)' }}>
          +{xpGained} XP {result.isDayComplete && '· daily goal complete! 🎉'}
        </div>

        <div className="card text-left mb-3">
          <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#00C49A' }}>✓ What worked</div>
          <p className="text-white text-sm leading-relaxed">{result.win}</p>
        </div>
        <div className="card text-left mb-6">
          <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#7B5EA7' }}>↑ Next time</div>
          <p className="text-white text-sm leading-relaxed">{result.fix}</p>
        </div>

        <button onClick={goNext} className="btn-primary w-full py-4 text-base mb-3">
          {result.isDayComplete ? 'Done for today 🎉' : 'Next rep →'}
        </button>
        <button onClick={() => navigate('/today')} className="text-sm" style={{ color: '#6B8CAE' }}>
          Back to Today
        </button>
      </main>
    </div>
  )

  // ── READY / RECORDING ───────────────────────────────────────────────────────
  const recording = phase === 'recording'
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#050810' }}>
      <div className="px-4 py-4 flex items-center justify-between">
        <button onClick={() => navigate('/today')} className="text-sm" style={{ color: '#6B8CAE' }}>← Today</button>
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#7B5EA7' }}>
          {rep.category} · Daily Rep
        </span>
        <span className="w-12" />
      </div>

      <main className="flex-1 flex flex-col items-center justify-center px-6 max-w-md mx-auto w-full text-center">
        <div className="text-5xl mb-4">{rep.emoji}</div>
        <p className="text-sm mb-2" style={{ color: '#6B8CAE' }}>{rep.situation}</p>
        <h1 className="text-xl font-black text-white leading-snug mb-8">"{rep.prompt}"</h1>

        {micError && (
          <div className="rounded-2xl px-4 py-3 mb-5 text-sm text-left w-full"
            style={{ background: 'rgba(239,68,68,0.1)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.3)' }}>
            {micError}
          </div>
        )}

        {recording && (
          <div className="text-4xl font-black mb-5 tabular-nums"
            style={{ color: left <= 10 ? '#F87171' : '#00C49A' }}>
            0:{String(left).padStart(2, '0')}
          </div>
        )}

        <button
          onClick={recording ? finishRecording : startRecording}
          className="relative flex items-center justify-center rounded-full transition-all active:scale-95 mb-3"
          style={{
            width: 88, height: 88,
            background: recording
              ? 'linear-gradient(135deg, #F87171, #EF4444)'
              : 'linear-gradient(135deg, #7B5EA7, #9B7EC8)',
            boxShadow: recording ? '0 0 40px rgba(239,68,68,0.4)' : '0 0 30px rgba(123,94,167,0.4)',
          }}
        >
          {recording && <span className="absolute inset-0 rounded-full animate-ping" style={{ background: 'rgba(239,68,68,0.25)' }} />}
          <span className="relative" style={{ fontSize: 36 }}>{recording ? '⏹' : '🎤'}</span>
        </button>
        <p className="text-xs" style={{ color: '#6B8CAE' }}>
          {recording ? 'Tap when you\'re done — or let the timer run out' : 'Tap the mic and just speak. 60 seconds, one take.'}
        </p>
      </main>
      <div className="h-10" />
    </div>
  )
}
