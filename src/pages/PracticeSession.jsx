import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom'
import { useAuth }     from '../hooks/useAuth'
import { useProgress } from '../hooks/useProgress'
import { useSubscription } from '../hooks/useSubscription'
import { supabase }    from '../lib/supabase'
import { sendPracticeMessage, analyzeSession, analyzeSessionFromAudio, synthesizeSpeech, transcribeSpeech, LANGUAGES, OPENING_LINES } from '../lib/gemini'
import { track, EV } from '../lib/analytics'
import { playPcmBase64, stopPlayback, primeAudio } from '../lib/voicePlayer'
import { getPersona, personaName, personaSub } from '../lib/personas'
import { SCENARIOS } from '../lib/progression'
import { fetchSan4Score, getLastMetrics, saveLastMetrics, fmtDelta } from '../lib/san4Score'
import { C, F, mono } from '../lib/ink'
import {
  Screen, Back, Btn, TextBtn, H1, Sub, Spacer, Rows, PrivatePill, Waveform, MicButton, Dots, Working,
  Notice, BackIcon, SpeakerIcon, LockIcon,
} from '../components/ink/Ink'

// ── Browser speech API support check ─────────────────────────────────────────
const SR_Class = window.SpeechRecognition || window.webkitSpeechRecognition
const VOICE_SUPPORTED = !!SR_Class && !!window.speechSynthesis

// Free sessions run four minutes; Pro sells the longer ones.
const FREE_SESSION_SECONDS = 240

// ── Helpers ───────────────────────────────────────────────────────────────────
const clock = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

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
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg']
  return types.find(t => MediaRecorder.isTypeSupported(t)) || 'audio/webm'
}

