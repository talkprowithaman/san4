import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate }  from 'react-router-dom'
import { useAuth }            from '../hooks/useAuth'
import { useProgress }        from '../hooks/useProgress'
import { supabase }           from '../lib/supabase'
import { analyzeQuickDrill }  from '../lib/gemini'
import { getTodaySituation, isDailyChallengeDone, markDailyChallengeDone } from '../lib/situations'
import Navbar                 from '../components/Navbar'
import VakMascot              from '../components/VakMascot'
import RewardCard             from '../components/RewardCard'

const SR_Class  = window.SpeechRecognition || window.webkitSpeechRecognition
const VOICE_OK  = !!SR_Class
const MAX_SEC   = 90

function fmt(s) {
  const m = Math.floor(s / 60)
  return `${m}:${(s % 60).toString().padStart(2, '0')}`
}
function scoreColor(s) {
  if (s >= 80) return '#00C49A'
  if (s >= 60) return '#FF6B35'
  return '#F87171'
}

export default function DailyChallenge() {
  const navigate       = useNavigate()
  const { user }       = useAuth()
  const { awardXP }    = useProgress()

  const situation      = getTodaySituation()
  const alreadyDone    = isDailyChallengeDone()

  // phase: prompt | recording | analyzing | report
  const [phase,      setPhase]      = useState('prompt')
  const [transcript, setTranscript] = useState('')
  const [liveText,   setLiveText]   = useState('')
  const [seconds,    setSeconds]    = useState(0)
  const [report,     setReport]     = useState(null)
  const [reward,     setReward]     = useState(null)

  const recRef         = useRef(null)
  const isListeningRef = useRef(false)
  const transcriptRef  = useRef('')
  const timerRef       = useRef(null)

  // ── SpeechRecognition setup ───────────────────────────────────────────────
  useEffect(() => {
    if (!SR_Class) return
    const rec = new SR_Class()
    rec.lang            = 'en-IN'
    rec.continuous      = true
    rec.interimResults  = true
    rec.maxAlternatives = 1

    rec.onresult = (e) => {
      let finalChunk = '', interimChunk = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) finalChunk += t + ' '
        else interimChunk += t
      }
      if (finalChunk) {
        transcriptRef.current = (transcriptRef.current + ' ' + finalChunk).trim()
        setTranscript(transcriptRef.current)
        setLiveText('')
      } else if (interimChunk) {
        setLiveText(interimChunk)
      }
    }

    rec.onend = () => {
      if (isListeningRef.current) {
        setTimeout(() => {
          if (isListeningRef.current) try { rec.start() } catch (_) {}
        }, 120)
      }
    }

    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'audio-capture') {
        alert('Microphone access denied. Please allow mic access and try again.')
        isListeningRef.current = false
        setPhase('prompt')
      }
    }

    recRef.current = rec
    return () => {
      isListeningRef.current = false
      try { rec.abort() } catch (_) {}
    }
  }, [])

  // ── Timer + auto-stop at MAX_SEC ─────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'recording') return
    timerRef.current = setInterval(() => {
      setSeconds(s => {
        if (s + 1 >= MAX_SEC) { handleDone(); return s }
        return s + 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [phase])

  function startRecording() {
    if (!recRef.current) return
    transcriptRef.current = ''
    setTranscript('')
    setLiveText('')
    setSeconds(0)
    try { recRef.current.start(); isListeningRef.current = true } catch (_) {}
    setPhase('recording')
  }

  function stopListening() {
    isListeningRef.current = false
    try { recRef.current?.stop() } catch (_) {}
  }

  async function handleDone() {
    stopListening()
    clearInterval(timerRef.current)
    setPhase('analyzing')

    try {
      const result = await analyzeQuickDrill(
        'daily_challenge',
        situation.text,
        transcriptRef.current,
        seconds,
      )
      setReport(result)
      markDailyChallengeDone()

      if (user) {
        await supabase.from('practice_sessions').insert({
          user_id:          user.id,
          scenario_id:      'daily_challenge',
          scenario_title:   '📅 Daily Challenge',
          overall_score:    result.score,
          confidence_score: result.confidence,
          pacing_score:     result.clarity,
          filler_word_count: 0,
          duration_seconds: seconds,
          feedback:         result.encouragement,
          action_item:      result.one_fix,
          messages:         [],
        })
      }

      const r = await awardXP(result.score)
      setReward(r)
    } catch {
      const fallback = {
        score: 70, clarity: 70, confidence: 70,
        best_moment: null,
        one_fix: 'Be more specific, use one concrete example to support your point.',
        encouragement: 'Great effort! Showing up daily is how you build the skill.',
      }
      markDailyChallengeDone()
      const r = await awardXP(fallback.score)
      setReward(r)
      setReport(fallback)
    }
    setPhase('report')
  }

  // ── Render: XP reward ─────────────────────────────────────────────────────
  if (reward) return <RewardCard reward={reward} onClose={() => setReward(null)} />

  // ── Already done today ────────────────────────────────────────────────────
  if (alreadyDone && phase === 'prompt') {
    return (
      <div className="min-h-screen" style={{ background: '#050810' }}>
        <Navbar />
        <main className="max-w-lg mx-auto px-4 py-16 text-center">
          <div className="flex justify-center mb-4 animate-float"><VakMascot level={4} size={90} /></div>
          <h2 className="text-white font-black text-2xl mb-2">You've done today's challenge! ✅</h2>
          <p className="mb-6" style={{ color: '#6B8CAE' }}>Come back tomorrow for a fresh situation.</p>
          <div className="rounded-2xl p-4 mb-6 text-left"
            style={{ background: 'rgba(0,196,154,0.08)', border: '1px solid rgba(0,196,154,0.2)' }}>
            <p className="text-xs font-bold mb-2" style={{ color: '#00C49A' }}>Today's situation</p>
            <p className="text-sm" style={{ color: '#E2E8F0' }}>{situation.text}</p>
          </div>
          <Link to="/dashboard" className="btn-primary">← Back to Dashboard</Link>
        </main>
      </div>
    )
  }

  // ── Phase: prompt ─────────────────────────────────────────────────────────
  if (phase === 'prompt') {
    return (
      <div className="min-h-screen" style={{ background: '#050810' }}>
        <Navbar />
        <main className="max-w-lg mx-auto px-4 py-8 animate-fade-in">

          {/* Header */}
          <div className="mb-6 text-center">
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-3 text-sm font-semibold"
              style={{ background: 'rgba(123,94,167,0.12)', color: '#7B5EA7', border: '1px solid rgba(123,94,167,0.25)' }}
            >
              🔥 Daily Challenge: {situation.category}
            </div>
            <p className="text-sm" style={{ color: '#6B8CAE' }}>
              One real situation. 90 seconds. Respond like you mean it.
            </p>
          </div>

          {/* Situation card */}
          <div
            className="rounded-3xl p-7 mb-6"
            style={{
              background: 'linear-gradient(160deg, #10192E 0%, #0B1220 100%)',
              border: '1px solid rgba(123,94,167,0.25)',
              boxShadow: '0 0 40px rgba(123,94,167,0.08)',
            }}
          >
            <div className="text-3xl mb-4 text-center">{situation.icon}</div>
            <p className="text-white text-lg leading-relaxed font-medium text-center">
              {situation.text}
            </p>
          </div>

          {/* Tip */}
          <div
            className="rounded-2xl px-5 py-3.5 mb-8 flex gap-3"
            style={{ background: 'rgba(0,196,154,0.07)', border: '1px solid rgba(0,196,154,0.2)' }}
          >
            <span className="text-lg shrink-0">💡</span>
            <p className="text-sm" style={{ color: '#6B8CAE' }}>
              <span className="font-semibold" style={{ color: '#00C49A' }}>Tip: </span>
              {situation.tip}
            </p>
          </div>

          {/* CTA */}
          {VOICE_OK ? (
            <button
              onClick={startRecording}
              className="w-full py-4 rounded-2xl font-black text-white text-base transition-all hover:opacity-90 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #7B5EA7, #9B7EC8)',
                boxShadow: '0 6px 24px rgba(123,94,167,0.4)',
              }}
            >
              🎤 Start Responding
            </button>
          ) : (
            <div className="text-center p-4 rounded-2xl" style={{ background: 'rgba(239,68,68,0.1)', color: '#F87171' }}>
              Voice not supported in your browser. Use Chrome or Edge.
            </div>
          )}

          <p className="text-center text-xs mt-3" style={{ color: '#6B8CAE' }}>
            You have up to 90 seconds · Stop anytime when you're done
          </p>
        </main>
      </div>
    )
  }

  // ── Phase: recording ──────────────────────────────────────────────────────
  if (phase === 'recording') {
    const pct = Math.min(100, (seconds / MAX_SEC) * 100)
    return (
      <div className="min-h-screen flex flex-col" style={{ background: '#050810' }}>
        <Navbar />
        <main className="max-w-lg mx-auto px-4 py-8 flex-1 flex flex-col">

          {/* Situation reminder */}
          <div className="rounded-2xl p-4 mb-6" style={{ background: 'linear-gradient(160deg, #10192E 0%, #0B1220 100%)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-sm leading-relaxed" style={{ color: '#6B8CAE' }}>{situation.text}</p>
          </div>

          {/* Mic pulse animation */}
          <div className="flex flex-col items-center justify-center flex-1 gap-5">
            <div className="relative">
              <div
                className="absolute inset-0 rounded-full animate-ping"
                style={{ background: 'rgba(123,94,167,0.2)', animationDuration: '1.2s' }}
              />
              <div
                className="relative w-24 h-24 rounded-full flex items-center justify-center text-4xl"
                style={{ background: 'linear-gradient(135deg, #7B5EA7, #9B7EC8)', boxShadow: '0 0 40px rgba(123,94,167,0.4)' }}
              >
                🎤
              </div>
            </div>
            <p className="text-white font-semibold">Speaking…</p>
          </div>

          {/* Live transcript */}
          {(transcript || liveText) && (
            <div className="rounded-2xl p-4 mb-5 min-h-20" style={{ background: 'linear-gradient(160deg, #10192E 0%, #0B1220 100%)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-sm" style={{ color: '#E2E8F0' }}>
                {transcript}
                {liveText && <span style={{ color: '#6B8CAE' }}> {liveText}</span>}
              </p>
            </div>
          )}

          {/* Timer progress bar */}
          <div className="mb-4">
            <div className="flex justify-between text-xs mb-1.5" style={{ color: '#6B8CAE' }}>
              <span>{fmt(seconds)}</span>
              <span>{fmt(MAX_SEC - seconds)} left</span>
            </div>
            <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: `${pct}%`,
                  background: pct > 80 ? '#F87171' : 'linear-gradient(90deg, #FF6B35, #FF8F4F)',
                }}
              />
            </div>
          </div>

          {/* Done button */}
          <button
            onClick={handleDone}
            disabled={seconds < 3}
            className="w-full py-3.5 rounded-2xl font-bold text-sm text-white transition-all hover:opacity-90 disabled:opacity-40"
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}
          >
            Submit Response →
          </button>
        </main>
      </div>
    )
  }

  // ── Phase: analyzing ──────────────────────────────────────────────────────
  if (phase === 'analyzing') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6" style={{ background: '#050810' }}>
        <div className="animate-float"><VakMascot level={3} size={90} /></div>
        <div className="text-center">
          <div className="text-white font-bold text-xl mb-2">Reviewing your response…</div>
          <div style={{ color: '#6B8CAE' }}>Vak is analysing clarity, confidence, and structure</div>
        </div>
        <div className="flex gap-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full animate-bounce"
              style={{ background: '#7B5EA7', animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    )
  }

  // ── Phase: report ─────────────────────────────────────────────────────────
  if (phase === 'report' && report) {
    return (
      <div className="min-h-screen" style={{ background: '#050810' }}>
        <Navbar />
        <main className="max-w-lg mx-auto px-4 py-8 animate-slide-up">

          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3 animate-float">
              <VakMascot level={report.score >= 80 ? 4 : 3} size={80} />
            </div>
            <h2 className="text-white font-black text-2xl mb-1">Challenge Complete! 🎯</h2>
            <p style={{ color: '#6B8CAE' }}>{situation.category} · {fmt(seconds)}</p>
          </div>

          {/* Score trio */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: 'Overall',    value: report.score,      icon: '🏆' },
              { label: 'Clarity',    value: report.clarity,    icon: '💡' },
              { label: 'Confidence', value: report.confidence, icon: '💪' },
            ].map(({ label, value, icon }) => (
              <div key={label} className="rounded-2xl p-4 text-center"
                style={{ background: 'linear-gradient(160deg, #10192E 0%, #0B1220 100%)', border: `1px solid ${scoreColor(value)}30` }}>
                <div className="text-lg mb-1">{icon}</div>
                <div className="text-2xl font-black" style={{ color: scoreColor(value) }}>{value}</div>
                <div className="text-xs mt-0.5" style={{ color: '#6B8CAE' }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Best moment */}
          {report.best_moment && (
            <div className="card mb-4" style={{ background: 'rgba(0,196,154,0.07)', borderColor: 'rgba(0,196,154,0.2)' }}>
              <div className="flex gap-3">
                <span className="text-xl">⭐</span>
                <div>
                  <div className="text-sm font-semibold mb-1" style={{ color: '#00C49A' }}>Best moment</div>
                  <p className="text-sm italic" style={{ color: '#E2E8F0' }}>"{report.best_moment}"</p>
                </div>
              </div>
            </div>
          )}

          {/* One fix */}
          <div className="card mb-4" style={{ background: 'rgba(123,94,167,0.06)', borderColor: 'rgba(123,94,167,0.2)' }}>
            <div className="flex gap-3">
              <span className="text-xl">🔧</span>
              <div>
                <div className="text-sm font-semibold mb-1" style={{ color: '#7B5EA7' }}>One thing to fix</div>
                <p className="text-sm" style={{ color: '#E2E8F0' }}>{report.one_fix}</p>
              </div>
            </div>
          </div>

          {/* Encouragement */}
          <div className="card mb-8" style={{ background: 'rgba(139,92,246,0.07)', borderColor: 'rgba(139,92,246,0.2)' }}>
            <div className="flex gap-3">
              <span className="text-xl">🦢</span>
              <p className="text-sm" style={{ color: '#E2E8F0' }}>{report.encouragement}</p>
            </div>
          </div>

          <Link to="/dashboard" className="btn-primary w-full text-center block">
            ← Back to Dashboard
          </Link>
          <div className="h-6" />
        </main>
      </div>
    )
  }

  return null
}
