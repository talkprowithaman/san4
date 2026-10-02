import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth }    from '../hooks/useAuth'
import { supabase }   from '../lib/supabase'
import { analyzeCEFRAssessment } from '../lib/gemini'
import { saveCommScore, scoreBand } from '../lib/san4Score'
import { LANGUAGES, getLang, setLang, hasChosenLang, t } from '../lib/onboardingCopy'
import { getGoal, setGoal } from '../lib/dailyReps'
import { setPendingSignup } from '../hooks/useAuth'
import { track, EV } from '../lib/analytics'
import { pickPassage } from '../lib/passages'
import { C, F, mono } from '../lib/ink'
import {
  Screen, Back, Btn, TextBtn, Kicker, H1, Sub, Spacer, Rows, Row, Choice, ScoreRing,
  Waveform, MicButton, Working, ConsentTick, ErrorNote, ArrowIcon,
} from '../components/ink/Ink'

// ── The 2-minute test: read a passage aloud, then answer one question ────────
// Section A rolls a fresh passage each attempt from a 100+ bank so repeat
// takers can't memorise it. Value before signup: guests get their score first.
const QUESTION = `Now, in your own words: describe a recent project or task you worked on, and what you found most challenging about it.`

const GOALS = [
  { id: 'placement', title: 'Placement interviews', sub: 'HR rounds, tell-me-about-yourself, salary' },
  { id: 'gd',        title: 'Group discussions',    sub: 'Cutting in without being rude' },
  { id: 'client',    title: 'Client and team calls', sub: 'Updates, pushback, saying no' },
  { id: 'daily',     title: 'Everyday confidence',  sub: 'Shops, strangers, small talk' },
]

const PITCH = [
  { k: 'daily',  n: '01', title: 'Sixty seconds a day', detail: 'One spoken rep, built from what you are preparing for. Not a course, not a video.' },
  { k: 'people', n: '02', title: 'Practise on people who scare you', detail: 'A Gurgaon HR manager, a Bengaluru tech lead, a London executive. They interrupt, and they never get tired.' },
  { k: 'fix',    n: '03', title: 'One fix after every rep', detail: 'Not a report card. One thing to change, and your own sentence rewritten the better way.' },
  { k: 'cv',     n: '04', title: 'A number for your CV', detail: 'Your score becomes a verified credential with a link anyone can check.' },
]

const AXES = [
  { key: 'clarity',    name: 'Clarity' },
  { key: 'confidence', name: 'Confidence' },
  { key: 'structure',  name: 'Structure' },
  { key: 'delivery',   name: 'Delivery' },
]

function arrayBufferToBase64(buf) {
  const bytes = new Uint8Array(buf); let bin = ''; const c = 8192
  for (let i = 0; i < bytes.length; i += c) bin += String.fromCharCode(...bytes.subarray(i, i + c))
  return btoa(bin)
}
function pickMime() {
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg']
    .find(t => MediaRecorder.isTypeSupported(t)) || 'audio/webm'
}
const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
const axisColor = (v) => (v >= 65 ? C.teal : C.amber)

// Your score stays valid for this long; retake unlocks after, to measure real
// improvement rather than re-testing the same thing repeatedly.
const RETAKE_DAYS = 30
const cefrKey = (user) => `san4_cefr_${user?.id || 'guest'}`
const fmtDate = (ts) => new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

const MIN_STEP_SECONDS = 8

