import { useState, useEffect, useRef } from 'react'
import { Link }               from 'react-router-dom'
import { useAuth }            from '../hooks/useAuth'
import { useProgress }        from '../hooks/useProgress'
import { supabase }           from '../lib/supabase'
import { analyzeQuickDrill }  from '../lib/gemini'
import { getRandomBluf, getRandomQuestion } from '../lib/drills'
import Navbar                 from '../components/Navbar'
import VakMascot              from '../components/VakMascot'
import RewardCard             from '../components/RewardCard'

const SR_Class = window.SpeechRecognition || window.webkitSpeechRecognition
const VOICE_OK = !!SR_Class
const MAX_SEC  = { bluf: 60, unexpected_question: 90 }

function fmt(s) {
  const m = Math.floor(s / 60)
  return `${m}:${(s % 60).toString().padStart(2, '0')}`
}
function scoreColor(s) {
  if (s >= 80) return '#00C49A'
  if (s >= 60) return '#FF6B35'
  return '#F87171'
}

const DRILL_META = {
  bluf: {
    name:        'BLUF Drill',
    icon:        '🎯',
    color:       '#6366F1',
    colorAlpha:  'rgba(99,102,241,0.12)',
    colorBorder: 'rgba(99,102,241,0.3)',
    description: 'Bottom Line Up Front. You\'re given a complex situation: explain it starting with your conclusion. No preamble.',
    instruction: 'Lead with the key takeaway. Then give context. Never bury the point.',
    timeLabel:   '60 seconds',
  },
  unexpected_question: {
    name:        'Unexpected Question',
    icon:        '⚡',
    color:       '#F59E0B',
    colorAlpha:  'rgba(245,158,11,0.12)',
    colorBorder: 'rgba(245,158,11,0.3)',
    description: 'A hard question with no warning. Answer on your feet. Trains your brain to think fast without freezing.',
    instruction: 'You have 5 seconds to start. Structure as you go. Don\'t panic — think out loud.',
    timeLabel:   '90 seconds',
  },
}

