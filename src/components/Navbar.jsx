import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const NAV = [
  { to: '/dashboard',    label: 'Dashboard',     icon: '⬡' },
  { to: '/practice',     label: 'Practice',       icon: '🎭' },
  { to: '/meeting-prep', label: 'Meeting Prep',   icon: '📋' },
]

export default function Navbar() {
  const { signOut, profile } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <nav className="border-b border-navy-600 bg-navy-800/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/dashboard" className="text-2xl font-black text-white">
          San<span className="text-primary">4</span>
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-1">
          {NAV.map(({ to, label, icon }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${location.pathname === to
                  ? 'bg-primary/20 text-primary'
                  : 'text-muted hover:text-white hover:bg-navy-700'}`}
            >
              <span>{icon}</span> {label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted hidden sm:block">
            {profile?.name || 'Welcome'}
          </span>
          <button onClick={handleSignOut} className="btn-ghost text-sm">
            Sign out
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      <div className="md:hidden flex border-t border-navy-600">
        {NAV.map(({ to, label, icon }) => (
          <Link
            key={to}
            to={to}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-all
              ${location.pathname === to ? 'text-primary' : 'text-muted'}`}
          >
            <span className="text-lg">{icon}</span> {label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
