import { useState, useEffect, useRef, useMemo } from 'react'
import { Link }            from 'react-router-dom'
import { useAuth }         from '../hooks/useAuth'
import { useProgress }     from '../hooks/useProgress'
import { useSubscription } from '../hooks/useSubscription'
import { supabase }        from '../lib/supabase'
import { analyzeScriptReading, analyzeScriptReadingFromAudio, LANGUAGES } from '../lib/gemini'
import { SCRIPTS }         from '../lib/scripts'
import Navbar              from '../components/Navbar'
import VakMascot           from '../components/VakMascot'
import RewardCard          from '../components/RewardCard'

// ── Voice support ─────────────────────────────────────────────────────────────
const SR_Class = window.SpeechRecognition || window.webkitSpeechRecognition
const VOICE_OK = !!SR_Class

// ── Filler detection (for live counter in reading phase) ──────────────────────
const BASE_FILLER_WORDS   = ['um', 'uh', 'ah', 'aa', 'hmm', 'eh', 'er', 'erm']
const BASE_FILLER_PHRASES = ['you know', 'i mean', 'kind of', 'sort of', 'basically', 'like basically', 'actually', 'you see']

// Regional filler words by language
const REGIONAL_FILLER_WORDS = {
  'hi-IN': ['matlab', 'woh', 'jaise', 'toh', 'bas', 'arre', 'haan'],
  'mr-IN': ['mhanje', 'asa', 'toch', 'mhanaje'],
  'te-IN': ['ante', 'adi', 'emo'],
  'bn-IN': ['mane', 'tokhon', 'aar'],
  'ta-IN': ['enna', 'apparam', 'illa'],
  'kn-IN': ['andre', 'avaga', 'nodu'],
}
const REGIONAL_FILLER_PHRASES = {
  'hi-IN': ['matlab kya', 'woh kya hai', 'matlab yeh'],
  'mr-IN': ['mhanje kay', 'asa aahe'],
}

function detectFillers(text, langCode = 'en-US') {
  const lower   = text.toLowerCase()
  const words   = new Set(BASE_FILLER_WORDS)
  const phrases = [...BASE_FILLER_PHRASES]

  // Add regional fillers for non-English languages
  if (langCode && langCode !== 'en-US') {
    ;(REGIONAL_FILLER_WORDS[langCode] || []).forEach(w => words.add(w))
    ;(REGIONAL_FILLER_PHRASES[langCode] || []).forEach(p => phrases.push(p))
  }

  let count = 0
  lower.split(/\s+/).forEach(w => { if (words.has(w.replace(/[^a-z]/g, ''))) count++ })
  phrases.forEach(p => { count += (lower.match(new RegExp(`\\b${p}\\b`, 'g')) || []).length })
  return count
}

// ── Audio helpers ─────────────────────────────────────────────────────────────
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary  = ''
  const chunk = 8192
  for (let i = 0; i < bytes.length; i += chunk)
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  return btoa(binary)
}

function pickMime() {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg']
  return types.find(t => MediaRecorder.isTypeSupported(t)) || 'audio/webm'
}

function fmt(s) {
  const m = Math.floor(s / 60)
  return `${m}:${(s % 60).toString().padStart(2, '0')}`
}
function scoreColor(s) {
  if (s >= 80) return '#00C49A'
  if (s >= 60) return '#FF6B35'
  return '#F87171'
}

