import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Screen, Btn, Dots, H1, Sub, Spacer } from '../components/ink/Ink'

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
    <Screen pad="36px 30px 30px">
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {status === 'verifying' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            <Dots />
            <H1 size={22} style={{ textAlign: 'center' }}>Signing you in</H1>
          </div>
        )}
        {status === 'success' && (
          <div style={{ textAlign: 'center' }}>
            <H1 size={24}>You are in.</H1>
            <Sub>Taking you to Today.</Sub>
          </div>
        )}
        {status === 'error' && (
          <>
            <H1>That link has expired.</H1>
            <Sub>{errorMsg || 'This link was already used, or it is too old. Ask for a new one.'}</Sub>
            <Spacer />
            <Btn onClick={() => navigate('/auth')}>Back to sign in</Btn>
          </>
        )}
      </div>
    </Screen>
  )
}
