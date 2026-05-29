import { useState, useEffect } from 'react'
import { Link }               from 'react-router-dom'
import { useAuth }            from '../hooks/useAuth'
import { useProgress }        from '../hooks/useProgress'
import { useSubscription }    from '../hooks/useSubscription'
import { supabase }           from '../lib/supabase'
import Navbar                 from '../components/Navbar'
import VakMascot              from '../components/VakMascot'

// ── Tiny sparkline (pure SVG, no deps) ───────────────────────────────────────
function Sparkline({ data, color = '#00C49A', width = 140, height = 44, invert = false }) {
  if (!data || data.length < 2) {
    return <div style={{ width, height, opacity: 0.2 }}>—</div>
  }
  const vals  = invert ? data.map(v => -v) : data
  const max   = Math.max(...vals)
  const min   = Math.min(...vals)
  const range = (max - min) || 1
  const pad   = 4

  const pts = vals.map((v, i) => {
    const x = pad + (i / (vals.length - 1)) * (width - pad * 2)
    const y = pad + ((max - v) / range) * (height - pad * 2)
    return [x, y]
  })

  const last = pts[pts.length - 1]

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Area fill */}
      <path
        d={`M ${pts.map(([x, y]) => `${x},${y}`).join(' L ')} L ${last[0]},${height} L ${pts[0][0]},${height} Z`}
        fill={`url(#grad-${color.replace('#', '')})`}
      />
      {/* Line */}
      <polyline
        points={pts.map(([x, y]) => `${x},${y}`).join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Current value dot */}
      <circle cx={last[0]} cy={last[1]} r="3.5" fill={color} />
    </svg>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function scoreColor(s) {
  if (!s) return '#6B8CAE'
  if (s >= 80) return '#00C49A'
  if (s >= 60) return '#FF6B35'
  return '#F87171'
}