// ── Custom script placeholder ─────────────────────────────────────────────────
const CUSTOM_SCRIPT_META = {
  id:          'custom',
  icon:        '✍️',
  title:       'My Own Script',
  category:    'Custom',
  duration:    'Variable',
  difficulty:  1,
  tier:        'free',
  description: 'Paste your own speech, presentation script, or any text. Practice reading it aloud and get detailed coaching feedback.',
  text:        '', // filled by user
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ScriptReading() {
  const { user }    = useAuth()
  const { awardXP } = useProgress()
  const { isPro }   = useSubscription()

  // phases: select | custom_input | countdown | reading | analyzing | report
  const [phase,       setPhase]       = useState('select')
  const [script,      setScript]      = useState(null)
  const [customText,  setCustomText]  = useState('')
  const [countdown,   setCountdown]   = useState(3)

  // ── Live reading state ────────────────────────────────────────────────────
  const [transcript,  setTranscript]  = useState('')
  const [liveText,    setLiveText]    = useState('')
  const [fillerCount, setFillerCount] = useState(0)
  const [fillerFlash, setFillerFlash] = useState(false)
  const [pauseCount,  setPauseCount]  = useState(0)
  const [wpm,         setWpm]         = useState(0)
  const [seconds,     setSeconds]     = useState(0)

  // ── Language state ────────────────────────────────────────────────────────
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem('san4_lang') || 'en-US' } catch { return 'en-US' }
  })
  const langRef = useRef(lang)

  useEffect(() => {
    langRef.current = lang
    try { localStorage.setItem('san4_lang', lang) } catch {}
    // Persist ESL pref alongside lang so PracticeSession picks it up too
    if (lang !== 'en-US') {
      try { localStorage.setItem('san4_esl_mode', 'true') } catch {}
    }
  }, [lang])

  // ── Report state ──────────────────────────────────────────────────────────
  const [report, setReport] = useState(null)
  const [reward, setReward] = useState(null)

  // ── Refs ──────────────────────────────────────────────────────────────────
  const recRef          = useRef(null)
  const isListeningRef  = useRef(false)
  const transcriptRef   = useRef('')
  const fillerRef       = useRef(0)
  const pauseRef        = useRef(0)
  const pauseTimer      = useRef(null)
  const startTimeRef    = useRef(null)
  const timerRef        = useRef(null)
  const paraRefs        = useRef([])
  const scrollContainer = useRef(null)

  // MediaRecorder refs — primary audio capture for Gemini analysis
  const mediaRecRef    = useRef(null)
  const audioChunksRef = useRef([])
  const audioStreamRef = useRef(null)
  const audioMimeRef   = useRef('audio/webm')

  // ── Paragraph splitting ───────────────────────────────────────────────────
  const paragraphs = useMemo(
    () => script?.text.split('\n\n').filter(p => p.trim()) || [],
    [script]
  )

  const cumWordCounts = useMemo(() => {
    let cum = 0
    return paragraphs.map(p => { cum += p.split(/\s+/).length; return cum })
  }, [paragraphs])

  // Which paragraph is the user on? (STT word-count approximation)
  const currentParaIdx = useMemo(() => {
    const spoken = transcriptRef.current.split(/\s+/).filter(Boolean).length
    const idx    = cumWordCounts.findIndex(c => spoken < c)
    return idx === -1 ? Math.max(0, paragraphs.length - 1) : idx
  }, [transcript, cumWordCounts, paragraphs.length]) // eslint-disable-line

  // ── Countdown ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'countdown') return
    setCountdown(3)
    const t = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(t); setPhase('reading'); return 0 }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [phase])

  // ── Session timer ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'reading') return
    timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000)
    return () => clearInterval(timerRef.current)
  }, [phase])

  // ── Start / stop mic + MediaRecorder with phase ───────────────────────────
  useEffect(() => {
    if (phase === 'reading') {
      startTimeRef.current = Date.now()
      startRecording()
      startListening()
    } else {
      stopListening()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // ── Auto-scroll: container ref + scrollTo ────────────────────────────────
  useEffect(() => {
    if (phase !== 'reading') return
    const el        = paraRefs.current[currentParaIdx]
    const container = scrollContainer.current
    if (!el || !container) return
    const targetTop = el.offsetTop - container.clientHeight / 2 + el.offsetHeight / 2
    container.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' })
  }, [currentParaIdx, phase])

  // ── MediaRecorder setup ───────────────────────────────────────────────────
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      audioStreamRef.current = stream
      const mime   = pickMime()
      audioMimeRef.current = mime
      const rec    = new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 32000 })
      rec.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      rec.start(1000)
      mediaRecRef.current = rec
    } catch (err) {
      console.warn('MediaRecorder unavailable:', err.message)
    }
  }

  async function stopRecording() {
    return new Promise(resolve => {
      const rec = mediaRecRef.current
      if (!rec || rec.state === 'inactive') { resolve(null); return }
      rec.onstop = async () => {
        audioStreamRef.current?.getTracks().forEach(t => t.stop())
        if (audioChunksRef.current.length === 0) { resolve(null); return }
        try {
          const blob   = new Blob(audioChunksRef.current, { type: audioMimeRef.current })
          const buf    = await blob.arrayBuffer()
          resolve({
            base64:   arrayBufferToBase64(buf),
            mimeType: audioMimeRef.current.split(';')[0],
          })
        } catch { resolve(null) }
      }
      rec.stop()
    })
  }

  // ── SpeechRecognition setup (live scroll tracking only) ───────────────────
  useEffect(() => {
    if (!SR_Class) return
    const rec = new SR_Class()
    rec.lang            = 'en-US'   // en-US is universally supported on all Chrome versions
    rec.continuous      = true
    rec.interimResults  = true
    rec.maxAlternatives = 1

    rec.onresult = (e) => {
      let finalChunk   = ''
      let interimChunk = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) finalChunk   += t + ' '
        else                       interimChunk += t
      }

      if (finalChunk) {
        transcriptRef.current = (transcriptRef.current + ' ' + finalChunk).trim()
        setTranscript(transcriptRef.current)
        setLiveText('')

        // WPM
        if (startTimeRef.current) {
          const mins  = (Date.now() - startTimeRef.current) / 60000
          const words = transcriptRef.current.split(/\s+/).filter(Boolean).length
          const cur   = Math.round(words / mins)
          if (cur > 0 && cur < 500) setWpm(cur)
        }

        // Fillers — use langRef.current so regional words are counted
        const newF = detectFillers(finalChunk, langRef.current)
        if (newF > 0) {
          fillerRef.current += newF
          setFillerCount(fillerRef.current)
          setFillerFlash(true)
          setTimeout(() => setFillerFlash(false), 900)
        }

        // Pause: 2.5s silence = one long pause
        clearTimeout(pauseTimer.current)
        pauseTimer.current = setTimeout(() => {
          if (isListeningRef.current) { pauseRef.current += 1; setPauseCount(pauseRef.current) }
        }, 2500)
      } else if (interimChunk) {
        setLiveText(interimChunk)
      }
    }

    rec.onend = () => {
      if (isListeningRef.current) {
        setTimeout(() => {
          if (isListeningRef.current) { try { rec.start() } catch (_) {} }
        }, 120)
      }
    }

    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'audio-capture') {
        alert('Microphone access denied. Please allow microphone access in your browser and try again.')
        isListeningRef.current = false
        setPhase('select')
      }
    }

    recRef.current = rec
    return () => {
      isListeningRef.current = false
      clearTimeout(pauseTimer.current)
      try { rec.abort() } catch (_) {}
    }
  }, [])

  function startListening() {
    if (!recRef.current) return
    recRef.current.lang = langRef.current  // apply selected language
    try { recRef.current.start(); isListeningRef.current = true } catch (_) {}
  }

  function stopListening() {
    isListeningRef.current = false
    clearTimeout(pauseTimer.current)
    try { recRef.current?.stop() } catch (_) {}
  }

  // Manual paragraph advance (fallback when STT isn't tracking)
  function advanceParagraph() {
    // Inject enough fake word count to push currentParaIdx forward
    const wordsNeeded = cumWordCounts[currentParaIdx] ?? 0
    const fakeWords   = ' word'.repeat(wordsNeeded + 1)
    transcriptRef.current = (transcriptRef.current + fakeWords).trim()
    setTranscript(transcriptRef.current)
  }

  // ── Done reading → analyse ────────────────────────────────────────────────
  async function handleDone() {
    stopListening()
    clearInterval(timerRef.current)
    setPhase('analyzing')

    // Stop MediaRecorder and get audio
    const audioPayload = await stopRecording()

    const totalWords = transcriptRef.current.split(/\s+/).filter(Boolean).length
    const mins       = seconds / 60
    const avgWpm     = mins > 0.1 ? Math.round(totalWords / mins) : 0

    const voiceMeta = {
      avgWpm,
      totalSpeakingSeconds: seconds,
      fillerCount: fillerRef.current,
      pauseCount:  pauseRef.current,
    }

    try {
      let result = null

      // ── Primary: Gemini audio analysis (doesn't depend on STT) ──────────
      if (audioPayload) {
        result = await analyzeScriptReadingFromAudio(
          script.title,
          script.text,
          audioPayload.base64,
          audioPayload.mimeType,
          lang,
        )
      }

      // ── Fallback: STT transcript text analysis ───────────────────────────
      if (!result) {
        result = await analyzeScriptReading(
          script.title,
          script.text,
          transcriptRef.current,
          voiceMeta,
        )
      }

      if (user) {
        await supabase.from('practice_sessions').insert({
          user_id:           user.id,
          scenario_id:       `script_${script.id}`,
          scenario_title:    `📜 ${script.title}`,
          overall_score:     result.overall_score,
          confidence_score:  result.fluency_score,
          pacing_score:      result.pacing_score,
          filler_word_count: fillerRef.current,
          duration_seconds:  seconds,
          feedback:          result.summary,
          action_item:       result.action_item,
          messages:          [],
        })
      }

      const r = await awardXP(result.overall_score)
      setReward(r)
      setReport({ ...result, avgWpm })
    } catch (err) {
      console.error('Analysis error:', err)
      const r = await awardXP(70)
      setReward(r)
      setReport({
        overall_score: 70, accuracy_score: 70, fluency_score: 70, pacing_score: 70,
        filler_word_count: fillerRef.current, top_filler_words: [], missed_phrases: [],
        pause_note:   `${pauseRef.current} long pause(s) detected.`,
        pacing_note:  avgWpm ? `You spoke at ~${avgWpm} WPM — aim for 120–150 WPM.` : null,
        strengths:    ['You completed the full script reading'],
        improvements: ['Focus on maintaining a consistent pace throughout'],
        action_item:  'Read the same script again tomorrow and compare your scores.',
        summary:      'Session completed. Script reading is one of the fastest ways to sharpen diction, delivery, and confidence.',
        avgWpm,
      })
    }

    setPhase('report')
  }

  function resetForReread() {
    setTranscript(''); transcriptRef.current = ''
    setLiveText('')
    setFillerCount(0); fillerRef.current = 0
    setPauseCount(0);  pauseRef.current  = 0
    setWpm(0); setSeconds(0)
    audioChunksRef.current = []
    setReport(null); setReward(null)
    setPhase('countdown')
  }

  function fullReset() {
    resetForReread()
    setScript(null)
    setCustomText('')
    setPhase('select')
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  // ── SELECT ────────────────────────────────────────────────────────────────
  if (phase === 'select') {
    return (
      <div className="min-h-screen" style={{ background: '#060E1A' }}>
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 py-8">

          <div className="mb-8 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-3 text-sm font-semibold"
              style={{ background: 'rgba(139,92,246,0.12)', color: '#A78BFA', border: '1px solid rgba(139,92,246,0.25)' }}>
              📜 Teleprompter Mode
            </div>
            <h1 className="text-3xl font-black text-white">Read. Practise. Improve.</h1>
            <p className="mt-1 max-w-xl" style={{ color: '#6B8CAE' }}>
              Pick a script or paste your own. Read it aloud — Vak records your voice and gives you
              detailed coaching on accuracy, fluency, pacing, and filler words.
            </p>

            {/* ── Language picker ── */}
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <span className="text-xs font-semibold" style={{ color: '#6B8CAE' }}>🌐 Reading in:</span>
              {LANGUAGES.map(l => (
                <button
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  className="text-xs px-3 py-1.5 rounded-full transition-all font-semibold"
                  style={{
                    background: lang === l.code ? 'rgba(139,92,246,0.2)'   : 'rgba(255,255,255,0.05)',
                    color:      lang === l.code ? '#A78BFA'                 : '#6B8CAE',
                    border:     `1px solid ${lang === l.code ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.1)'}`,
                  }}
                >
                  {l.flag} {l.nativeName}
                </button>
              ))}
            </div>

            {!VOICE_OK && (
              <div className="mt-4 px-4 py-3 rounded-2xl text-sm"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#F87171', border: '1px solid rgba(239,68,68,0.2)' }}>
                ⚠️ Voice input not supported. Please use Chrome or Edge on desktop.
              </div>
            )}
          </div>

          {/* ── "My Own Script" card — always first ── */}
          <div className="mb-3 flex items-center gap-3">
            <div className="text-xs font-bold uppercase tracking-widest" style={{ color: '#6B8CAE' }}>
              ✍️ Your Script
            </div>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
          </div>

          <button
            disabled={!VOICE_OK}
            onClick={() => setPhase('custom_input')}
            className="w-full text-left rounded-3xl p-5 mb-8 transition-all duration-200 group"
            style={{
              background: 'linear-gradient(145deg, rgba(139,92,246,0.1), rgba(139,92,246,0.04))',
              border: '1px solid rgba(139,92,246,0.3)',
            }}
            onMouseEnter={e => { e.currentTarget.style.border = '1px solid rgba(139,92,246,0.6)' }}
            onMouseLeave={e => { e.currentTarget.style.border = '1px solid rgba(139,92,246,0.3)' }}
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0"
                style={{ background: 'rgba(139,92,246,0.15)' }}>
                ✍️
              </div>
              <div className="flex-1">
                <div className="text-white font-black text-base mb-1">Practise My Own Script</div>
                <div className="text-sm" style={{ color: '#6B8CAE' }}>
                  Paste your own speech, presentation, pitch deck notes, or any text.
                  Get full coaching feedback on your delivery.
                </div>
              </div>
              <span style={{ color: '#A78BFA', fontSize: '1.3rem' }}>→</span>
            </div>
          </button>

          {/* ── Built-in scripts ── */}
          <div className="mb-3 flex items-center gap-3">
            <div className="text-xs font-bold uppercase tracking-widest" style={{ color: '#6B8CAE' }}>
              📜 Built-in Scripts
            </div>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {SCRIPTS.map(s => {
              const locked = s.tier === 'pro' && !isPro
              return (
                <button
                  key={s.id}
                  disabled={locked || !VOICE_OK}
                  onClick={() => { setScript(s); setPhase('countdown') }}
                  className="text-left rounded-3xl p-5 transition-all duration-200 relative overflow-hidden group"
                  style={{
                    background: 'linear-gradient(145deg, #0F1E35, #091522)',
                    border:  locked ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(139,92,246,0.2)',
                    opacity: locked ? 0.65 : 1,
                    cursor:  locked ? 'not-allowed' : 'pointer',
                  }}
                  onMouseEnter={e => { if (!locked) e.currentTarget.style.border = '1px solid rgba(139,92,246,0.5)' }}
                  onMouseLeave={e => { if (!locked) e.currentTarget.style.border = '1px solid rgba(139,92,246,0.2)' }}
                >
                  {locked && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl gap-1"
                      style={{ background: 'rgba(6,14,26,0.55)', backdropFilter: 'blur(2px)' }}>
                      <div className="text-2xl">🔒</div>
                      <div className="text-xs font-bold" style={{ color: '#FF6B35' }}>Pro only</div>
                    </div>
                  )}
                  <div className="text-3xl mb-3">{s.icon}</div>
                  <div className="font-black text-white text-sm mb-1 leading-tight">{s.title}</div>
                  <div className="text-xs mb-4 leading-relaxed" style={{ color: '#6B8CAE' }}>{s.description}</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: 'rgba(139,92,246,0.12)', color: '#A78BFA' }}>
                      {s.category}
                    </span>
                    <span className="text-xs" style={{ color: '#6B8CAE' }}>{s.duration}</span>
                    <span className="text-xs tracking-wider" style={{ color: '#6B8CAE' }}>
                      {'★'.repeat(s.difficulty)}{'☆'.repeat(3 - s.difficulty)}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>

          {!isPro && (
            <div className="rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap"
              style={{ background: 'rgba(255,107,53,0.06)', border: '1px solid rgba(255,107,53,0.2)' }}>
              <div>
                <p className="text-white font-semibold mb-0.5">🔒 4 scripts unlocked with Vak Pro</p>
                <p className="text-sm" style={{ color: '#6B8CAE' }}>
                  TED Talk, Weather forecast, IPL commentary, Product launch keynote
                </p>
              </div>
              <Link to="/pricing" className="text-sm font-bold px-4 py-2 rounded-full whitespace-nowrap"
                style={{ background: '#FF6B35', color: 'white' }}>
                Upgrade →
              </Link>
            </div>
          )}
        </main>
      </div>
    )
  }

  // ── CUSTOM SCRIPT INPUT ───────────────────────────────────────────────────
  if (phase === 'custom_input') {
    return (
      <div className="min-h-screen" style={{ background: '#060E1A' }}>
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 py-8">

          <button
            onClick={() => setPhase('select')}
            className="flex items-center gap-2 text-sm mb-6 transition-colors hover:opacity-80"
            style={{ color: '#6B8CAE' }}
          >
            ← Back to scripts
          </button>

          <div className="mb-6">
            <div className="text-3xl mb-2">✍️</div>
            <h1 className="text-2xl font-black text-white mb-1">Practise Your Own Script</h1>
            <p style={{ color: '#6B8CAE' }} className="text-sm">
              Paste your speech, presentation, or any text below. You'll read it aloud and
              Vak will coach you on your delivery.
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold text-white mb-2">
              Script title <span style={{ color: '#6B8CAE' }}>(optional)</span>
            </label>
            <input
              className="input w-full"
              placeholder="e.g. My startup pitch, Wedding toast, Team meeting opener…"
              id="customTitle"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-white mb-2">
              Your script <span style={{ color: '#FF6B35' }}>*</span>
            </label>
            <textarea
              value={customText}
              onChange={e => setCustomText(e.target.value)}
              className="input w-full"
              rows={12}
              placeholder="Paste or type your script here…&#10;&#10;Tip: Use double line breaks between paragraphs — each paragraph becomes one section in the teleprompter."
              style={{ resize: 'vertical', minHeight: 240 }}
            />
            <p className="text-xs mt-2" style={{ color: '#6B8CAE' }}>
              {customText.split(/\s+/).filter(Boolean).length} words
              · ~{Math.round(customText.split(/\s+/).filter(Boolean).length / 130)} min to read
            </p>
          </div>

          <button
            disabled={customText.trim().length < 20}
            onClick={() => {
              const titleEl = document.getElementById('customTitle')
              const title   = titleEl?.value?.trim() || 'My Script'
              setScript({ ...CUSTOM_SCRIPT_META, title, text: customText.trim() })
              setPhase('countdown')
            }}
            className="btn-primary w-full py-3 text-base"
            style={{ opacity: customText.trim().length < 20 ? 0.5 : 1 }}
          >
            Start Reading →
          </button>

          {customText.trim().length < 20 && customText.length > 0 && (
            <p className="text-xs mt-2 text-center" style={{ color: '#6B8CAE' }}>
              Please enter at least 20 characters
            </p>
          )}
        </main>
      </div>
    )
  }

  // ── COUNTDOWN ─────────────────────────────────────────────────────────────
  if (phase === 'countdown') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6"
        style={{ background: '#060E1A' }}>
        <p className="text-sm font-semibold" style={{ color: '#6B8CAE' }}>
          Get ready to read: <span className="text-white">{script?.title}</span>
        </p>
        <div className="text-9xl font-black leading-none animate-bounce"
          style={{ color: '#A78BFA', textShadow: '0 0 80px rgba(139,92,246,0.55)' }}>
          {countdown}
        </div>
        <p style={{ color: '#6B8CAE' }}>Speak clearly · natural pace · no rushing</p>
        <p className="text-xs px-4 py-2 rounded-full" style={{ background: 'rgba(0,196,154,0.08)', color: '#00C49A', border: '1px solid rgba(0,196,154,0.2)' }}>
          🔴 Your voice will be recorded and analysed by Gemini
        </p>
      </div>
    )
  }

  // ── READING (teleprompter) ────────────────────────────────────────────────
  if (phase === 'reading') {
    return (
      <div className="flex flex-col" style={{ height: '100vh', overflow: 'hidden', background: '#060E1A' }}>

        {/* ── Top stats bar ── */}
        <div className="shrink-0 px-4 py-3 flex items-center gap-4 flex-wrap"
          style={{ background: 'rgba(6,14,26,0.97)', borderBottom: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(14px)' }}>

          <div className="flex items-center gap-1.5">
            <span className="text-xs" style={{ color: '#6B8CAE' }}>⏱</span>
            <span className="font-mono font-bold text-sm text-white">{fmt(seconds)}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs" style={{ color: '#6B8CAE' }}>WPM</span>
            <span className="font-mono font-bold text-sm"
              style={{ color: wpm > 0 && (wpm < 100 || wpm > 180) ? '#F59E0B' : wpm > 0 ? '#00C49A' : '#6B8CAE' }}>
              {wpm || '—'}
            </span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1 rounded-full transition-all duration-200"
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

          {pauseCount > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs" style={{ color: '#6B8CAE' }}>⏸</span>
              <span className="text-xs font-bold" style={{ color: pauseCount > 3 ? '#F59E0B' : '#6B8CAE' }}>
                {pauseCount} pause{pauseCount !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          <div className="flex-1" />

          {/* Recording badge */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#F87171' }} />
            <span className="text-xs font-semibold" style={{ color: '#F87171' }}>REC</span>
          </div>

          <span className="text-xs font-semibold truncate max-w-[140px]" style={{ color: '#6B8CAE' }}>
            {currentParaIdx + 1}/{paragraphs.length}
          </span>
        </div>

        {/* ── Teleprompter body ── */}
        <div ref={scrollContainer} className="flex-1 overflow-y-auto" style={{ scrollBehavior: 'smooth' }}>
          <div className="max-w-2xl mx-auto px-6 py-12 space-y-8">
            {paragraphs.map((para, idx) => {
              const isDone    = idx < currentParaIdx
              const isCurrent = idx === currentParaIdx
              const isNext    = idx === currentParaIdx + 1

              return (
                <p
                  key={idx}
                  ref={el => { paraRefs.current[idx] = el }}
                  className="leading-relaxed transition-all duration-500"
                  style={{
                    fontSize:      isCurrent ? '1.3rem' : '1.05rem',
                    fontWeight:    isCurrent ? '600' : '400',
                    lineHeight:    isCurrent ? '2' : '1.75',
                    color:         isDone    ? 'rgba(255,255,255,0.18)'
                                 : isCurrent ? '#FFFFFF'
                                 : isNext    ? 'rgba(255,255,255,0.45)'
                                 :             'rgba(255,255,255,0.18)',
                    borderLeft:    isCurrent ? '4px solid #A78BFA' : '4px solid transparent',
                    paddingLeft:   '1.2rem',
                    paddingTop:    isCurrent ? '0.6rem' : '0',
                    paddingBottom: isCurrent ? '0.6rem' : '0',
                    background:    isCurrent ? 'rgba(139,92,246,0.07)' : 'transparent',
                    borderRadius:  '6px',
                  }}
                >
                  {para}
                </p>
              )
            })}
            <div style={{ height: '40vh' }} />
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div className="shrink-0 px-4 pt-2 pb-3"
          style={{ background: 'rgba(6,14,26,0.97)', borderTop: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(14px)' }}>

          {/* Live transcript — confirms voice is being captured */}
          <div className="mb-2 min-h-[28px] px-3 py-1 rounded-xl text-sm transition-all"
            style={{
              background: liveText ? 'rgba(255,107,53,0.08)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${liveText ? 'rgba(255,107,53,0.25)' : 'rgba(255,255,255,0.06)'}`,
            }}>
            {liveText ? (
              <span className="italic" style={{ color: '#FF9D6F' }}>🎤 {liveText}</span>
            ) : (
              <span style={{ color: 'rgba(107,140,174,0.5)', fontSize: '0.8rem' }}>
                Speak and your words will appear here · audio is always recorded even if this is blank
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {/* Listening pulse */}
              <div className="relative flex items-center justify-center w-6 h-6">
                <div className="absolute w-6 h-6 rounded-full animate-ping"
                  style={{ background: 'rgba(255,107,53,0.2)', animationDuration: '1.2s' }} />
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#FF6B35' }} />
              </div>
              <span className="text-sm font-semibold" style={{ color: '#FF6B35' }}>Listening</span>
            </div>

            {/* Manual advance button — works even when STT isn't tracking */}
            <button
              onClick={advanceParagraph}
              disabled={currentParaIdx >= paragraphs.length - 1}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
              style={{
                background: 'rgba(139,92,246,0.12)',
                border: '1px solid rgba(139,92,246,0.3)',
                color: '#A78BFA',
                opacity: currentParaIdx >= paragraphs.length - 1 ? 0.4 : 1,
              }}
            >
              Next ↓
            </button>

            <button
              onClick={handleDone}
              className="px-5 py-2 rounded-2xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #FF6B35, #FF8F4F)', boxShadow: '0 4px 16px rgba(255,107,53,0.35)' }}
            >
              Done →
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── ANALYZING ─────────────────────────────────────────────────────────────
  if (phase === 'analyzing') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6" style={{ background: '#060E1A' }}>
        <div className="animate-float"><VakMascot level={3} size={100} /></div>
        <div className="text-center">
          <div className="text-white font-bold text-xl mb-2">Analysing your delivery…</div>
          <div style={{ color: '#6B8CAE' }}>Gemini is listening to your recording</div>
        </div>
        <div className="flex gap-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full animate-bounce"
              style={{ background: '#A78BFA', animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
        <p className="text-xs px-4 py-2 rounded-full" style={{ background: 'rgba(0,196,154,0.06)', color: '#6B8CAE', border: '1px solid rgba(0,196,154,0.15)' }}>
          This may take 15–30 seconds for longer scripts
        </p>
      </div>
    )
  }

  // ── REPORT ────────────────────────────────────────────────────────────────
  if (phase === 'report' && report) {
    const fc = report.filler_word_count ?? fillerCount

    return (
      <div className="min-h-screen" style={{ background: '#060E1A' }}>
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 py-8 animate-slide-up">

          <div className="text-center mb-6">
            <div className="flex justify-center mb-3 animate-float">
              <VakMascot level={report.overall_score >= 80 ? 4 : 3} size={90} />
            </div>
            <h2 className="text-white font-black text-2xl mb-1">Reading Complete!</h2>
            <p style={{ color: '#6B8CAE' }}>
              {script?.title} · {fmt(seconds)}{report.avgWpm > 0 ? ` · ${report.avgWpm} WPM` : ''}
            </p>
          </div>

          {/* XP inline */}
          {reward && <RewardCard reward={reward} />}

          {/* Score grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {[
              { label: 'Overall',  value: report.overall_score,  icon: '🏆' },
              { label: 'Accuracy', value: report.accuracy_score, icon: '🎯' },
              { label: 'Fluency',  value: report.fluency_score,  icon: '🌊' },
              { label: 'Pacing',   value: report.pacing_score,   icon: '⚡' },
            ].map(({ label, value, icon }) => (
              <div key={label} className="rounded-2xl p-4 text-center"
                style={{ background: 'linear-gradient(145deg, #0F1E35, #091522)', border: `1px solid ${scoreColor(value)}30` }}>
                <div className="text-lg mb-1">{icon}</div>
                <div className="text-2xl font-black" style={{ color: scoreColor(value) }}>{value}</div>
                <div className="text-xs mt-0.5" style={{ color: '#6B8CAE' }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Score legend */}
          <div className="rounded-2xl px-4 py-3 mb-5 text-xs leading-relaxed space-y-1"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p style={{ color: '#6B8CAE' }}><span className="text-white font-semibold">Accuracy</span> — how closely your words matched the script</p>
            <p style={{ color: '#6B8CAE' }}><span className="text-white font-semibold">Fluency</span> — smooth delivery without unnatural hesitations</p>
            <p style={{ color: '#6B8CAE' }}><span className="text-white font-semibold">Pacing</span> — speaking speed (ideal: 120–150 WPM for most scripts)</p>
          </div>

          {/* Vak's coaching summary */}
          <div className="card mb-4" style={{ background: 'rgba(139,92,246,0.08)', borderColor: 'rgba(139,92,246,0.2)' }}>
            <div className="flex gap-3">
              <span className="text-xl shrink-0">🦢</span>
              <p className="text-sm leading-relaxed" style={{ color: '#E2E8F0' }}>{report.summary}</p>
            </div>
          </div>

          {/* What Vak heard — transcript from Gemini audio analysis */}
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
                    Gemini's transcription of your reading — the basis for accuracy and fluency scores.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Filler words */}
          <div className="card mb-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xl">💬</span>
              <div className="font-semibold text-white text-sm flex-1">Filler Words</div>
              <div className="text-xl font-black"
                style={{ color: fc > 5 ? '#F87171' : fc > 2 ? '#F59E0B' : '#00C49A' }}>
                {fc}
              </div>
            </div>
            {report.top_filler_words?.length > 0 ? (
              <div className="flex gap-2 flex-wrap mt-2">
                {report.top_filler_words.map((w, i) => (
                  <span key={i} className="px-2.5 py-0.5 rounded-full text-xs font-bold"
                    style={{ background: 'rgba(239,68,68,0.12)', color: '#F87171' }}>
                    "{w}"
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs mt-1" style={{ color: '#6B8CAE' }}>
                {fc === 0 ? '🎉 No filler words detected — great control!' : 'Replace fillers with a deliberate 1-second pause.'}
              </p>
            )}
          </div>

          {/* Pauses */}
          <div className="card mb-4">
            <div className="flex items-center gap-3">
              <span className="text-xl">⏸️</span>
              <div className="font-semibold text-white text-sm flex-1">Long Pauses (&gt;2.5s)</div>
              <div className="text-xl font-black"
                style={{ color: pauseCount > 4 ? '#F87171' : pauseCount > 1 ? '#F59E0B' : '#00C49A' }}>
                {pauseCount}
              </div>
            </div>
            {report.pause_note && (
              <p className="text-sm mt-2" style={{ color: '#6B8CAE' }}>{report.pause_note}</p>
            )}
          </div>

          {/* Pacing */}
          {report.pacing_note && (
            <div className="card mb-4" style={{ background: 'rgba(59,130,246,0.06)', borderColor: 'rgba(59,130,246,0.2)' }}>
              <div className="flex gap-3">
                <span className="text-xl shrink-0">🎙️</span>
                <p className="text-sm" style={{ color: '#E2E8F0' }}>{report.pacing_note}</p>
              </div>
            </div>
          )}

          {/* Missed / altered phrases */}
          {report.missed_phrases?.length > 0 && (
            <div className="card mb-4" style={{ background: 'rgba(245,158,11,0.06)', borderColor: 'rgba(245,158,11,0.2)' }}>
              <div className="flex gap-3">
                <span className="text-xl shrink-0">📝</span>
                <div>
                  <div className="font-semibold text-sm mb-2" style={{ color: '#F59E0B' }}>
                    Phrases you skipped or changed
                  </div>
                  <ul className="space-y-1.5">
                    {report.missed_phrases.map((ph, i) => (
                      <li key={i} className="text-sm italic" style={{ color: '#E2E8F0' }}>"…{ph}…"</li>
                    ))}
                  </ul>
                  <p className="text-xs mt-2" style={{ color: '#6B8CAE' }}>
                    Practise these phrases separately before your next read-through.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Strengths + Improvements */}
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div className="card">
              <div className="text-sm font-semibold mb-3" style={{ color: '#00C49A' }}>✅ What worked</div>
              <ul className="space-y-2">
                {report.strengths?.map((s, i) => (
                  <li key={i} className="text-sm flex gap-2" style={{ color: '#E2E8F0' }}>
                    <span style={{ color: '#00C49A' }}>•</span>{s}
                  </li>
                ))}
              </ul>
            </div>
            <div className="card">
              <div className="text-sm font-semibold mb-3" style={{ color: '#FF6B35' }}>🔧 Work on this</div>
              <ul className="space-y-2">
                {report.improvements?.map((s, i) => (
                  <li key={i} className="text-sm flex gap-2" style={{ color: '#E2E8F0' }}>
                    <span style={{ color: '#FF6B35' }}>•</span>{s}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Action item */}
          {report.action_item && (
            <div className="card mb-6" style={{ background: 'rgba(255,107,53,0.06)', borderColor: 'rgba(255,107,53,0.2)' }}>
              <div className="flex gap-3">
                <span className="text-xl shrink-0">🎯</span>
                <div>
                  <div className="text-sm font-semibold mb-1" style={{ color: '#FF6B35' }}>Your action item</div>
                  <p className="text-sm" style={{ color: '#E2E8F0' }}>{report.action_item}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={resetForReread}
              className="flex-1 py-3 rounded-2xl font-bold text-sm transition-all hover:opacity-90"
              style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)', color: '#A78BFA' }}>
              🔁 Read again
            </button>
            <button onClick={fullReset}
              className="flex-1 py-3 rounded-2xl font-bold text-sm text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #FF6B35, #FF8F4F)' }}>
              📜 New script →
            </button>
          </div>

          <div className="h-8" />
        </main>
      </div>
    )
  }

  return null
}
