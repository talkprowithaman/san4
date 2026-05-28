import { useState, useEffect } from 'react'
import { supabase }    from '../lib/supabase'
import { useAuthStore } from '../hooks/useAuth'

const MISSIONS = [
  {
    id:    'session',
    icon:  '🎮',
    title: 'Complete a practice session',
    xp:    20,
    check: (s) => s.length > 0,
  },
  {
    id:    'score75',
    icon:  '🎯',
    title: 'Score 75% or higher',
    xp:    30,
    check: (s) => s.some(x => x.overall_score >= 75),
  },
  {
    id:    'duration',
    icon:  '⏱',
    title: 'Practice for 10+ minutes',
    xp:    25,
    check: (s) => s.some(x => x.duration_seconds >= 600),
  },
]

export default function DailyMissions() {
  const { user }         = useAuthStore()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    if (!user) return
    const today = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD
    supabase
      .from('practice_sessions')
      .select('overall_score, duration_seconds')
      .eq('user_id', user.id)
      .gte('created_at', `${today}T00:00:00`)
      .then(({ data }) => { setSessions(data || []); setLoading(false) })
  }, [user])

  const done      = MISSIONS.filter(m => m.check(sessions))
  const remaining = MISSIONS.filter(m => !m.check(sessions))
  const xpEarned  = done.reduce((s, m) => s + m.xp, 0)
  const allDone   = done.length === MISSIONS.length

  return (
    <div className="mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">📋</span>
          <span className="text-white font-bold">Daily Missions</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>
            {done.length} / {MISSIONS.length}
          </span>
          {xpEarned > 0 && (
            <span className="text-xs font-semibold" style={{ color: '#F59E0B' }}>
              +{xpEarned} XP
            </span>
          )}
        </div>
      </div>

      {/* Mission rows */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0F1E35, #0A1628)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        {loading ? (
          <div className="p-4 text-center text-muted text-sm">Loading missions…</div>
        ) : (
          MISSIONS.map((m, idx) => {
            const isDone = m.check(sessions)
            return (
              <div
                key={m.id}
                className={`flex items-center gap-3 px-4 py-3.5 transition-all ${idx < MISSIONS.length - 1 ? 'border-b' : ''}`}
                style={{
                  borderColor: 'rgba(255,255,255,0.05)',
                  opacity: isDone ? 0.7 : 1,
                }}
              >
                {/* Checkbox */}
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all"
                  style={{
                    background: isDone ? 'rgba(0,196,154,0.2)' : 'rgba(255,255,255,0.06)',
                    border: `2px solid ${isDone ? '#00C49A' : 'rgba(255,255,255,0.15)'}`,
                  }}
                >
                  {isDone && <span className="text-xs">✓</span>}
                </div>

                {/* Icon + title */}
                <span className="text-base">{m.icon}</span>
                <span className={`flex-1 text-sm font-medium ${isDone ? 'line-through text-muted' : 'text-white'}`}>
                  {m.title}
                </span>

                {/* XP badge */}
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0"
                  style={{
                    background: isDone ? 'rgba(0,196,154,0.15)' : 'rgba(245,158,11,0.12)',
                    color: isDone ? '#00C49A' : '#F59E0B',
                  }}
                >
                  +{m.xp} XP
                </span>
              </div>
            )
          })
        )}

        {/* All done celebration */}
        {allDone && !loading && (
          <div
            className="px-4 py-3 text-center text-sm font-semibold"
            style={{ background: 'rgba(0,196,154,0.08)', color: '#00C49A', borderTop: '1px solid rgba(0,196,154,0.15)' }}
          >
            🎉 All missions complete! Come back tomorrow for more XP.
          </div>
        )}
      </div>

      {/* Resets at midnight note */}
      {!allDone && !loading && (
        <p className="text-xs text-center mt-2" style={{ color: 'rgba(107,140,174,0.6)' }}>
          Resets at midnight · Complete practice sessions to unlock
        </p>
      )}
    </div>
  )
}
