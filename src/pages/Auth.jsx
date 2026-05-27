import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useAuthStore } from '../hooks/useAuth'

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
      setError('')
      setLoading(false)
      setMode('check-email')
    }
  }

  if (mode === 'check-email') return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center px-4">
      <div className="card max-w-md w-full text-center">
        <div className="text-4xl mb-4">📧</div>
        <h2 className="text-white font-bold text-xl mb-2">Check your email</h2>
        <p className="text-muted">We sent a confirmation link to <strong className="text-white">{form.email}</strong>. Click it to activate your account.</p>
        <button onClick={() => setMode('signin')} className="btn-ghost mt-4 text-sm">
          Back to sign in
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="text-3xl font-black text-white">
            San<span className="text-primary">4</span>
          </Link>
          <p className="text-muted mt-2 text-sm">Communicate with Confidence</p>
        </div>

        <div className="card">
          {/* Tab toggle */}
          <div className="flex bg-navy-800 rounded-xl p-1 mb-6">
            {['signin', 'signup'].map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError('') }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all
                  ${mode === m ? 'bg-primary text-white' : 'text-muted hover:text-white'}`}
              >
                {m === 'signin' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-sm text-muted mb-1.5">Your name</label>
                <input
                  className="input"
                  placeholder="Aman Jindal"
                  value={form.name}
                  onChange={e => update('name', e.target.value)}
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm text-muted mb-1.5">Email address</label>
              <input
                className="input"
                type="email"
                placeholder="you@company.com"
                value={form.email}
                onChange={e => update('email', e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm text-muted mb-1.5">Password</label>
              <input
                className="input"
                type="password"
                placeholder={mode === 'signup' ? 'Min 8 characters' : '••••••••'}
                value={form.password}
                onChange={e => update('password', e.target.value)}
                minLength={8}
                required
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? '…' : mode === 'signin' ? 'Sign In →' : 'Create Account →'}
            </button>
          </form>

          {mode === 'signup' && (
            <p className="text-muted text-xs text-center mt-4 leading-relaxed">
              By creating an account you agree to our terms. 3 free sessions included. No card needed.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
