import { Link } from 'react-router-dom'

// Shared top ribbon for public marketing / info pages (Vak Extension, San4
// Score, Why it matters, legal). Keeps "Vak Extension" on the ribbon everywhere.
const LINKS = [
  ['Vak Extension', '/extension'],
  ['San4 Score',    '/san4-score'],
  ['Resume Builder','/resume-builder'],
  ['How it works',  '/how-it-works'],
  ['Pricing',       '/pricing'],
]

export default function MarketingHeader() {
  return (
    <nav className="sticky top-0 left-0 right-0 z-50 flex items-center justify-between px-5 lg:px-10 h-16"
      style={{ background: 'rgba(4,8,16,0.9)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
      <Link to="/" className="flex items-center gap-2">
        <img src="/san4-icon.png" alt="San4" width={28} height={28} className="rounded-lg" />
        <span className="text-lg font-black text-white tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
          SAN<span style={{ color: '#7B5EA7' }}>4</span>
        </span>
      </Link>

      <div className="hidden md:flex items-center gap-7">
        {LINKS.map(([t, to]) => (
          <Link key={t} to={to} className="text-sm transition-colors"
            style={{ color: 'rgba(255,255,255,0.5)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'white'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}>
            {t}
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Link to="/auth" className="hidden sm:block text-sm font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>Sign in</Link>
        <Link to="/auth?mode=signup"
          className="text-sm font-bold text-white px-5 py-2 rounded-full transition-all hover:opacity-90 active:scale-95"
          style={{ background: '#7B5EA7', boxShadow: '0 4px 18px rgba(123,94,167,0.4)' }}>
          Try free →
        </Link>
      </div>
    </nav>
  )
}
