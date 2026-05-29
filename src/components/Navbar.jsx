import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth }          from '../hooks/useAuth'
import { useProgress }      from '../hooks/useProgress'
import { useSubscription }  from '../hooks/useSubscription'

const NAV = [
  { to: '/dashboard',    label: 'Home',     icon: '🏠' },
  { to: '/practice',     label: 'Practice', icon: '🎮' },
  { to: '/meeting-prep', label: 'Prep',     icon: '📋' },
  { to: '/progress',     label: 'Progress', icon: '📊' },
]

export default function Navbar() {
  const { signOut, profile }    = useAuth()
  const { progress, levelInfo } = useProgress()
  const { isPro }               = useSubscription()
  const location  = useLocation()
  const navigate  = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  const streak = progress?.streak_count ?? 0

  return (
    <nav
      className="sticky top-0 z-50 backdrop-blur-md"
      style={{
        background: 'rgba(9,21,40,0.88)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-4">

        {/* ── Logo ─────────────────────────────────────── */}
        <Link to="/dashboard" className="flex items-center gap-2 shrink-0">
          <span className="text-2xl font-black text-white tracking-tight">
            San<span style={{ color: '#FF6B35' }}>4</span>
          </span>
        </Link>

        {/* ── Nav links (desktop) ───────────────────────── */}
        <div className="hidden md:flex items-center gap-1">
          {NAV.map(({ to, label, icon }) => {
            const active = location.pathname === to
            return (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background:  active ? 'rgba(255,107,53,0.15)' : 'transparent',
                  color:       active ? '#FF6B35' : '#6B8CAE',
                  border:      active ? '1px solid rgba(255,107,53,0.25)' : '1px solid transparent',
                }}
              >
                <span>{icon}</span> {label}
              </Link>
            )
          })}
        </div>

        {/* ── Right: streak + level + sign out ─────────── */}
        <div className="flex items-center gap-2.5 shrink-0">

          {/* Streak */}
          {streak > 0 && (
            <div
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold"
              style={{ background: 'rgba(255,107,53,0.12)', color: '#FF6B35' }}
            >
              🔥 <span>{streak}</span>
            </div>
          )}

          {/* Level badge */}
          {levelInfo && (
            <div
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
              style={{
                background: `${levelInfo.current.color}18`,
                color:       levelInfo.current.color,
                border:      `1px solid ${levelInfo.current.color}35`,
              }}
            >
              <span>{levelInfo.current.icon}</span>
              <span className="hidden lg:inline">{levelInfo.current.name}</span>
              <span className="lg:hidden">Lv.{levelInfo.current.level}</span>
            </div>
          )}

          {/* Mini XP bar (desktop) */}
          {levelInfo && (
            <div className="hidden lg:block w-20">
              <div className="xp-bar-track" style={{ height: '6px' }}>
                <div
                  className="xp-bar-fill"
                  style={{
                    width: `${levelInfo.progressPercent}%`,
                    background: `linear-gradient(90deg, ${levelInfo.current.color}aa, ${levelInfo.current.color})`,
                  }}
                />
              </div>
              <p className="text-center mt-0.5" style={{ fontSize: '9px', color: '#6B8CAE' }}>
                {levelInfo.progressPercent}%
              </p>
            </div>
          )}

          {/* Upgrade CTA (free users only) */}
          {!isPro && (
            <Link
              to="/pricing"
              className="hidden sm:flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-all hover:opacity-90"
              style={{
                background: 'linear-gradient(135deg, #FF6B35, #FF8F4F)',
                color: 'white',
                boxShadow: '0 2px 12px rgba(255,107,53,0.35)',
              }}
            >
              ⚡ Upgrade
            </Link>
          )}

          {/* Pro badge */}
          {isPro && (
            <div
              className="hidden sm:flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.25)' }}
            >
              ⚡ Pro
            </div>
          )}

          <button onClick={handleSignOut} className="btn-ghost text-sm">
            Sign out
          </button>
        </div>
      </div>

      {/* ── Mobile bottom nav ─────────────────────────── */}
      <div
        className="md:hidden flex border-t"
        style={{ borderColor: 'rgba(255,255,255,0.07)' }}
      >
        {NAV.map(({ to, label, icon }) => {
          const active = location.pathname === to
          return (
            <Link
              key={to}
              to={to}
              className="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-semibold transition-all"
              style={{ color: active ? '#FF6B35' : '#6B8CAE' }}
            >
              <span className="text-lg">{icon}</span>
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
