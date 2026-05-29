import { useState, useEffect, useRef, useMemo } from 'react'
import { Link }            from 'react-router-dom'
import { useAuth }         from '../hooks/useAuth'
import { useProgress }     from '../hooks/useProgress'
import { useSubscription } from '../hooks/useSubscription'
import { supabase }        from '../lib/supabase'
import { analyzeScriptReading } from '../lib/gemini'
import { SCRIPTS }         from '../lib/scripts'
import Navbar              from '../components/Navbar'
import VakMascot           from '../components/VakMascot'
import RewardCard          from '../components/RewardCard'

// ── Voice support ─────────────────────────────────────────────────────────────
const SR_Class = window.SpeechRecognition || window.webkitSpeechRecognition
const VOICE_OK = !!SR_Class

// ── Filler detection ──────────────────────────────────────────────────────────
const FILLER_WORDS   = new Set(['um', 'uh', 'ah', 'aa', 'hmm', 'eh', 'er', 'erm'])
const FILLER_PHRASES = ['you know', 'i mean', 'kind of', 'sort of', 'basically', 'like basically']

function detectFillers(text) {
  const lower = text.toLowerCase()
  let count = 0
  lower.split(/\s+/).forEach(w => {
    if (FILLER_WORDS.has(w.replace(/[^a-z]/g, ''))) count++
  })
  FILLER_PHRASES.forEach(p => {
    count += (lower.match(new RegExp(p, 'g')) || []).length
  })
  return count
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

// ── Main component ────────────────────────────────────────────────────────────
export default function ScriptReading() {
  const { user }    = useAuth()
  const { awardXP } = useProgress()
  const { isPro }   = useSubscription()

  // phases: select | countdown | reading | analyzing | report
  const [phase,     setPhase]     = useState('select')
  const [script,    setScript]    = useState(null)
  const [countdown, setCountdown] = useState(3)

  // ── Live reading state ────────────────────────────────────────────────────
  const [transcript,  setTranscript]  = useState('')
  const [liveText,    setLiveText]    = useState('')
  const [fillerCount, setFillerCount] = useState(0)
  const [fillerFlash, setFillerFlash] = useState(false)
  const [pauseCount,  setPauseCount]  = useState(0)
  const [wpm,         setWpm]         = useState(0)
  const [seconds,     setSeconds]     = useState(0)

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
  const scrollContainer = useRef(null)   // ← the scrollable div

  // ── Paragraph splitting ───────────────────────────────────────────────────
  const paragraphs = useMemo(
    () => script?.text.split('\n\n').filter(p => p.trim()) || [],
    [script]
  )

  // Cumulative word count per paragraph (for scroll tracking)
  const cumWordCounts = useMemo(() => {
    let cum = 0
    return paragraphs.map(p => { cum += p.split(/\s+/).length; return cum })
  }, [paragraphs])

  // Which paragraph is the user on right now?
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

  // ── Start/stop mic with phase ─────────────────────────────────────────────
  useEffect(() => {
    if (phase === 'reading') {
      startTimeRef.current = Date.now()
      startListening()
    } else {
      stopListening()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // ── Auto-scroll: use container ref + scrollTo (reliable in flex layouts) ──
  useEffect(() => {
    if (phase !== 'reading') return
    const el        = paraRefs.current[currentParaIdx]
    const container = scrollContainer.current
    if (!el || !container) return

    // Centre the current paragraph vertically in the container
    const targetTop =
      el.offsetTop - container.clientHeight / 2 + el.offsetHeight / 2

    container.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' })
  }, [currentParaIdx, phase])

  // ── SpeechRecognition setup ───────────────────────────────────────────────
  useEffect(() => {
    if (!SR_Class) return
    const rec = new SR_Class()
    rec.lang            = 'en-IN'
    rec.continuous      = true
    rec.interimResults  = true
    rec.maxAlternatives = 1

    rec.onresult = (e) => {
      let finalChunk  = ''
      let interimChunk = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) finalChunk  += t + ' '
        else                       interimChunk += t
      }

      if (finalChunk) {
        transcriptRef.current = (transcriptRef.current + ' ' + finalChunk).trim()
        setTranscript(transcriptRef.current)   // triggers currentParaIdx recompute
        setLiveText('')

        // WPM
        if (startTimeRef.current) {
          const mins  = (Date.now() - startTimeRef.current) / 60000
          const words = transcriptRef.current.split(/\s+/).filter(Boolean).length
          const cur   = Math.round(words / mins)
          if (cur > 0 && cur < 500) setWpm(cur)
        }

        // Fillers
        const newF = detectFillers(finalChunk)
        if (newF > 0) {
          fillerRef.current += newF
          setFillerCount(fillerRef.current)
          setFillerFlash(true)
          setTimeout(() => setFillerFlash(false), 900)
        }

        // Pause detection: 2.5s silence = one long pause
        clearTimeout(pauseTimer.current)
        pauseTimer.current = setTimeout(() => {
          if (isListeningRef.current) {
            pauseRef.current += 1
            setPauseCount(pauseRef.current)
          }
        }, 2500)
      } else if (interimChunk) {
        setLiveText(interimChunk)
      }
    }

    rec.onend = () => {
      // continuous=true → onend only fires if browser force-closed it.
      // Restart automatically if we're still supposed to be listening.
      if (isListeningRef.current) {
        setTimeout(() => {
          if (isListeningRef.current) {
            try { rec.start() } catch (_) {}
          }
        }, 120)
      }
    }

    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'audio-capture') {
        alert('Microphone access denied. Please allow microphone access and try again.')
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
    try { recRef.current.start(); isListeningRef.current = true } catch (_) {}
  }

  function stopListening() {
    isListeningRef.current = false
    clearTimeout(pauseTimer.current)
    try { recRef.current?.stop() } catch (_) {}
  }

  // ── Done reading → analyse ────────────────────────────────────────────────
  async function handleDone() {
    stopListening()
    clearInterval(timerRef.current)
    setPhase('analyzing')

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
      const result = await analyzeScriptReading(
        script.title,
        script.text,
        transcriptRef.current,
        voiceMeta,
      )

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
        filler_word_count: fillerRef.current,
        top_filler_words: [], missed_phrases: [],
        pause_note:   `${pauseRef.current} long pause(s) detected.`,
        pacing_note:  avgWpm ? `You spoke at ~${avgWpm} WPM — ideal is 120–150 WPM.` : null,
        strengths:    ['You completed the full script reading — that takes courage'],
        improvements: ['Focus on maintaining a consistent pace throughout'],
        action_item:  'Read the same script again tomorrow and try to beat your score.',
        summary:      'Session completed. Script reading is one of the fastest ways to sharpen diction and delivery.',
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
    setReport(null); setReward(null)
    setPhase('countdown')
  }

  function fullReset() {
    resetForReread()
    setScript(null)
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
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-3 text-sm font-semibold"
              style={{ background: 'rgba(139,92,246,0.12)', color: '#A78BFA', border: '1px solid rgba(139,92,246,0.25)' }}
            >
              📜 Teleprompter Mode
            </div>
            <h1 className="text-3xl font-black text-white">Read. Practise. Improve.</h1>
            <p className="mt-1 max-w-xl" style={{ color: '#6B8CAE' }}>
              Pick a real-world script and read it aloud. Vak scrolls with you and catches
              every filler word, long pause, and pace issue — live.
            </p>
            {!VOICE_OK && (
              <div
                className="mt-4 px-4 py-3 rounded-2xl text-sm"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#F87171', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                ⚠️ Your browser doesn't support voice input. Please use Chrome or Edge on desktop.
              </div>
            )}
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
                    <div
                      className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl gap-1"
                      style={{ background: 'rgba(6,14,26,0.55)', backdropFilter: 'blur(2px)' }}
                    >
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
            <div
              className="rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap"
              style={{ background: 'rgba(255,107,53,0.06)', border: '1px solid rgba(255,107,53,0.2)' }}
            >
              <div>
                <p className="text-white font-semibold mb-0.5">🔒 4 scripts unlocked with Vak Pro</p>
                <p className="text-sm" style={{ color: '#6B8CAE' }}>
                  TED Talk opener, Weather forecast, IPL commentary, Product launch keynote
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

  // ── COUNTDOWN ─────────────────────────────────────────────────────────────
  if (phase === 'countdown') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6"
        style={{ background: '#060E1A' }}>
        <p className="text-sm font-semibold" style={{ color: '#6B8CAE' }}>
          Get ready to read: <span className="text-white">{script?.title}</span>
        </p>
        <div
          className="text-9xl font-black leading-none animate-bounce"
          style={{ color: '#A78BFA', textShadow: '0 0 80px rgba(139,92,246,0.55)' }}
        >
          {countdown}
        </div>
        <p style={{ color: '#6B8CAE' }}>Speak clearly · natural pace · no rushing</p>
      </div>
    )
  }

  // ── READING (teleprompter) ─────────────────────────────────────────────────
  if (phase === 'reading') {
    return (
      // h-screen + overflow-hidden = exact viewport height so the inner
      // overflow-y-auto div becomes the ONLY scroll surface → scrollTo works.
      <div className="flex flex-col" style={{ height: '100vh', overflow: 'hidden', background: '#060E1A' }}>

        {/* ── Top stats bar ── */}
        <div
          className="shrink-0 px-4 py-3 flex items-center gap-4 flex-wrap"
          style={{
            background: 'rgba(6,14,26,0.97)',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            backdropFilter: 'blur(14px)',
          }}
        >
          {/* Timer */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs" style={{ color: '#6B8CAE' }}>⏱</span>
            <span className="font-mono font-bold text-sm text-white">{fmt(seconds)}</span>
          </div>

          {/* WPM */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs" style={{ color: '#6B8CAE' }}>WPM</span>
            <span className="font-mono font-bold text-sm"
              style={{ color: wpm > 0 && (wpm < 100 || wpm > 180) ? '#F59E0B' : wpm > 0 ? '#00C49A' : '#6B8CAE' }}>
              {wpm || '—'}
            </span>
          </div>

          {/* Filler counter */}
          <div
            className="flex items-center gap-2 px-3 py-1 rounded-full transition-all duration-200"
            style={{
              background:  fillerFlash ? 'rgba(239,68,68,0.18)' : 'rgba(255,255,255,0.05)',
              border:      `1px solid ${fillerFlash ? 'rgba(239,68,68,0.55)' : 'rgba(255,255,255,0.08)'}`,
              transform:   fillerFlash ? 'scale(1.08)' : 'scale(1)',
            }}
          >
            <span className="text-sm">{fillerFlash ? '⚡' : '💬'}</span>
            <span className="text-sm font-bold"
              style={{ color: fillerCount > 5 ? '#F87171' : fillerCount > 0 ? '#F59E0B' : '#6B8CAE' }}>
              {fillerCount} filler{fillerCount !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Pauses */}
          {pauseCount > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs" style={{ color: '#6B8CAE' }}>⏸</span>
              <span className="text-xs font-bold"
                style={{ color: pauseCount > 3 ? '#F59E0B' : '#6B8CAE' }}>
                {pauseCount} pause{pauseCount !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          <div className="flex-1" />

          {/* Progress fraction */}
          <span className="text-xs font-semibold" style={{ color: '#6B8CAE' }}>
            {currentParaIdx + 1} / {paragraphs.length}
          </span>

          {/* Script title */}
          <span className="hidden sm:block text-xs font-semibold truncate max-w-[160px]"
            style={{ color: '#6B8CAE' }}>
            📜 {script?.title}
          </span>
        </div>

        {/* ── Teleprompter body (the ONLY scrollable element) ── */}
        <div
          ref={scrollContainer}
          className="flex-1 overflow-y-auto"
          style={{ scrollBehavior: 'smooth' }}
        >
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
                    fontSize:      isCurrent ? '1.3rem'  : '1.05rem',
                    fontWeight:    isCurrent ? '600'     : '400',
                    lineHeight:    isCurrent ? '2'       : '1.75',
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
            {/* Bottom padding so last para can centre */}
            <div style={{ height: '40vh' }} />
          </div>
        </div>

        {/* ── Bottom bar — mic + live transcript ── */}
        <div
          className="shrink-0 px-4 pt-2 pb-3"
          style={{
            background:   'rgba(6,14,26,0.97)',
            borderTop:    '1px solid rgba(255,255,255,0.07)',
            backdropFilter: 'blur(14px)',
          }}
        >
          {/* Live transcript — always visible here, confirms voice capture */}
          <div
            className="mb-2 min-h-[28px] px-3 py-1 rounded-xl text-sm transition-all"
            style={{
              background: liveText
                ? 'rgba(255,107,53,0.08)'
                : 'rgba(255,255,255,0.03)',
              border: `1px solid ${liveText ? 'rgba(255,107,53,0.25)' : 'rgba(255,255,255,0.06)'}`,
            }}
          >
            {liveText ? (
              <span className="italic" style={{ color: '#FF9D6F' }}>🎤 {liveText}</span>
            ) : (
              <span style={{ color: 'rgba(107,140,174,0.5)', fontSize: '0.8rem' }}>
                Listening… speak a word and you'll see it here
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-4">
            {/* Mic pulse indicator */}
            <div className="flex items-center gap-2">
              <div className="relative flex items-center justify-center w-7 h-7">
                <div
                  className="absolute w-7 h-7 rounded-full animate-ping"
                  style={{ background: 'rgba(255,107,53,0.25)', animationDuration: '1.2s' }}
                />
                <div className="w-3 h-3 rounded-full" style={{ background: '#FF6B35' }} />
              </div>
              <span className="text-sm font-semibold" style={{ color: '#FF6B35' }}>
                Listening…
              </span>
            </div>

            <button
              onClick={handleDone}
              className="px-6 py-2.5 rounded-2xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95"
              style={{
                background:  'linear-gradient(135deg, #FF6B35, #FF8F4F)',
                boxShadow:   '0 4px 16px rgba(255,107,53,0.35)',
              }}
            >
              Done Reading →
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── ANALYZING ─────────────────────────────────────────────────────────────
  if (phase === 'analyzing') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6"
        style={{ background: '#060E1A' }}>
        <div className="animate-float"><VakMascot level={3} size={100} /></div>
        <div className="text-center">
          <div className="text-white font-bold text-xl mb-2">Analysing your delivery…</div>
          <div style={{ color: '#6B8CAE' }}>Comparing your reading against the original script</div>
        </div>
        <div className="flex gap-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full animate-bounce"
              style={{ background: '#A78BFA', animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    )
  }

  // ── REPORT ────────────────────────────────────────────────────────────────
  // NOTE: RewardCard is shown INLINE at the top — NOT as a full-screen gate.
  // The full feedback report is always visible below it.
  if (phase === 'report' && report) {
    const fc = report.filler_word_count ?? fillerCount

    return (
      <div className="min-h-screen" style={{ background: '#060E1A' }}>
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 py-8 animate-slide-up">

          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3 animate-float">
              <VakMascot level={report.overall_score >= 80 ? 4 : 3} size={90} />
            </div>
            <h2 className="text-white font-black text-2xl mb-1">Reading Complete!</h2>
            <p style={{ color: '#6B8CAE' }}>
              {script?.title} · {fmt(seconds)}
              {report.avgWpm > 0 && ` · ${report.avgWpm} WPM`}
            </p>
          </div>

          {/* XP reward — inline, not a full-screen gate */}
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
                style={{
                  background: 'linear-gradient(145deg, #0F1E35, #091522)',
                  border: `1px solid ${scoreColor(value)}30`,
                }}>
                <div className="text-lg mb-1">{icon}</div>
                <div className="text-2xl font-black" style={{ color: scoreColor(value) }}>{value}</div>
                <div className="text-xs mt-0.5" style={{ color: '#6B8CAE' }}>{label}</div>
              </div>
            ))}
          </div>

          {/* What each score means */}
          <div
            className="rounded-2xl px-4 py-3 mb-5 text-xs leading-relaxed space-y-1"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <p style={{ color: '#6B8CAE' }}>
              <span className="text-white font-semibold">Accuracy</span> — how closely your words matched the script
            </p>
            <p style={{ color: '#6B8CAE' }}>
              <span className="text-white font-semibold">Fluency</span> — smooth delivery without unnatural breaks
            </p>
            <p style={{ color: '#6B8CAE' }}>
              <span className="text-white font-semibold">Pacing</span> — speaking speed (ideal: 120–150 WPM)
            </p>
          </div>

          {/* Vak's coaching summary */}
          <div className="card mb-4"
            style={{ background: 'rgba(139,92,246,0.08)', borderColor: 'rgba(139,92,246,0.2)' }}>
            <div className="flex gap-3">
              <span className="text-xl shrink-0">🦢</span>
              <p className="text-sm leading-relaxed" style={{ color: '#E2E8F0' }}>{report.summary}</p>
            </div>
          </div>

          {/* Filler words */}
          <div className="card mb-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xl">💬</span>
              <div className="font-semibold text-white text-sm flex-1">Filler Words Detected</div>
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
                {fc === 0
                  ? '🎉 Zero filler words — excellent control!'
                  : 'Replace filler words with a deliberate 1-second pause instead.'}
              </p>
            )}
          </div>

          {/* Long pauses */}
          <div className="card mb-4">
            <div className="flex items-center gap-3">
              <span className="text-xl">⏸️</span>
              <div className="font-semibold text-white text-sm flex-1">Long Pauses (&gt;2.5 s)</div>
              <div className="text-xl font-black"
                style={{ color: pauseCount > 4 ? '#F87171' : pauseCount > 1 ? '#F59E0B' : '#00C49A' }}>
                {pauseCount}
              </div>
            </div>
            {report.pause_note && (
              <p className="text-sm mt-2" style={{ color: '#6B8CAE' }}>{report.pause_note}</p>
            )}
          </div>

          {/* Pacing note */}
          {report.pacing_note && (
            <div className="card mb-4"
              style={{ background: 'rgba(59,130,246,0.06)', borderColor: 'rgba(59,130,246,0.2)' }}>
              <div className="flex gap-3">
                <span className="text-xl shrink-0">🎙️</span>
                <p className="text-sm" style={{ color: '#E2E8F0' }}>{report.pacing_note}</p>
              </div>
            </div>
          )}

          {/* Missed / altered phrases */}
          {report.missed_phrases?.length > 0 && (
            <div className="card mb-4"
              style={{ background: 'rgba(245,158,11,0.06)', borderColor: 'rgba(245,158,11,0.2)' }}>
              <div className="flex gap-3">
                <span className="text-xl shrink-0">📝</span>
                <div>
                  <div className="font-semibold text-sm mb-2" style={{ color: '#F59E0B' }}>
                    Phrases you skipped or changed
                  </div>
                  <ul className="space-y-1.5">
                    {report.missed_phrases.map((ph, i) => (
                      <li key={i} className="text-sm italic" style={{ color: '#E2E8F0' }}>
                        "…{ph}…"
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs mt-2" style={{ color: '#6B8CAE' }}>
                    These are phrases from the original script that you said differently or skipped.
                    Practice them separately in your next session.
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
            <div className="card mb-6"
              style={{ background: 'rgba(255,107,53,0.06)', borderColor: 'rgba(255,107,53,0.2)' }}>
              <div className="flex gap-3">
                <span className="text-xl shrink-0">🎯</span>
                <div>
                  <div className="text-sm font-semibold mb-1" style={{ color: '#FF6B35' }}>
                    Your action item for next time
                  </div>
                  <p className="text-sm" style={{ color: '#E2E8F0' }}>{report.action_item}</p>
                </div>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={resetForReread}
              className="flex-1 py-3 rounded-2xl font-bold text-sm transition-all hover:opacity-90"
              style={{
                background: 'rgba(139,92,246,0.12)',
                border: '1px solid rgba(139,92,246,0.3)',
                color: '#A78BFA',
              }}
            >
              🔁 Read again
            </button>
            <button
              onClick={fullReset}
              className="flex-1 py-3 rounded-2xl font-bold text-sm text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #FF6B35, #FF8F4F)' }}
            >
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
