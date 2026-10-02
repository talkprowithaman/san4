import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth, useAuthStore, setPendingSignup } from '../hooks/useAuth'
import { getCommScore } from '../lib/san4Score'
import { PRIVACY_POLICY_VERSION } from '../lib/consent'
import { isRateLimited } from '../lib/authErrors'
import { C, F, mono } from '../lib/ink'
import { Screen, Back, Btn, TextBtn, H1, Sub, Spacer, ConsentTick, ErrorNote } from '../components/ink/Ink'

// 08 · Save my score — signup AFTER the score is on screen. Phone (+91) code,
// Google, or email. Ten seconds; the guest score attaches to the account on
// first sign-in (migrateGuestScores in useAuth).
const digits = (s) => String(s || '').replace(/\D/g, '')
const fmtPhone = (d) => (d.length > 5 ? `${d.slice(0, 5)} ${d.slice(5, 10)}` : d)

export default function Signup() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { sendPhoneCode, verifyPhoneCode, signInWithGoogle } = useAuth()
  const guestScore = getCommScore(null)

  const [step, setStep] = useState('phone') // phone | code
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [consented, setConsented] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { if (user) navigate('/today', { replace: true }) }, [user]) // eslint-disable-line

  const e164 = `+91${digits(phone).slice(-10)}`
  const consent = () => ({ consentedAt: new Date().toISOString(), version: PRIVACY_POLICY_VERSION })

  function needConsent() {
    if (consented) return false
    setError('Please agree to the Privacy Policy first.')
    return true
  }

  async function send(e) {
    e?.preventDefault()
    if (needConsent()) return
    if (digits(phone).length !== 10) { setError('Enter your 10-digit mobile number.'); return }
    setBusy(true); setError('')
    const { error: err } = await sendPhoneCode(e164, consent())
    setBusy(false)
    if (err) {
      console.warn('phone otp:', err.message)
      setError(isRateLimited(err)
        ? 'Too many codes asked for. Wait a minute, then try again.'
        : 'We could not send a code to that number. Try again, or continue with Google or email.')
      return
    }
    setStep('code')
  }

  async function verify(e) {
    e?.preventDefault()
    if (digits(code).length < 6) { setError('Enter the 6-digit code we sent.'); return }
    if (name.trim()) setPendingSignup({ name: name.trim() })
    setBusy(true); setError('')
    const { error: err } = await verifyPhoneCode(e164, digits(code))
    setBusy(false)
    if (err) setError('That code did not work. Check it, or ask for a new one.')
  }

  async function google() {
    if (needConsent()) return
    setBusy(true); setError('')
    const { error: err } = await signInWithGoogle(consent())
    if (err) { setBusy(false); setError('Google sign-in is not available right now. Use your phone or email.') }
  }

  const field = {
    border: `1px solid ${C.line2}`, borderRadius: 16, padding: '15px 17px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10,
  }
  const input = { flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none', color: C.paper, font: `500 15px ${F.sans}` }

  return (
    <Screen pad="36px 30px 30px">
      <Back onClick={() => (step === 'code' ? setStep('phone') : navigate(-1))} mb={24} />
      <H1 size={28} style={{ fontWeight: 300 }}>
        {step === 'code' ? 'Check your messages.' : guestScore != null ? `Keep the ${guestScore}.` : 'Save your progress.'}
      </H1>
      <Sub>
        {step === 'code'
          ? `We sent a 6-digit code to +91 ${fmtPhone(digits(phone))}.`
          : guestScore != null
            ? 'Ten seconds. We attach the score you just earned to the account.'
            : 'Ten seconds. Your streak and score follow you to any phone.'}
      </Sub>

      {step === 'phone' ? (
        <form onSubmit={send}>
          <label style={field}>
            <span style={mono(13, C.dim, 0)}>+91</span>
            <span style={{ width: 1, height: 18, background: C.line2 }} />
            <input style={input} inputMode="numeric" autoComplete="tel-national" placeholder="98765 43210" aria-label="Mobile number"
              value={fmtPhone(digits(phone).slice(0, 10))} onChange={e => { setPhone(e.target.value); setError('') }} />
          </label>
          <Btn kind="purple" type="submit" disabled={busy} style={{ padding: 16, borderRadius: 15, fontSize: 14.5 }}>
            {busy ? 'Sending…' : 'Send code'}
          </Btn>
        </form>
      ) : (
        <form onSubmit={verify}>
          <label style={field}>
            <input style={{ ...input, ...mono(18, C.paper, '.3em') }} inputMode="numeric" autoComplete="one-time-code" placeholder="••••••" aria-label="Code"
              value={digits(code).slice(0, 6)} onChange={e => { setCode(e.target.value); setError('') }} autoFocus />
          </label>
          <label style={field}>
            <input style={input} autoComplete="name" placeholder="Your name, for the credential" aria-label="Your name"
              value={name} onChange={e => setName(e.target.value)} />
          </label>
          <Btn kind="purple" type="submit" disabled={busy} style={{ padding: 16, borderRadius: 15, fontSize: 14.5 }}>
            {busy ? 'Checking…' : 'Verify and continue'}
          </Btn>
          <TextBtn onClick={send} style={{ display: 'block', margin: '12px auto 0' }}>Send a new code</TextBtn>
        </form>
      )}

      {step === 'phone' && <>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '22px 0' }}>
          <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.1)' }} />
          <span style={mono(10, C.dim, 0)}>OR</span>
          <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.1)' }} />
        </div>
        <Btn kind="outline" onClick={google} disabled={busy} style={{ padding: 16, borderRadius: 15 }}>Continue with Google</Btn>
        <TextBtn to="/auth?mode=signup" style={{ marginTop: 12 }}>Use email instead</TextBtn>
      </>}

      <ErrorNote style={{ marginTop: 14 }}>{error}</ErrorNote>
      <Spacer min={24} />
      {step === 'phone' && (
        <div style={{ marginBottom: 14 }}>
          <ConsentTick checked={consented} onChange={v => { setConsented(v); setError('') }}>
            I agree to the <Link to="/privacy" target="_blank" style={{ color: C.lilac }}>Privacy Policy</Link>. San4 processes my voice with AI to give me feedback.
          </ConsentTick>
        </div>
      )}
      <p style={{ margin: 0, textAlign: 'center', fontSize: 11.5, lineHeight: 1.5, color: C.dim }}>
        We never post anything. Your recordings are not stored.
      </p>
    </Screen>
  )
}
