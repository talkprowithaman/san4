import { Dots } from './ink/Ink'

// Vak is reduced to a single mark in the app: the icon and three dots.
export default function LoadingScreen() {
  return (
    <div style={{ minHeight: '100dvh', background: '#0A0A0C', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 26 }}>
      <img src="/san4-icon.png" alt="San4" width={46} height={46} style={{ borderRadius: 14, display: 'block' }} />
      <Dots />
    </div>
  )
}
