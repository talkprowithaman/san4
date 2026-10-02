import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth, useAuthStore } from '../hooks/useAuth'
import { C, F } from '../lib/ink'
import { Screen, Back, Btn, TextBtn, H1, Sub, Spacer, ConsentTick, ErrorNote } from '../components/ink/Ink'
import { PRIVACY_POLICY_VERSION } from '../lib/consent'
import { isDisposableEmail, DISPOSABLE_MESSAGE } from '../lib/disposableEmails'
import { friendlyAuthError, isRateLimited } from '../lib/authErrors'

export default function Auth() {
  const [params]  = useSearchParams()
  const [mode, setMode] = useState(
    params.get('reset') ? 'forgot' : params.get('mode') === 'signup' ? 'signup' : 'signin'
  )
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const [consented, setConsented] = useState(false)

  const { signIn, signUp, resetPassword, signInWithMagicLink } = useAuth()
  const { user } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) return
    const next = params.get('next')
    // Only allow internal paths (prevent open-redirect via the query param)
    navigate(next && next.startsWith('/') ? next : '/today')
  }, [user])

  function update(key, val) { setForm(f => ({ ...f, [key]: val })); setError('') }

  async function submit(e) {
    e.preventDefault()
    if (mode === 'signup' && !consented) {
      setError('Please agree to the Privacy Policy to create an account.')
      return
    }
    // Real inboxes only, at signup. Sign-in is deliberately NOT checked so
    // existing accounts are never locked out by a later blocklist update.
    if (mode === 'signup' && isDisposableEmail(form.email)) {
      setError(DISPOSABLE_MESSAGE)
      return
    }
    setLoading(true); setError('')
    const { error: err } = mode === 'signup'
      ? await signUp(form.email, form.password, form.name, {
          consentedAt: new Date().toISOString(),
          version: PRIVACY_POLICY_VERSION,
        })
      : await signIn(form.email, form.password)
    if (err) { setError(friendlyAuthError(err, mode)); setLoading(false) }
    else if (mode === 'signup') { setLoading(false); setMode('check-email') }
  }

  // Magic link: email a one-tap sign-in link. Like the reset flow, the
  // confirmation is identical whether or not the account exists, so this can't
  // be used to discover which emails are registered.
  async function sendMagicLink(e) {
    e.preventDefault()
    if (!form.email) { setError('Enter your email first.'); return }
    setLoading(true); setError('')
    const { error: err } = await signInWithMagicLink(form.email)
    setLoading(false)
    if (isRateLimited(err)) { setError(friendlyAuthError(err, 'email')); return }
    setMode('magic-sent')
  }

  // Forgot password: email them a reset link. We always show the same
  // confirmation, even if the address has no account, so the form can't be used
  // to discover which emails are registered.
  async function sendReset(e) {
    e.preventDefault()
    if (!form.email) { setError('Enter your email first.'); return }
    setLoading(true); setError('')
    const { error: err } = await resetPassword(form.email)
    setLoading(false)
    if (isRateLimited(err)) { setError(friendlyAuthError(err, 'email')); return }
    setMode('reset-sent')
  }

  // ── Shared pieces ──────────────────────────────────────────────────────────
  const backToSignin = () => { setMode('signin'); setError('') }
  const Label = ({ children }) => (
    <div style={{ font: `500 10px ${F.mono}`, letterSpacing: '.16em', color: C.dim, margin: '0 0 8px' }}>{children}</div>
  )
  const Sent = ({ title, children, note }) => (
    <Screen pad="36px 30px 30px">
      <Back onClick={backToSignin} mb={26} />
      <H1>{title}</H1>
      <Sub>{children}</Sub>
      {note && <p style={{ margin: 0, fontSize: 12, color: C.dim }}>{note}</p>}
      <Spacer />
      <Btn onClick={backToSignin}>Back to sign in</Btn>
    </Screen>
  )

  // ── Magic link ─────────────────────────────────────────────────────────────
  if (mode === 'magic') return (
    <Screen pad="36px 30px 30px">
      <Back onClick={backToSignin} mb={26} />
      <H1>No password needed.</H1>
      <Sub>We email you a link. One tap and you are in.</Sub>
      <form onSubmit={sendMagicLink} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input className="input" type="email" autoComplete="email" placeholder="you@email.com"
          value={form.email} onChange={e => update('email', e.target.value)} required />
        <ErrorNote>{error}</ErrorNote>
        <Btn kind="purple" type="submit" disabled={loading}>{loading ? '…' : 'Email me a link'}</Btn>
      </form>
      <Spacer />
      <TextBtn onClick={backToSignin}>Use my password instead</TextBtn>
    </Screen>
  )

  if (mode === 'magic-sent') return (
    <Sent title="Check your inbox." note="The link works once and expires in an hour.">
      If an account exists for <span style={{ color: C.paper }}>{form.email}</span>, your sign-in link is on its way.
    </Sent>
  )

  // ── Forgot password ────────────────────────────────────────────────────────
  if (mode === 'forgot') return (
    <Screen pad="36px 30px 30px">
      <Back onClick={backToSignin} mb={26} />
      <H1>Forgot your password?</H1>
      <Sub>Enter your email and we will send you a link to set a new one.</Sub>
      <form onSubmit={sendReset} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input className="input" type="email" autoComplete="email" placeholder="you@email.com"
          value={form.email} onChange={e => update('email', e.target.value)} required />
        <ErrorNote>{error}</ErrorNote>
        <Btn kind="purple" type="submit" disabled={loading}>{loading ? '…' : 'Send reset link'}</Btn>
      </form>
    </Screen>
  )

  if (mode === 'reset-sent') return (
    <Sent title="Check your inbox." note="The link expires shortly and can only be used once.">
      If an account exists for <span style={{ color: C.paper }}>{form.email}</span>, we have sent a link to reset your password.
    </Sent>
  )

  if (mode === 'check-email') return (
    <Sent title="One more step.">
      We sent a confirmation link to <span style={{ color: C.paper }}>{form.email}</span>. Tap it to activate your account.
    </Sent>
  )

  // ── Sign in / sign up with email ───────────────────────────────────────────
  const signup = mode === 'signup'
  return (
    <Screen pad="36px 30px 30px">
      <Back onClick={() => navigate(-1)} mb={26} />
      <H1 size={28}>{signup ? 'Create your account.' : 'Welcome back.'}</H1>
      <Sub>{signup ? 'Your score, streak and credential, saved to one account.' : 'Pick up the streak where you left it.'}</Sub>

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {signup && (
          <div>
            <Label>YOUR NAME</Label>
            <input className="input" placeholder="Ananya Raghavan" autoComplete="name"
              value={form.name} onChange={e => update('name', e.target.value)} required />
          </div>
        )}
        <div>
          <Label>EMAIL</Label>
          <input className="input" type="email" placeholder="you@email.com" autoComplete="email"
            value={form.email} onChange={e => update('email', e.target.value)} required />
        </div>
        <div>
          <Label>PASSWORD</Label>
          <input className="input" type="password" autoComplete={signup ? 'new-password' : 'current-password'}
            placeholder={signup ? 'At least 8 characters' : '••••••••'}
            value={form.password} onChange={e => update('password', e.target.value)} minLength={8} required />
        </div>
        {!signup && (
          <button type="button" onClick={() => { setMode('forgot'); setError('') }}
            style={{ alignSelf: 'flex-end', border: 'none', background: 'none', cursor: 'pointer', color: C.lilac, font: `500 12px ${F.sans}`, marginTop: -4 }}>
            Forgot password?
          </button>
        )}
        {signup && (
          <ConsentTick checked={consented} onChange={v => { setConsented(v); setError('') }}>
            I agree to the <Link to="/privacy" target="_blank" style={{ color: C.lilac }}>Privacy Policy</Link>. I understand San4 records and processes my voice and practice sessions with AI to give me feedback.
          </ConsentTick>
        )}
        <ErrorNote>{error}</ErrorNote>
        <Btn kind={signup ? 'purple' : 'paper'} type="submit" disabled={loading || (signup && !consented)}>
          {loading ? '…' : signup ? 'Create account' : 'Sign in'}
        </Btn>
      </form>

      {!signup && <>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '22px 0' }}>
          <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.1)' }} />
          <span style={{ font: `500 10px ${F.mono}`, color: C.dim }}>OR</span>
          <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.1)' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Btn kind="outline" to="/signup" style={{ padding: 16, borderRadius: 15 }}>Phone number or Google</Btn>
          <Btn kind="outline" onClick={() => { setMode('magic'); setError('') }} style={{ padding: 16, borderRadius: 15 }}>Email me a link instead</Btn>
        </div>
      </>}

      <Spacer min={24} />
      <p style={{ margin: 0, textAlign: 'center', fontSize: 12.5, color: C.dim }}>
        {signup
          ? <>Already in? <TextBtn onClick={() => { setMode('signin'); setError('') }} color={C.lilac}>Sign in</TextBtn></>
          : <>New here? <TextBtn to="/start" color={C.lilac} style={{ display: 'inline' }}>Get your score first</TextBtn></>}
      </p>
    </Screen>
  )
}