// ── Chat bubble, as designed: persona left, you right, live take in teal ────
function Bubble({ role, tag, text }) {
  const s = role === 'ai'
    ? { align: 'flex-start', tagColor: C.lilac, bg: 'rgba(255,255,255,.045)', bd: C.line, fg: C.bubble, radius: '4px 16px 16px 16px' }
    : role === 'user'
      ? { align: 'flex-end', tagColor: C.dim, bg: 'rgba(123,94,167,.16)', bd: 'rgba(123,94,167,.4)', fg: C.paper, radius: '16px 4px 16px 16px' }
      : { align: 'flex-end', tagColor: C.teal, bg: 'rgba(0,196,154,.07)', bd: 'rgba(0,196,154,.3)', fg: C.soft, radius: '16px 4px 16px 16px' }
  return (
    <div style={{ alignSelf: s.align, maxWidth: '84%', animation: 'fadeUp .25s ease both' }}>
      <div style={{ ...mono(10, s.tagColor, '.12em'), marginBottom: 6, textAlign: role === 'ai' ? 'left' : 'right' }}>{tag}</div>
      <div style={{ padding: '13px 15px', borderRadius: s.radius, background: s.bg, border: `1px solid ${s.bd}`, fontSize: 14.5, lineHeight: 1.55, color: s.fg }}>{text}</div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function PracticeSession() {
  const { scenarioId }  = useParams()
  const [params]        = useSearchParams()
  const { user }        = useAuth()
  const navigate        = useNavigate()
  const { awardXP }     = useProgress()
  const { isPro }       = useSubscription()

  const scenario = SCENARIOS.find(s => s.id === scenarioId) || { id: scenarioId, title: scenarioId, level: null }
  const typed = params.get('mode') === 'type'

  // Interview mode (Pro): the pasted job post shapes the interview and the score.
  const jobPost = (() => {
    if (params.get('jd') !== '1' || !isPro) return ''
    try { return sessionStorage.getItem('san4_jd') || '' } catch { return '' }
  })()
  const jobPostRef = useRef(jobPost)
  useEffect(() => { jobPostRef.current = jobPost }, [jobPost])

  // ── Core session state ────────────────────────────────────────────────────
  // stage: live | review | analyzing | report | empty | failed
  const [stage,      setStage]      = useState('live')
  const [messages,   setMessages]   = useState([])
  const [aiThinking, setAiThinking] = useState(false)
  const [report,     setReport]     = useState(null)
  const [seconds,    setSeconds]    = useState(0)
  const [started,    setStarted]    = useState(false)
  const [hitLimit,   setHitLimit]   = useState(false)

  // ── Voice state ───────────────────────────────────────────────────────────
  const [voiceMode,   setVoiceMode]   = useState(!typed && VOICE_SUPPORTED)
  const [listening,   setListening]   = useState(false)
  const [liveText,    setLiveText]    = useState('')   // shown while recording
  const [transcribing, setTranscribing] = useState(false) // Gemini STT fallback in flight
  const [ttsOn,       setTtsOn]       = useState(!typed)
  const [vakSpeaking, setVakSpeaking] = useState(false)
  const [micBlocked,  setMicBlocked]  = useState(false) // mic permission denied

  // Speaking language (chosen in onboarding). Any Indian language turns on
  // ESL mode: Vak won't penalise code-switching or Indian English structure.
  const lang = (() => { try { return localStorage.getItem('san4_lang') || 'en-US' } catch { return 'en-US' } })()
  const langRef = useRef(lang)
  const eslMode = (() => {
    if (lang !== 'en-US') return true
    try { return localStorage.getItem('san4_esl_mode') === 'true' } catch { return false }
  })()

  // ── Persona (accent / context of the counterpart) ──────────────────────────
  const persona = getPersona(params.get('persona') || (() => { try { return localStorage.getItem('san4_persona') } catch { return null } })() || 'default')
  const personaRef = useRef(persona)
  const pName = personaName(persona)

  // ── Text input ────────────────────────────────────────────────────────────
  const [textInput, setTextInput] = useState('')

  // ── Voice refs ────────────────────────────────────────────────────────────
  const recRef          = useRef(null)
  const isListeningRef  = useRef(false)
  const accRef          = useRef('')          // accumulated final transcript
  const autoSendTimer   = useRef(null)
  const speechStart     = useRef(null)
  const voiceMetaRef    = useRef({ wpmSamples: [], totalSpeakingSeconds: 0 })
  const ttsReqRef       = useRef(0)   // supersedes stale/pending neural TTS
  const ttsOnRef        = useRef(ttsOn)
  useEffect(() => { ttsOnRef.current = ttsOn }, [ttsOn])

  // ── MediaRecorder — records full session audio as Gemini analysis backup ──
  const mediaRecRef    = useRef(null)
  const audioChunksRef = useRef([])
  const audioStreamRef = useRef(null)
  const audioMimeRef   = useRef('audio/webm')

  // ── Per-turn recorder — Gemini transcription fallback ─────────────────────
  // Browser SpeechRecognition is unreliable for Hindi and other Indian
  // languages. We also record each turn separately; if STT captures nothing,
  // Gemini transcribes the turn's audio so the user's answer still lands.
  const turnRecRef    = useRef(null)
  const turnChunksRef = useRef([])

  // The finished take, held until the user keeps it or throws it away.
  const takeRef = useRef(null)

  const bottomRef = useRef(null)
  const textRef   = useRef(null)
  const endingRef = useRef(false)

  // ── Timer + free-tier limit ───────────────────────────────────────────────
  useEffect(() => {
    if (!started) return
    const t = setInterval(() => setSeconds(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [started])

  useEffect(() => {
    if (started && !isPro && seconds >= FREE_SESSION_SECONDS && !endingRef.current) {
      setHitLimit(true)
      endSession()
    }
  }, [seconds]) // eslint-disable-line

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, aiThinking, liveText, transcribing])

  // ── Start straight away (persona and mode were chosen on the screens before)
  useEffect(() => { beginSession(); return () => teardown() }, []) // eslint-disable-line

  function beginSession() {
    endingRef.current = false
    setStarted(true)
    setSeconds(0)
    setHitLimit(false)
    voiceMetaRef.current = { wpmSamples: [], totalSpeakingSeconds: 0 }
    audioChunksRef.current = []

    // Opening lines are fixed per scenario, so Vak speaks instantly with no
    // Gemini round-trip. The first real API call is the user's first answer.
    const opening = OPENING_LINES[scenario.id] || "Let's begin. I'm ready when you are."
    setMessages([{ role: 'ai', content: opening }])
    speak(opening)
    if (typed) setTimeout(() => textRef.current?.focus(), 50)

    // Mic + MediaRecorder in parallel; never blocks the start. The recording
    // is the assessment backup: if STT fails, Gemini analyses the raw audio.
    if (!typed) startRecorder()
  }

  function teardown() {
    stopVak()
    isListeningRef.current = false
    clearTimeout(autoSendTimer.current)
    try { recRef.current?.abort() } catch { /* ignore */ }
    try { if (mediaRecRef.current?.state !== 'inactive') mediaRecRef.current?.stop() } catch { /* ignore */ }
    audioStreamRef.current?.getTracks().forEach(t => t.stop())
  }

  function startRecorder() {
    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then(stream => {
        audioStreamRef.current = stream
        const mime = pickMime()
        audioMimeRef.current = mime
        const rec = new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 32000 })
        rec.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
        rec.start(1000)
        mediaRecRef.current = rec
        setMicBlocked(false)
      })
      .catch(err => {
        console.warn('Mic unavailable:', err.message)
        setMicBlocked(true)
      })
  }

  // ── Speech Recognition setup ──────────────────────────────────────────────
  useEffect(() => {
    if (!SR_Class) return
    const rec = new SR_Class()
    rec.lang             = 'en-US'
    rec.continuous       = true
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
          if (isListeningRef.current && accRef.current.trim()) stopAndSend()
        }, 1800)
      } else if (interimChunk) {
        setLiveText((accRef.current + ' ' + interimChunk).trim())
      }
    }

    rec.onend = () => {
      // continuous:true → onend fires on stop()/abort() or when the browser
      // closes the stream itself. Restart if we still want to listen.
      if (isListeningRef.current) {
        setTimeout(() => {
          if (isListeningRef.current) {
            try { rec.start() } catch (err) {
              console.warn('STT restart failed:', err.message)
              isListeningRef.current = false
              setListening(false)
            }
          }
        }, 120)
      } else {
        setListening(false)
      }
    }

    rec.onerror = (e) => {
      console.warn('STT error:', e.error)
      if (['not-allowed', 'permission-denied', 'audio-capture'].includes(e.error)) {
        setMicBlocked(true)
        isListeningRef.current = false
        setListening(false)
      }
      // no-speech / aborted / network: onend handles the restart
    }

    recRef.current = rec
    return () => {
      isListeningRef.current = false
      clearTimeout(autoSendTimer.current)
      try { rec.abort() } catch { /* ignore */ }
    }
  }, [])

  function startListening() {
    if (!recRef.current || listening) return
    recRef.current.lang = langRef.current
    stopVak() // user wants to speak
    accRef.current = ''
    setLiveText('')
    speechStart.current = Date.now()

    // Per-turn recording on the already-open mic stream (Gemini STT fallback).
    if (audioStreamRef.current) {
      try {
        const turnRec = new MediaRecorder(audioStreamRef.current, { mimeType: audioMimeRef.current, audioBitsPerSecond: 40000 })
        turnChunksRef.current = []
        turnRec.ondataavailable = e => { if (e.data.size > 0) turnChunksRef.current.push(e.data) }
        turnRec.start(500)
        turnRecRef.current = turnRec
      } catch (err) {
        console.warn('Turn recorder failed:', err.message)
        turnRecRef.current = null
      }
    }

    try {
      recRef.current.start()
      isListeningRef.current = true
      setListening(true)
    } catch (err) {
      console.error('Could not start microphone:', err.message)
      if (err.name === 'InvalidStateError') {
        try { recRef.current.abort() } catch { /* ignore */ }
        setTimeout(() => startListening(), 200)
      }
    }
  }

  async function stopAndSend() {
    isListeningRef.current = false
    try { recRef.current.stop() } catch { /* ignore */ }
    clearTimeout(autoSendTimer.current)
    setListening(false)

    let turnBlob = null
    if (turnRecRef.current && turnRecRef.current.state !== 'inactive') {
      await new Promise(resolve => {
        turnRecRef.current.onstop = resolve
        try { turnRecRef.current.stop() } catch { resolve() }
      })
    }
    if (turnChunksRef.current.length > 0) {
      turnBlob = new Blob(turnChunksRef.current, { type: audioMimeRef.current })
      turnChunksRef.current = []
    }
    turnRecRef.current = null

    let text = accRef.current.trim()
    const durSec = speechStart.current ? (Date.now() - speechStart.current) / 1000 : 0
    setLiveText('')
    accRef.current = ''

    // Browser STT caught nothing (typical for Hindi and code-switching):
    // fall back to Gemini transcription of the turn's actual audio.
    if (!text && turnBlob && durSec >= 1.5) {
      setTranscribing(true)
      try {
        const buf = await turnBlob.arrayBuffer()
        const langName = LANGUAGES.find(l => l.code === langRef.current)?.nativeName || 'English or Hindi'
        text = await transcribeSpeech(arrayBufferToBase64(buf), audioMimeRef.current.split(';')[0], langName)
      } finally {
        setTranscribing(false)
      }
      if (!text) {
        setLiveText("Couldn't catch that. Tap the mic and try once more, a little louder.")
        return
      }
    }
    if (!text) return

    if (durSec > 0) {
      const wpm = Math.round((text.split(/\s+/).length / durSec) * 60)
      if (wpm > 30 && wpm < 400) {
        voiceMetaRef.current.wpmSamples.push(wpm)
        voiceMetaRef.current.totalSpeakingSeconds += durSec
      }
    }
    submitMessage(text)
  }

  // ── Stop any Vak speech (neural audio + browser TTS) ──────────────────────
  function stopVak() {
    ttsReqRef.current++
    stopPlayback()
    window.speechSynthesis?.cancel()
    setVakSpeaking(false)
  }

  // ── TTS — the persona speaks back ─────────────────────────────────────────
  // Primary: natural Gemini neural voice. Fallback: browser speechSynthesis.
  async function speak(text) {
    if (!ttsOnRef.current || !text) return
    stopVak()
    const reqId = ++ttsReqRef.current
    try {
      const { audioBase64, sampleRate } = await synthesizeSpeech(text)
      if (reqId !== ttsReqRef.current || !ttsOnRef.current) return
      await playPcmBase64(audioBase64, sampleRate, {
        onstart: () => setVakSpeaking(true),
        onend:   () => setVakSpeaking(false),
      })
    } catch (err) {
      console.warn('Neural TTS failed, using browser voice:', err.message)
      if (reqId === ttsReqRef.current) browserSpeak(text)
    }
  }

  function browserSpeak(text) {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(text)
    utt.lang  = personaRef.current?.ttsLang || 'en-IN'
    utt.rate  = 0.95
    utt.pitch = 1.1
    const voices = window.speechSynthesis.getVoices?.() || []
    const match  = voices.find(v => v.lang === utt.lang) || voices.find(v => v.lang?.startsWith(utt.lang.split('-')[0]))
    if (match) utt.voice = match
    utt.onstart = () => setVakSpeaking(true)
    utt.onend   = () => setVakSpeaking(false)
    utt.onerror = () => setVakSpeaking(false)
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

    const jdNote = jobPostRef.current
      ? `\n\nINTERVIEW MODE: You are interviewing the user for this specific role. Ask about what this job post actually needs, and probe the gaps.\nJOB POST:\n${jobPostRef.current.slice(0, 4000)}`
      : ''
    try {
      const response = await sendPracticeMessage(scenario.id, messages, text, {
        eslMode,
        personaPrompt: (personaRef.current?.prompt || '') + jdNote,
      })
      if (response.includes('[SESSION_ENDED]')) {
        const clean = response.replace('[SESSION_ENDED]', '').trim()
        const finalMsgs = clean ? [...newMsgs, { role: 'ai', content: clean }] : newMsgs
        if (clean) { setMessages(finalMsgs); speak(clean) }
        setTimeout(() => endSession(finalMsgs), clean ? 2500 : 0)
      } else {
        setMessages([...newMsgs, { role: 'ai', content: response }])
        speak(response)
      }
    } catch (err) {
      console.error('Gemini error:', err)
      setMessages([...newMsgs, { role: 'ai', content: "Sorry, I couldn't connect. Please check your internet and try again." }])
    }
    setAiThinking(false)
  }

  // ── End: stop capturing, hold the take, ask keep or retry ────────────────
  // Nothing is scored, stored or counted until the user keeps the take.
  async function endSession(finalMessages) {
    if (endingRef.current) return
    endingRef.current = true
    stopVak()
    isListeningRef.current = false
    try { recRef.current?.abort() } catch { /* ignore */ }
    setListening(false)
    setStarted(false)

    const msgList = finalMessages || messages

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
        const blob = new Blob(audioChunksRef.current, { type: audioMimeRef.current })
        audioPayload = { base64: arrayBufferToBase64(await blob.arrayBuffer()), mimeType: audioMimeRef.current.split(';')[0] }
      } catch (err) {
        console.warn('Audio encoding failed:', err.message)
      }
    }
    audioChunksRef.current = []

    const wpmSamples = voiceMetaRef.current.wpmSamples
    const voiceMeta = wpmSamples.length
      ? { avgWpm: Math.round(wpmSamples.reduce((a, b) => a + b, 0) / wpmSamples.length), totalSpeakingSeconds: Math.round(voiceMetaRef.current.totalSpeakingSeconds) }
      : null

    // Don't score an empty session: require recognised/typed input, or a
    // real chunk of recorded audio (~12s).
    const hasUserMessages = msgList.some(m => m.role === 'user')
    const spokeSomething = hasUserMessages || (audioPayload && seconds >= 12)
    if (!spokeSomething) { takeRef.current = null; setStage('empty'); return }

    takeRef.current = { msgList, audioPayload, voiceMeta, hasUserMessages, seconds }
    setStage('review')
  }

  function retry() {
    takeRef.current = null
    setReport(null)
    setMessages([])
    setStage('live')
    beginSession()
  }

  function discard() {
    takeRef.current = null
    navigate('/today')
  }

  // ── Keep: score it, save it, move the number ─────────────────────────────
  async function keepTake() {
    const take = takeRef.current
    if (!take) return
    setStage('analyzing')
    try {
      const scoreBefore = await fetchSan4Score(user?.id)
      const prevMetrics = getLastMetrics(user?.id)
      let analysis = null
      if (!take.hasUserMessages && take.audioPayload) {
        analysis = await analyzeSessionFromAudio(scenario.title, take.audioPayload.base64, take.audioPayload.mimeType, lang, { jobPost: jobPostRef.current })
      }
      if (!analysis) {
        analysis = await analyzeSession(scenario.title, take.msgList, take.voiceMeta, { eslMode, jobPost: jobPostRef.current })
      }
      if (!analysis || typeof analysis.overall_score !== 'number') { setStage('failed'); return }

      if (user) {
        await supabase.from('practice_sessions').insert({
          user_id:           user.id,
          scenario_id:       scenario.id,
          scenario_title:    scenario.title,
          messages:          take.msgList,
          filler_word_count: analysis.filler_word_count,
          confidence_score:  analysis.confidence_score,
          pacing_score:      analysis.pacing_score,
          overall_score:     analysis.overall_score,
          duration_seconds:  take.seconds,
          feedback:          analysis.summary,
          action_item:       analysis.action_item,
        })
      }
      track(EV.SESSION_COMPLETED, { scenario_id: scenarioId, score: analysis.overall_score })
      takeRef.current = null // the audio is gone once scored

      const reward = await awardXP(analysis.overall_score)
      const scoreAfter = await fetchSan4Score(user?.id)
      const metrics = {
        clarity:   Number.isFinite(analysis.clarity_score) ? analysis.clarity_score : null,
        structure: Number.isFinite(analysis.structure_score) ? analysis.structure_score : null,
      }
      if (metrics.clarity != null || metrics.structure != null) saveLastMetrics(user?.id, metrics)
      setReport({ ...analysis, reward, scoreBefore, scoreAfter, metrics, prevMetrics })
      setStage('report')
    } catch (err) {
      console.error('Analysis error:', err)
      setStage('failed') // never fabricate a score
    }
  }

  // ── EMPTY — nothing to score ──────────────────────────────────────────────
  if (stage === 'empty') return (
    <Screen>
      <Back to="/today" />
      <H1 size={28}>Nothing to score yet.</H1>
      <Sub>You ended before saying anything, so there is no score and no streak for this one. Nothing was kept.</Sub>
      <Spacer />
      <Btn onClick={retry}>Start again</Btn>
      <TextBtn to="/today" style={{ marginTop: 10 }}>Back to Today</TextBtn>
    </Screen>
  )

  // ── FAILED — honest, no fabricated score or XP ────────────────────────────
  if (stage === 'failed') return (
    <Screen>
      <H1 size={28} style={{ marginTop: 24 }}>We could not score that one.</H1>
      <Sub>Something went wrong while analysing, so nothing was saved and your streak is untouched. Check your connection and try again.</Sub>
      <Spacer />
      <Btn onClick={retry}>Try again</Btn>
      <TextBtn to="/today" style={{ marginTop: 10 }}>Back to Today</TextBtn>
    </Screen>
  )

  if (stage === 'analyzing') return <Working title="Scoring how you communicate" sub="One instruction coming up, and your own words, rewritten" />

  // ── 17 · Keep or retry ────────────────────────────────────────────────────
  if (stage === 'review') return (
    <Screen pad="30px 28px 26px">
      <PrivatePill />
      <H1 size={28} style={{ margin: '24px 0 14px' }}>Take as many goes as you want.</H1>
      <Sub mb={22} size={14}>Only the take you keep is scored. Attempts are not counted, not stored, and never shown to anyone.</Sub>
      {hitLimit && (
        <Notice tone="amber" style={{ marginBottom: 16 }}>
          Free sessions run four minutes, so we stopped here. <Link to="/pro" style={{ color: C.amber, fontWeight: 600 }}>Pro runs longer.</Link>
        </Notice>
      )}
      <Rows radius={18}>
        {[
          'Audio goes to the scorer and is deleted the same minute',
          'No leaderboard, no classmates, no public profile unless you publish it',
          'Mixing Hindi into an English answer is not a mistake here',
        ].map((t, i) => (
          <div key={i} style={{ padding: '14px 17px', background: C.panel, display: 'flex', gap: 13, alignItems: 'flex-start' }}>
            <span style={{ ...mono(11, C.teal, 0), paddingTop: 2 }}>0{i + 1}</span>
            <span style={{ fontSize: 13, lineHeight: 1.5, color: C.soft }}>{t}</span>
          </div>
        ))}
      </Rows>
      <Spacer min={24} />
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <Btn kind="quiet" onClick={retry} style={{ padding: 15, borderRadius: 15 }}>Try again, free</Btn>
        <Btn kind="teal" onClick={keepTake} style={{ padding: 15, borderRadius: 15 }}>Keep this take</Btn>
      </div>
      <TextBtn onClick={discard}>Delete and start over</TextBtn>
    </Screen>
  )

  // ── 18 · The one instruction ──────────────────────────────────────────────
  if (stage === 'report' && report) {
    const delta = fmtDelta(report.scoreAfter, report.scoreBefore)
    const points = delta == null ? '' : delta === '±0' ? ' · SCORE HELD' : ` · ${delta} POINT${Math.abs(report.scoreAfter - report.scoreBefore) === 1 ? '' : 'S'}`
    const passed = scenario.passScore && report.overall_score >= scenario.passScore
    const tiles = [
      ['CLARITY', report.metrics.clarity, report.prevMetrics?.clarity],
      ['STRUCTURE', report.metrics.structure, report.prevMetrics?.structure],
    ].filter(([, v]) => Number.isFinite(v))
    return (
      <Screen pad="28px 28px 24px">
        <div style={mono(10, C.dim, '.18em')}>AFTER THE SESSION{points}{report.reward?.xpGained ? ` · +${report.reward.xpGained} XP` : ''}</div>
        <div style={{ margin: '20px 0 0', padding: '24px 22px', borderRadius: 22, background: C.cardHi, border: '1px solid rgba(169,140,224,.35)' }}>
          <div style={{ ...mono(10, C.lilac), marginBottom: 14 }}>DO THIS NEXT TIME</div>
          <p style={{ margin: 0, fontFamily: F.display, fontWeight: 300, fontSize: 24, lineHeight: 1.32, letterSpacing: '-.01em' }}>{report.action_item}</p>
          {report.better_opening && <>
            <div style={{ height: 1, background: 'rgba(255,255,255,.1)', margin: '20px 0 14px' }} />
            <div style={{ ...mono(10, C.teal, '.14em'), marginBottom: 8 }}>SAY IT LIKE THIS INSTEAD</div>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: C.soft }}>"{report.better_opening}"</p>
          </>}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          {(tiles.length ? tiles : [['OVERALL', report.overall_score, null]]).map(([label, v, prev]) => {
            const d = fmtDelta(v, prev)
            return (
              <div key={label} style={{ flex: 1, padding: '15px 17px', borderRadius: 16, border: `1px solid ${C.line}` }}>
                <div style={mono(9.5, C.dim, '.14em')}>{label}</div>
                <div style={{ fontFamily: F.display, fontWeight: 400, fontSize: 26, marginTop: 5 }}>{v}</div>
                {d && <div style={{ ...mono(11, d.startsWith('-') ? C.amber : C.teal, 0), marginTop: 3 }}>{d}</div>}
              </div>
            )
          })}
        </div>

        {passed && (
          <Notice style={{ marginTop: 14 }}>
            Passed Level {scenario.level} with {report.overall_score}%. {scenario.unlockHint ? 'The next level is open.' : ''}
          </Notice>
        )}

        {/* Line-by-line: Pro depth */}
        {report.line_notes?.length > 0 && (isPro ? (
          <div style={{ marginTop: 16 }}>
            <div style={{ ...mono(10, C.lilac), marginBottom: 10 }}>LINE BY LINE</div>
            <Rows>
              {report.line_notes.slice(0, 6).map((n, i) => (
                <div key={i} style={{ padding: '13px 16px', background: C.panel }}>
                  <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: C.dim }}>"{n.said}"</p>
                  <p style={{ margin: '6px 0 0', fontSize: 13, lineHeight: 1.5, color: C.paper }}>{n.better}</p>
                </div>
              ))}
            </Rows>
          </div>
        ) : (
          <Link to="/pro" style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderRadius: 16, border: '1px dashed rgba(255,255,255,.16)', textDecoration: 'none' }}>
            <LockIcon color={C.lilac} />
            <span style={{ flex: 1, font: `500 12.5px ${F.sans}`, color: C.soft }}>Line by line breakdown of what you said</span>
            <span style={mono(9.5, C.amber, '.1em')}>PRO</span>
          </Link>
        ))}

        <div style={{ flex: 1, minHeight: 14 }} />
        <Btn onClick={retry} style={{ padding: 16, borderRadius: 15, fontSize: 14.5, marginTop: 14 }}>Redo it with that one change</Btn>
        <TextBtn to="/today" style={{ marginTop: 10 }}>Back to Today</TextBtn>
      </Screen>
    )
  }

  // ── 16 · Live session ─────────────────────────────────────────────────────
  const turns = messages.filter(m => m.role === 'user').length
  const busy = aiThinking || transcribing
  const nearLimit = !isPro && seconds >= FREE_SESSION_SECONDS - 15
  const hint = transcribing ? 'Writing down what you said'
    : aiThinking ? `${pName} is thinking`
    : vakSpeaking ? `${pName} is speaking. Tap to cut in`
    : listening ? 'Tap to send'
    : turns >= 3 ? 'Tap End when you are ready' : 'Tap and speak'

  return (
    <div style={{ height: '100dvh', background: C.ink, color: C.paper, display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 'calc(env(safe-area-inset-top, 0px) + 14px) 22px 14px', borderBottom: '1px solid rgba(255,255,255,.07)', flex: 'none' }}>
          <button aria-label="Back" onClick={() => { teardown(); navigate(-1) }} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: C.dim }}><BackIcon /></button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: `600 14px ${F.sans}` }}>{pName}</div>
            <div style={{ font: `400 11.5px ${F.sans}`, color: C.dim, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {jobPost ? 'Interview mode · your job post' : `${scenario.title} · ${personaSub(persona)}`}
            </div>
          </div>
          <button aria-label={ttsOn ? 'Mute the voice' : 'Turn the voice on'} onClick={() => { setTtsOn(v => !v); stopVak() }}
            style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
            <SpeakerIcon on={ttsOn} />
          </button>
          <div style={{ ...mono(12, nearLimit ? C.amber : C.dim, 0), padding: '5px 10px', border: `1px solid ${nearLimit ? 'rgba(245,158,11,.5)' : 'rgba(255,255,255,.1)'}`, borderRadius: 8 }}>{clock(seconds)}</div>
          <button onClick={() => endSession()} style={{ border: `1px solid ${C.line3}`, background: 'none', cursor: 'pointer', padding: '6px 12px', borderRadius: 9, color: C.soft, font: `600 12px ${F.sans}` }}>End</button>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 22px 10px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {messages.map((m, i) => (
            <Bubble key={i} role={m.role} tag={m.role === 'ai' ? pName.toUpperCase() : 'YOU'} text={m.content} />
          ))}
          {listening && <Bubble role="live" tag="LIVE" text={liveText || 'Listening…'} />}
          {!listening && liveText && <p style={{ alignSelf: 'flex-end', margin: 0, fontSize: 12, color: C.amber }}>{liveText}</p>}
          {busy && <div style={{ alignSelf: transcribing ? 'flex-end' : 'flex-start', padding: '6px 2px' }}><Dots size={6} /></div>}
          {micBlocked && (
            <Notice tone="red">
              The microphone is blocked. Allow it for this site, then <button onClick={startRecorder} style={{ border: 'none', background: 'none', color: '#FCA5A5', textDecoration: 'underline', cursor: 'pointer', padding: 0, font: 'inherit' }}>try again</button>. Or type below, everything still works.
            </Notice>
          )}
          {nearLimit && <p style={{ margin: 0, textAlign: 'center', fontSize: 11.5, color: C.amber }}>Free sessions end at four minutes. Start wrapping up.</p>}
          <div ref={bottomRef} />
        </div>

        {voiceMode ? (
          <>
            <div style={{ padding: '10px 22px 0', display: 'flex', alignItems: 'center', gap: 16, flex: 'none' }}>
              <div style={{ flex: 1 }}>
                <Waveform active={listening} flex count={24} height={26} gap={3} color={C.teal} origin="bottom" speed={1} />
              </div>
              <MicButton size={66} listening={listening} stopSquare disabled={busy}
                onClick={() => { primeAudio(); listening ? stopAndSend() : startListening() }} />
            </div>
            <div style={{ textAlign: 'center', padding: '12px 0 4px', ...mono(11.5, C.dim, 0), flex: 'none' }}>{hint}</div>
            <TextBtn onClick={() => { if (listening) stopAndSend(); setVoiceMode(false) }} size={11.5}
              style={{ margin: '0 auto calc(env(safe-area-inset-bottom, 0px) + 14px)', flex: 'none' }}>Type instead</TextBtn>
          </>
        ) : (
          <div style={{ padding: '10px 22px calc(env(safe-area-inset-bottom, 0px) + 18px)', borderTop: '1px solid rgba(255,255,255,.07)', flex: 'none' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <textarea ref={textRef} className="input" rows={2} value={textInput} disabled={aiThinking}
                onChange={e => setTextInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitMessage(textInput.trim()) } }}
                placeholder={`Answer ${pName}…`} style={{ resize: 'none', fontSize: 14 }} />
              <button onClick={() => submitMessage(textInput.trim())} disabled={!textInput.trim() || aiThinking} style={{
                border: 'none', cursor: 'pointer', borderRadius: 14, padding: '0 18px', height: 50, background: C.purple, color: '#fff',
                font: `700 14px ${F.sans}`, opacity: !textInput.trim() || aiThinking ? 0.45 : 1,
              }}>Send</button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <span style={mono(10.5, C.dim, 0)}>{aiThinking ? `${pName} is thinking` : 'Enter to send'}</span>
              {!typed && VOICE_SUPPORTED && <TextBtn size={11.5} onClick={() => setVoiceMode(true)} style={{ padding: 0 }}>Speak instead</TextBtn>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
