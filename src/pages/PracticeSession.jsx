import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth }     from '../hooks/useAuth'
import { useProgress } from '../hooks/useProgress'
import { supabase }    from '../lib/supabase'
import { sendPracticeMessage, analyzeSession } from '../lib/gemini'
import Navbar      from '../components/Navbar'
import RewardCard  from '../components/RewardCard'
import VakMascot   from '../components/VakMascot'

// ── Browser speech API support check ─────────────────────────────────────────
const SR_Class = window.SpeechRecognition || window.webkitSpeechRecognition
const VOICE_SUPPORTED = !!SR_Class && !!window.speechSynthesis

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(s) {
  const m = Math.floor(s / 60)
  return `${m}:${(s % 60).toString().padStart(2, '0')}`
}
function scoreColor(s) {
  if (s >= 80) return '#00C49A'
  if (s >= 60) return '#FF6B35'
  return '#F87171'
}
function wpmLabel(wpm) {
  if (!wpm) return null
  if (wpm < 100) return { text: `${wpm} WPM — too slow`, color: '#F87171' }
  if (wpm > 180) return { text: `${wpm} WPM — too fast`, color: '#F59E0B' }
  return { text: `${wpm} WPM — good pace`, color: '#00C49A' }
}

// ── Main component ────────────────────────────────────────────────────────────
export default function PracticeSession() {
  const { scenarioId }  = useParams()
  const { state }       = useLocation()
  const { user }        = useAuth()
  const navigate        = useNavigate()
  const { awardXP }     = useProgress()

  const scenario = state?.scenario || { id: scenarioId, title: scenarioId, icon: '🎭' }

  // ── Core session state ────────────────────────────────────────────────────
  const [messages,   setMessages]   = useState([])
  const [aiThinking, setAiThinking] = useState(false)
  const [analyzing,  setAnalyzing]  = useState(false)
  const [report,     setReport]     = useState(null)
  const [reward,     setReward]     = useState(null)
  const [seconds,    setSeconds]    = useState(0)
  const [started,    setStarted]    = useState(false)

  // ── Voice state ───────────────────────────────────────────────────────────
  const [voiceMode,   setVoiceMode]   = useState(VOICE_SUPPORTED)
  const [listening,   setListening]   = useState(false)
  const [liveText,    setLiveText]    = useState('')   // shown while recording
  const [ttsOn,       setTtsOn]       = useState(true)
  const [vakSpeaking, setVakSpeaking] = useState(false)

  // ── Text mode state ───────────────────────────────────────────────────────
  const [textInput, setTextInput] = useState('')

  // ── Voice refs ────────────────────────────────────────────────────────────
  const recRef          = useRef(null)
  const isListeningRef  = useRef(false)
  const accRef          = useRef('')          // accumulated final transcript
  const autoSendTimer   = useRef(null)
  const speechStart     = useRef(null)
  const voiceMetaRef    = useRef({ wpmSamples: [], totalSpeakingSeconds: 0 })

  const bottomRef = useRef(null)
  const textRef   = useRef(null)

  // ── Timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!started) return
    const t = setInterval(() => setSeconds(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [started])

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, aiThinking, liveText])

  // ── Start session ─────────────────────────────────────────────────────────
  useEffect(() => { beginSession() }, [])

  async function beginSession() {
    setStarted(true)
    setAiThinking(true)
    try {
      const opening = await sendPracticeMessage(scenario.id, [], 'Start the session now.')
      setMessages([{ role: 'ai', content: opening }])
      speak(opening)
    } catch (err) {
      const fallback = "Let's begin. I'm ready when you are."
      setMessages([{ role: 'ai', content: fallback }])
      speak(fallback)
    }
    setAiThinking(false)
    if (!voiceMode) textRef.current?.focus()
  }

  // ── Speech Recognition setup ──────────────────────────────────────────────
  useEffect(() => {
    if (!SR_Class) return
    const rec = new SR_Class()
    rec.lang             = 'en-IN'  // Indian English — better for Indian accents
    rec.continuous       = true     // keep alive until we explicitly call stop()
    rec.interimResults   = true
    rec.maxAlternatives  = 1

    rec.onresult = (e) => {
      let finalChunk = ''
      let interimChunk = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) finalChunk += t + ' '
        else interimChunk += t
      }

      if (finalChunk) {
        accRef.current = (accRef.current + ' ' + finalChunk).trim()
        setLiveText(accRef.current)

        // Auto-send after 1.8 s of silence following the last final chunk
        clearTimeout(autoSendTimer.current)
        autoSendTimer.current = setTimeout(() => {
          if (isListeningRef.current && accRef.current.trim()) {
            stopAndSend()
          }
        }, 1800)
      } else if (interimChunk) {
        setLiveText((accRef.current + ' ' + interimChunk).trim())
      }
    }

    rec.onend = () => {
      // continuous:true means onend fires only when stop()/abort() is called
      // OR if the browser forcibly closes it (network timeout, ~60 s silence).
      // If we still want to be listening, restart after a brief safety delay.
      if (isListeningRef.current) {
        setTimeout(() => {
          if (isListeningRef.current) {
            try { rec.start() } catch (err) {
              // Could not restart — give up gracefully
              console.warn('STT restart failed:', err.message)
              isListeningRef.current = false
              setListening(false)
            }
          }
        }, 120) // 120 ms gap lets the browser fully reset before re-starting
      } else {
        setListening(false)
      }
    }

    rec.onerror = (e) => {
      console.warn('STT error:', e.error)
      switch (e.error) {
        case 'not-allowed':
        case 'permission-denied':
          alert('Microphone access denied.\n\nOpen your browser settings → Site permissions → Microphone → Allow.')
          isListeningRef.current = false
          setListening(false)
          setVoiceMode(false)
          break

        case 'audio-capture':
          alert('No microphone detected. Please plug in a mic and try again.')
          isListeningRef.current = false
          setListening(false)
          setVoiceMode(false)
          break

        case 'no-speech':
        case 'aborted':
          // no-speech: user hasn't spoken yet — keep listening
          // aborted: we called rec.abort() ourselves — onend will handle cleanup
          break

        case 'network':
          // Transient network blip — onend will fire and restart automatically
          break

        default:
          // Unknown error — don't panic, let onend handle the restart
          console.warn('Unhandled STT error:', e.error)
      }
    }

    recRef.current = rec

    return () => {
      isListeningRef.current = false
      clearTimeout(autoSendTimer.current)
      try { rec.abort() } catch (_) {}
    }
  }, [])

  function startListening() {
    if (!recRef.current || listening) return

    // Stop Vak's TTS immediately — user wants to speak
    window.speechSynthesis?.cancel()
    setVakSpeaking(false)

    accRef.current = ''
    setLiveText('')
    speechStart.current = Date.now()

    try {
      recRef.current.start()
      // Only flip state after start() succeeds
      isListeningRef.current = true
      setListening(true)
    } catch (err) {
      console.error('Could not start microphone:', err.message)
      // Most likely cause: recognition is already running (double-tap)
      // or browser blocked it. Show user a helpful message.
      if (err.name === 'InvalidStateError') {
        // Already running — abort and restart cleanly
        try { recRef.current.abort() } catch (_) {}
        setTimeout(() => startListening(), 200)
      }
    }
  }

  function stopAndSend() {
    isListeningRef.current = false
    try { recRef.current.stop() } catch (_) {}
    clearTimeout(autoSendTimer.current)
    setListening(false)

    const text = accRef.current.trim()
    setLiveText('')
    accRef.current = ''

    if (!text) return

    // Track pacing
    if (speechStart.current) {
      const durSec = (Date.now() - speechStart.current) / 1000
      const wpm = Math.round((text.split(/\s+/).length / durSec) * 60)
      if (wpm > 30 && wpm < 400) {
        voiceMetaRef.current.wpmSamples.push(wpm)
        voiceMetaRef.current.totalSpeakingSeconds += durSec
      }
    }

    submitMessage(text)
  }

  // ── TTS — Vak speaks back ─────────────────────────────────────────────────
  function speak(text) {
    if (!ttsOn || !window.speechSynthesis) return
    window.speechSynthesis.cancel()

    const utt    = new SpeechSynthesisUtterance(text)
    utt.lang     = 'en-IN'
    utt.rate     = 0.95
    utt.pitch    = 1.1

    utt.onstart  = () => setVakSpeaking(true)
    utt.onend    = () => setVakSpeaking(false)
    utt.onerror  = () => setVakSpeaking(false)

    window.speechSynthesis.speak(utt)
    setVakSpeaking(true)
  }

  // ── Shared message submission ─────────────────────────────────────────────
  async function submitMessage(text) {
    if (!text || aiThinking) return

    const newMsgs = [...messages, { role: 'user', content: text }]
    setMessages(newMsgs)
    setTextInput('')
    setAiThinking(true)

    try {
      const response = await sendPracticeMessage(scenario.id, messages, text)

      if (response.includes('[SESSION_ENDED]')) {
        const clean = response.replace('[SESSION_ENDED]', '').trim()
        const finalMsgs = clean
          ? [...newMsgs, { role: 'ai', content: clean }]
          : newMsgs
        if (clean) {
          setMessages(finalMsgs)
          speak(clean)
        }
        // Wait for last TTS to finish before ending
        setTimeout(() => endSession(finalMsgs), clean ? 2500 : 0)
      } else {
        setMessages([...newMsgs, { role: 'ai', content: response }])
        speak(response)
      }
    } catch (err) {
      console.error('Gemini error:', err)
      setMessages([...newMsgs, {
        role: 'ai',
        content: "Sorry, I couldn't connect. Please check your internet and try again.",
      }])
    }
    setAiThinking(false)
  }

  // ── End session ───────────────────────────────────────────────────────────
  async function endSession(finalMessages) {
    window.speechSynthesis?.cancel()
    setVakSpeaking(false)
    isListeningRef.current = false
    setListening(false)

    const msgList = finalMessages || messages
    setAnalyzing(true)

    // Build voice metadata for analysis
    const wpmSamples = voiceMetaRef.current.wpmSamples
    const voiceMeta  = wpmSamples.length
      ? {
          avgWpm:              Math.round(wpmSamples.reduce((a, b) => a + b, 0) / wpmSamples.length),
          totalSpeakingSeconds: Math.round(voiceMetaRef.current.totalSpeakingSeconds),
        }
      : null

    try {
      const analysis = await analyzeSession(scenario.title, msgList, voiceMeta)

      if (user) {
        await supabase.from('practice_sessions').insert({
          user_id:           user.id,
          scenario_id:       scenario.id,
          scenario_title:    scenario.title,
          messages:          msgList,
          filler_word_count: analysis.filler_word_count,
          confidence_score:  analysis.confidence_score,
          pacing_score:      analysis.pacing_score,
          overall_score:     analysis.overall_score,
          duration_seconds:  seconds,
          feedback:          analysis.summary,
          action_item:       analysis.action_item,
        })
      }

      const rewardResult = await awardXP(analysis.overall_score)
      setReward(rewardResult)
      setReport({ ...analysis, voiceMeta })
    } catch (err) {
      console.error('Analysis error:', err)
      const fallback = {
        overall_score: 70, confidence_score: 70, pacing_score: 70,
        filler_word_count: 0, top_filler_words: [],
        strengths: ['You completed the session'],
        improvements: ['Keep practising daily'],
        action_item: 'Try this scenario again tomorrow.',
        summary: 'Session completed. Regular practice builds real confidence.',
        voiceMeta,
      }
      const r = await awardXP(fallback.overall_score)
      setReward(r)
      setReport(fallback)
    }
    setAnalyzing(false)
  }

  // ── Views ─────────────────────────────────────────────────────────────────

  if (analyzing) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#060E1A' }}>
      <div className="text-center animate-fade-in">
        <div className="flex justify-center mb-4 animate-float">
          <VakMascot level={3} size={100} />
        </div>
        <h2 className="text-white font-bold text-xl mb-2">Vak is reviewing your session…</h2>
        <p className="text-sm" style={{ color: '#6B8CAE' }}>Checking filler words, pacing, confidence — building your report.</p>
        <div className="flex gap-2 justify-center mt-5">
          {[0,1,2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full animate-bounce"
              style={{ background: '#FF6B35', animationDelay: `${i * 0.18}s` }} />
          ))}
        </div>
      </div>
    </div>
  )

  if (report) return (
    <div className="min-h-screen" style={{ background: '#060E1A' }}>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8 animate-slide-up">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">{scenario.icon || '🎭'}</div>
          <h1 className="text-2xl font-black text-white">Session Complete</h1>
          <p className="text-sm mt-1" style={{ color: '#6B8CAE' }}>
            {scenario.title} · {fmt(seconds)}
            {voiceMode && ' · 🎤 Voice'}
          </p>
        </div>

        {/* XP reward */}
        <RewardCard reward={reward} />

        {/* Score row */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: 'Overall',    val: report.overall_score },
            { label: 'Confidence', val: report.confidence_score },
            { label: 'Pacing',     val: report.pacing_score },
          ].map(({ label, val }) => (
            <div key={label} className="card text-center">
              <div className="text-3xl font-black" style={{ color: scoreColor(val) }}>{val}%</div>
              <div className="text-xs mt-1" style={{ color: '#6B8CAE' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Pacing note (voice only) */}
        {report.voiceMeta && (() => {
          const w = wpmLabel(report.voiceMeta.avgWpm)
          return w ? (
            <div className="card mb-4 flex items-center gap-3">
              <span className="text-xl">🎙️</span>
              <div>
                <div className="text-white font-semibold text-sm">Speaking pace</div>
                <div className="text-sm font-bold mt-0.5" style={{ color: w.color }}>{w.text}</div>
                {report.pacing_note && (
                  <p className="text-xs mt-1" style={{ color: '#6B8CAE' }}>{report.pacing_note}</p>
                )}
              </div>
            </div>
          ) : null
        })()}

        {/* Filler words */}
        <div className="card mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-white font-semibold text-sm">Filler Words</h3>
            <span className="font-black text-xl" style={{
              color: report.filler_word_count > 10 ? '#F87171' : report.filler_word_count > 5 ? '#FF6B35' : '#00C49A'
            }}>
              {report.filler_word_count}
            </span>
          </div>
          {report.top_filler_words?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {report.top_filler_words.map(w => (
                <span key={w} className="text-xs px-3 py-1 rounded-full"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#F87171' }}>
                  "{w}"
                </span>
              ))}
            </div>
          )}
          <p className="text-xs mt-2" style={{ color: '#6B8CAE' }}>
            {report.filler_word_count === 0
              ? '🎉 No filler words detected — excellent!'
              : report.filler_word_count <= 5
              ? 'Good control. Keep it up.'
              : 'Filler words reduce perceived confidence. Pause instead of filling silence.'}
          </p>
        </div>

        {/* Coach summary */}
        <div className="card mb-4">
          <h3 className="text-white font-semibold text-sm mb-2">Vak's Assessment</h3>
          <p className="text-sm leading-relaxed" style={{ color: '#94A3B8' }}>{report.summary}</p>
        </div>

        {/* Strengths + improvements */}
        <div className="grid md:grid-cols-2 gap-3 mb-4">
          <div className="card">
            <h3 className="font-semibold text-sm mb-3" style={{ color: '#00C49A' }}>✓ What worked</h3>
            <ul className="space-y-2">
              {report.strengths?.map((s, i) => (
                <li key={i} className="text-sm flex gap-2" style={{ color: '#94A3B8' }}>
                  <span style={{ color: '#00C49A' }}>•</span> {s}
                </li>
              ))}
            </ul>
          </div>
          <div className="card">
            <h3 className="font-semibold text-sm mb-3" style={{ color: '#FF6B35' }}>↑ Work on this</h3>
            <ul className="space-y-2">
              {report.improvements?.map((s, i) => (
                <li key={i} className="text-sm flex gap-2" style={{ color: '#94A3B8' }}>
                  <span style={{ color: '#FF6B35' }}>•</span> {s}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Action item */}
        <div className="card mb-8"
          style={{ background: 'rgba(255,107,53,0.07)', border: '1px solid rgba(255,107,53,0.25)' }}>
          <div className="flex gap-3 items-start">
            <span className="text-2xl">🎯</span>
            <div>
              <h3 className="font-semibold text-sm mb-1" style={{ color: '#FF6B35' }}>Your action item</h3>
              <p className="text-white text-sm">{report.action_item}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={() => navigate('/practice')} className="btn-primary flex-1">Practice again →</button>
          <button onClick={() => navigate('/dashboard')} className="btn-secondary flex-1">Dashboard</button>
        </div>
        <div className="h-8" />
      </main>
    </div>
  )

  // ── Live session ──────────────────────────────────────────────────────────
  const lastAiMsg = [...messages].reverse().find(m => m.role === 'ai')

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#060E1A' }}>
      <Navbar />

      {/* Session header */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(9,21,40,0.9)' }}
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{scenario.icon || '🎭'}</span>
          <div>
            <div className="text-white font-semibold text-sm">{scenario.title}</div>
            <div className="text-xs" style={{ color: '#6B8CAE' }}>
              {fmt(seconds)} · {messages.filter(m => m.role === 'user').length} responses
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Voice / Text toggle */}
          {VOICE_SUPPORTED && (
            <button
              onClick={() => setVoiceMode(v => !v)}
              className="text-xs px-3 py-1.5 rounded-full transition-all"
              style={{
                background: voiceMode ? 'rgba(0,196,154,0.12)' : 'rgba(255,255,255,0.07)',
                color: voiceMode ? '#00C49A' : '#6B8CAE',
                border: `1px solid ${voiceMode ? 'rgba(0,196,154,0.3)' : 'rgba(255,255,255,0.1)'}`,
              }}
            >
              {voiceMode ? '🎤 Voice' : '⌨️ Text'}
            </button>
          )}
          <button
            onClick={() => endSession()}
            className="text-sm px-4 py-1.5 rounded-xl font-semibold transition-all hover:opacity-90"
            style={{ background: 'rgba(239,68,68,0.15)', color: '#F87171', border: '1px solid rgba(239,68,68,0.25)' }}
          >
            End →
          </button>
        </div>
      </div>

      {voiceMode ? (
        /* ── VOICE MODE ─────────────────────────────────────────────────────── */
        <div className="flex-1 flex flex-col items-center justify-between px-4 py-6 max-w-md mx-auto w-full">

          {/* Vak avatar + last message */}
          <div className="flex-1 flex flex-col items-center justify-center w-full">

            {/* Vak with speaking/listening aura */}
            <div className="relative mb-6 flex items-center justify-center">
              {/* Outer pulse ring */}
              {(vakSpeaking || listening) && (
                <div
                  className="absolute rounded-full animate-ping"
                  style={{
                    width: 160, height: 160,
                    background: vakSpeaking
                      ? 'rgba(139,92,246,0.15)'
                      : 'rgba(255,107,53,0.15)',
                    border: `2px solid ${vakSpeaking ? 'rgba(139,92,246,0.3)' : 'rgba(255,107,53,0.3)'}`,
                    animationDuration: '1.5s',
                  }}
                />
              )}
              {/* Inner glow */}
              <div
                className="absolute rounded-full transition-all duration-300"
                style={{
                  width: 130, height: 130,
                  background: vakSpeaking
                    ? 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)'
                    : listening
                    ? 'radial-gradient(circle, rgba(255,107,53,0.15) 0%, transparent 70%)'
                    : 'transparent',
                }}
              />
              <div className={vakSpeaking ? 'animate-float' : listening ? '' : 'animate-float'}>
                <VakMascot level={3} size={110} />
              </div>
            </div>

            {/* Status badge */}
            <div
              className="text-xs font-bold px-4 py-1.5 rounded-full mb-6 transition-all"
              style={{
                background: vakSpeaking
                  ? 'rgba(139,92,246,0.15)'
                  : listening
                  ? 'rgba(255,107,53,0.15)'
                  : aiThinking
                  ? 'rgba(245,158,11,0.15)'
                  : 'rgba(255,255,255,0.07)',
                color: vakSpeaking ? '#A78BFA' : listening ? '#FF6B35' : aiThinking ? '#F59E0B' : '#6B8CAE',
                border: `1px solid ${vakSpeaking ? 'rgba(139,92,246,0.3)' : listening ? 'rgba(255,107,53,0.3)' : aiThinking ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.1)'}`,
              }}
            >
              {vakSpeaking
                ? '🦢 Vak is speaking…'
                : listening
                ? '🎤 Listening…'
                : aiThinking
                ? '⏳ Thinking…'
                : '👆 Tap mic to speak'}
            </div>

            {/* Last Vak message */}
            {lastAiMsg && (
              <div
                className="w-full rounded-2xl px-5 py-4 mb-4"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <div className="text-xs mb-2 font-semibold" style={{ color: '#6B8CAE' }}>🦢 Vak says</div>
                <p className="text-white text-sm leading-relaxed">{lastAiMsg.content}</p>
                {/* Re-play TTS */}
                {ttsOn && (
                  <button
                    onClick={() => speak(lastAiMsg.content)}
                    className="mt-2 text-xs transition-colors"
                    style={{ color: '#6B8CAE' }}
                  >
                    🔊 Replay
                  </button>
                )}
              </div>
            )}

            {/* Live transcript preview */}
            {liveText && (
              <div
                className="w-full rounded-2xl px-4 py-3 mb-2"
                style={{ background: 'rgba(255,107,53,0.07)', border: '1px solid rgba(255,107,53,0.2)' }}
              >
                <div className="text-xs mb-1 font-semibold" style={{ color: '#FF6B35' }}>You're saying…</div>
                <p className="text-white text-sm italic leading-relaxed">{liveText}</p>
              </div>
            )}
          </div>

          {/* Mic button */}
          <div className="flex flex-col items-center gap-4 w-full">
            <button
              onClick={listening ? stopAndSend : startListening}
              disabled={aiThinking || vakSpeaking}
              className="relative flex items-center justify-center rounded-full transition-all active:scale-95"
              style={{
                width: 80, height: 80,
                background: listening
                  ? 'linear-gradient(135deg, #FF6B35, #FF4500)'
                  : 'linear-gradient(135deg, #0F1E35, #1A2F4A)',
                border: listening
                  ? '3px solid rgba(255,107,53,0.6)'
                  : '2px solid rgba(255,255,255,0.15)',
                boxShadow: listening ? '0 0 30px rgba(255,107,53,0.5)' : 'none',
                opacity: (aiThinking || vakSpeaking) ? 0.4 : 1,
              }}
            >
              <span style={{ fontSize: 32 }}>{listening ? '⏹' : '🎤'}</span>
            </button>
            <p className="text-xs text-center" style={{ color: '#6B8CAE' }}>
              {listening
                ? 'Tap to stop & send — or just pause for 2 seconds'
                : 'Tap to speak • Vak hears you in Indian English'}
            </p>

            {/* TTS toggle */}
            <button
              onClick={() => { setTtsOn(v => !v); window.speechSynthesis?.cancel(); setVakSpeaking(false) }}
              className="text-xs px-4 py-2 rounded-full transition-all"
              style={{
                background: ttsOn ? 'rgba(0,196,154,0.1)' : 'rgba(255,255,255,0.05)',
                color: ttsOn ? '#00C49A' : '#6B8CAE',
                border: `1px solid ${ttsOn ? 'rgba(0,196,154,0.25)' : 'rgba(255,255,255,0.08)'}`,
              }}
            >
              {ttsOn ? '🔊 Vak voice on' : '🔇 Vak voice off'}
            </button>
          </div>

          <div className="h-2" />
        </div>

      ) : (
        /* ── TEXT MODE ─────────────────────────────────────────────────────── */
        <>
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 max-w-3xl mx-auto w-full">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                {msg.role === 'ai' && (
                  <div className="w-7 h-7 mr-2 mt-1 shrink-0 flex items-center justify-center rounded-full text-sm"
                    style={{ background: 'rgba(139,92,246,0.2)' }}>
                    🦢
                  </div>
                )}
                <div
                  className="max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed"
                  style={msg.role === 'ai'
                    ? { background: 'rgba(255,255,255,0.06)', color: '#E2E8F0', borderRadius: '4px 18px 18px 18px' }
                    : { background: '#FF6B35', color: 'white', borderRadius: '18px 4px 18px 18px' }
                  }
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {aiThinking && (
              <div className="flex justify-start animate-fade-in">
                <div className="w-7 h-7 mr-2 mt-1 shrink-0 flex items-center justify-center rounded-full text-sm"
                  style={{ background: 'rgba(139,92,246,0.2)' }}>🦢</div>
                <div className="px-4 py-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div className="flex gap-1.5 items-center h-5">
                    {[0,1,2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                        style={{ background: '#6B8CAE', animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="px-4 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)', background: 'rgba(9,21,40,0.9)' }}>
            <div className="max-w-3xl mx-auto flex gap-3">
              <textarea
                ref={textRef}
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitMessage(textInput.trim()) } }}
                placeholder="Type your response… (Enter to send)"
                className="input flex-1 resize-none"
                style={{ height: 48, paddingTop: 12 }}
                rows={1}
              />
              <button
                onClick={() => submitMessage(textInput.trim())}
                disabled={!textInput.trim() || aiThinking}
                className="btn-primary px-5 h-12 flex items-center text-sm"
              >
                Send
              </button>
            </div>
            <p className="text-xs text-center mt-2" style={{ color: '#6B8CAE' }}>
              Type <strong>end session</strong> or click "End →" when finished
            </p>
          </div>
        </>
      )}
    </div>
  )
}
