import { useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { C, F, mono } from '../../lib/ink'

// ── Stroke icons (the design swaps every emoji for these) ───────────────────
const svg = (size, stroke, width, children, extra = {}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke}
    strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" {...extra}>{children}</svg>
)
export const MicIcon = ({ size = 24, color = '#fff', width = 1.7 }) =>
  svg(size, color, width, <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><path d="M12 18v3" /></>)
export const BackIcon = ({ size = 20, color = 'currentColor' }) => svg(size, color, 1.6, <path d="M15 5l-7 7 7 7" />)
export const ChevronIcon = ({ size = 16, color = C.lilac }) => svg(size, color, 1.8, <path d="M9 5l7 7-7 7" />, { style: { flex: 'none' } })
export const ArrowIcon = ({ size = 18, color = C.lilac }) => svg(size, color, 1.8, <><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></>)
export const CheckIcon = ({ size = 14, color = C.teal, width = 2.4 }) => svg(size, color, width, <path d="M4 12.5l5 5L20 6.5" />, { style: { flex: 'none' } })
export const LockIcon = ({ size = 13, color = C.teal }) =>
  svg(size, color, 1.8, <><rect x="4" y="10" width="16" height="11" rx="2.5" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>)
export const FlameIcon = ({ size = 12, color = C.lilac, width = 1.7 }) =>
  svg(size, color, width, <path d="M12 3c3 4 6 6 6 10a6 6 0 0 1-12 0c0-2 1-3.5 2-5 .5 1.5 1.5 2 2.5 2C10 8 10.5 5 12 3z" />, { style: { flex: 'none' } })
export const FreezeIcon = ({ size = 18, color = C.ice }) =>
  svg(size, color, 1.6, <><path d="M12 3v18" /><path d="M4.2 7.5l15.6 9" /><path d="M19.8 7.5l-15.6 9" /></>)
export const SpeakerIcon = ({ size = 16, color = C.dim, on = true }) =>
  svg(size, color, 1.6, <>
    <path d="M4 9h4l5-4v14l-5-4H4z" />
    {on ? <><path d="M16.5 8.5a5 5 0 0 1 0 7" /><path d="M19 6a8.5 8.5 0 0 1 0 12" /></> : <path d="M17 9l5 6M22 9l-5 6" />}
  </>)

// ── Screen frame ─────────────────────────────────────────────────────────────
// Every app screen is a phone-width column on ink. On a desktop the column
// stays phone-width and centred, so the layout matches the design exactly.
export function Screen({ children, pad = '30px 28px 28px', animate = true, style }) {
  return (
    <div style={{ minHeight: '100dvh', background: C.ink, color: C.paper, display: 'flex', justifyContent: 'center' }}>
      <div style={{
        width: '100%', maxWidth: 480, minHeight: '100dvh', display: 'flex', flexDirection: 'column',
        padding: pad, paddingTop: `calc(env(safe-area-inset-top, 0px) + ${pad.split(' ')[0]})`,
        animation: animate ? 'fadeUp .35s ease both' : undefined, ...style,
      }}>
        {children}
      </div>
    </div>
  )
}

// A tab screen: fixed header area, scrolling body, bottom tab bar.
export function TabScreen({ header, children, bodyPad = '6px 22px 16px' }) {
  useEffect(() => { window.scrollTo(0, 0) }, [])
  return (
    <div style={{ minHeight: '100dvh', background: C.ink, color: C.paper, display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
        {header && <div style={{ padding: 'calc(env(safe-area-inset-top, 0px) + 20px) 22px 12px', flex: 'none' }}>{header}</div>}
        <div style={{ flex: 1, padding: header ? bodyPad : `calc(env(safe-area-inset-top, 0px) + 20px) 22px 16px`, paddingBottom: 110 }}>
          {children}
        </div>
        <TabBar />
      </div>
    </div>
  )
}

export function Back({ to, onClick, mb = 22 }) {
  const navigate = useNavigate()
  return (
    <button aria-label="Back" onClick={onClick || (() => (to ? navigate(to) : navigate(-1)))}
      style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: C.dim, marginBottom: mb, alignSelf: 'flex-start' }}>
      <BackIcon />
    </button>
  )
}

