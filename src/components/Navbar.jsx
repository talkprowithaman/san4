import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth }          from '../hooks/useAuth'
import { useProgress }      from '../hooks/useProgress'
import { useSubscription }  from '../hooks/useSubscription'

// Four tabs, Duolingo-style: the daily loop, the ladder, the shelf, the self.
const NAV = [
  { to: '/today',    label: 'Today',   icon: '🔥' },
  { to: '/practice', label: 'Climb',   icon: '🧗' },
  { to: '/library',  label: 'Library', icon: '🧰' },
  { to: '/progress', label: 'Me',      icon: '📊' },
]

export default function Navbar() {
  const { signOut }             = useAuth()
  const { progress, levelInfo } = useProgress()
  const { isPro }               = useSubscription()
  const location                = useLocation()
  const navigate                = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  const streak = progress?.streak_count ?? 0

  return (
    <nav
      className="sticky top-0 z-50"
      style={{
        background: 'rgba(5,8,16,0.82)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="max-w-5xl mx-auto px-5 h-15 flex items-center justify-between gap-4" style={{ height: 60 }}>

        {/* Logo — swan icon + SAN4 wordmark */}
        <Link to="/today" className="flex items-center gap-2 shrink-0">
          <img src="/san4-icon.png" alt="San4" width={28} height={28} className="rounded-lg" />
          <span className="text-xl font-black text-white tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
            SAN<span style={{ color: '#7B5EA7' }}>4</span>
          </span>
        </Link>

        {/* Nav links — desktop */}
        <div className="hidden md:flex items-center gap-0.5">
          {NAV.map(({ to, label }) => {
            const active = location.pathname === to
            return (
              <Link
                key={to}
                to={to}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200"
                style={{
                  color:      active ? '#FFFFFF' : 'rgba(255,255,255,0.45)',
                  background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
                }}
              >
                {label}
              </Link>
            )
          })}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">

          {streak > 0 && (
            <div
              className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold"
              style={{ background: 'rgba(123,94,167,0.1)', color: '#7B5EA7', border: '1px solid rgba(123,94,167,0.2)' }}
            >
              🔥 {streak}
            </div>
          )}

          {levelInfo && (
            <div
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{
                background: `${levelInfo.current.color}12`,
                color:       levelInfo.current.color,
                border:      `1px solid ${levelInfo.current.color}25`,
              }}
            >
              {levelInfo.current.icon}
              <span className="hidden lg:inline">{levelInfo.current.name}</span>
              <span className="lg:hidden">Lv{levelInfo.current.level}</span>
            </div>
          )}

          {levelInfo && (
            <div className="hidden lg:block w-16">
              <div className="xp-bar-track" style={{ height: '4px' }}>
                <div
                  className="xp-bar-fill"
                  style={{
                    width: `${levelInfo.progressPercent}%`,
                    background: `linear-gradient(90deg, ${levelInfo.current.color}99, ${levelInfo.current.color})`,
                  }}
                />
              </div>
            </div>
          )}

          {!isPro && (
            <Link
              to="/pricing"
              className="hidden sm:flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full transition-all"
              style={{
                background: 'linear-gradient(135deg, #7B5EA7, #9B7EC8)',
                color: 'white',
                boxShadow: '0 2px 12px rgba(123,94,167,0.3)',
              }}
            >
              ⚡ Pro
            </Link>
          )}

          {isPro && (
            <div
              className="hidden sm:flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.2)' }}
            >
              ⚡ Pro
            </div>
          )}

          <button
            onClick={handleSignOut}
            className="text-xs px-3 py-1.5 rounded-xl transition-all"
            style={{ color: 'rgba(255,255,255,0.35)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.75)'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.35)'}
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <div
        className="md:hidden flex border-t"
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}
      >
        {NAV.map(({ to, label, icon }) => {
          const active = location.pathname === to
          return (
            <Link
              key={to}
              to={to}
              className="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-semibold transition-all"
              style={{ color: active ? '#7B5EA7' : 'rgba(255,255,255,0.35)' }}
            >
              <span className="text-base">{icon}</span>
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
