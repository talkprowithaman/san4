import { useState, useEffect, useRef } from 'react'
import { Link, Navigate, useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth }     from '../hooks/useAuth'
import { useProgress } from '../hooks/useProgress'
import { analyzeDailyRep, analyzeDailyRepText, synthesizeSpeech } from '../lib/gemini'
import { playPcmBase64, stopPlayback, primeAudio } from '../lib/voicePlayer'
import { getRep, getTodaysReps, getRepCompletions, repsUnlockedToday, REP_MAX_SECONDS } from '../lib/dailyReps'
import { keepRep } from '../lib/repScoring'
import { queueTake } from '../lib/offlineQueue'
import { fmtDelta } from '../lib/san4Score'
import { C, F, mono } from '../lib/ink'
import {
  Screen, Back, Btn, TextBtn, H1, Sub, Spacer, Rows, PrivatePill, Waveform, MicButton, Working, ConsentTick, ErrorNote, Notice,
} from '../components/ink/Ink'

function arrayBufferToBase64(buf) {
  const bytes = new Uint8Array(buf); let bin = ''; const c = 8192
  for (let i = 0; i < bytes.length; i += c) bin += String.fromCharCode(...bytes.subarray(i, i + c))
  return btoa(bin)
}
function pickMime() {
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg']
    .find(t => MediaRecorder.isTypeSupported(t)) || 'audio/webm'
}