function getWeekLabel(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function groupByWeek(sessions) {
  const weeks = {}
  sessions.forEach(s => {
    const d   = new Date(s.created_at)
    const sun = new Date(d)
    sun.setDate(d.getDate() - d.getDay())
    const key = sun.toISOString().slice(0, 10)
    if (!weeks[key]) weeks[key] = []
    weeks[key].push(s)
  })
  return weeks
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Progress() {
  const { user }          = useAuth()
  const { progress, levelInfo } = useProgress()
  const { isPro }         = useSubscription()
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
      .order('created_at', { ascending: true })
      .limit(40)
    setSessions(data || [])
    setLoading(false)
  }

  // ── Computed stats ────────────────────────────────────────────────────────
  const scores        = sessions.map(s => s.overall_score).filter(Boolean)
  const fillers       = sessions.map(s => s.filler_word_count ?? 0)
  const avgScore      = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
  const bestScore     = scores.length ? Math.max(...scores) : 0
  const totalMinutes  = Math.round(sessions.reduce((a, s) => a + (s.duration_seconds || 0), 0) / 60)
  const totalSessions = sessions.length
  const avgFillers    = fillers.length ? Math.round(fillers.reduce((a, b) => a + b, 0) / fillers.length) : 0

  // Score trend (last 20)
  const recentScores  = scores.slice(-20)
  const recentFillers = fillers.slice(-20)

  // Score change: first half vs second half
  const mid   = Math.floor(recentScores.length / 2)
  const first = recentScores.slice(0, mid)
  const second = recentScores.slice(mid)
  const firstAvg  = first.length ? Math.round(first.reduce((a, b) => a + b, 0) / first.length) : null
  const secondAvg = second.length ? Math.round(second.reduce((a, b) => a + b, 0) / second.length) : null
  const improvement = firstAvg && secondAvg ? secondAvg - firstAvg : null

  // Weekly sessions (last 8 weeks)
  const weekGroups = groupByWeek(sessions)
  const weekKeys   = Object.keys(weekGroups).sort().slice(-8)
  const weeklyCounts = weekKeys.map(k => weekGroups[k].length)

  // Scenario breakdown
  const scenarioCounts = {}
  sessions.forEach(s => {
    const title = s.scenario_title || s.scenario_id || 'Unknown'
    scenarioCounts[title] = (scenarioCounts[title] || 0) + 1
  })
  const topScenarios = Object.entries(scenarioCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
  const maxCount = topScenarios[0]?.[1] || 1

  // ── Free tier: show teaser ────────────────────────────────────────────────
  if (!isPro && !loading && sessions.length < 3) {
    return (
      <div className="min-h-screen" style={{ background: '#060E1A' }}>
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="flex justify-center mb-4 animate-float">
            <VakMascot level={3} size={90} />
          </div>
          <h2 className="text-white font-black text-2xl mb-3">Your Progress Dashboard</h2>
          <p className="mb-8" style={{ color: '#6B8CAE' }}>
            Complete at least 3 sessions to unlock your trend charts and performance breakdown.
          </p>
          <Link to="/practice" className="btn-primary">Start Practising →</Link>
        </main>
      </div>
    )
  }

  if (!isPro) {
    return (
      <div className="min-h-screen" style={{ background: '#060E1A' }}>
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-black text-white mb-1">Progress</h1>
            <p style={{ color: '#6B8CAE' }}>Track your improvement over time</p>
          </div>

          {/* Blurred teaser */}
          <div className="relative rounded-3xl overflow-hidden mb-6"
            style={{ border: '1px solid rgba(255,107,53,0.2)' }}>
            <div className="p-6 filter blur-sm pointer-events-none select-none" aria-hidden>
              <div className="grid grid-cols-3 gap-3 mb-6">
                {['Score Trend', 'Filler Trend', 'Weekly Sessions'].map(l => (
                  <div key={l} className="rounded-2xl p-4 text-center"
                    style={{ background: '#0F1E35' }}>
                    <div className="h-11 mb-2 bg-white/10 rounded" />
                    <div className="text-xs" style={{ color: '#6B8CAE' }}>{l}</div>
                  </div>
                ))}
              </div>
              <div className="h-32 rounded-2xl" style={{ background: '#0F1E35' }} />
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4"
              style={{ background: 'rgba(6,14,26,0.8)', backdropFilter: 'blur(4px)' }}>
              <div className="text-4xl">📊</div>
              <h3 className="text-white font-black text-xl">Unlock with Vak Pro</h3>
              <p className="text-sm text-center max-w-xs" style={{ color: '#6B8CAE' }}>
                See your score trend, filler word improvement, weekly consistency, and top scenarios.
              </p>
              <Link to="/pricing" className="btn-primary text-sm">Upgrade — ₹299/month →</Link>
            </div>
          </div>

          {/* Free stats they CAN see */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Total Sessions', value: totalSessions, icon: '🎭' },
              { label: 'Best Score', value: bestScore ? `${bestScore}%` : '—', icon: '🏆' },
            ].map(({ label, value, icon }) => (
              <div key={label} className="rounded-2xl p-4 text-center"
                style={{ background: 'linear-gradient(145deg, #0F1E35, #091522)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="text-2xl mb-1">{icon}</div>
                <div className="text-2xl font-black text-white">{value}</div>
                <div className="text-xs mt-0.5" style={{ color: '#6B8CAE' }}>{label}</div>
              </div>
            ))}
          </div>
        </main>
      </div>
    )
  }

  // ── FULL PRO DASHBOARD ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: '#060E1A' }}>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-3 text-sm font-semibold"
            style={{ background: 'rgba(0,196,154,0.12)', color: '#00C49A', border: '1px solid rgba(0,196,154,0.25)' }}>
            📊 Progress Dashboard
          </div>
          <h1 className="text-3xl font-black text-white">Your Communication Journey</h1>
          <p style={{ color: '#6B8CAE' }}>
            {totalSessions} session{totalSessions !== 1 ? 's' : ''} · {totalMinutes} minutes practised
          </p>
        </div>

        {loading ? (
          <div className="text-center py-16" style={{ color: '#6B8CAE' }}>Loading your data…</div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-4">🎯</div>
            <p className="text-white font-semibold mb-2">No sessions yet</p>
            <p className="text-sm mb-6" style={{ color: '#6B8CAE' }}>Complete your first session to see progress charts.</p>
            <Link to="/practice" className="btn-primary">Start Practising →</Link>
          </div>
        ) : (
          <>
            {/* ── Top stats ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                { label: 'Avg Score',    value: `${avgScore}%`,       icon: '📈', color: scoreColor(avgScore) },
                { label: 'Best Session', value: `${bestScore}%`,       icon: '🏆', color: scoreColor(bestScore) },
                { label: 'Total Time',   value: `${totalMinutes}m`,    icon: '⏱️', color: '#6366F1' },
                { label: 'Avg Fillers',  value: avgFillers,            icon: '💬', color: avgFillers > 5 ? '#F87171' : '#00C49A' },
              ].map(({ label, value, icon, color }) => (
                <div key={label} className="rounded-2xl p-4 text-center"
                  style={{ background: 'linear-gradient(145deg, #0F1E35, #091522)', border: `1px solid ${color}25` }}>
                  <div className="text-lg mb-1">{icon}</div>
                  <div className="text-2xl font-black" style={{ color }}>{value}</div>
                  <div className="text-xs mt-0.5" style={{ color: '#6B8CAE' }}>{label}</div>
                </div>
              ))}
            </div>

            {/* ── Improvement banner ── */}
            {improvement !== null && Math.abs(improvement) >= 3 && (
              <div className="rounded-2xl px-5 py-4 mb-6 flex items-center gap-3"
                style={{
                  background: improvement > 0 ? 'rgba(0,196,154,0.08)' : 'rgba(239,68,68,0.07)',
                  border: `1px solid ${improvement > 0 ? 'rgba(0,196,154,0.25)' : 'rgba(239,68,68,0.2)'}`,
                }}>
                <span className="text-2xl">{improvement > 0 ? '📈' : '📉'}</span>
                <div>
                  <div className="text-white font-bold text-sm">
                    {improvement > 0
                      ? `Your score improved by ${improvement} points in recent sessions!`
                      : `Your recent scores are down ${Math.abs(improvement)} points — push a little harder.`}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: '#6B8CAE' }}>
                    First half avg: {firstAvg}% → Recent avg: {secondAvg}%
                  </div>
                </div>
              </div>
            )}

            {/* ── Charts row ── */}
            <div className="grid sm:grid-cols-3 gap-4 mb-6">

              {/* Score trend */}
              <div className="rounded-2xl p-4"
                style={{ background: 'linear-gradient(145deg, #0F1E35, #091522)', border: '1px solid rgba(0,196,154,0.2)' }}>
                <div className="text-xs font-bold mb-1" style={{ color: '#00C49A' }}>SCORE TREND</div>
                <div className="text-xs mb-3" style={{ color: '#6B8CAE' }}>Last {recentScores.length} sessions</div>
                <Sparkline data={recentScores} color="#00C49A" />
                {recentScores.length > 1 && (
                  <div className="mt-2 text-xs font-bold" style={{ color: scoreColor(recentScores[recentScores.length - 1]) }}>
                    Latest: {recentScores[recentScores.length - 1]}%
                  </div>
                )}
              </div>

              {/* Filler trend */}
              <div className="rounded-2xl p-4"
                style={{ background: 'linear-gradient(145deg, #0F1E35, #091522)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <div className="text-xs font-bold mb-1" style={{ color: '#F87171' }}>FILLER WORDS</div>
                <div className="text-xs mb-3" style={{ color: '#6B8CAE' }}>Going down = improving</div>
                <Sparkline data={recentFillers} color="#F87171" invert />
                {recentFillers.length > 1 && (
                  <div className="mt-2 text-xs font-bold" style={{ color: recentFillers[recentFillers.length - 1] < avgFillers ? '#00C49A' : '#F87171' }}>
                    Latest: {recentFillers[recentFillers.length - 1]} fillers
                  </div>
                )}
              </div>

              {/* Weekly sessions */}
              <div className="rounded-2xl p-4"
                style={{ background: 'linear-gradient(145deg, #0F1E35, #091522)', border: '1px solid rgba(99,102,241,0.2)' }}>
                <div className="text-xs font-bold mb-1" style={{ color: '#818CF8' }}>SESSIONS / WEEK</div>
                <div className="text-xs mb-3" style={{ color: '#6B8CAE' }}>Last 8 weeks</div>
                {weeklyCounts.length > 0 ? (
                  <div className="flex items-end gap-1 h-11">
                    {weeklyCounts.map((c, i) => (
                      <div key={i} className="flex-1 rounded-sm transition-all"
                        style={{
                          height: `${Math.max(4, (c / Math.max(...weeklyCounts)) * 44)}px`,
                          background: i === weeklyCounts.length - 1 ? '#818CF8' : 'rgba(129,140,248,0.3)',
                        }} />
                    ))}
                  </div>
                ) : (
                  <div className="h-11 flex items-center justify-center text-xs" style={{ color: '#6B8CAE' }}>No data yet</div>
                )}
                <div className="mt-2 text-xs font-bold" style={{ color: '#818CF8' }}>
                  This week: {weeklyCounts[weeklyCounts.length - 1] ?? 0} session{(weeklyCounts[weeklyCounts.length - 1] ?? 0) !== 1 ? 's' : ''}
                </div>
              </div>
            </div>

            {/* ── Streak + XP ── */}
            {progress && (
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="rounded-2xl p-4"
                  style={{ background: 'linear-gradient(145deg, #0F1E35, #091522)', border: '1px solid rgba(255,107,53,0.2)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">🔥</span>
                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#FF6B35' }}>Streak</span>
                  </div>
                  <div className="text-3xl font-black text-white">{progress.streak_count || 0}<span className="text-lg"> days</span></div>
                  <div className="text-xs mt-1" style={{ color: '#6B8CAE' }}>
                    Best: {progress.longest_streak || 0} days
                  </div>
                </div>
                <div className="rounded-2xl p-4"
                  style={{ background: 'linear-gradient(145deg, #0F1E35, #091522)', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">⭐</span>
                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#F59E0B' }}>Total XP</span>
                  </div>
                  <div className="text-3xl font-black text-white">{progress.total_xp || 0}</div>
                  {levelInfo && (
                    <div className="text-xs mt-1" style={{ color: '#6B8CAE' }}>
                      Level {levelInfo.current.level} — {levelInfo.current.name}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Scenario breakdown ── */}
            {topScenarios.length > 0 && (
              <div className="rounded-2xl p-5 mb-6"
                style={{ background: 'linear-gradient(145deg, #0F1E35, #091522)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="text-sm font-bold text-white mb-4">🎭 Most Practised Scenarios</div>
                <div className="space-y-3">
                  {topScenarios.map(([title, count]) => (
                    <div key={title}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-white truncate max-w-48">{title}</span>
                        <span className="text-xs font-bold ml-2 shrink-0" style={{ color: '#6B8CAE' }}>
                          {count} session{count !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-1.5 rounded-full transition-all"
                          style={{
                            width: `${(count / maxCount) * 100}%`,
                            background: 'linear-gradient(90deg, #6366F1, #818CF8)',
                          }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Recent sessions list ── */}
            <div>
              <div className="text-sm font-bold text-white mb-3">Recent Sessions</div>
              <div className="space-y-2">
                {[...sessions].reverse().slice(0, 10).map(s => (
                  <div key={s.id} className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <span className="text-lg">🎭</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-medium truncate">{s.scenario_title}</div>
                      <div className="text-xs" style={{ color: '#6B8CAE' }}>
                        {new Date(s.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        {s.duration_seconds > 0 && ` · ${Math.round(s.duration_seconds / 60)}m`}
                        {s.filler_word_count > 0 && ` · ${s.filler_word_count} fillers`}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-lg font-black" style={{ color: scoreColor(s.overall_score) }}>
                        {s.overall_score || '—'}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="h-8" />
          </>
        )}
      </main>
    </div>
  )
}
