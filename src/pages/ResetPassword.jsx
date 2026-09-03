import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import VakMascot from '../components/VakMascot'

// Landing point for the "reset your password" email link.
// Supabase sends the user here with a `code` (PKCE). We exchange it for a
// short-lived recovery session, then let them set a new password. If the link
// is stale or already used, we say so plainly instead of failing silently.
export default function ResetPassword() {
  const navigate = useNavigate()
  const { updatePassword } = useAuth()
  const [phase, setPhase] = useState('verifying') // verifying | form | done | invalid
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  useEffect(() => {
    const url = new URL(window.location.href)
    const code = url.searchParams.get('code')
    // Older email templates use a hash fragment instead of ?code=
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const errDesc = url.searchParams.get('error_description') || hash.get('error_description')

    if (errDesc) { console.warn('reset link error:', errDesc); setPhase('invalid'); return }

    if (code) {
      supabase.auth.exchangeCodeForSession(code)
        .then(({ error }) => {
          if (error) { console.warn('reset link exchange failed:', error.message); setPhase('invalid') }
          else setPhase('form')
        })
        .catch(e => { console.warn('reset link exchange failed:', e?.message); setPhase('invalid') })
      return
    }

    // Some flows land here with the recovery session already established.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setPhase(session ? 'form' : 'invalid')
    })
  }, [])

  async function submit(e) {
    e.preventDefault()
    if (password.length < 8)     { setError('Use at least 8 characters.'); return }
    if (password !== confirm)    { setError('Those two passwords do not match.'); return }
    setLoading(true); setError('')
    const { error: err } = await updatePassword(password)
    setLoading(false)
    if (err) { setError(err.message); return }
    setPhase('done')
    setTimeout(() => navigate('/today', { replace: true }), 1800)
  }

  const Shell = ({ children }) => (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0a0a0f' }}>
      <div className="max-w-md w-full rounded-3xl p-9 text-center"
        style={{ background: 'linear-gradient(160deg,#10192E,#0B1220)', border: '1px solid rgba(255,255,255,0.08)' }}>
        {children}
      </div>
    </div>
  )

  if (phase === 'verifying') return (
    <Shell>
      <div className="w-10 h-10 mx-auto mb-5 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: '#7B5EA7 transparent #7B5EA7 #7B5EA7' }} />
      <h2 className="text-white font-bold text-lg">Checking your link…</h2>
    </Shell>
  )

  if (phase === 'invalid') return (
    <Shell>
      <div className="text-5xl mb-4">⚠️</div>
      <h2 className="text-white font-black text-xl mb-2">This link has expired</h2>
      <p className="text-sm mb-6" style={{ color: '#94A3B8' }}>
        Password reset links can only be used once, and expire after a short while. Request a fresh one and it will work.
      </p>
      <Link to="/auth?reset=1" className="btn-primary inline-block px-7 py-3">Send a new link →</Link>
    </Shell>
  )

  if (phase === 'done') return (
    <Shell>
      <div className="flex justify-center mb-4"><VakMascot level={5} size={82} mood="celebrating" /></div>
      <h2 className="text-white font-black text-xl mb-2">Password updated</h2>
      <p className="text-sm" style={{ color: '#6B8CAE' }}>Signing you in…</p>
    </Shell>
  )

  return (
    <Shell>
      <div className="flex justify-center mb-4"><VakMascot level={3} size={78} mood="encouraging" /></div>
      <h2 className="text-white font-black text-xl mb-1">Set a new password</h2>
      <p className="text-sm mb-6" style={{ color: '#6B8CAE' }}>Make it something you will remember.</p>

      {error && (
        <div className="rounded-2xl px-4 py-3 mb-4 text-sm text-left"
          style={{ background: 'rgba(239,68,68,0.1)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.3)' }}>
          {error}
        </div>
      )}

      <form onSubmit={submit} className="space-y-3 text-left">
        <input className="input" type="password" autoComplete="new-password" placeholder="New password (min 8 characters)"
          value={password} onChange={e => { setPassword(e.target.value); setError('') }} required />
        <input className="input" type="password" autoComplete="new-password" placeholder="Confirm new password"
          value={confirm} onChange={e => { setConfirm(e.target.value); setError('') }} required />
        <button type="submit" disabled={loading} className="btn-play mt-1 w-full">
          {loading ? '…' : 'Update password →'}
        </button>
      </form>
    </Shell>
  )
}
