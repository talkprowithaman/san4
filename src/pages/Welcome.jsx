import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../hooks/useAuth'
import { Screen, Btn, TextBtn } from '../components/ink/Ink'
import { C, F } from '../lib/ink'

// 01 · Welcome — the first thing a new user sees.
export default function Welcome() {
  const { user, loading } = useAuthStore()
  if (!loading && user) return <Navigate to="/today" replace />

  return (
    <Screen pad="0 30px 40px">
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <img src="/san4-icon.png" alt="San4" width={46} height={46} style={{ borderRadius: 14, marginBottom: 34, display: 'block' }} />
        <h1 style={{ fontFamily: F.display, fontWeight: 300, fontSize: 40, lineHeight: 1.1, letterSpacing: '-.02em', margin: '0 0 18px' }}>
          Speak like the room is already yours.
        </h1>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: C.dim, maxWidth: 290 }}>
          Two minutes a day, out loud, in private. Nobody hears it but you and Vak.
        </p>
        <div style={{ marginTop: 38, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Btn to="/assessment">Begin</Btn>
          <TextBtn to="/auth" size={13}>I already have an account</TextBtn>
        </div>
      </div>
    </Screen>
  )
}
