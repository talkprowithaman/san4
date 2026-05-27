import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'

export default function Dashboard() {
  const { user, profile } = useAuth()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    if (user) fetchSessions()
  }, [user])

  async function fetchSessions() {
    const { data } = await supabase
      .from('practice_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)
    setSessions(data || [])
    setLoading(false)
  }

  const sub          = profile?.subscriptions?.[0]
  const sessionsLeft = sub ? (sub.sessions_limit === -1 ? '∞' : sub.sessions_limit - sub.sessions_used) : 3
  const planName     = sub?.plan || 'free'

  const avgScore = sessions.length
    ? Math.round(sessions.reduce((a, s) => a + (s.overall_score || 0), 0) / sessions.length)
    : null

  return (
    <div className="min-h-screen bg-navy-900">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Welcome */}
        <div className="mb-8 animate-fade-in">
          <h1 className="text-3xl font-black text-white">
            Welcome back, {profile?.name?.split(' ')[0] || 'there'} 👋
          </h1>
          <p className="text-muted mt-1">Ready to practice? Your next great conversation is one session away.</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Sessions Done',   value: sessions.length,             suffix: '',    color: 'text-white' },
            { label: 'Sessions Left',    value: sessionsLeft,                suffix: '',    color: 'text-teal' },
            { label: 'Avg Score',        value: avgScore ? `${avgScore}%` : '—', suffix: '', color: 'text-primary' },
            { label: 'Current Plan',     value: planName.charAt(0).toUpperCase() + planName.slice(1), suffix: '', color: 'text-white' },
          ].map(({ label, value, color }) => (
            <div key={label} className="card text-center">
              <div className={`text-3xl font-black ${color} mb-1`}>{value}</div>
              <div className="text-muted text-xs">{label}</div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <Link to="/practice" className="card hover:border-primary/50 transition-all group cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="text-4xl">🎭</div>
              <div>
                <h3 className="text-white font-bold text-lg group-hover:text-primary transition-colors">
                  Start Practice Session
                </h3>
                <p className="text-muted text-sm">Choose a scenario and practice with AI</p>
              </div>
              <div className="ml-auto text-muted group-hover:text-primary transition-colors text-xl">→</div>
            </div>
          </Link>

          <Link to="/meeting-prep" className="card hover:border-teal/50 transition-all group cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="text-4xl">📋</div>
              <div>
                <h3 className="text-white font-bold text-lg group-hover:text-teal transition-colors">
                  Prepare for a Meeting
                </h3>
                <p className="text-muted text-sm">Generate talking points in 90 seconds</p>
              </div>
              <div className="ml-auto text-muted group-hover:text-teal transition-colors text-xl">→</div>
            </div>
          </Link>
        </div>

        {/* Recent sessions */}
        <div>
          <h2 className="text-white font-bold text-xl mb-4">Recent Sessions</h2>

          {loading ? (
            <div className="text-muted text-sm">Loading…</div>
          ) : sessions.length === 0 ? (
            <div className="card text-center py-12">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-white font-semibold mb-2">No sessions yet</h3>
              <p className="text-muted text-sm mb-4">Start your first practice session to see your progress here.</p>
              <Link to="/practice" className="btn-primary inline-block">Start Now →</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map(s => (
                <div key={s.id} className="card flex items-center gap-4 hover:border-navy-500 transition-all">
                  <div className="text-2xl">🎭</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-semibold truncate">{s.scenario_title}</div>
                    <div className="text-muted text-xs mt-0.5">
                      {new Date(s.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <div>
                      <div className={`font-black text-lg ${s.overall_score >= 75 ? 'text-teal' : s.overall_score >= 50 ? 'text-primary' : 'text-red-400'}`}>
                        {s.overall_score || 0}%
                      </div>
                      <div className="text-muted text-xs">Score</div>
                    </div>
                    <div className="text-muted text-sm">
                      {s.filler_word_count} fillers
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upgrade banner if on free plan */}
        {planName === 'free' && (
          <div className="mt-8 card border-primary/30 bg-primary/5">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="badge-orange mb-2">Founding Member Offer</div>
                <h3 className="text-white font-bold">Upgrade to Pro — ₹299/month</h3>
                <p className="text-muted text-sm mt-1">Unlimited sessions, full reports, progress tracking. Limited seats.</p>
              </div>
              <button className="btn-primary">Upgrade Now →</button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