export const Spacer = ({ min = 0 }) => <div style={{ flex: 1, minHeight: min }} />

export function Kicker({ children, color = C.dim, size = 10, spacing = '.16em', style }) {
  return <div style={{ ...mono(size, color, spacing), ...style }}>{children}</div>
}

export function H1({ children, size = 27, weight = 300, mb = 10, style }) {
  return (
    <h2 style={{ fontFamily: F.display, fontWeight: weight, fontSize: size, lineHeight: 1.2, letterSpacing: '-.02em', margin: `0 0 ${mb}px`, ...style }}>
      {children}
    </h2>
  )
}

export function Sub({ children, mb = 26, size = 13.5, style }) {
  return <p style={{ margin: `0 0 ${mb}px`, fontSize: size, lineHeight: 1.6, color: C.dim, ...style }}>{children}</p>
}

// ── Buttons ──────────────────────────────────────────────────────────────────
const BTN = {
  paper:   { background: C.paper, color: C.ink, border: 'none', font: `700 15px ${F.sans}` },
  purple:  { background: C.purple, color: '#fff', border: 'none', font: `700 15px ${F.sans}` },
  teal:    { background: C.teal, color: C.tealInk, border: 'none', font: `700 14px ${F.sans}` },
  outline: { background: 'none', color: C.paper, border: `1px solid ${C.line3}`, font: `600 14.5px ${F.sans}` },
  quiet:   { background: 'none', color: C.soft, border: `1px solid ${C.line3}`, font: `600 14px ${F.sans}` },
}
export function Btn({ kind = 'paper', children, onClick, to, disabled, style, type = 'button', ...rest }) {
  const s = {
    ...BTN[kind], cursor: disabled ? 'not-allowed' : 'pointer', padding: 17, borderRadius: 16, width: '100%',
    opacity: disabled ? 0.45 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
    textDecoration: 'none', textAlign: 'center', ...style,
  }
  if (to && !disabled) return <Link to={to} style={s} {...rest}>{children}</Link>
  return <button type={type} onClick={onClick} disabled={disabled} style={s} {...rest}>{children}</button>
}
export function TextBtn({ children, onClick, to, size = 12.5, color = C.dim, style }) {
  const s = { border: 'none', background: 'none', cursor: 'pointer', color, font: `500 ${size}px ${F.sans}`, textDecoration: 'none', textAlign: 'center', padding: 4, ...style }
  if (to) return <Link to={to} style={{ ...s, display: 'block' }}>{children}</Link>
  return <button onClick={onClick} style={s}>{children}</button>
}

// ── Hairline row group (Clarity 71 / Structure 58 …) ─────────────────────────
export function Rows({ children, radius = 16, style }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: C.line, border: `1px solid ${C.line}`, borderRadius: radius, overflow: 'hidden', ...style }}>
      {children}
    </div>
  )
}
export function Row({ label, value, valueColor = C.paper, onClick }) {
  const s = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: C.panel, border: 'none', width: '100%', textAlign: 'left', cursor: onClick ? 'pointer' : 'default' }
  const inner = <>
    <span style={{ font: `400 13px ${F.sans}`, color: C.soft }}>{label}</span>
    <span style={{ font: `500 12px ${F.mono}`, color: valueColor }}>{value}</span>
  </>
  return onClick ? <button onClick={onClick} style={s}>{inner}</button> : <div style={s}>{inner}</div>
}

// ── Choice card (goal / mode / persona pickers) ─────────────────────────────
export function Choice({ selected, onClick, children, radius = 16, pad = 18, style }) {
  return (
    <button onClick={onClick} style={{
      cursor: 'pointer', textAlign: 'left', padding: pad, borderRadius: radius, width: '100%',
      background: selected ? 'rgba(123,94,167,.14)' : 'rgba(255,255,255,.03)',
      border: `1px solid ${selected ? 'rgba(169,140,224,.5)' : C.line}`, color: C.paper, ...style,
    }}>{children}</button>
  )
}

