import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth, useAuthStore } from '../hooks/useAuth'

const navy = '#0F172A'
const blue = '#2563EB'

const inputStyle = {
  background: 'rgba(255,255,255,0.07)',
  border:     '1px solid rgba(255,255,255,0.14)',
}

export default function Auth() {
  const [params]  = useSearchParams()
  const [mode, setMode] = useState(params.get('mode') === 'signup' ? 'signup' : 'signin')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const { signIn, signUp } = useAuth()
  const { user } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => { if (user) navigate('/dashboard') }, [user])

  function update(key, val) { setForm(f => ({ ...f, [key]: val })); setError('') }

  async function submit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: err } = mode === 'signup'
      ? await signUp(form.email, form.password, form.name)
      : await signIn(form.email, form.password)

    if (err) { setError(err.message); setLoading(false) }
    else if (mode === 'signup') {
      setLoading(false)
      setMode('check-email')
    }
  }

  // ── Check-email screen ──────────────────────────────────────────────────────
  if (mode === 'check-email') return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: navy }}
    >
      <div
        className="max-w-md w-full text-center rounded-2xl p-10"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}
      >
        <div className="text-5xl mb-5">📧</div>
        <h2 className="text-white font-black text-xl mb-3">Check your inbox</h2>
        <p style={{ color: '#93C5FD' }} className="text-sm leading-relaxed">
          We sent a confirmation link to{' '}
          <span className="text-white font-semibold">{form.email}</span>.
          Click it to activate your account.
        </p>
        <button
          onClick={() => setMode('signin')}
          className="mt-6 text-sm hover:text-white transition-colors"
          style={{ color: '#64748B' }}
        >
          ← Back to sign in
        </button>
      </div>
    </div>
  )

  // ── Sign-in / Sign-up screen ────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{ background: navy }}
    >
      {/* Subtle radial bloom */}
      <div
        className="fixed top-0 right-0 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.18) 0%, transparent 65%)' }}
      />

      <div className="w-full max-w-md relative z-10">

        {/* Logo */}
        <div className="text-center mb-10">
          <Link to="/" className="inline-block">
            <span className="text-3xl font-black text-white tracking-tight">
              San<span style={{ color: blue }}>4</span>
            </span>
          </Link>
          <p className="mt-2 text-sm" style={{ color: '#93C5FD' }}>
            Communicate with Confidence
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-6 sm:p-8"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}
        >
          {/* Tab toggle */}
          <div
            className="flex rounded-xl p-1 mb-8"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            {['signin', 'signup'].map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError('') }}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
                style={{
                  background: mode === m ? blue : 'transparent',
                  color:      mode === m ? 'white' : '#64748B',
                }}
              >
                {m === 'signin' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-5">

            {/* Name — signup only */}
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2"
                  style={{ color: '#64748B' }}>
                  Your name
                </label>
                <input
                  className="w-full text-white rounded-xl px-4 py-3 text-sm focus:outline-none transition-all"
                  style={inputStyle}
                  placeholder="Ravi Kumar"
                  value={form.name}
                  onChange={e => update('name', e.target.value)}
                  required
                />
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2"
                style={{ color: '#64748B' }}>
                Email
              </label>
              <input
                className="w-full text-white rounded-xl px-4 py-3 text-sm focus:outline-none transition-all"
                style={inputStyle}
                type="email"
                placeholder="you@email.com"
                value={form.email}
                onChange={e => update('email', e.target.value)}
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2"
                style={{ color: '#64748B' }}>
                Password
              </label>
              <input
                className="w-full text-white rounded-xl px-4 py-3 text-sm focus:outline-none transition-all"
                style={inputStyle}
                type="password"
                placeholder={mode === 'signup' ? 'Minimum 8 characters' : '••••••••'}
                value={form.password}
                onChange={e => update('password', e.target.value)}
                minLength={8}
                required
              />
            </div>

            {/* Error */}
            {error && (
              <div
                className="text-sm px-4 py-3 rounded-xl"
                style={{
                  background: 'rgba(239,68,68,0.12)',
                  border:     '1px solid rgba(239,68,68,0.25)',
                  color:      '#FCA5A5',
                }}
              >
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full text-white font-bold py-3.5 rounded-xl text-sm transition-all active:scale-95 disabled:opacity-50 hover:opacity-90 mt-2"
              style={{ background: blue }}
            >
              {loading ? '…' : mode === 'signin' ? 'Sign In →' : 'Create Account →'}
            </button>

          </form>

          {/* Fine print */}
          {mode === 'signup' && (
            <p className="text-xs text-center mt-5 leading-relaxed" style={{ color: '#475569' }}>
              By creating an account you agree to our terms.
              3 free sessions included. No card needed.
            </p>
          )}

          {/* Switch mode */}
          <p className="text-center mt-5 text-sm" style={{ color: '#475569' }}>
            {mode === 'signin' ? (
              <>
                No account?{' '}
                <button
                  onClick={() => { setMode('signup'); setError('') }}
                  className="font-semibold hover:text-white transition-colors"
                  style={{ color: '#93C5FD' }}
                >
                  Create one free
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  onClick={() => { setMode('signin'); setError('') }}
                  className="font-semibold hover:text-white transition-colors"
                  style={{ color: '#93C5FD' }}
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>

        {/* Back to home */}
        <p className="text-center mt-6 text-xs" style={{ color: '#334155' }}>
          <Link to="/" className="hover:text-slate-400 transition-colors">
            ← Back to San4
          </Link>
        </p>

      </div>
    </div>
  )
}
