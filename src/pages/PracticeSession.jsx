import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth }     from '../hooks/useAuth'
import { useProgress } from '../hooks/useProgress'
import { supabase }    from '../lib/supabase'
import { sendPracticeMessage, analyzeSession, analyzeSessionFromAudio, LANGUAGES } from '../lib/gemini'
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

// Convert ArrayBuffer → base64 safely (avoids call-stack overflow on large buffers)
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary  = ''
  const chunk = 8192
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

// Pick the best supported audio MIME type for MediaRecorder
function pickMime() {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
  ]
  return types.find(t => MediaRecorder.isTypeSupported(t)) || 'audio/webm'
}
function scoreColor(s) {
  if (s >= 80) return '#00C49A'
  if (s >= 60) return '#FF6B35'
  return '#F87171'
}
function wpmLabel(wpm) {
  if (!wpm) return null
  if (wpm < 100) return { text: `${wpm} WPM · too slow`, color: '#F87171' }
  if (wpm > 180) return { text: `${wpm} WPM · too fast`, color: '#F59E0B' }
  return { text: `${wpm} WPM · good pace`, color: '#00C49A' }
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
  const [setupDone,  setSetupDone]  = useState(false)  // gates beginSession()

  // ── Voice state ───────────────────────────────────────────────────────────
  const [voiceMode,   setVoiceMode]   = useState(VOICE_SUPPORTED)
  const [listening,   setListening]   = useState(false)
  const [liveText,    setLiveText]    = useState('')   // shown while recording
  const [ttsOn,       setTtsOn]       = useState(true)
  const [vakSpeaking, setVakSpeaking] = useState(false)

  // ── ESL mode state ────────────────────────────────────────────────────────
  const [eslMode, setEslMode] = useState(() => {
    try { return localStorage.getItem('san4_esl_mode') === 'true' } catch { return false }
  })

  function toggleEsl() {
    setEslMode(v => {
      const next = !v
      try { localStorage.setItem('san4_esl_mode', String(next)) } catch {}
      return next
    })
  }

  // ── Language state ─────────────────────────────────────────────────────────
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem('san4_lang') || 'en-US' } catch { return 'en-US' }
  })
  const langRef = useRef(lang)

  useEffect(() => {
    langRef.current = lang
    try { localStorage.setItem('san4_lang', lang) } catch {}
    // Auto-enable ESL for any Indian language — Vak won't penalise
    // code-switching, Indian English structure, or mixed responses
    if (lang !== 'en-US') {
      setEslMode(true)
      try { localStorage.setItem('san4_esl_mode', 'true') } catch {}
    }
  }, [lang])

  // ── Text mode state ───────────────────────────────────────────────────────
  const [textInput, setTextInput] = useState('')

  // ── Voice refs ────────────────────────────────────────────────────────────
  const recRef          = useRef(null)
  const isListeningRef  = useRef(false)
  const accRef          = useRef('')          // accumulated final transcript
  const autoSendTimer   = useRef(null)
  const speechStart     = useRef(null)
  const voiceMetaRef    = useRef({ wpmSamples: [], totalSpeakingSeconds: 0 })

  // ── MediaRecorder — records full session audio as Gemini analysis backup ──
  const mediaRecRef    = useRef(null)
  const audioChunksRef = useRef([])
  const audioStreamRef = useRef(null)
  const audioMimeRef   = useRef('audio/webm')

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

  // ── Start session — fires once when user clicks "Start" on the setup screen
  useEffect(() => { if (setupDone) beginSession() }, [setupDone]) // eslint-disable-line

  async function beginSession() {
    setStarted(true)

    // ── Start MediaRecorder silently — this is the assessment backup ─────────
    // Even if Web Speech API fails to transcribe, we always have the raw audio
    // and Gemini can analyse it directly at the end of the session.
    try {
      const stream  = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      audioStreamRef.current = stream
      const mime    = pickMime()
      audioMimeRef.current = mime
      const rec = new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 32000 })
      rec.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      rec.start(1000)  // collect in 1-second chunks
      mediaRecRef.current = rec
    } catch (err) {
      console.warn('MediaRecorder unavailable, will rely on STT only:', err.message)
    }

    setAiThinking(true)
    try {
      const opening = await sendPracticeMessage(scenario.id, [], 'Start the session now.', { eslMode })
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
    rec.lang             = 'en-US'  // en-US is universally supported; handles Indian accents well
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

    // Apply the currently selected language before (re-)starting
    recRef.current.lang = langRef.current

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
      const response = await sendPracticeMessage(scenario.id, messages, text, { eslMode })

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

    // ── Stop MediaRecorder and collect audio ──────────────────────────────
    let audioPayload = null
    if (mediaRecRef.current && mediaRecRef.current.state !== 'inactive') {
      await new Promise(resolve => {
        mediaRecRef.current.onstop = resolve
        mediaRecRef.current.stop()
      })
    }
    audioStreamRef.current?.getTracks().forEach(t => t.stop())
    if (audioChunksRef.current.length > 0) {
      try {
        const blob   = new Blob(audioChunksRef.current, { type: audioMimeRef.current })
        const buffer = await blob.arrayBuffer()
        audioPayload = {
          base64:   arrayBufferToBase64(buffer),
          mimeType: audioMimeRef.current.split(';')[0],  // strip codec suffix for Gemini
        }
      } catch (err) {
        console.warn('Audio encoding failed:', err.message)
      }
    }

    // Build voice metadata for analysis
    const wpmSamples = voiceMetaRef.current.wpmSamples
    const voiceMeta  = wpmSamples.length
      ? {
          avgWpm:               Math.round(wpmSamples.reduce((a, b) => a + b, 0) / wpmSamples.length),
          totalSpeakingSeconds: Math.round(voiceMetaRef.current.totalSpeakingSeconds),
        }
      : null

    // ── Choose analysis path ──────────────────────────────────────────────
    // If STT didn't capture any user messages AND we have audio, use Gemini
    // audio analysis (it transcribes + coaches in one shot). Otherwise fall
    // back to the transcript-based path.
    const hasUserMessages = msgList.some(m => m.role === 'user')

    try {
      let analysis = null

      if (!hasUserMessages && audioPayload) {
        // Primary path: audio-first analysis — STT didn't work but we have the recording
        analysis = await analyzeSessionFromAudio(
          scenario.title, audioPayload.base64, audioPayload.mimeType, lang
        )
      }

      if (!analysis) {
        // Transcript-based path (STT worked, or audio analysis also failed)
        analysis = await analyzeSession(scenario.title, msgList, voiceMeta, { eslMode })
      }

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

  // ── SETUP SCREEN ──────────────────────────────────────────────────────────
  if (!setupDone) return (
    <div className="min-h-screen flex flex-col" style={{ background: '#050810' }}>
      <Navbar />
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-lg mx-auto w-full animate-fade-in">

        {/* Scenario card */}
        <div
          className="w-full rounded-3xl p-6 mb-6 text-center"
          style={{ background: 'linear-gradient(160deg, #10192E 0%, #0B1220 100%)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="text-5xl mb-3">{scenario.icon || '🎭'}</div>
          <h1 className="text-xl font-black text-white mb-1">{scenario.title}</h1>
          <p className="text-sm" style={{ color: '#6B8CAE' }}>
            Vak plays the other person. Speak naturally. Your voice is recorded and analysed.
          </p>
        </div>

        {/* Language picker */}
        <div className="w-full mb-5">
          <div className="text-xs font-bold mb-2 uppercase tracking-widest" style={{ color: '#6B8CAE' }}>
            🌐 I'll be speaking in
          </div>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map(l => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                className="text-xs px-3 py-2 rounded-full transition-all font-semibold"
                style={{
                  background: lang === l.code ? 'rgba(0,196,154,0.18)'  : 'rgba(255,255,255,0.05)',
                  color:      lang === l.code ? '#00C49A'                : '#6B8CAE',
                  border:     `1px solid ${lang === l.code ? 'rgba(0,196,154,0.45)' : 'rgba(255,255,255,0.1)'}`,
                }}
              >
                {l.flag} {l.nativeName}
              </button>
            ))}
          </div>
          {lang !== 'en-US' && (
            <p className="text-xs mt-2 px-3 py-2 rounded-xl"
              style={{ background: 'rgba(245,158,11,0.08)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.2)' }}>
              🇮🇳 ESL mode on. Vak won't penalise Indian English or code-switching.
            </p>
          )}
        </div>

        {/* ESL toggle */}
        <div
          className="w-full mb-5 flex items-center justify-between p-4 rounded-2xl"
          style={{ background: 'linear-gradient(160deg, #10192E 0%, #0B1220 100%)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div>
            <div className="text-white font-semibold text-sm">ESL / Indian English mode</div>
            <div className="text-xs mt-0.5" style={{ color: '#6B8CAE' }}>
              Adapts feedback for non-native speakers, no grammar penalties
            </div>
          </div>
          <button
            onClick={toggleEsl}
            className="px-3 py-1.5 rounded-full text-xs font-bold transition-all ml-4 shrink-0"
            style={{
              background: eslMode ? 'rgba(0,196,154,0.15)' : 'rgba(255,255,255,0.07)',
              color:      eslMode ? '#00C49A'               : '#6B8CAE',
              border:     `1px solid ${eslMode ? 'rgba(0,196,154,0.35)' : 'rgba(255,255,255,0.1)'}`,
            }}
          >
            {eslMode ? '✓ On' : 'Off'}
          </button>
        </div>

        {/* Quick tips */}
        <div className="w-full mb-6 space-y-2">
          {[
            { icon: '🎤', text: 'Tap the mic to speak. Vak listens and responds' },
            { icon: '🔴', text: 'Your audio is always recorded, even if text doesn\'t appear' },
            { icon: '🏁', text: 'Say "end session" or tap End → when you\'re done' },
          ].map(({ icon, text }) => (
            <div
              key={text}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm"
              style={{ color: '#6B8CAE', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              <span>{icon}</span>
              <span>{text}</span>
            </div>
          ))}
        </div>

        <button onClick={() => setSetupDone(true)} className="btn-play w-full">
          <span className="text-xl">🎮</span>
          <span>Start Session</span>
          <span style={{ opacity: 0.7, fontSize: '0.85rem' }}>→</span>
        </button>

      </main>
    </div>
  )

  if (analyzing) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#050810' }}>
      <div className="text-center animate-fade-in">
        <div className="flex justify-center mb-4 animate-float">
          <VakMascot level={3} size={100} />
        </div>
        <h2 className="text-white font-bold text-xl mb-2">Vak is reviewing your session…</h2>
        <p className="text-sm" style={{ color: '#6B8CAE' }}>Checking filler words, pacing, confidence. Building your report.</p>
        <div className="flex gap-2 justify-center mt-5">
          {[0,1,2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full animate-bounce"
              style={{ background: '#7B5EA7', animationDelay: `${i * 0.18}s` }} />
          ))}
        </div>
      </div>
    </div>
  )

  if (report) return (
    <div className="min-h-screen" style={{ background: '#050810' }}>
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
              ? '🎉 No filler words detected. Excellent!'
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

        {/* What Vak heard — transcript from audio analysis */}
        {report.transcript && (
          <div className="card mb-4" style={{ background: 'rgba(0,196,154,0.05)', border: '1px solid rgba(0,196,154,0.2)' }}>
            <div className="flex gap-3 items-start">
              <span className="text-xl shrink-0">📝</span>
              <div className="flex-1">
                <h3 className="text-white font-semibold text-sm mb-2">What Vak heard</h3>
                <p className="text-sm leading-relaxed italic" style={{ color: '#94A3B8' }}>
                  "{report.transcript}"
                </p>
                <p className="text-xs mt-2" style={{ color: '#6B8CAE' }}>
                  This is Gemini's transcription of your audio, used to generate the feedback above.
                </p>
              </div>
            </div>
          </div>
        )}

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
            <h3 className="font-semibold text-sm mb-3" style={{ color: '#7B5EA7' }}>↑ Work on this</h3>
            <ul className="space-y-2">
              {report.improvements?.map((s, i) => (
                <li key={i} className="text-sm flex gap-2" style={{ color: '#94A3B8' }}>
                  <span style={{ color: '#7B5EA7' }}>•</span> {s}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Action item */}
        <div className="card mb-8"
          style={{ background: 'rgba(123,94,167,0.07)', border: '1px solid rgba(123,94,167,0.25)' }}>
          <div className="flex gap-3 items-start">
            <span className="text-2xl">🎯</span>
            <div>
              <h3 className="font-semibold text-sm mb-1" style={{ color: '#7B5EA7' }}>Your action item</h3>
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
    <div className="min-h-screen flex flex-col" style={{ background: '#050810' }}>
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
          {/* Language selector */}
          <select
            value={lang}
            onChange={e => setLang(e.target.value)}
            title="Choose your speaking language"
            className="text-xs px-2 py-1.5 rounded-full transition-all cursor-pointer"
            style={{
              background: lang !== 'en-US' ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.07)',
              color:      lang !== 'en-US' ? '#F59E0B' : '#6B8CAE',
              border:     `1px solid ${lang !== 'en-US' ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.1)'}`,
              WebkitAppearance: 'none',
              appearance: 'none',
            }}
          >
            {LANGUAGES.map(l => (
              <option key={l.code} value={l.code} style={{ background: '#0F1E35', color: '#E2E8F0' }}>
                {l.flag} {l.nativeName}
              </option>
            ))}
          </select>

          {/* ESL mode toggle */}
          <button
            onClick={toggleEsl}
            className="text-xs px-3 py-1.5 rounded-full transition-all"
            style={{
              background: eslMode ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.07)',
              color: eslMode ? '#F59E0B' : '#6B8CAE',
              border: `1px solid ${eslMode ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.1)'}`,
            }}
            title="ESL / Indian English mode, Vak adapts feedback for non-native speakers"
          >
            {eslMode ? '🇮🇳 ESL on' : '🌐 ESL'}
          </button>

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
                      : 'rgba(123,94,167,0.15)',
                    border: `2px solid ${vakSpeaking ? 'rgba(139,92,246,0.3)' : 'rgba(123,94,167,0.3)'}`,
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
                    ? 'radial-gradient(circle, rgba(123,94,167,0.15) 0%, transparent 70%)'
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
                  ? 'rgba(123,94,167,0.15)'
                  : aiThinking
                  ? 'rgba(245,158,11,0.15)'
                  : 'rgba(255,255,255,0.07)',
                color: vakSpeaking ? '#A78BFA' : listening ? '#7B5EA7' : aiThinking ? '#F59E0B' : '#6B8CAE',
                border: `1px solid ${vakSpeaking ? 'rgba(139,92,246,0.3)' : listening ? 'rgba(123,94,167,0.3)' : aiThinking ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.1)'}`,
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
                style={{ background: 'linear-gradient(160deg, #10192E 0%, #0B1220 100%)', border: '1px solid rgba(255,255,255,0.08)' }}
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

            {/* Live transcript — always visible so user knows voice is being captured */}
            <div
              className="w-full rounded-2xl px-4 py-3 mb-2 min-h-[60px] transition-all"
              style={{
                background: liveText ? 'rgba(123,94,167,0.08)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${liveText ? 'rgba(123,94,167,0.3)' : 'rgba(255,255,255,0.06)'}`,
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold" style={{ color: '#7B5EA7' }}>
                  🎤 What Vak hears
                </span>
                {mediaRecRef.current && (
                  <span className="flex items-center gap-1 text-xs" style={{ color: '#00C49A' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block animate-pulse" />
                    Recording
                  </span>
                )}
              </div>
              {liveText ? (
                <p className="text-white text-sm italic leading-relaxed">{liveText}</p>
              ) : (
                <p className="text-sm italic" style={{ color: 'rgba(107,140,174,0.6)' }}>
                  {listening
                    ? 'Speak now, your words will appear here'
                    : 'Tap the mic below and start speaking'}
                </p>
              )}
            </div>
          </div>

          {/* Mic button + text fallback */}
          <div className="flex flex-col items-center gap-3 w-full">
            <button
              onClick={listening ? stopAndSend : startListening}
              disabled={aiThinking || vakSpeaking}
              className="relative flex items-center justify-center rounded-full transition-all active:scale-95"
              style={{
                width: 80, height: 80,
                background: listening
                  ? 'linear-gradient(135deg, #7B5EA7, #FF4500)'
                  : 'linear-gradient(135deg, #0F1E35, #1A2F4A)',
                border: listening
                  ? '3px solid rgba(123,94,167,0.6)'
                  : '2px solid rgba(255,255,255,0.15)',
                boxShadow: listening ? '0 0 30px rgba(123,94,167,0.5)' : 'none',
                opacity: (aiThinking || vakSpeaking) ? 0.4 : 1,
              }}
            >
              <span style={{ fontSize: 32 }}>{listening ? '⏹' : '🎤'}</span>
            </button>
            <p className="text-xs text-center" style={{ color: '#6B8CAE' }}>
              {listening
                ? 'Tap to stop & send, or pause for 2 seconds to auto-send'
                : 'Tap to speak · your voice is always recorded for analysis'}
            </p>

            {/* Text fallback — always visible so user can type if mic doesn't transcribe */}
            <div className="w-full flex gap-2 items-center">
              <input
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && textInput.trim()) {
                    if (listening) { isListeningRef.current = false; try { recRef.current?.stop() } catch (_) {} }
                    submitMessage(textInput.trim())
                  }
                }}
                placeholder="Or type your response here…"
                className="input flex-1 text-sm"
                style={{ height: 40, paddingTop: 0, paddingBottom: 0 }}
                disabled={aiThinking}
              />
              <button
                onClick={() => { submitMessage(textInput.trim()) }}
                disabled={!textInput.trim() || aiThinking}
                className="btn-primary text-sm px-4"
                style={{ height: 40 }}
              >
                Send
              </button>
            </div>

            {/* TTS toggle */}
            <button
              onClick={() => { setTtsOn(v => !v); window.speechSynthesis?.cancel(); setVakSpeaking(false) }}
              className="text-xs px-4 py-1.5 rounded-full transition-all"
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
                    : { background: '#7B5EA7', color: 'white', borderRadius: '18px 4px 18px 18px' }
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