export function Notice({ children, tone = 'teal', style }) {
  const t = {
    teal:  { c: C.teal,  bg: 'rgba(0,196,154,.07)',  bd: 'rgba(0,196,154,.3)' },
    amber: { c: C.amber, bg: 'rgba(245,158,11,.09)', bd: 'rgba(245,158,11,.4)' },
    red:   { c: '#FCA5A5', bg: 'rgba(239,68,68,.08)', bd: 'rgba(239,68,68,.3)' },
    blue:  { c: C.blue,  bg: 'rgba(79,172,254,.09)', bd: 'rgba(79,172,254,.35)' },
  }[tone]
  return (
    <div style={{ padding: '11px 14px', borderRadius: 14, border: `1px solid ${t.bd}`, background: t.bg, color: t.c, font: `500 12.5px/1.5 ${F.sans}`, ...style }}>
      {children}
    </div>
  )
}

// "Nobody hears this but you" pill
export function PrivatePill({ style }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 14px', borderRadius: 20, border: '1px solid rgba(0,196,154,.3)', background: 'rgba(0,196,154,.07)', alignSelf: 'flex-start', ...style }}>
      <LockIcon />
      <span style={{ font: `500 11.5px ${F.sans}`, color: C.teal }}>Nobody hears this but you</span>
    </div>
  )
}

// Consent tick (DPDP). Kept small; it has to exist before any recording.
export function ConsentTick({ checked, onChange, children }) {
  return (
    <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', font: `400 11.5px/1.55 ${F.sans}`, color: C.dim, userSelect: 'none' }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        style={{ accentColor: C.purple, marginTop: 2, flex: 'none' }} />
      <span>{children}</span>
    </label>
  )
}

// ── Score ring ───────────────────────────────────────────────────────────────
export function ScoreRing({ score, size = 132, stroke = 5, color = C.teal, track = 'rgba(255,255,255,.07)', label = 'SAN4 SCORE', numSize = 48, numColor, labelColor = C.dim }) {
  const r = size / 2 - stroke * 1.6
  const circ = 2 * Math.PI * r
  const v = Math.max(0, Math.min(100, Number(score) || 0))
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        {score != null && (
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={`${(v / 100 * circ).toFixed(1)} ${circ.toFixed(1)}`} transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: 'stroke-dasharray .8s ease' }} />
        )}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: F.display, fontWeight: 300, fontSize: numSize, letterSpacing: '-.045em', lineHeight: 1, color: numColor }}>{score ?? '—'}</span>
        {label && <span style={{ ...mono(9, labelColor, '.14em'), marginTop: 5 }}>{label}</span>}
      </div>
    </div>
  )
}

// ── Waveform + mic ───────────────────────────────────────────────────────────
export function Waveform({ active, count = 19, color = C.purple, height = 50, gap = 4, barWidth = 3, flex = false, speed = 1.2, origin = 'center' }) {
  return (
    <div style={{ display: 'flex', alignItems: origin === 'bottom' ? 'flex-end' : 'center', justifyContent: 'center', gap, height: height + 12, width: '100%' }}>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} style={{
          width: flex ? undefined : barWidth, flex: flex ? 1 : undefined, height, borderRadius: 2,
          background: active ? color : 'rgba(255,255,255,.12)', transformOrigin: origin,
          transform: active ? undefined : 'scaleY(.22)',
          animation: active ? `vb ${speed}s ease-in-out infinite` : 'none',
          animationDelay: `${(i % (flex ? 9 : 7)) * (flex ? 0.08 : 0.11)}s`,
        }} />
      ))}
    </div>
  )
}

