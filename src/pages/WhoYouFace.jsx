import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useSubscription } from '../hooks/useSubscription'
import { PERSONAS, getPersona, personaName, personaSub } from '../lib/personas'
import { SCENARIOS } from '../lib/progression'
import { primeAudio } from '../lib/voicePlayer'
import { C, F, mono } from '../lib/ink'
import { Screen, Back, Btn, H1, Sub, Spacer, ConsentTick } from '../components/ink/Ink'

const JD_KEY = 'san4_jd'

// ── 14 · Who are you facing today? ─────────────────────────────────────────
export default function WhoYouFace() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { user, profile, recordVoiceConsent } = useAuth()
  const { isPro, loading: subLoading } = useSubscription()

  const scenario = SCENARIOS.find(s => s.id === params.get('scenario')) || SCENARIOS[0]
  const mode = params.get('mode') || 'speak'
  const [personaId, setPersonaId] = useState(() => {
    try { return getPersona(localStorage.getItem('san4_persona') || 'default').id } catch { return 'default' }
  })
  const [interview, setInterview] = useState(false)
  const [jd, setJd] = useState(() => { try { return sessionStorage.getItem(JD_KEY) || '' } catch { return '' } })
  const needsConsent = mode !== 'type' && !profile?.voice_consent_at
  const [consented, setConsented] = useState(false)

  if (scenario.tier === 'pro' && !subLoading && !isPro) return <Navigate to="/pro" replace />

  async function start() {
    primeAudio()
    try { localStorage.setItem('san4_persona', personaId) } catch { /* ignore */ }
    if (needsConsent && user) await recordVoiceConsent(user.id)
    const useJd = interview && isPro && jd.trim().length > 40
    if (useJd) { try { sessionStorage.setItem(JD_KEY, jd.trim()) } catch { /* ignore */ } }
    // Interview mode is the HR interview, scored against the pasted job post.
    const target = useJd ? 'hr_interview' : scenario.id
    navigate(`/practice/${target}?mode=${mode}&persona=${personaId}${useJd ? '&jd=1' : ''}`)
  }

  return (
    <Screen pad="30px 28px 28px">
      <Back mb={22} />
      <div style={{ ...mono(10, C.lilac, '.14em'), marginBottom: 12 }}>LV {scenario.level} · {scenario.title.toUpperCase()}</div>
      <H1 mb={8}>Who are you facing today?</H1>
      <Sub mb={20} size={13}>Every voice is free. Nobody pays to practise against an accent.</Sub>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {PERSONAS.map(p => {
          const on = personaId === p.id
          return (
            <button key={p.id} onClick={() => setPersonaId(p.id)} title={p.blurb} style={{
              cursor: 'pointer', textAlign: 'left', borderRadius: 16, padding: '15px 16px', display: 'flex', alignItems: 'center', gap: 13,
              border: `1px solid ${on ? 'rgba(169,140,224,.5)' : C.line}`, background: on ? 'rgba(123,94,167,.12)' : 'transparent',
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: on ? C.lilac : 'rgba(255,255,255,.25)', flex: 'none' }} />
              <span style={{ flex: 1 }}>
                <span style={{ display: 'block', font: `600 14px ${F.sans}`, color: C.paper }}>{personaName(p)}</span>
                <span style={{ display: 'block', font: `400 12px ${F.sans}`, color: C.dim, marginTop: 2 }}>{personaSub(p)}</span>
              </span>
            </button>
          )
        })}
      </div>

      {/* Interview mode: Pro depth, scored against a real job post */}
      <div style={{ marginTop: 14, borderRadius: 16, border: `1px solid ${interview ? 'rgba(169,140,224,.5)' : C.line}`, padding: '15px 16px' }}>
        <button onClick={() => (isPro ? setInterview(v => !v) : navigate('/pro'))} style={{
          width: '100%', border: 'none', background: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ flex: 1 }}>
            <span style={{ display: 'block', font: `600 14px ${F.sans}`, color: C.paper }}>Interview mode</span>
            <span style={{ display: 'block', font: `400 12px ${F.sans}`, color: C.dim, marginTop: 2 }}>Paste a real job post. The interview and the score follow it.</span>
          </span>
          <span style={mono(9.5, isPro ? (interview ? C.teal : C.lilac) : C.amber, '.1em')}>{isPro ? (interview ? 'ON' : 'OFF') : 'PRO'}</span>
        </button>
        {interview && (
          <textarea className="input" rows={5} value={jd} onChange={e => setJd(e.target.value)}
            placeholder="Paste the job description here"
            style={{ marginTop: 12, resize: 'vertical', fontSize: 13, lineHeight: 1.5 }} />
        )}
        {interview && jd.trim().length > 0 && jd.trim().length <= 40 && (
          <p style={{ margin: '8px 0 0', fontSize: 11.5, color: C.amber }}>Paste the full post, not just the title.</p>
        )}
      </div>

      {!isPro && (
        <Link to="/pro" style={{
          display: 'block', marginTop: 14, border: '1px dashed rgba(255,255,255,.16)', borderRadius: 16, padding: 15, textDecoration: 'none',
          color: C.soft, font: `500 12.5px/1.5 ${F.sans}`,
        }}>Pro is depth, not access. See what it adds.</Link>
      )}

      <Spacer min={22} />
      {needsConsent && (
        <div style={{ marginBottom: 14 }}>
          <ConsentTick checked={consented} onChange={setConsented}>
            I consent to San4 recording my voice during this session and sending it to our AI processor (Google Gemini) to transcribe and score it.{' '}
            <Link to="/privacy" target="_blank" style={{ color: C.lilac }}>Privacy Policy</Link>
          </ConsentTick>
        </div>
      )}
      <Btn kind="purple" onClick={start} disabled={needsConsent && !consented}>Start the session</Btn>
    </Screen>
  )
}
