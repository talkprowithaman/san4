import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth, useAuthStore } from '../hooks/useAuth'
import VakMascot from '../components/VakMascot'
import { PRIVACY_POLICY_VERSION } from '../lib/consent'
import { isDisposableEmail, DISPOSABLE_MESSAGE } from '../lib/disposableEmails'

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
    if (err) { setError(err.message); setLoading(false) }
    else if (mode === 'signup') { setLoading(false); setMode('check-email') }
  }

  // Supabase rate-limits auth emails (a few per hour). That limit applies
  // regardless of whether the account exists, so saying so leaks nothing, and
  // it beats sending someone to an inbox that will never receive anything.
  function isRateLimited(err) {
    if (!err) return false
    return err.status === 429 || /rate limit|too many|security purposes/i.test(err.message || '')
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
    if (isRateLimited(err)) { setError('Too many emails just now. Please wait a minute and try again.'); return }
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
    if (isRateLimited(err)) { setError('Too many emails just now. Please wait a minute and try again.'); return }
    setMode('reset-sent')
  }

  // ── Magic-link screens ──────────────────────────────────────────────────────
  if (mode === 'magic') return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0a0a0f' }}>
      <div className="max-w-md w-full rounded-3xl p-9 text-center"
        style={{ background: 'linear-gradient(160deg,#10192E,#0B1220)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex justify-center mb-4"><VakMascot level={3} size={78} mood="encouraging" /></div>
        <h2 className="text-white font-black text-xl mb-1">No password needed</h2>
        <p className="text-sm mb-6" style={{ color: '#6B8CAE' }}>
          We will email you a link. One tap and you are in.
        </p>

        {error && (
          <div className="rounded-2xl px-4 py-3 mb-4 text-sm text-left"
            style={{ background: 'rgba(239,68,68,0.1)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.3)' }}>
            {error}
          </div>
        )}

        <form onSubmit={sendMagicLink} className="space-y-3 text-left">
          <input className="input" type="email" autoComplete="email" placeholder="you@email.com"
            value={form.email} onChange={e => update('email', e.target.value)} required />
          <button type="submit" disabled={loading} className="btn-play mt-1 w-full">
            {loading ? '\u2026' : 'Email me a link \u2192'}
          </button>
        </form>

        <button onClick={() => { setMode('signin'); setError('') }}
          className="mt-5 text-sm transition-colors hover:text-white" style={{ color: '#6B8CAE' }}>
          ← Use my password instead
        </button>
      </div>
    </div>
  )

  if (mode === 'magic-sent') return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0a0a0f' }}>
      <div className="max-w-md w-full text-center rounded-3xl p-10"
        style={{ background: 'linear-gradient(160deg,#10192E,#0B1220)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="text-5xl mb-5">🔑</div>
        <h2 className="text-white font-black text-xl mb-3">Check your inbox</h2>
        <p className="text-sm leading-relaxed mb-2" style={{ color: '#6B8CAE' }}>
          If an account exists for{' '}
          <span className="text-white font-semibold">{form.email}</span>, your sign-in link is on its way.
        </p>
        <p className="text-xs" style={{ color: '#475F7B' }}>The link works once and expires in an hour.</p>
        <button onClick={() => { setMode('signin'); setError('') }}
          className="mt-6 text-sm transition-colors hover:text-white" style={{ color: '#6B8CAE' }}>
          ← Back to sign in
        </button>
      </div>
    </div>
  )

  // ── Forgot-password screens ─────────────────────────────────────────────────
  if (mode === 'forgot') return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0a0a0f' }}>
      <div className="max-w-md w-full rounded-3xl p-9 text-center"
        style={{ background: 'linear-gradient(160deg,#10192E,#0B1220)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex justify-center mb-4"><VakMascot level={3} size={78} mood="encouraging" /></div>
        <h2 className="text-white font-black text-xl mb-1">Forgot your password?</h2>
        <p className="text-sm mb-6" style={{ color: '#6B8CAE' }}>
          Enter your email and we will send you a link to set a new one.
        </p>

        {error && (
          <div className="rounded-2xl px-4 py-3 mb-4 text-sm text-left"
            style={{ background: 'rgba(239,68,68,0.1)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.3)' }}>
            {error}
          </div>
        )}

        <form onSubmit={sendReset} className="space-y-3 text-left">
          <input className="input" type="email" autoComplete="email" placeholder="you@email.com"
            value={form.email} onChange={e => update('email', e.target.value)} required />
          <button type="submit" disabled={loading} className="btn-play mt-1 w-full">
            {loading ? '…' : 'Send reset link →'}
          </button>
        </form>

        <button onClick={() => { setMode('signin'); setError('') }}
          className="mt-5 text-sm transition-colors hover:text-white" style={{ color: '#6B8CAE' }}>
          ← Back to sign in
        </button>
      </div>
    </div>
  )

  if (mode === 'reset-sent') return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0a0a0f' }}>
      <div className="max-w-md w-full text-center rounded-3xl p-10"
        style={{ background: 'linear-gradient(160deg,#10192E,#0B1220)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="text-5xl mb-5">📧</div>
        <h2 className="text-white font-black text-xl mb-3">Check your inbox</h2>
        <p className="text-sm leading-relaxed mb-2" style={{ color: '#6B8CAE' }}>
          If an account exists for{' '}
          <span className="text-white font-semibold">{form.email}</span>, we have sent a link to reset your password.
        </p>
        <p className="text-xs" style={{ color: '#475F7B' }}>The link expires shortly and can only be used once.</p>
        <button onClick={() => { setMode('signin'); setError('') }}
          className="mt-6 text-sm transition-colors hover:text-white" style={{ color: '#6B8CAE' }}>
          ← Back to sign in
        </button>
      </div>
    </div>
  )

  // ── Check-email screen ───────────────────────────────────────────────────────
  if (mode === 'check-email') return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: '#0a0a0f' }}>
      <div className="max-w-md w-full text-center rounded-3xl p-10"
        style={{ background: 'linear-gradient(160deg, #10192E 0%, #0B1220 100%)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="text-5xl mb-5">📧</div>
        <h2 className="text-white font-black text-xl mb-3">Check your inbox</h2>
        <p className="text-sm leading-relaxed" style={{ color: '#6B8CAE' }}>
          We sent a confirmation link to{' '}
          <span className="text-white font-semibold">{form.email}</span>.
          Click it to activate your account and start earning XP.
        </p>
        <button
          onClick={() => setMode('signin')}
          className="mt-6 text-sm transition-colors hover:text-white"
          style={{ color: '#6B8CAE' }}
        >
          ← Back to sign in
        </button>
      </div>
    </div>
  )

  // ── Sign-in / Sign-up screen ─────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden"
      style={{ background: '#0a0a0f' }}
    >
      {/* Background glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div style={{
          position: 'absolute', top: '-100px', right: '-80px',
          width: '500px', height: '500px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', bottom: '-100px', left: '-80px',
          width: '400px', height: '400px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(123,94,167,0.07) 0%, transparent 70%)',
        }} />
      </div>

      <div className="w-full max-w-sm relative z-10">

        {/* Vak + Logo */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="flex justify-center mb-3 animate-float">
            <VakMascot level={2} size={100} />
          </div>
          <Link to="/" className="inline-block">
            <span className="text-3xl font-black text-white tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
              SAN<span style={{ color: '#7B5EA7' }}>4</span>
            </span>
          </Link>
          <p className="mt-1 text-sm font-medium" style={{ color: '#6B8CAE' }}>
            Communicate with Confidence
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-3xl p-6 sm:p-8 animate-slide-up"
          style={{
            background: 'linear-gradient(160deg, #10192E 0%, #0B1220 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {/* Tab toggle */}
          <div
            className="flex rounded-2xl p-1 mb-7"
            style={{ background: 'linear-gradient(160deg, #10192E 0%, #0B1220 100%)' }}
          >
            {['signin', 'signup'].map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError('') }}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
                style={{
                  background: mode === m
                    ? 'linear-gradient(135deg, #7B5EA7, #9B7EC8)'
                    : 'transparent',
                  color: mode === m ? 'white' : '#6B8CAE',
                  boxShadow: mode === m ? '0 4px 14px rgba(123,94,167,0.3)' : 'none',
                }}
              >
                {m === 'signin' ? 'Sign In' : 'Join Free'}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">

            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-2"
                  style={{ color: '#6B8CAE' }}>Your name</label>
                <input className="input" placeholder="Ravi Kumar"
                  value={form.name} onChange={e => update('name', e.target.value)} required />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2"
                style={{ color: '#6B8CAE' }}>Email</label>
              <input className="input" type="email" placeholder="you@email.com"
                value={form.email} onChange={e => update('email', e.target.value)} required />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2"
                style={{ color: '#6B8CAE' }}>Password</label>
              <input className="input" type="password"
                placeholder={mode === 'signup' ? 'Min 8 characters' : '••••••••'}
                value={form.password} onChange={e => update('password', e.target.value)}
                minLength={8} required />
            </div>

            {mode === 'signin' && (
              <div className="text-right -mt-1">
                <button type="button" onClick={() => { setMode('forgot'); setError('') }}
                  className="text-xs font-semibold transition-colors hover:text-white"
                  style={{ color: '#7B5EA7' }}>
                  Forgot password?
                </button>
              </div>
            )}

            {mode === 'signup' && (
              <label className="flex items-start gap-2.5 text-xs leading-relaxed cursor-pointer select-none"
                style={{ color: '#6B8CAE' }}>
                <input
                  type="checkbox"
                  checked={consented}
                  onChange={e => { setConsented(e.target.checked); setError('') }}
                  className="mt-0.5 shrink-0"
                  style={{ accentColor: '#7B5EA7' }}
                  required
                />
                <span>
                  I agree to the{' '}
                  <Link to="/privacy" target="_blank" className="font-semibold hover:text-white transition-colors"
                    style={{ color: '#7B5EA7' }}>Privacy Policy</Link>.
                  {' '}I understand San4 records and processes my voice and practice sessions with AI to give me feedback.
                </span>
              </label>
            )}

            {error && (
              <div
                className="text-sm px-4 py-3 rounded-2xl"
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  color: '#FCA5A5',
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (mode === 'signup' && !consented)}
              className="btn-play mt-1"
              style={mode === 'signup' && !consented ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
            >
              {loading
                ? '…'
                : mode === 'signin'
                  ? '🎮 Sign In →'
                  : '🚀 Create Account →'}
            </button>
          </form>

          {mode === 'signin' && (
            <>
              <div className="flex items-center gap-3 my-4">
                <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.1)' }} />
                <span className="text-xs" style={{ color: '#475F7B' }}>or</span>
                <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.1)' }} />
              </div>
              <button
                type="button"
                onClick={() => { setMode('magic'); setError('') }}
                className="w-full py-3 rounded-2xl text-sm font-semibold transition-all hover:opacity-90"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#cbd5e1' }}
              >
                ✉️ Email me a link instead
              </button>
            </>
          )}

          {mode === 'signup' && (
            <div
              className="mt-4 rounded-2xl px-4 py-3 text-xs text-center"
              style={{
                background: 'rgba(245,158,11,0.08)',
                border: '1px solid rgba(245,158,11,0.15)',
                color: '#F59E0B',
              }}
            >
              ⭐ 3 free sessions included · No card needed
            </div>
          )}

          {/* Switch mode */}
          <p className="text-center mt-5 text-sm" style={{ color: '#6B8CAE' }}>
            {mode === 'signin' ? (
              <>No account?{' '}
                <button onClick={() => { setMode('signup'); setError('') }}
                  className="font-bold hover:text-white transition-colors"
                  style={{ color: '#7B5EA7' }}>
                  Join free →
                </button>
              </>
            ) : (
              <>Already in?{' '}
                <button onClick={() => { setMode('signin'); setError('') }}
                  className="font-bold hover:text-white transition-colors"
                  style={{ color: '#7B5EA7' }}>
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>

        <p className="text-center mt-5 text-xs" style={{ color: '#243D5F' }}>
          <Link to="/" className="hover:text-muted transition-colors">← Back to San4</Link>
        </p>
      </div>
    </div>
  )
}