// ── The 60-second rep ─────────────────────────────────────────────────────────
// speak:   ready → recording → review (keep or retry) → analysing → report
// type:    ready (textarea) → review → analysing → report
// offline: ready → recording → saved on the phone, scored later on wifi
export default function DailyRep() {
  const { repId } = useParams()
  const [params]  = useSearchParams()
  const { user, profile, recordVoiceConsent } = useAuth()
  const { awardXP, progress } = useProgress()
  const navigate  = useNavigate()

  const rep  = getRep(repId)
  const mode = ['type', 'offline'].includes(params.get('mode')) ? params.get('mode') : 'speak'

  const [phase,    setPhase]    = useState('ready') // ready | recording | review | analyzing | report | saved | failed
  const [left,     setLeft]     = useState(REP_MAX_SECONDS)
  const [result,   setResult]   = useState(null)
  const [micError, setMicError] = useState(null)
  const [liveText, setLiveText] = useState('')
  const [typedText, setTypedText] = useState('')
  const needsConsent = mode !== 'type' && !profile?.voice_consent_at
  const [consented, setConsented] = useState(false)

  const mediaRecRef    = useRef(null)
  const audioChunksRef = useRef([])
  const audioStreamRef = useRef(null)
  const audioMimeRef   = useRef('audio/webm')
  const timerRef       = useRef(null)
  const startedAtRef   = useRef(null)
  const stoppingRef    = useRef(false)
  const sttRef         = useRef(null) // best-effort live captions
  const recordingRef   = useRef(false)
  const takeRef        = useRef(null) // the held take: { blob, seconds } or { text }

  // Vak reads the challenge aloud on entry (speaking modes only).
  useEffect(() => {
    if (!rep || mode === 'type') return
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

  if (!rep) return <Navigate to="/today" replace />

  // Live captions so users SEE what they're saying. The recording is still the
  // source of truth; if the browser's STT can't keep up, the rep still works.
  function startLiveCaptions() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    try {
      const stt = new SR()
      stt.lang = 'en-IN'; stt.continuous = true; stt.interimResults = true
      let finals = ''
      let restarts = 0
      stt.onresult = (e) => {
        let interim = ''
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript
          if (e.results[i].isFinal) finals += t + ' '
          else interim += t
        }
        setLiveText((finals + ' ' + interim).trim())
      }
      stt.onerror = (e) => { if (['not-allowed', 'service-not-allowed', 'audio-capture'].includes(e.error)) sttRef.current = null }
      // The recognizer self-terminates constantly; revive it while recording.
      stt.onend = () => {
        if (sttRef.current !== stt || !recordingRef.current || restarts > 20) return
        restarts++
        setTimeout(() => { if (sttRef.current === stt && recordingRef.current) { try { stt.start() } catch { sttRef.current = null } } }, 150)
      }
      stt.start()
      sttRef.current = stt
    } catch { /* captions are cosmetic */ }
  }
  function stopLiveCaptions() {
    const stt = sttRef.current
    sttRef.current = null
    try { stt?.abort() } catch { /* ignore */ }
  }

  async function startRecording() {
    if (needsConsent && !consented) { setMicError('Tick the consent box first.'); return }
    if (needsConsent && user) recordVoiceConsent(user.id)
    setMicError(null); setLiveText(''); stopPlayback()
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
      setMicError('Mic access needed. Allow the microphone for this site, then tap the mic again.')
    }
  }

  async function finishRecording() {
    if (stoppingRef.current) return
    stoppingRef.current = true
    recordingRef.current = false
    clearInterval(timerRef.current)
    stopLiveCaptions()
    const spokeSeconds = (Date.now() - startedAtRef.current) / 1000

    await new Promise(resolve => {
      const recorder = mediaRecRef.current
      if (!recorder || recorder.state === 'inactive') { resolve(); return }
      recorder.onstop = resolve; recorder.stop()
    })
    audioStreamRef.current?.getTracks().forEach(t => t.stop())

    if (spokeSeconds < 3 || audioChunksRef.current.length === 0) {
      setMicError('That was too short. Take a breath and give it a real go.')
      setPhase('ready')
      return
    }
    const blob = new Blob(audioChunksRef.current, { type: audioMimeRef.current })
    audioChunksRef.current = []

    if (mode === 'offline') {
      try {
        await queueTake({ userId: user?.id, repId: rep.id, blob, mimeType: audioMimeRef.current.split(';')[0], seconds: spokeSeconds })
        setPhase('saved')
      } catch {
        setMicError('Could not save the take on this phone. Try "Speak it" instead.')
        setPhase('ready')
      }
      return
    }
    takeRef.current = { blob, seconds: spokeSeconds }
    setPhase('review')
  }

  function submitTyped() {
    if (typedText.trim().split(/\s+/).length < 8) { setMicError('Give it a few full sentences, the way you would say it.'); return }
    setMicError(null)
    takeRef.current = { text: typedText.trim(), seconds: 0 }
    setPhase('review')
  }

  function retry() {
    takeRef.current = null
    setResult(null); setMicError(null); setLiveText('')
    setPhase('ready')
  }

  async function keep() {
    const take = takeRef.current
    if (!take) return
    setPhase('analyzing')
    let analysis = null
    if (take.text) {
      analysis = await analyzeDailyRepText(rep, take.text)
    } else {
      const buf = await take.blob.arrayBuffer()
      analysis = await analyzeDailyRep(rep, arrayBufferToBase64(buf), take.blob.type.split(';')[0] || 'audio/webm')
    }
    if (!analysis) { setPhase('failed'); return }
    takeRef.current = null // the audio is gone once scored
    const kept = await keepRep({ user, rep, analysis, seconds: take.seconds, awardXP })
    setResult({ ...analysis, ...kept })
    setPhase('report')
  }

  function nextRep() {
    const done = getRepCompletions(user?.id)
    const open = getTodaysReps().slice(0, repsUnlockedToday(progress))
    return open.find(r => !done.some(c => c.id === r.id)) || null
  }

  // ── Analysing / failed ────────────────────────────────────────────────────
  if (phase === 'analyzing') return <Working title="Scoring how you communicate" sub="One instruction coming up" />

  if (phase === 'failed') return (
    <Screen>
      <H1 size={28} style={{ marginTop: 24 }}>We could not score that one.</H1>
      <Sub>Something went wrong while analysing. Nothing was saved and your streak is untouched, so just try the rep again.</Sub>
      <Spacer />
      <Btn onClick={retry}>Try again</Btn>
      <TextBtn to="/today" style={{ marginTop: 10 }}>Back to Today</TextBtn>
    </Screen>
  )

  // ── Saved for later (offline) ─────────────────────────────────────────────
  if (phase === 'saved') return (
    <Screen>
      <PrivatePill />
      <H1 size={28} style={{ margin: '24px 0 14px' }}>Saved on your phone.</H1>
      <Sub size={14}>We score it the next time you open San4 on wifi. Until then it never leaves this phone, and it is deleted once it is scored.</Sub>
      <Spacer />
      <Btn to="/today">Back to Today</Btn>
    </Screen>
  )

  // ── 17 · Keep or retry ────────────────────────────────────────────────────
  if (phase === 'review') return (
    <Screen pad="30px 28px 26px">
      <PrivatePill />
      <H1 size={28} style={{ margin: '24px 0 14px' }}>Take as many goes as you want.</H1>
      <Sub mb={22} size={14}>Only the take you keep is scored. Attempts are not counted, not stored, and never shown to anyone.</Sub>
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
        <Btn kind="teal" onClick={keep} style={{ padding: 15, borderRadius: 15 }}>Keep this take</Btn>
      </div>
      <TextBtn onClick={() => { takeRef.current = null; navigate('/today') }}>Delete and start over</TextBtn>
    </Screen>
  )

  // ── 18 · The one instruction ──────────────────────────────────────────────
  if (phase === 'report' && result) {
    const delta = fmtDelta(result.scoreAfter, result.scoreBefore)
    const points = delta == null ? '' : delta === '±0' ? ' · SCORE HELD' : ` · ${delta} POINT${Math.abs(result.scoreAfter - result.scoreBefore) === 1 ? '' : 'S'}`
    const next = nextRep()
    const tiles = [
      ['CLARITY', result.metrics?.clarity, result.prevMetrics?.clarity],
      ['STRUCTURE', result.metrics?.structure, result.prevMetrics?.structure],
    ].filter(([, v]) => Number.isFinite(v))
    return (
      <Screen pad="28px 28px 24px">
        <div style={mono(10, C.dim, '.18em')}>AFTER THE REP{points} · +{result.xp} XP</div>
        <div style={{ margin: '20px 0 0', padding: '24px 22px', borderRadius: 22, background: C.cardHi, border: '1px solid rgba(169,140,224,.35)' }}>
          <div style={{ ...mono(10, C.lilac), marginBottom: 14 }}>DO THIS NEXT TIME</div>
          <p style={{ margin: 0, fontFamily: F.display, fontWeight: 300, fontSize: 24, lineHeight: 1.32, letterSpacing: '-.01em' }}>{result.fix}</p>
          {result.better_opening && <>
            <div style={{ height: 1, background: 'rgba(255,255,255,.1)', margin: '20px 0 14px' }} />
            <div style={{ ...mono(10, C.teal, '.14em'), marginBottom: 8 }}>INSTEAD OF YOUR OPENING</div>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: C.soft }}>"{result.better_opening}"</p>
          </>}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          {(tiles.length ? tiles : [['SCORE', result.score, null]]).map(([label, v, prev]) => {
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
        {result.win && (
          <p style={{ margin: '14px 0 0', fontSize: 12.5, lineHeight: 1.55, color: C.dim }}>
            <span style={mono(9.5, C.teal, '.14em')}>WHAT WORKED · </span>{result.win}
          </p>
        )}
        <div style={{ flex: 1, minHeight: 14 }} />
        <Btn onClick={retry} style={{ padding: 16, borderRadius: 15, fontSize: 14.5, marginTop: 14 }}>Redo it with that one change</Btn>
        {next
          ? <TextBtn onClick={() => navigate(`/session/mode?rep=${next.id}`)} style={{ marginTop: 10 }}>Next rep</TextBtn>
          : <TextBtn to="/today" style={{ marginTop: 10 }}>Back to Today</TextBtn>}
      </Screen>
    )
  }

  // ── Ready / recording / typing ────────────────────────────────────────────
  const recording = phase === 'recording'
  return (
    <Screen pad="30px 30px 30px">
      <Back to="/today" mb={22} />
      <div style={{ ...mono(11, C.dim), marginBottom: 16 }}>DAILY REP · {rep.category.toUpperCase()}{mode === 'offline' ? ' · SCORED LATER' : ''}</div>
      <p style={{ margin: '0 0 8px', fontSize: 13.5, lineHeight: 1.55, color: C.dim }}>{rep.situation}</p>
      <p style={{ margin: '0 0 24px', fontFamily: F.display, fontWeight: 300, fontSize: 24, lineHeight: 1.4, letterSpacing: '-.01em' }}>{rep.prompt}</p>

      {mode === 'type' ? (
        <>
          <textarea className="input" rows={7} value={typedText} onChange={e => { setTypedText(e.target.value); setMicError(null) }}
            placeholder="Write it the way you would say it out loud" style={{ resize: 'vertical', fontSize: 14.5, lineHeight: 1.55 }} />
          <ErrorNote style={{ marginTop: 12 }}>{micError}</ErrorNote>
          <Spacer min={20} />
          <Btn kind="purple" onClick={submitTyped}>Done</Btn>
          <p style={{ margin: '12px 0 0', textAlign: 'center', fontSize: 11.5, color: C.dim }}>Scored on structure and clarity. No voice needed.</p>
        </>
      ) : (
        <>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 22, minHeight: 250 }}>
            <Waveform active={recording} color={C.purple} />
            <MicButton listening={recording} live={C.purple} stopSquare disabled={!recording && needsConsent && !consented}
              onClick={() => { primeAudio(); recording ? finishRecording() : startRecording() }} />
            <div style={{ ...mono(12, recording && left <= 10 ? C.amber : C.dim, 0), textAlign: 'center' }}>
              {recording ? `0:${String(left).padStart(2, '0')} · tap when you are done` : 'Tap the mic and just speak. Sixty seconds.'}
            </div>
            {recording && liveText && (
              <p style={{ margin: 0, maxHeight: 90, overflowY: 'auto', fontSize: 13, lineHeight: 1.55, color: C.soft, textAlign: 'center' }}>{liveText}</p>
            )}
            <ErrorNote style={{ width: '100%' }}>{micError}</ErrorNote>
          </div>
          {needsConsent && !recording && (
            <ConsentTick checked={consented} onChange={v => { setConsented(v); setMicError(null) }}>
              I consent to San4 recording my voice for this rep and sending it to our AI processor (Google Gemini) to score it.{' '}
              <Link to="/privacy" target="_blank" style={{ color: C.lilac }}>Privacy Policy</Link>
            </ConsentTick>
          )}
          {mode === 'offline' && !recording && (
            <Notice style={{ marginTop: 12 }}>The take stays on this phone and is scored the next time you open San4 on wifi.</Notice>
          )}
        </>
      )}
    </Screen>
  )
}