// ── Main component ────────────────────────────────────────────────────────────
export default function MicroDrill() {
  // phase: select | ready | recording | analyzing | report
  const [phase,     setPhase]     = useState('select')
  const [drillType, setDrillType] = useState(null) // 'bluf' | 'unexpected_question'
  const [prompt,    setPrompt]    = useState(null)  // the bluf situation or question
  const [countdown, setCountdown] = useState(5)

  const [transcript, setTranscript] = useState('')
  const [liveText,   setLiveText]   = useState('')
  const [seconds,    setSeconds]    = useState(0)
  const [report,     setReport]     = useState(null)
  const [reward,     setReward]     = useState(null)

  const { user }    = useAuth()
  const { awardXP } = useProgress()

  const recRef         = useRef(null)
  const isListeningRef = useRef(false)
  const transcriptRef  = useRef('')
  const timerRef       = useRef(null)
  const maxSec         = drillType ? MAX_SEC[drillType] : 60

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
        alert('Microphone access denied.')
        isListeningRef.current = false
        setPhase('select')
      }
    }

    recRef.current = rec
    return () => {
      isListeningRef.current = false
      try { rec.abort() } catch (_) {}
    }
  }, [])

  // ── 5-second "get ready" countdown ───────────────────────────────────────
  useEffect(() => {
    if (phase !== 'ready') return
    setCountdown(5)
    const t = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(t)
          startRecording()
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [phase])

  // ── Session timer + auto-submit ───────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'recording') return
    timerRef.current = setInterval(() => {
      setSeconds(s => {
        if (s + 1 >= maxSec) { handleDone(); return s }
        return s + 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [phase, maxSec])

  function pickDrill(type) {
    const p = type === 'bluf' ? getRandomBluf() : getRandomQuestion()
    setDrillType(type)
    setPrompt(p)
    transcriptRef.current = ''
    setTranscript('')
    setLiveText('')
    setSeconds(0)
    setReport(null)
    setReward(null)
    setPhase('ready')
  }

  function startRecording() {
    if (!recRef.current) return
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

    const promptText = drillType === 'bluf'
      ? prompt.situation
      : prompt.question

    try {
      const result = await analyzeQuickDrill(drillType, promptText, transcriptRef.current, seconds)
      setReport(result)

      if (user) {
        await supabase.from('practice_sessions').insert({
          user_id:          user.id,
          scenario_id:      drillType,
          scenario_title:   DRILL_META[drillType].name,
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
        score: 70, clarity: 70, confidence: 70, led_with_point: null,
        best_moment: null,
        one_fix: 'Be more specific in your examples.',
        encouragement: 'Good effort. Completing the drill is what matters. Keep going.',
      }
      const r = await awardXP(fallback.score)
      setReward(r)
      setReport(fallback)
    }
    setPhase('report')
  }

  const meta = drillType ? DRILL_META[drillType] : null

  // ── XP reward ─────────────────────────────────────────────────────────────
  if (reward) return <RewardCard reward={reward} onClose={() => setReward(null)} />

  // ── PHASE: select ─────────────────────────────────────────────────────────
  if (phase === 'select') {
    return (
      <div className="min-h-screen" style={{ background: '#050810' }}>
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 py-8 animate-fade-in">

          <div className="mb-8">
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-3 text-sm font-semibold"
              style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.25)' }}
            >
              ⚡ Micro-Drills
            </div>
            <h1 className="text-3xl font-black text-white">60-second skill sharpeners</h1>
            <p className="mt-1" style={{ color: '#6B8CAE' }}>
              No scenario setup. No warmup. Respond on the spot.
            </p>
          </div>

          {!VOICE_OK && (
            <div className="mb-6 px-4 py-3 rounded-2xl text-sm"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#F87171', border: '1px solid rgba(239,68,68,0.2)' }}>
              ⚠️ Voice not supported in your browser. Use Chrome or Edge.
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            {Object.entries(DRILL_META).map(([type, m]) => (
              <button
                key={type}
                disabled={!VOICE_OK}
                onClick={() => pickDrill(type)}
                className="text-left rounded-3xl p-6 transition-all hover:brightness-110 disabled:opacity-50"
                style={{
                  background: 'linear-gradient(160deg, #10192E 0%, #0B1220 100%)',
                  border: `1px solid ${m.colorBorder}`,
                  boxShadow: `0 0 30px ${m.colorAlpha}`,
                }}
              >
                <div className="text-4xl mb-3">{m.icon}</div>
                <div className="font-black text-white text-lg mb-2">{m.name}</div>
                <p className="text-sm mb-4" style={{ color: '#6B8CAE' }}>{m.description}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: m.colorAlpha, color: m.color }}>
                    {m.timeLabel}
                  </span>
                  <span className="text-xs" style={{ color: '#6B8CAE' }}>Auto-submit at end</span>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-6 rounded-2xl p-4"
            style={{ background: 'linear-gradient(160deg, #10192E 0%, #0B1220 100%)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-sm" style={{ color: '#6B8CAE' }}>
              💡 <span className="text-white font-semibold">How drills work:</span> A random prompt appears.
              You have 5 seconds to read it, then recording starts automatically. Speak until time runs out
              or tap Done. Vak analyses and gives you one targeted fix.
            </p>
          </div>
        </main>
      </div>
    )
  }

  // ── PHASE: ready (countdown) ──────────────────────────────────────────────
  if (phase === 'ready') {
    const promptText = drillType === 'bluf' ? prompt.situation : prompt.question
    return (
      <div className="min-h-screen flex flex-col" style={{ background: '#050810' }}>
        <Navbar />
        <main className="max-w-lg mx-auto px-4 py-8 flex-1 flex flex-col justify-center">

          {/* Drill badge */}
          <div className="text-center mb-6">
            <span
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold"
              style={{ background: meta.colorAlpha, color: meta.color, border: `1px solid ${meta.colorBorder}` }}
            >
              {meta.icon} {meta.name}
            </span>
          </div>

          {/* The prompt */}
          <div
            className="rounded-3xl p-6 mb-6"
            style={{
              background: 'linear-gradient(160deg, #10192E 0%, #0B1220 100%)',
              border: `1px solid ${meta.colorBorder}`,
            }}
          >
            {drillType === 'bluf' && (
              <div className="text-xs font-bold uppercase tracking-widest mb-3"
                style={{ color: meta.color }}>Context / Situation</div>
            )}
            <p className="text-white text-base leading-relaxed font-medium">{promptText}</p>
            {drillType === 'bluf' && (
              <div className="mt-4 pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                <p className="text-xs font-semibold" style={{ color: meta.color }}>
                  Your task: Explain this situation to your leadership. Lead with the bottom line.
                </p>
              </div>
            )}
          </div>

          {/* Instruction */}
          <div className="rounded-2xl p-4 mb-6"
            style={{ background: meta.colorAlpha, border: `1px solid ${meta.colorBorder}` }}>
            <p className="text-sm font-semibold" style={{ color: meta.color }}>{meta.instruction}</p>
          </div>

          {/* Countdown */}
          <div className="text-center">
            <p className="text-sm mb-2" style={{ color: '#6B8CAE' }}>Recording starts in</p>
            <div
              className="text-7xl font-black"
              style={{ color: meta.color, textShadow: `0 0 40px ${meta.colorAlpha}` }}
            >
              {countdown}
            </div>
          </div>
        </main>
      </div>
    )
  }

  // ── PHASE: recording ──────────────────────────────────────────────────────
  if (phase === 'recording') {
    const pct = Math.min(100, (seconds / maxSec) * 100)
    const promptText = drillType === 'bluf' ? prompt.situation : prompt.question
    return (
      <div className="min-h-screen flex flex-col" style={{ background: '#050810' }}>
        <Navbar />
        <main className="max-w-lg mx-auto px-4 py-6 flex-1 flex flex-col">

          {/* Prompt reminder */}
          <div className="rounded-2xl p-4 mb-4"
            style={{ background: 'linear-gradient(160deg, #10192E 0%, #0B1220 100%)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-sm" style={{ color: '#6B8CAE' }}>{promptText}</p>
          </div>

          {/* Mic animation */}
          <div className="flex flex-col items-center justify-center flex-1 gap-4">
            <div className="relative">
              <div className="absolute inset-0 rounded-full animate-ping"
                style={{ background: `${meta.colorAlpha}`, animationDuration: '1s' }} />
              <div className="relative w-20 h-20 rounded-full flex items-center justify-center text-3xl"
                style={{ background: `linear-gradient(135deg, ${meta.color}cc, ${meta.color})`, boxShadow: `0 0 30px ${meta.colorAlpha}` }}>
                🎤
              </div>
            </div>
            <p className="font-semibold" style={{ color: meta.color }}>Recording…</p>
          </div>

          {/* Live transcript */}
          {(transcript || liveText) && (
            <div className="rounded-2xl p-4 mb-4 max-h-32 overflow-y-auto"
              style={{ background: 'linear-gradient(160deg, #10192E 0%, #0B1220 100%)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-sm" style={{ color: '#E2E8F0' }}>
                {transcript}
                {liveText && <span style={{ color: '#6B8CAE' }}> {liveText}</span>}
              </p>
            </div>
          )}

          {/* Timer bar */}
          <div className="mb-4">
            <div className="flex justify-between text-xs mb-1.5" style={{ color: '#6B8CAE' }}>
              <span>{fmt(seconds)}</span>
              <span>{fmt(maxSec - seconds)} left</span>
            </div>
            <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div className="h-1.5 rounded-full transition-all"
                style={{
                  width: `${pct}%`,
                  background: pct > 85 ? '#F87171' : `linear-gradient(90deg, ${meta.color}99, ${meta.color})`,
                }} />
            </div>
          </div>

          <button
            onClick={handleDone}
            disabled={seconds < 3}
            className="w-full py-3 rounded-2xl font-bold text-sm transition-all hover:opacity-90 disabled:opacity-40"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }}
          >
            Submit →
          </button>
        </main>
      </div>
    )
  }

  // ── PHASE: analyzing ──────────────────────────────────────────────────────
  if (phase === 'analyzing') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6" style={{ background: '#050810' }}>
        <div className="animate-float"><VakMascot level={3} size={90} /></div>
        <div className="text-center">
          <div className="text-white font-bold text-xl mb-2">Analysing your response…</div>
          <div style={{ color: '#6B8CAE' }}>One fix coming up</div>
        </div>
        <div className="flex gap-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full animate-bounce"
              style={{ background: meta?.color || '#FF6B35', animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    )
  }

  // ── PHASE: report ─────────────────────────────────────────────────────────
  if (phase === 'report' && report) {
    const promptText = drillType === 'bluf' ? prompt.situation : prompt.question
    return (
      <div className="min-h-screen" style={{ background: '#050810' }}>
        <Navbar />
        <main className="max-w-lg mx-auto px-4 py-8 animate-slide-up">

          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3 animate-float">
              <VakMascot level={report.score >= 80 ? 4 : 3} size={80} />
            </div>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold mb-2"
              style={{ background: meta.colorAlpha, color: meta.color }}>
              {meta.icon} {meta.name}
            </span>
            <p style={{ color: '#6B8CAE' }}>{fmt(seconds)}</p>
          </div>

          {/* Scores */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: 'Score',      value: report.score,      icon: '🏆' },
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

          {/* BLUF-specific: did they lead with the point? */}
          {drillType === 'bluf' && report.led_with_point !== null && (
            <div className="card mb-4" style={{
              background: report.led_with_point ? 'rgba(0,196,154,0.07)' : 'rgba(239,68,68,0.07)',
              borderColor: report.led_with_point ? 'rgba(0,196,154,0.25)' : 'rgba(239,68,68,0.25)',
            }}>
              <div className="flex items-center gap-3">
                <span className="text-xl">{report.led_with_point ? '✅' : '❌'}</span>
                <div>
                  <div className="text-sm font-semibold" style={{ color: report.led_with_point ? '#00C49A' : '#F87171' }}>
                    {report.led_with_point ? 'Led with the bottom line ✓' : 'Did NOT lead with the bottom line'}
                  </div>
                  {!report.led_with_point && (
                    <p className="text-xs mt-0.5" style={{ color: '#6B8CAE' }}>Start with your conclusion, then explain why.</p>
                  )}
                </div>
              </div>
            </div>
          )}

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
          <div className="card mb-4" style={{ background: 'rgba(255,107,53,0.06)', borderColor: 'rgba(255,107,53,0.2)' }}>
            <div className="flex gap-3">
              <span className="text-xl">🔧</span>
              <div>
                <div className="text-sm font-semibold mb-1" style={{ color: '#FF6B35' }}>The one fix</div>
                <p className="text-sm" style={{ color: '#E2E8F0' }}>{report.one_fix}</p>
              </div>
            </div>
          </div>

          {/* Encouragement */}
          <div className="card mb-6" style={{ background: `${meta.colorAlpha}`, borderColor: meta.colorBorder }}>
            <div className="flex gap-3">
              <span className="text-xl">🦢</span>
              <p className="text-sm" style={{ color: '#E2E8F0' }}>{report.encouragement}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => pickDrill(drillType)}
              className="flex-1 py-3 rounded-2xl font-bold text-sm transition-all hover:opacity-90"
              style={{ background: meta.colorAlpha, border: `1px solid ${meta.colorBorder}`, color: meta.color }}
            >
              🔁 New {drillType === 'bluf' ? 'situation' : 'question'}
            </button>
            <button
              onClick={() => setPhase('select')}
              className="flex-1 py-3 rounded-2xl font-bold text-sm text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #FF6B35, #FF8F4F)' }}
            >
              Switch drill →
            </button>
          </div>
          <div className="h-6" />
        </main>
      </div>
    )
  }

  return null
}
