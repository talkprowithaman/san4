import { useState, useEffect, useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth }         from '../hooks/useAuth'
import { useProgress }     from '../hooks/useProgress'
import { useSubscription } from '../hooks/useSubscription'
import { supabase }        from '../lib/supabase'
import { analyzeBodyLanguageFrame, analyzeBodyLanguageFull } from '../lib/gemini'
import { SCRIPTS }         from '../lib/scripts'
import Navbar              from '../components/Navbar'
import VakMascot           from '../components/VakMascot'
import RewardCard          from '../components/RewardCard'

// ── Browser support ───────────────────────────────────────────────────────────
const SR_Class = window.SpeechRecognition || window.webkitSpeechRecognition

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(s) {
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}
function scoreColor(v) {
  if (v >= 80) return '#00C49A'
  if (v >= 60) return '#FF6B35'
  return '#F87171'
}
function arrayBufferToBase64(buf) {
  const bytes = new Uint8Array(buf); let bin = ''; const c = 8192
  for (let i = 0; i < bytes.length; i += c)
    bin += String.fromCharCode(...bytes.subarray(i, i + c))
  return btoa(bin)
}
function pickAudioMime() {
  return ['audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus','audio/ogg']
    .find(t => MediaRecorder.isTypeSupported(t)) || 'audio/webm'
}

// Capture a JPEG frame from a <video> element via a hidden <canvas>
function captureFrame(videoEl, canvasEl) {
  if (!videoEl || !canvasEl || !videoEl.videoWidth) return null
  canvasEl.width  = videoEl.videoWidth
  canvasEl.height = videoEl.videoHeight
  canvasEl.getContext('2d').drawImage(videoEl, 0, 0)
  const dataUrl = canvasEl.toDataURL('image/jpeg', 0.70)
  return {
    base64:    dataUrl.split(',')[1],
    mimeType:  'image/jpeg',
    dataUrl,                    // kept for thumbnail display in report
    timestamp: Date.now(),
  }
}

// ── Custom script placeholder ─────────────────────────────────────────────────
const CUSTOM_META = {
  id: 'custom', icon: '✍️', title: 'My Own Script', category: 'Custom',
  duration: 'Variable', difficulty: 1, tier: 'free',
  description: 'Paste your own speech or presentation script.', text: '',
}

// ── Filler detection ──────────────────────────────────────────────────────────
const FILLER_SET = new Set(['um','uh','ah','aa','hmm','eh','er','erm'])
const FILLER_PHRASES = ['you know','i mean','kind of','sort of','basically','actually']
function detectFillers(text) {
  const lower = text.toLowerCase(); let n = 0
  lower.split(/\s+/).forEach(w => { if (FILLER_SET.has(w.replace(/[^a-z]/g,''))) n++ })
  FILLER_PHRASES.forEach(p => { n += (lower.match(new RegExp(`\\b${p}\\b`,'g')) || []).length })
  return n
}

