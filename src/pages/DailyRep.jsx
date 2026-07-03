import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth }     from '../hooks/useAuth'
import { useProgress } from '../hooks/useProgress'
import { supabase }    from '../lib/supabase'
import { analyzeDailyRep, synthesizeSpeech } from '../lib/gemini'
import { playPcmBase64, stopPlayback, primeAudio } from '../lib/voicePlayer'
import {
  getRep, getTodaysReps, getRepCompletions, saveRepCompletion, REPS_PER_DAY, REP_MAX_SECONDS,
} from '../lib/dailyReps'
import { generateShareCard, shareCard } from '../lib/shareCard'
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
  const { user, profile } = useAuth()
  const { awardXP, progress } = useProgress()
  const navigate    = useNavigate()

  const rep = getRep(repId)

  const [phase,    setPhase]    = useState('ready') // ready | recording | analyzing | feedback | failed
  const [left,     setLeft]     = useState(REP_MAX_SECONDS)
  const [result,   setResult]   = useState(null)
  const [xpGained, setXpGained] = useState(0)
  const [micError, setMicError] = useState(null)
  const [liveText, setLiveText] = useState('') // live transcript while speaking
  const [captionsDead, setCaptionsDead] = useState(false) // live captions unavailable

  const mediaRecRef    = useRef(null)
  const audioChunksRef = useRef([])
  const audioStreamRef = useRef(null)
  const audioMimeRef   = useRef('audio/webm')
  const timerRef       = useRef(null)
  const startedAtRef   = useRef(null)
  const stoppingRef    = useRef(false)
  const sttRef         = useRef(null) // browser SpeechRecognition (best-effort live captions)
  const recordingRef   = useRef(false) // lets the caption restart loop know when to stop

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
    try { sttRef.current?.abort() } catch { /* ignore */ }
  }, [])

  if (!rep) {
    navigate('/today', { replace: true })
    return null
  }

  // Best-effort live captions so users SEE what they're saying as they speak.
  // The recording is still the source of truth for scoring; if the browser's
  // STT can't keep up (e.g. Hinglish), the rep still works fine.
  // Chrome quirk: the recognizer often ends itself after a few seconds (or
  // when it thinks there's silence). Without a restart loop the captions die
  // quietly, so we restart while the rep is still recording, and if it keeps
  // dying we tell the user captions are off rather than showing a dead box.
  function startLiveCaptions() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { setCaptionsDead(true); return }
    try {
      const stt = new SR()
      stt.lang = 'en-IN'
      stt.continuous = true
      stt.interimResults = true
      let finals = ''
      let gotAnything = false
      let restarts = 0

      stt.onresult = (e) => {
        gotAnything = true
        let interim = ''
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript
          if (e.results[i].isFinal) finals += t + ' '
          else interim += t
        }
        setLiveText((finals + ' ' + interim).trim())
      }

      stt.onerror = (e) => {
        // Hard failures mean captions can't work this session. Cosmetic only.
        if (['not-allowed', 'service-not-allowed', 'audio-capture'].includes(e.error)) {
          setCaptionsDead(true)
          sttRef.current = null
        }
      }

      // The recognizer self-terminates constantly; keep reviving it while the
      // user is still recording.
      stt.onend = () => {
        if (sttRef.current !== stt) return           // we stopped it on purpose
        if (!recordingRef.current) return            // rep is over
        if (!gotAnything && restarts >= 2) {         // it's just not working
          setCaptionsDead(true)
          sttRef.current = null
          return
        }
        restarts++
        setTimeout(() => {
          if (sttRef.current === stt && recordingRef.current) {
            try { stt.start() } catch { setCaptionsDead(true); sttRef.current = null }
          }
        }, 150)
      }

      stt.start()
      sttRef.current = stt
    } catch { setCaptionsDead(true) }
  }

  function stopLiveCaptions() {
    const stt = sttRef.current
    sttRef.current = null // mark as intentional before abort so onend exits
    try { stt?.abort() } catch { /* ignore */ }
  }

  async function startRecording() {
    setMicError(null)
    setLiveText('')
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
      recordingRef.current = true
      setCaptionsDead(false)
      setLeft(REP_MAX_SECONDS)
      setPhase('recording')
      startLiveCaptions()
      timerRef.current = setInterval(() => {
        setLeft(prev => {
          if (prev <= 1) { finishRecording(); return 0 }
          return prev - 1
        })
      }, 1000)
    } catch {
      setMicError('Mic access needed. Click the 🔒 lock icon in the address bar, allow the microphone, then try again.')
    }
  }

  async function finishRecording() {
    if (stoppingRef.current) return
    stoppingRef.current = true
    recordingRef.current = false
    clearInterval(timerRef.current)
    stopLiveCaptions()

    const spokeSeconds = (Date.now() - startedAtRef.current) / 1000
    setPhase('analyzing')

    await new Promise(resolve => {
      const recorder = mediaRecRef.current
      if (!recorder || recorder.state === 'inactive') { resolve(); return }
      recorder.onstop = resolve; recorder.stop()
    })
    audioStreamRef.current?.getTracks().forEach(t => t.stop())

    if (spokeSeconds < 3 || audioChunksRef.current.length === 0) {
      setMicError("That was too short. Take a breath and give it a real go.")
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
        scenario_title:    `⚡ Daily Rep · ${rep.category}`,
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

    // Deterministic pace: words actually spoken / seconds actually recorded.
    const words = (analysis.transcript || '').split(/\s+/).filter(Boolean).length
    const wpm = spokeSeconds >= 5 && words >= 5
      ? Math.round(words / (spokeSeconds / 60))
      : null
    const paceVerdict = wpm == null ? null
      : wpm < 100 ? 'slow'
      : wpm <= 160 ? 'good pace'
      : 'fast'

    setResult({ ...analysis, isDayComplete, wpm, paceVerdict })
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
      <div className="animate-float"><VakMascot level={3} size={90} mood="thinking" /></div>
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
          Something went wrong while analysing. Your streak isn't affected, so just try the rep again.
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
          <VakMascot level={result.score >= 80 ? 5 : result.score >= 60 ? 4 : 3} size={80}
            mood={result.score >= 80 ? 'celebrating' : result.score >= 60 ? 'encouraging' : 'neutral'} />
        </div>

        <div className="text-6xl font-black mb-1" style={{ color: scoreColor(result.score) }}>
          {result.score}%
        </div>
        <div className="inline-block text-xs font-bold px-3 py-1 rounded-full mb-4"
          style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.3)' }}>
          +{xpGained} XP {result.isDayComplete && '· daily goal complete! 🎉'}
        </div>

        {/* Delivery chips: pace, energy, fillers */}
        <div className="flex flex-wrap justify-center gap-2 mb-5">
          {result.wpm != null && (
            <span className="text-xs font-bold px-3 py-1.5 rounded-full"
              style={{
                background: 'rgba(0,196,154,0.1)', border: '1px solid rgba(0,196,154,0.3)',
                color: result.paceVerdict === 'good pace' ? '#00C49A' : '#F59E0B',
              }}>
              ⏱️ {result.wpm} wpm · {result.paceVerdict}
            </span>
          )}
          {result.energy && (
            <span className="text-xs font-bold px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', color: '#A78BFA' }}>
              🎙️ {result.energy}
            </span>
          )}
          <span className="text-xs font-bold px-3 py-1.5 rounded-full"
            style={{
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
              color: (result.filler_count ?? 0) > 3 ? '#F87171' : '#00C49A',
            }}>
            🗣️ {result.filler_count ?? 0} filler{(result.filler_count ?? 0) === 1 ? '' : 's'}
          </span>
        </div>
        {result.pace_note && (
          <p className="text-xs mb-5 -mt-2" style={{ color: '#6B8CAE' }}>{result.pace_note}</p>
        )}

        <div className="card text-left mb-3">
          <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#00C49A' }}>✓ What worked</div>
          <p className="text-white text-sm leading-relaxed">{result.win}</p>
        </div>
        <div className="card text-left mb-3">
          <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#7B5EA7' }}>↑ Next time</div>
          <p className="text-white text-sm leading-relaxed">{result.fix}</p>
        </div>
        {result.transcript && (
          <div className="card text-left mb-6" style={{ background: 'rgba(255,255,255,0.02)' }}>
            <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#6B8CAE' }}>📝 What Vak heard</div>
            <p className="text-sm italic leading-relaxed" style={{ color: '#94A3B8' }}>"{result.transcript}"</p>
          </div>
        )}

        <button onClick={goNext} className="btn-primary w-full py-4 text-base mb-3">
          {result.isDayComplete ? 'Done for today 🎉' : 'Next rep →'}
        </button>
        <button
          onClick={async () => {
            const blob = await generateShareCard({
              big: `${result.score}%`,
              bigColor: scoreColor(result.score),
              label: 'Daily Rep score',
              sub: `"${rep.prompt}"`,
              streak: progress?.streak_count ?? 0,
              name: profile?.name || '',
            })
            shareCard(blob, `I scored ${result.score}% on today's San4 speaking rep 🎤 Same challenge, same day. Can you beat it? san4.vercel.app`)
          }}
          className="w-full py-3 rounded-2xl font-bold text-sm text-white mb-3 transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg,#7B5EA7,#9B7EC8)' }}
        >
          📲 Share this score
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
          <div className="text-4xl font-black mb-4 tabular-nums"
            style={{ color: left <= 10 ? '#F87171' : '#00C49A' }}>
            0:{String(left).padStart(2, '0')}
          </div>
        )}

        {/* Live transcript: see what you're actually saying, as you say it */}
        {recording && (
          <div className="w-full rounded-2xl px-4 py-3 mb-5 min-h-[64px] max-h-32 overflow-y-auto text-left"
            style={{
              background: liveText ? 'rgba(123,94,167,0.08)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${liveText ? 'rgba(123,94,167,0.3)' : 'rgba(255,255,255,0.07)'}`,
            }}>
            {liveText ? (
              <p className="text-white text-sm italic leading-relaxed">{liveText}</p>
            ) : (
              <p className="text-sm italic" style={{ color: 'rgba(107,140,174,0.6)' }}>
                {captionsDead
                  ? "Live captions aren't available right now, but Vak hears every word. Keep going!"
                  : 'Speak up, your words will appear here as you talk…'}
              </p>
            )}
          </div>
        )}

        <button
          onClick={() => { primeAudio(); recording ? finishRecording() : startRecording() }}
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
          {recording ? 'Tap when you\'re done, or let the timer run out' : 'Tap the mic and just speak. 60 seconds, one take.'}
        </p>
      </main>
      <div className="h-10" />
    </div>
  )
}