export function MicButton({ listening, onClick, size = 82, disabled, idle = C.purple, live = C.teal, stopSquare = false }) {
  return (
    <button onClick={onClick} disabled={disabled} aria-label={listening ? 'Stop' : 'Speak'} style={{
      border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', width: size, height: size, borderRadius: '50%', flex: 'none',
      background: listening ? live : idle, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.45 : 1,
      boxShadow: listening ? `0 0 0 6px ${live === C.teal ? 'rgba(0,196,154,.14)' : 'rgba(123,94,167,.18)'}` : '0 8px 28px rgba(123,94,167,.45)',
      transition: 'background .2s ease',
    }}>
      {listening && stopSquare
        ? <span style={{ width: size * 0.3, height: size * 0.3, borderRadius: 5, background: '#fff', display: 'block' }} />
        : <MicIcon size={Math.round(size * 0.34)} />}
    </button>
  )
}

export function Dots({ size = 7, color = C.purple }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {[0, 0.18, 0.36].map(d => (
        <span key={d} style={{ width: size, height: size, borderRadius: '50%', background: color, animation: 'dots 1.1s infinite', animationDelay: `${d}s` }} />
      ))}
    </div>
  )
}

// Full-screen "thinking" state (scoring, analysing).
export function Working({ title, sub }) {
  return (
    <Screen pad="40px 34px">
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
        <Dots />
        <p style={{ margin: 0, textAlign: 'center', fontFamily: F.display, fontWeight: 300, fontSize: 22, lineHeight: 1.35 }}>{title}</p>
        {sub && <p style={{ margin: 0, textAlign: 'center', fontSize: 12.5, color: C.dim }}>{sub}</p>}
      </div>
    </Screen>
  )
}

// ── Bottom navigation: Today / Climb / Library / Me + the mic ────────────────
const TABS = [
  { to: '/today',    label: 'Today',   match: ['/today', '/streak'] },
  { to: '/practice', label: 'Climb',   match: ['/practice'] },
  { to: '/library',  label: 'Library', match: ['/library'] },
  { to: '/me',       label: 'Me',      match: ['/me', '/progress', '/dashboard'] },
]
export function TabBar() {
  const { pathname } = useLocation()
  return (
    <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 40, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
      <nav style={{
        width: '100%', maxWidth: 480, display: 'flex', alignItems: 'center', gap: 6, pointerEvents: 'auto',
        padding: '10px 26px calc(env(safe-area-inset-bottom, 0px) + 24px)', borderTop: `1px solid rgba(255,255,255,.07)`,
        background: 'rgba(10,10,12,.94)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
      }}>
        {TABS.map(t => {
          const on = t.match.some(m => pathname === m || (m === '/practice' && pathname === '/practice'))
          return (
            <Link key={t.to} to={t.to} style={{
              flex: 1, padding: '10px 0 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              font: `500 10.5px ${F.sans}`, color: on ? C.paper : C.dim, textDecoration: 'none',
            }}>
              <span style={{ width: 20, height: 2, borderRadius: 2, background: on ? C.purple : 'transparent' }} />
              {t.label}
            </Link>
          )
        })}
        <Link to="/session/mode" aria-label="Practise now" style={{
          flex: 'none', marginLeft: 8, width: 52, height: 52, borderRadius: '50%', background: C.purple,
          display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 26px rgba(123,94,167,.45)',
        }}>
          <MicIcon size={21} />
        </Link>
      </nav>
    </div>
  )
}

// Segmented control (Levels | Library).
export function Segmented({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6, padding: 4, borderRadius: 14, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)' }}>
      {options.map(o => (
        <button key={o.value} onClick={() => onChange(o.value)} style={{
          flex: 1, border: 'none', cursor: 'pointer', padding: 9, borderRadius: 11,
          background: value === o.value ? 'rgba(123,94,167,.9)' : 'transparent',
          color: value === o.value ? '#fff' : C.dim, font: `600 12.5px ${F.sans}`,
        }}>{o.label}</button>
      ))}
    </div>
  )
}

// Error/info line used across flows.
export function ErrorNote({ children, style }) {
  if (!children) return null
  return <Notice tone="red" style={style}>{children}</Notice>
}