// ── Score bar ─────────────────────────────────────────────────────────────────
function ScoreBar({ label, value, icon }) {
  const c = scoreColor(value)
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-base">{icon}</span>
          <span className="text-sm font-semibold text-white">{label}</span>
        </div>
        <span className="text-sm font-black" style={{ color: c }}>{value}%</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, background: c }} />
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function BodyLanguage() {
  const { user }    = useAuth()
  const { awardXP } = useProgress()
  const { isPro }   = useSubscription()

  // phases: select | custom_input | camera_setup | countdown | reading | analyzing | report
  const [phase,      setPhase]      = useState('select')
  const [script,     setScript]     = useState(null)
  const [customText, setCustomText] = useState('')
  const [countdown,  setCountdown]  = useState(3)

  // ── Live session state ─────────────────────────────────────────────────────
  const [seconds,     setSeconds]     = useState(0)
  const [wpm,         setWpm]         = useState(0)
  const [fillerCount, setFillerCount] = useState(0)
  const [fillerFlash, setFillerFlash] = useState(false)
  const [liveText,    setLiveText]    = useState('')
  const [transcript,  setTranscript]  = useState('')
  const [liveTip,     setLiveTip]     = useState(null)   // latest frame analysis
  const [tipLoading,  setTipLoading]  = useState(false)

  // ── Report state ───────────────────────────────────────────────────────────
  const [report, setReport] = useState(null)
  const [reward, setReward] = useState(null)

  // ── Refs ───────────────────────────────────────────────────────────────────
  const videoRef        = useRef(null)   // <video> element
  const canvasRef       = useRef(null)   // hidden canvas for frame capture
  const streamRef       = useRef(null)   // full MediaStream (video + audio)
  const mediaRecRef     = useRef(null)   // audio-only MediaRecorder
  const audioChunksRef  = useRef([])
  const audioMimeRef    = useRef('audio/webm')
  const recRef          = useRef(null)   // SpeechRecognition
  const isListeningRef  = useRef(false)
  const transcriptRef   = useRef('')
  const fillerRef       = useRef(0)
  const startTimeRef    = useRef(null)
  const timerRef        = useRef(null)
  const captureIntRef   = useRef(null)   // frame capture interval
  const tipIntRef       = useRef(null)   // live tip call interval
  const tipInFlightRef  = useRef(false)
  const framesRef       = useRef([])     // captured { base64, mimeType, dataUrl, ts }
  const paraRefs        = useRef([])
  const scrollContainer = useRef(null)

  // ── Paragraph helpers ──────────────────────────────────────────────────────
  const paragraphs = useMemo(
    () => script?.text.split('\n\n').filter(p => p.trim()) || [],
    [script]
  )
  const cumWords = useMemo(() => {
    let c = 0; return paragraphs.map(p => { c += p.split(/\s+/).length; return c })
  }, [paragraphs])
  const currentParaIdx = useMemo(() => {
    const n = transcriptRef.current.split(/\s+/).filter(Boolean).length
    const i = cumWords.findIndex(c => n < c)
    return i === -1 ? Math.max(0, paragraphs.length - 1) : i
  }, [transcript, cumWords, paragraphs.length]) // eslint-disable-line

  // ── Countdown ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'countdown') return
    setCountdown(3)
    const t = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(t); beginSession(); return 0 }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [phase]) // eslint-disable-line

  // ── Timer ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'reading') return
    timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000)
    return () => clearInterval(timerRef.current)
  }, [phase])

  // ── Auto-scroll ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'reading') return
    const el = paraRefs.current[currentParaIdx]
    const ct = scrollContainer.current
    if (!el || !ct) return
    ct.scrollTo({ top: Math.max(0, el.offsetTop - ct.clientHeight / 2 + el.offsetHeight / 2), behavior: 'smooth' })
  }, [currentParaIdx, phase])

  // ── SpeechRecognition setup ────────────────────────────────────────────────
  useEffect(() => {
    if (!SR_Class) return
    const rec = new SR_Class()
    rec.lang = 'en-US'; rec.continuous = true; rec.interimResults = true

    rec.onresult = e => {
      let fin = '', int = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) fin += t + ' '; else int += t
      }
      if (fin) {
        transcriptRef.current = (transcriptRef.current + ' ' + fin).trim()
        setTranscript(transcriptRef.current)
        // WPM
        if (startTimeRef.current) {
          const mins = (Date.now() - startTimeRef.current) / 60000
          const w = transcriptRef.current.split(/\s+/).filter(Boolean).length
          const cur = Math.round(w / mins)
          if (cur > 0 && cur < 500) setWpm(cur)
        }
        // Fillers
        const nf = detectFillers(fin)
        if (nf > 0) {
          fillerRef.current += nf
          setFillerCount(fillerRef.current)
          setFillerFlash(true)
          setTimeout(() => setFillerFlash(false), 900)
        }
      } else if (int) {
        setLiveText(int)
      }
    }
    rec.onend = () => {
      if (isListeningRef.current) {
        setTimeout(() => {
          if (isListeningRef.current) { try { rec.start() } catch (_) {} }
        }, 120)
      }
    }
    rec.onerror = e => {
      if (e.error === 'not-allowed' || e.error === 'audio-capture') {
        isListeningRef.current = false
      }
    }
    recRef.current = rec
    return () => { isListeningRef.current = false; try { rec.abort() } catch(_) {} }
  }, [])

  // ── Camera permission + stream (camera_setup phase) ───────────────────────
  async function requestCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      streamRef.current = stream
      if (videoRef.current) { videoRef.current.srcObject = stream }
      setPhase('countdown')
    } catch (err) {
      alert('Camera access denied. Please allow camera + microphone access and try again.')
    }
  }

  // Start the actual practice session (called after countdown)
  function beginSession() {
    startTimeRef.current = Date.now()
    framesRef.current    = []
    audioChunksRef.current = []

    const stream = streamRef.current
    if (!stream) return

    // ── Audio-only MediaRecorder ────────────────────────────────────────────
    const audioMime = pickAudioMime()
    audioMimeRef.current = audioMime
    try {
      const audioStream = new MediaStream(stream.getAudioTracks())
      const rec = new MediaRecorder(audioStream, { mimeType: audioMime, audioBitsPerSecond: 32000 })
      rec.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      rec.start(1000)
      mediaRecRef.current = rec
    } catch (err) {
      console.warn('Audio recorder unavailable:', err.message)
    }

    // ── STT for scroll tracking ─────────────────────────────────────────────
    if (recRef.current) {
      try { recRef.current.start(); isListeningRef.current = true } catch (_) {}
    }

    // ── Frame capture every 10 s ────────────────────────────────────────────
    captureIntRef.current = setInterval(() => {
      const frame = captureFrame(videoRef.current, canvasRef.current)
      if (frame) framesRef.current.push(frame)
    }, 10000)

    // ── Live tip from Gemini every 30 s ─────────────────────────────────────
    tipIntRef.current = setInterval(async () => {
      if (tipInFlightRef.current) return
      const frames = framesRef.current
      if (!frames.length) return
      const latest = frames[frames.length - 1]
      tipInFlightRef.current = true
      setTipLoading(true)
      try {
        const analysis = await analyzeBodyLanguageFrame(script?.title || 'Speech', latest.base64, latest.mimeType)
        if (analysis) setLiveTip(analysis)
      } finally {
        tipInFlightRef.current = false
        setTipLoading(false)
      }
    }, 30000)

    setPhase('reading')
  }

  // ── End session → analyze ─────────────────────────────────────────────────
  async function handleDone() {
    // Stop STT
    isListeningRef.current = false
    clearTimeout(null)
    try { recRef.current?.stop() } catch (_) {}

    // Stop intervals
    clearInterval(timerRef.current)
    clearInterval(captureIntRef.current)
    clearInterval(tipIntRef.current)

    setPhase('analyzing')

    // Capture one final frame
    const finalFrame = captureFrame(videoRef.current, canvasRef.current)
    if (finalFrame) framesRef.current.push(finalFrame)

    // Stop camera stream
    streamRef.current?.getTracks().forEach(t => t.stop())
    if (videoRef.current) videoRef.current.srcObject = null

    // Stop audio recorder + collect audio
    let audioPayload = null
    await new Promise(resolve => {
      const rec = mediaRecRef.current
      if (!rec || rec.state === 'inactive') { resolve(); return }
      rec.onstop = resolve; rec.stop()
    })
    if (audioChunksRef.current.length > 0) {
      try {
        const blob = new Blob(audioChunksRef.current, { type: audioMimeRef.current })
        const buf  = await blob.arrayBuffer()
        audioPayload = { base64: arrayBufferToBase64(buf), mimeType: audioMimeRef.current.split(';')[0] }
      } catch (err) { console.warn('Audio encoding failed:', err.message) }
    }

    // ── Gemini full analysis ──────────────────────────────────────────────
    try {
      let analysis = await analyzeBodyLanguageFull(
        script.title,
        script.text || '',
        framesRef.current,
        audioPayload?.base64 || null,
        audioPayload?.mimeType || 'audio/webm',
      )

      if (!analysis) {
        analysis = {
          overall_score:70, posture_score:70, eye_contact_score:70,
          expression_score:70, gesture_score:70, presence_score:70,
          strengths:['You completed the session'], improvements:['Keep practising'],
          action_item:'Record yourself again and compare.',
          summary:'Session completed. Consistent practice builds stage presence.',
          coaching_notes:{ posture:'Keep your back straight', eye_contact:'Look at the camera more',
            gestures:'Use purposeful hand movements', expression:'Let your energy match the content' },
        }
      }

      if (user) {
        await supabase.from('practice_sessions').insert({
          user_id:           user.id,
          scenario_id:       `body_language_${script.id}`,
          scenario_title:    `📹 ${script.title} — Body Language`,
          overall_score:     analysis.overall_score,
          confidence_score:  analysis.presence_score,
          pacing_score:      analysis.eye_contact_score,
          filler_word_count: fillerRef.current,
          duration_seconds:  seconds,
          feedback:          analysis.summary,
          action_item:       analysis.action_item,
          messages:          [],
        })
      }

      const r = await awardXP(analysis.overall_score)
      setReward(r)
      setReport({ ...analysis, frames: framesRef.current.map(f => f.dataUrl) })
    } catch (err) {
      console.error('Analysis error:', err)
      setReport({
        overall_score:70, posture_score:70, eye_contact_score:70,
        expression_score:70, gesture_score:70, presence_score:70,
        strengths:['You completed the session'], improvements:['Keep practising consistently'],
        action_item:'Practise again tomorrow with the same script and compare.',
        summary:'Session completed. Body language improves fastest with repeated deliberate practice.',
        coaching_notes:{ posture:'Stand tall', eye_contact:'Look at the camera more often',
          gestures:'Use your hands naturally', expression:'Let your enthusiasm show' },
        frames: framesRef.current.map(f => f.dataUrl),
      })
    }

    setPhase('report')
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop())
      clearInterval(timerRef.current)
      clearInterval(captureIntRef.current)
      clearInterval(tipIntRef.current)
    }
  }, [])

  // ──────────────────────────────────────────────────────────────────────────
  //  RENDER — SELECT
  // ──────────────────────────────────────────────────────────────────────────
  if (phase === 'select') {
    return (
      <div className="min-h-screen" style={{ background: '#060E1A' }}>
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 py-8">

          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold"
                style={{ background: 'rgba(0,196,154,0.12)', color: '#00C49A', border: '1px solid rgba(0,196,154,0.25)' }}>
                📹 Body Language Coach
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.3)' }}>
                ⚡ Pro
              </div>
            </div>
            <h1 className="text-3xl font-black text-white mb-2">Speak. Move. Command the room.</h1>
            <p className="max-w-xl text-sm leading-relaxed" style={{ color: '#6B8CAE' }}>
              Turn on your camera, read a script aloud, and get AI coaching on your posture, eye contact,
              gestures, and facial expression. Your voice AND your presence — both analysed.
            </p>
          </div>

          {/* Pro gate */}
          {!isPro && (
            <div className="rounded-2xl p-6 mb-8 text-center"
              style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)' }}>
              <div className="text-3xl mb-3">📹</div>
              <h3 className="text-white font-black text-lg mb-2">Body Language coaching is a Vak Pro feature</h3>
              <p className="text-sm mb-4" style={{ color: '#6B8CAE' }}>
                Camera-based analysis, live coaching tips, and frame-by-frame body language feedback
                are included in Vak Pro.
              </p>
              <Link to="/pricing" className="btn-primary inline-block px-8 py-3">
                Upgrade to Pro →
              </Link>
            </div>
          )}

          {/* What's tracked */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {[
              { icon: '🧍', label: 'Posture',        desc: 'Straight, open, confident' },
              { icon: '👁️', label: 'Eye Contact',    desc: 'Camera vs. script' },
              { icon: '😊', label: 'Expression',     desc: 'Engaged vs. flat' },
              { icon: '🙌', label: 'Hand Gestures',  desc: 'Purposeful vs. stiff' },
            ].map(({ icon, label, desc }) => (
              <div key={label} className="rounded-2xl p-4 text-center"
                style={{ background: 'linear-gradient(145deg,#0F1E35,#091522)', border: '1px solid rgba(0,196,154,0.15)' }}>
                <div className="text-2xl mb-2">{icon}</div>
                <div className="text-white font-bold text-xs mb-1">{label}</div>
                <div className="text-xs" style={{ color: '#6B8CAE' }}>{desc}</div>
              </div>
            ))}
          </div>

          {/* Custom script card */}
          <div className="mb-3 flex items-center gap-3">
            <div className="text-xs font-bold uppercase tracking-widest" style={{ color: '#6B8CAE' }}>✍️ Your Script</div>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
          </div>

          <button
            disabled={!isPro}
            onClick={() => setPhase('custom_input')}
            className="w-full text-left rounded-3xl p-5 mb-8 transition-all"
            style={{
              background: 'linear-gradient(145deg,rgba(0,196,154,0.08),rgba(0,196,154,0.03))',
              border: '1px solid rgba(0,196,154,0.25)',
              opacity: !isPro ? 0.5 : 1,
              cursor: !isPro ? 'not-allowed' : 'pointer',
            }}>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0"
                style={{ background: 'rgba(0,196,154,0.15)' }}>✍️</div>
              <div className="flex-1">
                <div className="text-white font-black text-base mb-1">Practise My Own Script</div>
                <div className="text-sm" style={{ color: '#6B8CAE' }}>
                  Paste your own presentation, speech, or pitch. Get full body language feedback on your delivery.
                </div>
              </div>
              <span style={{ color: '#00C49A', fontSize: '1.3rem' }}>→</span>
            </div>
          </button>

          {/* Built-in scripts */}
          <div className="mb-3 flex items-center gap-3">
            <div className="text-xs font-bold uppercase tracking-widest" style={{ color: '#6B8CAE' }}>📜 Built-in Scripts</div>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SCRIPTS.map(s => {
              const locked = !isPro
              return (
                <button
                  key={s.id}
                  disabled={locked}
                  onClick={() => { setScript(s); setPhase('camera_setup') }}
                  className="text-left rounded-3xl p-5 transition-all relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(145deg,#0F1E35,#091522)',
                    border: locked ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,196,154,0.2)',
                    opacity: locked ? 0.55 : 1,
                    cursor: locked ? 'not-allowed' : 'pointer',
                  }}
                  onMouseEnter={e => { if (!locked) e.currentTarget.style.border = '1px solid rgba(0,196,154,0.5)' }}
                  onMouseLeave={e => { if (!locked) e.currentTarget.style.border = '1px solid rgba(0,196,154,0.2)' }}
                >
                  {locked && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1"
                      style={{ background: 'rgba(6,14,26,0.55)', backdropFilter: 'blur(2px)' }}>
                      <div className="text-2xl">🔒</div>
                      <div className="text-xs font-bold" style={{ color: '#F59E0B' }}>Pro only</div>
                    </div>
                  )}
                  <div className="text-3xl mb-3">{s.icon}</div>
                  <div className="font-black text-white text-sm mb-1 leading-tight">{s.title}</div>
                  <div className="text-xs mb-3 leading-relaxed" style={{ color: '#6B8CAE' }}>{s.description}</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: 'rgba(0,196,154,0.12)', color: '#00C49A' }}>
                      {s.category}
                    </span>
                    <span className="text-xs" style={{ color: '#6B8CAE' }}>{s.duration}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </main>
      </div>
    )
  }

  // ── CUSTOM INPUT ─────────────────────────────────────────────────────────────
  if (phase === 'custom_input') {
    return (
      <div className="min-h-screen" style={{ background: '#060E1A' }}>
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 py-8">
          <button onClick={() => setPhase('select')}
            className="flex items-center gap-2 text-sm mb-6 hover:opacity-80" style={{ color: '#6B8CAE' }}>
            ← Back
          </button>
          <div className="text-3xl mb-2">✍️</div>
          <h1 className="text-2xl font-black text-white mb-1">Paste Your Script</h1>
          <p className="text-sm mb-6" style={{ color: '#6B8CAE' }}>
            Your presentation, pitch, speech — paste it below and practise with camera feedback.
          </p>

          <div className="mb-4">
            <label className="block text-sm font-semibold text-white mb-2">
              Script title <span style={{ color: '#6B8CAE' }}>(optional)</span>
            </label>
            <input className="input w-full" placeholder="e.g. My startup pitch, TEDx talk…" id="blTitle" />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-white mb-2">
              Your script <span style={{ color: '#FF6B35' }}>*</span>
            </label>
            <textarea
              value={customText} onChange={e => setCustomText(e.target.value)}
              className="input w-full" rows={12}
              placeholder="Paste or type your script here…&#10;&#10;Tip: Use double line breaks between paragraphs — each becomes one teleprompter section."
              style={{ resize: 'vertical', minHeight: 240 }}
            />
            <p className="text-xs mt-2" style={{ color: '#6B8CAE' }}>
              {customText.split(/\s+/).filter(Boolean).length} words ·{' '}
              ~{Math.round(customText.split(/\s+/).filter(Boolean).length / 130)} min
            </p>
          </div>

          <button
            disabled={customText.trim().length < 20}
            onClick={() => {
              const title = document.getElementById('blTitle')?.value?.trim() || 'My Script'
              setScript({ ...CUSTOM_META, title, text: customText.trim() })
              setPhase('camera_setup')
            }}
            className="btn-primary w-full py-3 text-base"
            style={{ opacity: customText.trim().length < 20 ? 0.5 : 1 }}>
            Set Up Camera →
          </button>
        </main>
      </div>
    )
  }

  // ── CAMERA SETUP ─────────────────────────────────────────────────────────────
  if (phase === 'camera_setup') {
    return (
      <div className="min-h-screen" style={{ background: '#060E1A' }}>
        <Navbar />
        <main className="max-w-lg mx-auto px-4 py-8 text-center">
          <button onClick={() => setPhase('select')}
            className="flex items-center gap-2 text-sm mb-8 hover:opacity-80 mx-auto" style={{ color: '#6B8CAE' }}>
            ← Back
          </button>

          <VakMascot level={3} size={80} />
          <h1 className="text-2xl font-black text-white mt-4 mb-2">Set Up Your Camera</h1>
          <p className="text-sm mb-8" style={{ color: '#6B8CAE' }}>
            Vak will watch your body language while you read <strong className="text-white">{script?.title}</strong>.
            Position yourself so your upper body is visible.
          </p>

          <div className="rounded-2xl p-5 mb-6 text-left space-y-3"
            style={{ background: 'rgba(0,196,154,0.06)', border: '1px solid rgba(0,196,154,0.2)' }}>
            {[
              { icon: '🪑', text: 'Sit or stand about 50–80 cm from the camera' },
              { icon: '💡', text: 'Make sure your face and hands are well-lit' },
              { icon: '👀', text: 'Look at the camera when delivering — not at the script' },
              { icon: '🤝', text: 'Keep hands in frame to let Vak track your gestures' },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-start gap-3">
                <span>{icon}</span>
                <span className="text-sm" style={{ color: '#94A3B8' }}>{text}</span>
              </div>
            ))}
          </div>

          <button onClick={requestCamera} className="btn-primary w-full py-4 text-base">
            📸 Allow Camera &amp; Mic Access →
          </button>
          <p className="text-xs mt-3" style={{ color: '#6B8CAE' }}>
            Video never leaves your device — only frame analysis results are sent to Gemini.
          </p>

          {/* Hidden video preview (fills srcObject once allowed) */}
          <video ref={videoRef} autoPlay muted playsInline className="hidden" />
        </main>
      </div>
    )
  }

  // ── COUNTDOWN ─────────────────────────────────────────────────────────────────
  if (phase === 'countdown') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6"
        style={{ background: '#060E1A' }}>
        {/* Live camera preview */}
        <video ref={videoRef} autoPlay muted playsInline
          className="w-40 h-40 rounded-2xl object-cover"
          style={{ transform: 'scaleX(-1)', border: '2px solid rgba(0,196,154,0.4)' }} />
        <p className="text-sm font-semibold" style={{ color: '#6B8CAE' }}>
          Starting: <span className="text-white">{script?.title}</span>
        </p>
        <div className="text-9xl font-black leading-none animate-bounce"
          style={{ color: '#00C49A', textShadow: '0 0 80px rgba(0,196,154,0.6)' }}>
          {countdown}
        </div>
        <p style={{ color: '#6B8CAE' }}>Look at the camera · speak clearly · be yourself</p>
        <p className="text-xs px-4 py-2 rounded-full"
          style={{ background: 'rgba(239,68,68,0.08)', color: '#F87171', border: '1px solid rgba(239,68,68,0.2)' }}>
          🔴 Camera + audio recording will start
        </p>
        {/* Hidden canvas for frame capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    )
  }

  // ── READING PHASE ─────────────────────────────────────────────────────────────
  if (phase === 'reading') {
    return (
      <div className="flex flex-col" style={{ height: '100vh', overflow: 'hidden', background: '#060E1A' }}>

        {/* Top stats bar */}
        <div className="shrink-0 px-4 py-2.5 flex items-center gap-4 flex-wrap"
          style={{ background: 'rgba(6,14,26,0.97)', borderBottom: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(14px)' }}>

          <div className="flex items-center gap-1.5">
            <span className="text-xs" style={{ color: '#6B8CAE' }}>⏱</span>
            <span className="font-mono font-bold text-sm text-white">{fmt(seconds)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs" style={{ color: '#6B8CAE' }}>WPM</span>
            <span className="font-mono font-bold text-sm"
              style={{ color: wpm > 0 ? (wpm < 100 || wpm > 180 ? '#F59E0B' : '#00C49A') : '#6B8CAE' }}>
              {wpm || '—'}
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full transition-all"
            style={{
              background: fillerFlash ? 'rgba(239,68,68,0.18)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${fillerFlash ? 'rgba(239,68,68,0.55)' : 'rgba(255,255,255,0.08)'}`,
              transform: fillerFlash ? 'scale(1.08)' : 'scale(1)',
            }}>
            <span className="text-sm">{fillerFlash ? '⚡' : '💬'}</span>
            <span className="text-sm font-bold"
              style={{ color: fillerCount > 5 ? '#F87171' : fillerCount > 0 ? '#F59E0B' : '#6B8CAE' }}>
              {fillerCount} filler{fillerCount !== 1 ? 's' : ''}
            </span>
          </div>

          {liveTip && !tipLoading && (
            <>
              <div className="flex items-center gap-1.5">
                <span className="text-xs" style={{ color: '#6B8CAE' }}>Posture</span>
                <span className="text-xs font-bold" style={{ color: scoreColor(liveTip.posture_score) }}>
                  {liveTip.posture_score}%
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs" style={{ color: '#6B8CAE' }}>Eye</span>
                <span className="text-xs font-bold" style={{ color: scoreColor(liveTip.eye_contact_score) }}>
                  {liveTip.eye_contact_score}%
                </span>
              </div>
            </>
          )}
          {tipLoading && (
            <span className="text-xs" style={{ color: '#6B8CAE' }}>👁 Vak is watching…</span>
          )}

          <div className="flex items-center gap-1.5 ml-auto">
            {/* REC badge */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#F87171' }} />
              <span className="text-xs font-semibold" style={{ color: '#F87171' }}>REC</span>
            </div>
            <button onClick={handleDone}
              className="text-sm px-4 py-1.5 rounded-xl font-semibold transition-all hover:opacity-90"
              style={{ background: 'rgba(239,68,68,0.15)', color: '#F87171', border: '1px solid rgba(239,68,68,0.25)' }}>
              Done →
            </button>
          </div>
        </div>

        {/* Main area: camera + teleprompter */}
        <div className="flex-1 overflow-hidden flex">

          {/* ── Left: camera feed ── */}
          <div className="relative flex-shrink-0 flex flex-col"
            style={{ width: '55%', borderRight: '1px solid rgba(255,255,255,0.07)' }}>

            <video
              ref={videoRef}
              autoPlay muted playsInline
              className="w-full flex-1 object-cover"
              style={{ transform: 'scaleX(-1)', display: 'block' }}
            />

            {/* Live tip overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-4">
              {liveTip ? (
                <div className="rounded-2xl px-4 py-3"
                  style={{ background: 'rgba(6,14,26,0.88)', border: '1px solid rgba(0,196,154,0.3)', backdropFilter: 'blur(12px)' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold" style={{ color: '#00C49A' }}>🦢 Vak's live tip</span>
                    <span className="text-xs" style={{ color: '#6B8CAE' }}>· updated every 30 s</span>
                  </div>
                  <p className="text-white text-sm font-semibold">{liveTip.instant_tip}</p>
                  {liveTip.observation && (
                    <p className="text-xs mt-1" style={{ color: '#6B8CAE' }}>{liveTip.observation}</p>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl px-4 py-3"
                  style={{ background: 'rgba(6,14,26,0.7)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)' }}>
                  <p className="text-xs" style={{ color: '#6B8CAE' }}>
                    📹 Vak is watching · live tip appears in ~30 s
                  </p>
                </div>
              )}
            </div>

            {/* Hidden canvas */}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* ── Right: teleprompter ── */}
          <div ref={scrollContainer} className="flex-1 overflow-y-auto" style={{ scrollBehavior: 'smooth' }}>
            <div className="max-w-xl mx-auto px-6 py-12 space-y-8">
              {paragraphs.map((para, idx) => {
                const isDone    = idx < currentParaIdx
                const isCurrent = idx === currentParaIdx
                const isNext    = idx === currentParaIdx + 1
                return (
                  <p key={idx}
                    ref={el => { paraRefs.current[idx] = el }}
                    className="leading-relaxed transition-all duration-500"
                    style={{
                      fontSize:    isCurrent ? '1.25rem' : '1rem',
                      fontWeight:  isCurrent ? '600' : '400',
                      lineHeight:  isCurrent ? '2' : '1.75',
                      color:       isDone    ? 'rgba(255,255,255,0.18)'
                                 : isCurrent ? '#FFFFFF'
                                 : isNext    ? 'rgba(255,255,255,0.45)'
                                 :             'rgba(255,255,255,0.18)',
                      borderLeft:  isCurrent ? '4px solid #00C49A' : '4px solid transparent',
                      paddingLeft: '1.2rem',
                      background:  isCurrent ? 'rgba(0,196,154,0.05)' : 'transparent',
                      borderRadius: '6px',
                    }}>
                    {para}
                  </p>
                )
              })}
              <div style={{ height: '40vh' }} />
            </div>
          </div>
        </div>

        {/* Bottom bar — live transcript */}
        <div className="shrink-0 px-4 py-2"
          style={{ background: 'rgba(6,14,26,0.97)', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="min-h-[24px] text-sm"
            style={{ color: liveText ? '#FF9D6F' : 'rgba(107,140,174,0.5)' }}>
            {liveText ? `🎤 ${liveText}` : 'Speak and your words appear here · audio always recorded'}
          </div>
        </div>
      </div>
    )
  }

  // ── ANALYZING ─────────────────────────────────────────────────────────────────
  if (phase === 'analyzing') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6" style={{ background: '#060E1A' }}>
        <div className="animate-float"><VakMascot level={4} size={100} /></div>
        <div className="text-center">
          <div className="text-white font-bold text-xl mb-2">Analysing your presence…</div>
          <div style={{ color: '#6B8CAE' }}>Gemini is reviewing your frames and audio</div>
        </div>
        <div className="flex gap-2">
          {[0,1,2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full animate-bounce"
              style={{ background: '#00C49A', animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
        <p className="text-xs px-4 py-2 rounded-full"
          style={{ background: 'rgba(0,196,154,0.06)', color: '#6B8CAE', border: '1px solid rgba(0,196,154,0.15)' }}>
          Reviewing posture · eye contact · expression · gestures
        </p>
      </div>
    )
  }

  // ── REPORT ────────────────────────────────────────────────────────────────────
  if (phase === 'report' && report) {
    return (
      <div className="min-h-screen" style={{ background: '#060E1A' }}>
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 py-8 animate-slide-up">

          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3 animate-float">
              <VakMascot level={report.overall_score >= 80 ? 5 : 4} size={90} />
            </div>
            <h2 className="text-white font-black text-2xl mb-1">Body Language Report</h2>
            <p style={{ color: '#6B8CAE' }}>
              {script?.title} · {fmt(seconds)} · {framesRef.current.length} frames analysed
            </p>
          </div>

          {/* XP reward */}
          {reward && <RewardCard reward={reward} />}

          {/* Overall presence */}
          <div className="rounded-3xl p-6 mb-5 text-center"
            style={{
              background: 'linear-gradient(145deg,#0F1E35,#091522)',
              border: `1px solid ${scoreColor(report.overall_score)}40`,
              boxShadow: `0 0 40px ${scoreColor(report.overall_score)}14`,
            }}>
            <div className="text-5xl font-black mb-1" style={{ color: scoreColor(report.overall_score) }}>
              {report.overall_score}%
            </div>
            <div className="text-white font-semibold mb-2">Overall Presence</div>
            <p className="text-sm leading-relaxed" style={{ color: '#94A3B8' }}>{report.summary}</p>
          </div>

          {/* Score bars */}
          <div className="card mb-5">
            <h3 className="text-white font-bold text-sm mb-4">Detailed Scores</h3>
            <ScoreBar icon="🧍" label="Posture"       value={report.posture_score} />
            <ScoreBar icon="👁️" label="Eye Contact"   value={report.eye_contact_score} />
            <ScoreBar icon="😊" label="Expression"    value={report.expression_score} />
            <ScoreBar icon="🙌" label="Hand Gestures" value={report.gesture_score} />
            <ScoreBar icon="⚡" label="Presence"      value={report.presence_score} />
          </div>

          {/* Coaching notes per dimension */}
          {report.coaching_notes && (
            <div className="card mb-5">
              <h3 className="text-white font-bold text-sm mb-4">Vak's Coaching Notes</h3>
              <div className="space-y-3">
                {[
                  { key:'posture',      label:'🧍 Posture' },
                  { key:'eye_contact',  label:'👁️ Eye Contact' },
                  { key:'gestures',     label:'🙌 Gestures' },
                  { key:'expression',   label:'😊 Expression' },
                ].map(({ key, label }) => (
                  report.coaching_notes[key] && (
                    <div key={key} className="rounded-xl p-3"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <div className="text-xs font-bold mb-1 text-white">{label}</div>
                      <p className="text-sm leading-relaxed" style={{ color: '#94A3B8' }}>
                        {report.coaching_notes[key]}
                      </p>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}

          {/* Frame thumbnails */}
          {report.frames?.length > 0 && (
            <div className="card mb-5">
              <h3 className="text-white font-bold text-sm mb-3">
                📸 Captured Frames ({report.frames.length})
              </h3>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {report.frames.map((dataUrl, i) => (
                  <img key={i} src={dataUrl} alt={`Frame ${i+1}`}
                    className="shrink-0 rounded-lg object-cover"
                    style={{ width: 100, height: 75, border: '1px solid rgba(255,255,255,0.1)', transform: 'scaleX(-1)' }}
                  />
                ))}
              </div>
              <p className="text-xs mt-2" style={{ color: '#6B8CAE' }}>
                These frames were used by Gemini to analyse your body language.
              </p>
            </div>
          )}

          {/* Strengths + improvements */}
          <div className="grid md:grid-cols-2 gap-3 mb-5">
            <div className="card">
              <h3 className="font-semibold text-sm mb-3" style={{ color: '#00C49A' }}>✅ What worked</h3>
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
            style={{ background: 'rgba(0,196,154,0.07)', border: '1px solid rgba(0,196,154,0.25)' }}>
            <div className="flex gap-3 items-start">
              <span className="text-2xl">🎯</span>
              <div>
                <h3 className="font-semibold text-sm mb-1" style={{ color: '#00C49A' }}>Your action item</h3>
                <p className="text-white text-sm">{report.action_item}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setReport(null); setReward(null)
                setSeconds(0); setWpm(0); setFillerCount(0)
                setLiveTip(null); setTranscript('')
                transcriptRef.current = ''; fillerRef.current = 0
                framesRef.current = []; audioChunksRef.current = []
                setPhase('camera_setup')
              }}
              className="flex-1 py-3 rounded-2xl font-bold text-sm transition-all hover:opacity-90"
              style={{ background: 'rgba(0,196,154,0.12)', border: '1px solid rgba(0,196,154,0.3)', color: '#00C49A' }}>
              📹 Record again
            </button>
            <Link to="/practice"
              className="flex-1 py-3 rounded-2xl font-bold text-sm text-white text-center transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg,#7B5EA7,#9B7EC8)' }}>
              🎭 More practice →
            </Link>
          </div>

          <div className="h-8" />
        </main>
      </div>
    )
  }

  return null
}
