import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'

// ── Library — every tool that isn't the daily loop or the Climb lives here. ──
// Keeps primary navigation to four tabs (Duolingo principle: one path,
// everything else is a shelf).
const TOOLS = [
  { to: '/assessment',      icon: '🎯', title: 'English Score',    desc: 'Your CEFR level, the global standard' },
  { to: '/daily-challenge', icon: '🌟', title: 'Daily Challenge',  desc: 'Situation of the day' },
  { to: '/micro-drill',     icon: '⚡', title: 'Micro Drills',     desc: 'Rapid-fire speaking exercises' },
  { to: '/script-reading',  icon: '📜', title: 'Script Reading',   desc: 'Read aloud, get pacing feedback' },
  { to: '/meeting-prep',    icon: '📋', title: 'Meeting Prep',     desc: 'Agenda → talking points' },
  { to: '/call-analyzer',   icon: '📞', title: 'Call Analyzer',    desc: 'Upload a recording, get coached' },
  { to: '/body-language',   icon: '🕺', title: 'Body Language',    desc: 'On-camera presence feedback' },
  { to: '/reminders',       icon: '⏰', title: 'Reminders',        desc: 'Nudges that keep the habit' },
  { to: '/dashboard',       icon: '🏠', title: 'Dashboard',        desc: 'Session history & stats' },
]

export default function Library() {
  return (
    <div className="min-h-screen" style={{ background: '#050810' }}>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8 animate-fade-in">
        <h1 className="text-2xl font-black text-white mb-1">Library</h1>
        <p className="text-sm mb-6" style={{ color: '#6B8CAE' }}>
          Every San4 tool in one place. Your daily reps live on the Today tab.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {TOOLS.map(t => (
            <Link key={t.to} to={t.to}
              className="card flex items-center gap-4 hover:opacity-90 transition-opacity">
              <span className="text-3xl">{t.icon}</span>
              <div>
                <div className="text-white font-semibold text-sm">{t.title}</div>
                <div className="text-xs mt-0.5" style={{ color: '#6B8CAE' }}>{t.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
