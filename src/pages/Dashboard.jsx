import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth }          from '../hooks/useAuth'
import { useProgress }      from '../hooks/useProgress'
import { useSubscription }  from '../hooks/useSubscription'
import { supabase }         from '../lib/supabase'
import { useScrollReveal }  from '../hooks/useScrollReveal'
import Navbar               from '../components/Navbar'
import VakMascot            from '../components/VakMascot'
import DailyMissions        from '../components/DailyMissions'
import SituationOfTheDay    from '../components/SituationOfTheDay'

export default function Dashboard() {
  const { user, profile }       = useAuth()
  const { progress, levelInfo } = useProgress()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading]   = useState(true)

  useScrollReveal()

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

  const { isPro, sessionsRemaining, canStartSession, weeklySessionCount } = useSubscription()

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
    <div className="min-h-screen" style={{ background: '#050810' }}>

      {/* Ambient background glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div style={{
          position: 'absolute', top: '-220px', right: '-160px',
          width: '800px', height: '800px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(123,94,167,0.22) 0%, rgba(123,94,167,0.06) 45%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', bottom: '-220px', left: '-180px',
          width: '800px', height: '700px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,196,154,0.16) 0%, rgba(0,196,154,0.04) 45%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', top: '45%', left: '50%', transform: 'translateX(-50%)',
          width: '600px', height: '600px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 65%)',
        }} />
      </div>

      <Navbar />

      <main className="max-w-xl mx-auto px-4 py-8 relative z-10">

        {/* Greeting */}
        <div className="text-center mb-6 animate-fade-in">
          <h1 className="text-2xl font-black text-white tracking-tight">
            Hey {firstName} 👋
          </h1>
          <p className="text-sm mt-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {streak > 0
              ? `${streak}-day streak 🔥 Keep it going`
              : 'Start your first session and build a streak'}
          </p>
        </div>

        {/* Vak Hero Card */}
        <div
          className="rounded-3xl p-6 text-center mb-5 relative overflow-hidden reveal animate-slide-up"
          style={{
            background: 'linear-gradient(160deg, #10192E 0%, #0B1220 100%)',
            border: `1px solid ${levelColor}40`,
            boxShadow: `0 0 80px ${levelColor}18, inset 0 1px 0 rgba(255,255,255,0.07)`,
          }}
        >
          {/* Corner glow */}
          <div style={{
            position: 'absolute', top: '-40px', right: '-40px',
            width: '160px', height: '160px', borderRadius: '50%',
            background: `radial-gradient(circle, ${levelColor}18 0%, transparent 70%)`,
            pointerEvents: 'none',
          }} />

          <div className="flex justify-center mb-4 animate-float">
            <VakMascot level={level} size={148} />
          </div>

          <div className="flex items-center justify-center gap-2 mb-4">
            <span
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-bold"
              style={{
                background: `${levelColor}14`,
                color: levelColor,
                border: `1px solid ${levelColor}35`,
              }}
            >
              {levelIcon} {levelName} · Lv.{level}
            </span>
          </div>

          {levelInfo && (
            <div className="px-2">
              <div className="flex justify-between text-xs mb-1.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                <span>{levelInfo.xpIntoLevel} XP</span>
                {levelInfo.next
                  ? <span>{levelInfo.next.icon} {levelInfo.next.name} at {levelInfo.next.minXP}</span>
                  : <span>Max level reached</span>
                }
              </div>
              <div className="xp-bar-track">
                <div
                  className="xp-bar-fill"
                  style={{
                    width: `${levelInfo.progressPercent}%`,
                    background: `linear-gradient(90deg, ${levelColor}88, ${levelColor})`,
                    boxShadow: `0 0 8px ${levelColor}60`,
                  }}
                />
              </div>
              <p className="text-xs mt-1.5" style={{ color: `${levelColor}80` }}>
                {levelInfo.progressPercent}% to next level
              </p>
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-5 reveal reveal-d1">
          {[
            { icon: '🔥', label: 'Streak',   value: streak > 0 ? `${streak}d` : '0',  color: '#7B5EA7' },
            { icon: '⭐', label: 'Total XP', value: totalXP,          color: '#F59E0B' },
            { icon: '🎭', label: 'Sessions', value: sessions.length,  color: '#00C49A' },
          ].map(({ icon, label, value, color }) => (
            <div key={label} className="stat-gem">
              <div className="text-xl mb-1">{icon}</div>
              <div className="text-xl font-black" style={{ color }}>{value}</div>
              <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Play button */}
        <Link to="/practice" className="btn-play mb-5 reveal reveal-d2">
          <span className="text-xl">🎮</span>
          <span>Start Practice</span>
          <span style={{ opacity: 0.6, fontSize: '0.85rem' }}>→</span>
        </Link>

        {/* Meeting Prep quick link */}
        <Link
          to="/meeting-prep"
          className="flex items-center gap-3 px-5 py-4 rounded-2xl mb-6 transition-all reveal reveal-d3"
          style={{
            background: 'linear-gradient(160deg, #0E1A2C 0%, #091322 100%)',
            border: '1px solid rgba(0,196,154,0.22)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 20px rgba(0,0,0,0.4)',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(0,196,154,0.4)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(0,196,154,0.18)'}
        >
          <span className="text-2xl">📋</span>
          <div className="flex-1">
            <div className="text-white font-semibold text-sm">Meeting Prep</div>
            <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>AI talking points in 90 seconds</div>
          </div>
          <span style={{ color: '#00C49A', fontSize: '1rem' }}>→</span>
        </Link>

        {/* Situation of the Day */}
        <div className="reveal reveal-d4">
          <SituationOfTheDay />
        </div>

        {/* Daily Missions */}
        <div className="reveal reveal-d5">
          <DailyMissions />
        </div>

        {/* Recent Sessions */}
        <div className="reveal">
          <h2 className="text-white font-semibold text-sm mb-3 flex items-center gap-2 tracking-wide">
            <span>🏆</span> Recent Sessions
          </h2>

          {loading ? (
            <div className="text-sm text-center py-8" style={{ color: 'rgba(255,255,255,0.25)' }}>Loading</div>
          ) : sessions.length === 0 ? (
            <div
              className="rounded-2xl p-8 text-center"
              style={{
                background: 'linear-gradient(160deg, #10192E 0%, #0B1220 100%)',
                border: '1px solid rgba(255,255,255,0.09)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
              }}
            >
              <div className="text-4xl mb-3">🎯</div>
              <p className="text-white font-semibold mb-1">No sessions yet</p>
              <p className="text-sm mb-5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Your first session unlocks XP, streaks, and reports.
              </p>
              <Link
                to="/practice"
                className="btn-play"
                style={{ maxWidth: '200px', margin: '0 auto', fontSize: '0.875rem', padding: '0.75rem' }}
              >
                🎮 Start now →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map(s => (
                <div
                  key={s.id}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all"
                  style={{
                    background: 'linear-gradient(160deg, #10192E 0%, #0B1220 100%)',
                    border: '1px solid rgba(255,255,255,0.09)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'}
                >
                  <span className="text-xl">🎭</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium text-sm truncate">{s.scenario_title}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      {new Date(s.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      {s.duration_seconds > 0 && ` · ${Math.round(s.duration_seconds / 60)}m`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-black" style={{ color: scoreColor(s.overall_score) }}>
                      {s.overall_score || 0}%
                    </div>
                    <div className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
                      {s.filler_word_count} fillers
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Weekly sessions pill */}
        {!isPro && (
          <div
            className="mt-4 rounded-2xl px-4 py-3 flex items-center justify-between gap-3 reveal"
            style={{
              background: canStartSession ? 'rgba(0,196,154,0.05)' : 'rgba(239,68,68,0.05)',
              border: `1px solid ${canStartSession ? 'rgba(0,196,154,0.18)' : 'rgba(239,68,68,0.18)'}`,
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: canStartSession ? '#00C49A' : '#F87171' }}>
                {canStartSession ? '●' : '●'}
              </span>
              <span className="text-sm font-medium" style={{ color: canStartSession ? '#00C49A' : '#F87171' }}>
                {canStartSession
                  ? `${sessionsRemaining} free session${sessionsRemaining !== 1 ? 's' : ''} left this week`
                  : 'Weekly limit reached. Resets Sunday'}
              </span>
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>({weeklySessionCount}/3)</span>
            </div>
            <Link to="/pricing" className="text-xs font-bold" style={{ color: '#7B5EA7' }}>
              Upgrade →
            </Link>
          </div>
        )}

        {/* Upgrade banner */}
        {!isPro && (
          <div
            className="mt-4 rounded-2xl p-5 reveal"
            style={{
              background: 'linear-gradient(160deg, rgba(123,94,167,0.1), rgba(123,94,167,0.05))',
              border: '1px solid rgba(123,94,167,0.25)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
            }}
          >
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div
                  className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full mb-2"
                  style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }}
                >
                  🎉 Founding Member Offer
                </div>
                <h3 className="text-white font-bold">Upgrade to Vak Pro · ₹299/month</h3>
                <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  Unlimited sessions · Deep reports · Full scenario library
                </p>
              </div>
              <Link to="/pricing" className="btn-primary text-sm">
                See plans →
              </Link>
            </div>
          </div>
        )}

        <div className="h-8" />
      </main>
    </div>
  )
}