export default function Assessment() {
  const { user } = useAuth()
  const navigate = useNavigate()

  // phases: language | goal | number | read | answer | analyzing | result | pitch
  const [phase, setPhase] = useState(() => (!hasChosenLang() ? 'language' : !getGoal() ? 'goal' : 'number'))
  const [lang, setLangState] = useState(getLang)
  const [goal, setGoalState] = useState(() => getGoal() || 'placement')
  const c = t(lang)
  const isEn = lang === 'en-US'
  const [passage, setPassage] = useState(pickPassage)
  const [seconds, setSeconds] = useState(0)
  const [report, setReport] = useState(null)
  const [error, setError] = useState(null)
  const [lockedUntil, setLockedUntil] = useState(null)
  const [guestConsent, setGuestConsent] = useState(false)
  const [pitchOpen, setPitchOpen] = useState('daily')
  const [showDetail, setShowDetail] = useState(false)

  // Restore a saved score so the level persists across visits.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(cefrKey(user))
      if (!raw) return
      const saved = JSON.parse(raw)
      if (saved?.result && saved?.takenAt) {
        setReport(saved.result)
        setLockedUntil(saved.takenAt + RETAKE_DAYS * 86400000)
        setPhase('result')
      }
    } catch { /* ignore */ }
  }, [user])

  const mediaRecRef = useRef(null)
  const audioChunksRef = useRef([])
  const audioStreamRef = useRef(null)
  const audioMimeRef = useRef('audio/webm')
  const timerRef = useRef(null)
  const step1ClipRef = useRef(null)
  const [recOn, setRecOn] = useState(false)

  useEffect(() => () => {
    audioStreamRef.current?.getTracks().forEach(tr => tr.stop())
    clearInterval(timerRef.current)
  }, [])

  async function beginCapture() {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioStreamRef.current = stream
      const mime = pickMime()
      audioMimeRef.current = mime
      const rec = new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 40000 })
      audioChunksRef.current = []
      rec.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      rec.start(1000)
      mediaRecRef.current = rec
      setSeconds(0)
      setRecOn(true)
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000)
    } catch {
      setError('We need the microphone to score your speaking. Allow mic access for this site, then tap the mic again.')
    }
  }

  async function endCapture() {
    clearInterval(timerRef.current)
    setRecOn(false)
    await new Promise(resolve => {
      const rec = mediaRecRef.current
      if (!rec || rec.state === 'inactive') { resolve(); return }
      rec.onstop = resolve; rec.stop()
    })
    audioStreamRef.current?.getTracks().forEach(tr => tr.stop())
    if (audioChunksRef.current.length === 0) return null
    const blob = new Blob(audioChunksRef.current, { type: audioMimeRef.current })
    const buf = await blob.arrayBuffer()
    audioChunksRef.current = []
    return { base64: arrayBufferToBase64(buf), mimeType: audioMimeRef.current.split(';')[0] }
  }

  async function handleMic(step) {
    if (!recOn) { beginCapture(); return }
    if (seconds < MIN_STEP_SECONDS) {
      setError(step === 1 ? 'Keep going, read the full passage aloud.' : 'Give it a fuller answer. A few sentences at least.')
      return
    }
    const payload = await endCapture()
    if (!payload) { setError('We could not capture any audio. Please try again.'); return }
    if (step === 1) {
      step1ClipRef.current = payload
      setError(null); setSeconds(0); setPhase('answer')
      return
    }
    runAnalysis([step1ClipRef.current, payload])
  }

  async function runAnalysis(clips) {
    setPhase('analyzing')
    const result = await analyzeCEFRAssessment(clips, 'describe a recent project or task they worked on and what they found most challenging')
    if (!result) {
      setError('Scoring failed. Your read-aloud is saved, so just answer the question again.')
      setPhase('answer')
      return
    }
    if (user) {
      await supabase.from('practice_sessions').insert({
        user_id: user.id,
        scenario_id: 'cefr_assessment',
        scenario_title: `CEFR Assessment · ${result.cefr_level}`,
        overall_score: result.overall_score,
        confidence_score: result.fluency,
        pacing_score: result.pronunciation,
        duration_seconds: seconds,
        feedback: result.band_description,
        action_item: result.next_step,
        messages: [],
      }).then(() => {}, () => {})
    }
    try { localStorage.setItem(cefrKey(user), JSON.stringify({ result, takenAt: Date.now() })) } catch { /* ignore */ }
    setLockedUntil(Date.now() + RETAKE_DAYS * 86400000)
    if (Number.isFinite(result.communication_score)) saveCommScore(user?.id, result.communication_score)
    track(EV.ASSESSMENT_COMPLETED, {
      guest: !user,
      cefr_level: result.cefr_level,
      communication_score: result.communication_score,
      band: Number.isFinite(result.communication_score) ? scoreBand(result.communication_score)?.name : null,
    })
    setReport(result)
    setPhase('result')
  }

  function retake() {
    setReport(null); setError(null); setPassage(pickPassage()); setSeconds(0); setPhase('number')
  }

  // ── 02 · LANGUAGE ──────────────────────────────────────────────────────────
  if (phase === 'language') return (
    <Screen pad="36px 30px 32px">
      <Back to="/start" mb={26} />
      <H1>{isEn ? 'Which language do you think in?' : c.chooseTitle}</H1>
      <Sub>{isEn ? 'We guide you in yours. You practise, and are scored, in English.' : c.chooseSub}</Sub>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
        {LANGUAGES.map(l => {
          const on = lang === l.code
          return (
            <button key={l.code} onClick={() => { setLang(l.code); setLangState(l.code) }} style={{
              cursor: 'pointer', padding: '11px 16px', borderRadius: 12, font: `500 14px ${F.sans}`,
              background: on ? 'rgba(123,94,167,.18)' : 'rgba(255,255,255,.03)', color: on ? C.paper : C.dim,
              border: `1px solid ${on ? 'rgba(169,140,224,.55)' : C.line}`,
            }}>{l.nativeName}</button>
          )
        })}
      </div>
      <Spacer min={28} />
      <Btn onClick={() => {
        setLang(lang)
        if (user) supabase.from('profiles').update({ preferred_language: lang }).eq('id', user.id).then(() => {}, () => {})
        setPhase(getGoal() ? 'number' : 'goal')
      }}>{isEn ? 'Continue' : c.continue}</Btn>
    </Screen>
  )

  // ── 03 · GOAL ──────────────────────────────────────────────────────────────
  if (phase === 'goal') return (
    <Screen pad="36px 30px 32px">
      <Back onClick={() => setPhase('language')} mb={26} />
      <H1>What are you walking into?</H1>
      <Sub>Your daily reps are built from this.</Sub>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {GOALS.map(g => {
          const on = goal === g.id
          return (
            <Choice key={g.id} selected={on} onClick={() => setGoalState(g.id)} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: on ? C.lilac : 'rgba(255,255,255,.22)', flex: 'none' }} />
              <span style={{ flex: 1 }}>
                <span style={{ display: 'block', font: `600 15px ${F.sans}`, color: C.paper }}>{g.title}</span>
                <span style={{ display: 'block', font: `400 12.5px ${F.sans}`, color: C.dim, marginTop: 3 }}>{g.sub}</span>
              </span>
            </Choice>
          )
        })}
      </div>
      <Spacer min={28} />
      <Btn onClick={() => {
        setGoal(goal)
        if (user) supabase.from('profiles').update({ goal }).eq('id', user.id).then(() => {}, () => {})
        setPhase('number')
      }}>Continue</Btn>
    </Screen>
  )

  // ── 04 · THE NUMBER ────────────────────────────────────────────────────────
  if (phase === 'number') return (
    <Screen pad="36px 30px 32px">
      <Back onClick={() => (user ? navigate(-1) : setPhase('goal'))} mb={20} />
      <Kicker size={11} color={C.lilac} style={{ marginBottom: 18 }}>THE NUMBER</Kicker>
      <div style={{ border: '1px solid rgba(255,255,255,.1)', borderRadius: 24, padding: '26px 24px', background: C.card }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontFamily: F.display, fontWeight: 300, fontSize: 74, lineHeight: 0.9, letterSpacing: '-.04em', color: 'rgba(255,255,255,.18)' }}>00</span>
          <span style={mono(12, C.dim, 0)}>/ 100</span>
        </div>
        <div style={{ height: 1, background: C.line, margin: '22px 0 18px' }} />
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: C.soft }}>
          Your <strong style={{ color: C.paper, fontWeight: 600 }}>San4 Score</strong> is one number for how you communicate, not how good your English is. It goes on your CV. It moves with every rep.
        </p>
      </div>
      <Spacer min={24} />
      {!user && (
        <div style={{ marginBottom: 16 }}>
          <ConsentTick checked={guestConsent} onChange={v => { setGuestConsent(v); setError(null) }}>
            I consent to San4 recording my voice for this test and sending it to our AI processor (Google Gemini) to score it.{' '}
            <Link to="/privacy" target="_blank" style={{ color: C.lilac }}>Privacy Policy</Link>
          </ConsentTick>
        </div>
      )}
      <ErrorNote style={{ marginBottom: 12 }}>{error}</ErrorNote>
      <Btn kind="purple" disabled={!user && !guestConsent} onClick={() => {
        if (!user && !guestConsent) { setError('Please tick the consent box to start.'); return }
        track(EV.ASSESSMENT_STARTED, { guest: !user, lang })
        setError(null); setSeconds(0); setPhase('read')
      }}>Take the 2-minute test</Btn>
      <p style={{ margin: '14px 0 0', textAlign: 'center', fontSize: 11.5, color: C.dim }}>
        {user ? 'Audio is scored once, then deleted.' : 'Free, no account. Audio is scored once, then deleted.'}
      </p>
    </Screen>
  )

  // ── 05 · READ ALOUD / ANSWER ───────────────────────────────────────────────
  if (phase === 'read' || phase === 'answer') {
    const one = phase === 'read'
    const hint = recOn
      ? `${one ? 'Recording' : 'Listening'} · ${fmt(seconds)} · tap to finish`
      : one ? 'Tap the mic and read it out loud' : 'Tap the mic and answer out loud'
    return (
      <Screen pad="34px 30px 30px">
        <Kicker size={11} style={{ marginBottom: 20 }}>
          {one ? (isEn ? 'STEP 01 · READ ALOUD' : c.s1kicker) : (isEn ? 'STEP 02 · YOUR TURN' : c.s2kicker)}
        </Kicker>
        <p style={{ margin: '0 0 28px', fontFamily: F.display, fontWeight: 300, fontSize: one ? 24 : 26, lineHeight: 1.45, letterSpacing: '-.01em' }}>
          {one ? passage : QUESTION}
        </p>
        {!one && c.qgloss && <p style={{ margin: '-14px 0 24px', fontSize: 13, lineHeight: 1.55, color: C.dim }}>{c.qgloss}</p>}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 22, minHeight: 240 }}>
          <Waveform active={recOn} count={19} color={C.purple} />
          <MicButton listening={recOn} live={C.purple} onClick={() => handleMic(one ? 1 : 2)} stopSquare />
          <div style={{ ...mono(12, C.dim, 0), textAlign: 'center' }}>{hint}</div>
          {recOn && seconds < MIN_STEP_SECONDS && (
            <div style={{ fontSize: 11.5, color: C.dim }}>Keep going for at least {MIN_STEP_SECONDS} seconds</div>
          )}
          <ErrorNote style={{ width: '100%' }}>{error}</ErrorNote>
        </div>
        <div style={{ ...mono(10, C.dim, '.14em'), textAlign: 'center' }}>STEP {one ? 1 : 2} OF 2</div>
      </Screen>
    )
  }

  // ── ANALYSING ─────────────────────────────────────────────────────────────
  if (phase === 'analyzing') {
    return <Working title={isEn ? 'Scoring how you communicate' : c.scoring.replace(/…$/, '')} sub={isEn ? 'Two numbers coming up: your San4 Score and your English level' : c.scoringSub} />
  }

  if (!report) return null

  const comm = Number.isFinite(report.communication_score) ? report.communication_score : report.overall_score
  const band = scoreBand(comm)
  const locked = lockedUntil && Date.now() < lockedUntil

  // ── 07 · HOW SAN4 HELPS ───────────────────────────────────────────────────
  if (phase === 'pitch') {
    const axes = AXES.filter(a => Number.isFinite(report[a.key]))
    const weakest = axes.length ? axes.reduce((m, a) => (report[a.key] < report[m.key] ? a : m), axes[0]) : null
    const target = Math.min(95, comm + 11)
    return (
      <Screen pad="30px 28px 26px">
        <Back onClick={() => setPhase('result')} mb={20} />
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: F.display, fontWeight: 300, fontSize: 40, lineHeight: 1, letterSpacing: '-.04em', color: C.dim }}>{comm}</span>
          <span style={{ alignSelf: 'center' }}><ArrowIcon /></span>
          <span style={{ fontFamily: F.display, fontWeight: 300, fontSize: 40, lineHeight: 1, letterSpacing: '-.04em', color: C.teal }}>{target}</span>
          <span style={mono(10, C.dim, '.12em')}>6-WEEK TARGET</span>
        </div>
        <H1 size={26} mb={20}>
          {weakest ? `${weakest.name} is what is holding you back. Here is how we fix it.` : 'Here is how San4 moves that number.'}
        </H1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {PITCH.map(it => {
            const open = pitchOpen === it.k
            return (
              <button key={it.k} onClick={() => setPitchOpen(open ? null : it.k)} style={{
                width: '100%', textAlign: 'left', cursor: 'pointer', borderRadius: 16, padding: '15px 16px',
                border: `1px solid ${open ? 'rgba(169,140,224,.5)' : C.line}`, background: open ? 'rgba(123,94,167,.12)' : 'rgba(255,255,255,.03)',
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ ...mono(10, open ? C.lilac : C.dim, 0), flex: 'none', width: 18 }}>{it.n}</span>
                  <span style={{ flex: 1, font: `600 14.5px ${F.sans}`, color: C.paper, lineHeight: 1.3 }}>{it.title}</span>
                </span>
                {open && <span style={{ display: 'block', padding: '10px 0 0 30px', fontSize: 12.5, lineHeight: 1.55, color: C.dim }}>{it.detail}</span>}
              </button>
            )
          })}
        </div>
        <Spacer min={24} />
        {user
          ? <Btn to="/today">Start practising</Btn>
          : <Btn onClick={() => { setPendingSignup({ fromAssessment: true }); navigate('/signup') }}>Save my score and start</Btn>}
        <p style={{ margin: '12px 0 0', textAlign: 'center', fontSize: 11.5, color: C.dim }}>Free. Nobody hears your recordings.</p>
      </Screen>
    )
  }

  // ── 06 · RESULT ───────────────────────────────────────────────────────────
  return (
    <Screen pad="30px 28px 28px">
      {user && <Back to="/library" mb={18} />}
      <Kicker size={10} spacing=".18em">{user ? 'YOUR RESULT' : 'YOUR RESULT · NO ACCOUNT NEEDED'}</Kicker>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, margin: '24px 0 22px' }}>
        <ScoreRing score={comm} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: F.display, fontWeight: 500, fontSize: 22 }}>{band.name}</div>
          <p style={{ margin: '7px 0 0', fontSize: 13, lineHeight: 1.55, color: C.dim }}>{band.blurb}</p>
        </div>
      </div>
      <Rows>
        {Number.isFinite(report.clarity) && <Row label="Clarity" value={report.clarity} valueColor={axisColor(report.clarity)} />}
        {Number.isFinite(report.structure) && <Row label="Structure" value={report.structure} valueColor={axisColor(report.structure)} />}
        <Row label="English level" value={report.cefr_level} valueColor={C.soft} />
      </Rows>

      {showDetail && (
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12, animation: 'fadeUp .3s ease both' }}>
          <Rows>
            {Number.isFinite(report.confidence) && <Row label="Confidence" value={report.confidence} valueColor={axisColor(report.confidence)} />}
            {Number.isFinite(report.delivery) && <Row label="Delivery" value={report.delivery} valueColor={axisColor(report.delivery)} />}
            {['pronunciation', 'grammar', 'vocabulary', 'fluency'].filter(k => Number.isFinite(report[k])).map(k => (
              <Row key={k} label={k[0].toUpperCase() + k.slice(1)} value={report[k]} valueColor={C.soft} />
            ))}
          </Rows>
          {report.next_step && <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: C.soft }}>{report.next_step}</p>}
          {report.transcript_answer && (
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: C.dim }}>
              <span style={mono(9.5, C.dim, '.14em')}>WHAT VAK HEARD · </span>"{report.transcript_answer}"
            </p>
          )}
        </div>
      )}
      <TextBtn onClick={() => setShowDetail(v => !v)} style={{ marginTop: 10, alignSelf: 'flex-start', paddingLeft: 0 }}>
        {showDetail ? 'Hide the breakdown' : 'See the full breakdown'}
      </TextBtn>

      <Spacer min={18} />
      <div style={{ border: '1px dashed rgba(255,255,255,.16)', borderRadius: 18, padding: 16, marginBottom: 14 }}>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: C.soft }}>
          {user
            ? 'Saved to your account. Every rep from here moves it.'
            : 'This score disappears when you close the app. Keep it, and every rep from here moves it.'}
        </p>
      </div>
      <Btn onClick={() => setPhase('pitch')}>What do I do with this?</Btn>
      {locked && user
        ? <p style={{ margin: '12px 0 0', textAlign: 'center', fontSize: 12, color: C.dim }}>Retake opens on {fmtDate(lockedUntil)}, so the change is real.</p>
        : <TextBtn onClick={retake} style={{ marginTop: 12 }}>Retake the test</TextBtn>}
    </Screen>
  )
}
