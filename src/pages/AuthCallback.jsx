import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const navy = '#0F172A'
const blue = '#2563EB'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('verifying') // 'verifying' | 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code')

    if (!code) {
      // No code — maybe already authenticated or bad link
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) navigate('/today', { replace: true })
        else navigate('/auth', { replace: true })
      })
      return
    }

    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        setErrorMsg(error.message)
        setStatus('error')
      } else {
        setStatus('success')
        setTimeout(() => navigate('/today', { replace: true }), 1200)
      }
    })
  }, [])

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: navy }}
    >
      <div
        className="max-w-sm w-full text-center rounded-2xl p-10"
        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}
      >
        {status === 'verifying' && (
          <>
            <div className="flex justify-center mb-5">
              <div
                className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: `${blue} transparent ${blue} ${blue}` }}
              />
            </div>
            <h2 className="text-white font-bold text-lg">Verifying your email…</h2>
            <p className="text-sm mt-2" style={{ color: '#64748B' }}>Just a moment</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-5xl mb-5">✅</div>
            <h2 className="text-white font-bold text-lg">Email confirmed!</h2>
            <p className="text-sm mt-2" style={{ color: '#64748B' }}>Taking you to your dashboard…</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-5xl mb-5">⚠️</div>
            <h2 className="text-white font-bold text-lg mb-2">Link expired or invalid</h2>
            <p className="text-sm mb-6" style={{ color: '#94A3B8' }}>
              {errorMsg || 'This confirmation link has already been used or has expired.'}
            </p>
            <button
              onClick={() => navigate('/auth')}
              className="w-full text-white font-semibold py-3 rounded-xl text-sm transition-all hover:opacity-90"
              style={{ background: blue }}
            >
              Back to Sign In
            </button>
          </>
        )}
      </div>
    </div>
  )
}
