import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth }     from '../hooks/useAuth'
import { useProgress } from '../hooks/useProgress'
import { supabase }    from '../lib/supabase'
import Navbar          from '../components/Navbar'
import VakMascot       from '../components/VakMascot'
import DailyMissions   from '../components/DailyMissions'

export default function Dashboard() {
  const { user, profile }       = useAuth()
  const { progress, levelInfo } = useProgress()
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
  const sessionsLeft = sub
    ? (sub.sessions_limit === -1 ? '∞' : sub.sessions_limit - sub.sessions_used)
    : 3
  const isPro = sub?.plan === 'pro'

  const avgScore = sessions.length
    ? Math.round(sessions.reduce((a, s) => a + (s.overall_score || 0), 0) / sessions.length)
    : null

  const firstName  = profile?.name?.split(' ')[0] || 'there'
  const level      = levelInfo?.current.level     || 1
  const levelName  = levelInfo?.current.name      || 'Hesitant'
  const levelColor = levelInfo?.current.color     || '#6B8CAE'
  const levelIcon  = levelInfo?.current.icon      || '🌱'
  const streak     = progress?.streak_count       || 0
  const totalXP    = progress?.total_xp           || 0

  function scoreColor(s) {
    if (s >= 80) return '#00C49A'
    if (s >= 60) return '#FF6B35'
    return '#F87171'
  }

  return (
    <div className="min-h-screen" style={{ background: '#060E1A' }}>

      {/* Background atmosphere */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div style={{
          position: 'absolute', top: '-120px', right: '-80px',
          width: '500px', height: '500px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', bottom: '-150px', left: '-100px',
          width: '600px', height: '500px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,196,154,0.06) 0%, transparent 70%)',
        }} />
      </div>

      <Navbar />

      <main className="max-w-xl mx-auto px-4 py-6 relative z-10">

        {/* ── Greeting ─────────────────────────────────────────────────────── */}
        <div className="text-center mb-5 animate-fade-in">
          <h1 className="text-2xl font-black text-white">
            Hey {firstName}! 👋
          </h1>
          <p style={{ color: '#6B8CAE' }} className="text-sm mt-1">
            {streak > 0
              ? `${streak}-day streak 🔥 — keep it going!`
              : "Start your first session and build a streak!"}
          </p>
        </div>

        {/* ── Vak Hero Card ────────────────────────────────────────────────── */}
        <div
          className="rounded-3xl p-6 text-center mb-5 animate-slide-up relative overflow-hidden"
          style={{
            background: 'linear-gradient(145deg, #0F1E35 0%, #091522 100%)',
            border: `1px solid ${levelColor}30`,
            boxShadow: `0 0 40px ${levelColor}14`,
          }}
        >
          {/* Decorative corner glow */}
          <div style={{
            position: 'absolute', top: '-30px', right: '-30px',
            width: '120px', height: '120px', borderRadius: '50%',
            background: `radial-gradient(circle, ${levelColor}20 0%, transparent 70%)`,
          }} />

          {/* Vak floating */}
          <div className="flex justify-center mb-3 animate-float">
            <VakMascot level={level} size={148} />
          </div>

          {/* Level badge */}
          <div className="flex items-center justify-center gap-2 mb-3">
            <span
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-bold"
              style={{
                background: `${levelColor}1A`,
                color: levelColor,
                border: `1px solid ${levelColor}40`,
              }}
            >
              {levelIcon} {levelName} · Lv.{level}
            </span>
          </div>

          {/* XP Progress bar */}
          {levelInfo && (
            <div className="px-2">
              <div className="flex justify-between text-xs mb-1.5" style={{ color: '#6B8CAE' }}>
                <span>{levelInfo.xpIntoLevel} XP</span>
                {levelInfo.next
                  ? <span>{levelInfo.next.icon} {levelInfo.next.name} at {levelInfo.next.minXP}</span>
                  : <span>🦚 Max level!</span>
                }
              </div>
              <div className="xp-bar-track">
                <div
                  className="xp-bar-fill"
                  style={{
                    width: `${levelInfo.progressPercent}%`,
                    background: `linear-gradient(90deg, ${levelColor}88, ${levelColor})`,
                    boxShadow: `0 0 10px ${levelColor}55`,
                  }}
                />
              </div>
              <p className="text-xs mt-1.5" style={{ color: `${levelColor}99` }}>
                {levelInfo.progressPercent}% to next level
              </p>
            </div>
          )}
        </div>

        {/* ── Stats row ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { icon: '🔥', label: 'Streak', value: streak > 0 ? `${streak}d` : '—', color: '#FF6B35' },
            { icon: '⭐', label: 'Total XP', value: totalXP,        color: '#F59E0B' },
            { icon: '🎭', label: 'Sessions', value: sessions.length, color: '#00C49A' },
          ].map(({ icon, label, value, color }) => (
            <div key={label} className="stat-gem">
              <div className="text-xl mb-1">{icon}</div>
              <div className="text-xl font-black" style={{ color }}>{value}</div>
              <div className="text-xs mt-0.5" style={{ color: '#6B8CAE' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* ── Play button ──────────────────────────────────────────────────── */}
        <Link to="/practice" className="btn-play mb-5">
          <span className="text-xl">🎮</span>
          <span>Start Practice</span>
          <span style={{ opacity: 0.7, fontSize: '0.85rem' }}>→</span>
        </Link>

        {/* ── Meeting Prep quick link ───────────────────────────────────────── */}
        <Link
          to="/meeting-prep"
          className="flex items-center gap-3 px-5 py-4 rounded-2xl mb-6 transition-all hover:brightness-110"
          style={{
            background: 'linear-gradient(135deg, #0F1E35, #091522)',
            border: '1px solid rgba(0,196,154,0.2)',
          }}
        >
          <span className="text-2xl">📋</span>
          <div className="flex-1">
            <div className="text-white font-bold text-sm">Meeting Prep</div>
            <div className="text-xs" style={{ color: '#6B8CAE' }}>AI talking points in 90 seconds</div>
          </div>
          <span style={{ color: '#00C49A', fontSize: '1.1rem' }}>→</span>
        </Link>

        {/* ── Daily Missions ────────────────────────────────────────────────── */}
        <DailyMissions />

        {/* ── Recent Sessions ───────────────────────────────────────────────── */}
        <div>
          <h2 className="text-white font-bold text-base mb-3 flex items-center gap-2">
            <span>🏆</span> Recent Sessions
          </h2>

          {loading ? (
            <div className="text-sm text-center py-6" style={{ color: '#6B8CAE' }}>Loading…</div>
          ) : sessions.length === 0 ? (
            <div
              className="rounded-2xl p-8 text-center"
              style={{ background: 'linear-gradient(135deg, #0F1E35, #091522)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="text-4xl mb-3">🎯</div>
              <p className="text-white font-semibold mb-1">No sessions yet</p>
              <p className="text-sm mb-4" style={{ color: '#6B8CAE' }}>
                Your first session unlocks XP, streaks, and reports.
              </p>
              <Link to="/practice" className="btn-play" style={{ maxWidth: '200px', margin: '0 auto', fontSize: '0.9rem', padding: '0.8rem' }}>
                🎮 Play Now →
              </Link>
            </div>
          ) : (
            <div className="space-y-2.5">
              {sessions.map(s => (
                <div
                  key={s.id}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all"
                  style={{
                    background: 'linear-gradient(135deg, #0F1E35, #091522)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <span className="text-xl">🎭</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-semibold text-sm truncate">{s.scenario_title}</div>
                    <div className="text-xs mt-0.5" style={{ color: '#6B8CAE' }}>
                      {new Date(s.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      {s.duration_seconds > 0 && ` · ${Math.round(s.duration_seconds / 60)}m`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black" style={{ color: scoreColor(s.overall_score) }}>
                      {s.overall_score || 0}%
                    </div>
                    <div className="text-xs" style={{ color: '#6B8CAE' }}>
                      {s.filler_word_count} fillers
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Upgrade banner (free plan) ────────────────────────────────────── */}
        {!isPro && (
          <div
            className="mt-6 rounded-2xl p-5"
            style={{
              background: 'linear-gradient(135deg, rgba(255,107,53,0.08), rgba(255,107,53,0.04))',
              border: '1px solid rgba(255,107,53,0.25)',
            }}
          >
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="badge-orange mb-2">⚡ Founding Member Offer</div>
                <h3 className="text-white font-bold">Upgrade to Pro — ₹299/month</h3>
                <p className="text-sm mt-0.5" style={{ color: '#6B8CAE' }}>
                  Unlimited sessions · Full reports · {sessionsLeft} sessions left on free
                </p>
              </div>
              <button className="btn-primary text-sm py-2.5 px-5">Upgrade →</button>
            </div>
          </div>
        )}

        <div className="h-6" />
      </main>
    </div>
  )
}
