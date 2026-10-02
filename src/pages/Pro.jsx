import { useNavigate } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { useAuthStore } from '../hooks/useAuth'
import { useSubscription } from '../hooks/useSubscription'
import { track } from '../lib/analytics'
import { C, F, mono } from '../lib/ink'
import { Screen, Back, Btn, TextBtn, H1, Spacer, CheckIcon } from '../components/ink/Ink'

// Same payment path as /pricing: a Razorpay payment link, with the email
// pre-filled so the webhook can match it to the account. In the native app
// there is no in-app digital payment (Play policy), so it opens the website.
const PAY_LINK = 'https://rzp.io/rzp/m54y50n'
const WEB_BASE = 'https://san4-delta.vercel.app'

const DEPTH = [
  'Sessions past four minutes',
  'Line by line breakdown of what you said',
  'The verified credential page and badge',
  'Interview mode, scored against a real job post',
  'The Summit: four advanced levels, no unlock chain',
]

// ── 15 · Pro is depth, not access ──────────────────────────────────────────
export default function Pro() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { isPro } = useSubscription()

  function goPro() {
    track('pro_checkout_opened', { from: 'pro_screen' })
    if (!user) { navigate('/start'); return }
    if (Capacitor.isNativePlatform()) { window.open(`${WEB_BASE}/pricing`, '_system'); return }
    window.open(user.email ? `${PAY_LINK}?prefill[email]=${encodeURIComponent(user.email)}` : PAY_LINK, '_blank')
  }

  return (
    <Screen pad="30px 28px 28px">
      <Back mb={22} />
      <div style={{ ...mono(10, C.lilac), marginBottom: 14 }}>PRO IS DEPTH, NOT ACCESS</div>
      <H1 mb={22}>Every accent stays free. You pay for how deep it goes.</H1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {DEPTH.map(d => (
          <div key={d} style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
            <span style={{ marginTop: 2 }}><CheckIcon /></span>
            <span style={{ fontSize: 13.5, lineHeight: 1.5, color: C.soft }}>{d}</span>
          </div>
        ))}
      </div>
      <Spacer min={24} />
      {isPro ? (
        <>
          <div style={{ border: '1px solid rgba(0,196,154,.3)', background: 'rgba(0,196,154,.06)', borderRadius: 20, padding: 18, color: C.teal, font: `600 14px ${F.sans}` }}>
            You are on Pro. All of this is already yours.
          </div>
          <Btn onClick={() => navigate(-1)} style={{ marginTop: 12, padding: 16, borderRadius: 15, fontSize: 14.5 }}>Back to practice</Btn>
        </>
      ) : (
        <>
          <div style={{ border: `1px solid ${C.line2}`, borderRadius: 20, padding: 18, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div>
              <div style={{ fontFamily: F.display, fontWeight: 400, fontSize: 26 }}>₹299 <s style={{ fontSize: 15, color: C.dim }}>₹499</s></div>
              <div style={{ ...mono(10, C.dim, 0), marginTop: 3 }}>PER MONTH · EARLY BIRD</div>
            </div>
            <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(255,255,255,.1)' }} />
            <p style={{ margin: 0, flex: 1, fontSize: 12, lineHeight: 1.5, color: C.dim }}>No annual lock-in. Your score and badge stay yours.</p>
          </div>
          <Btn onClick={goPro} style={{ marginTop: 12, padding: 16, borderRadius: 15, fontSize: 14.5 }}>Go Pro</Btn>
          <TextBtn onClick={() => navigate(-1)} style={{ marginTop: 10 }}>Keep practising free</TextBtn>
        </>
      )}
    </Screen>
  )
}
