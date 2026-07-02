import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth }     from '../hooks/useAuth'
import { useProgress } from '../hooks/useProgress'
import { getTodaysReps, getRepCompletions, REPS_PER_DAY } from '../lib/dailyReps'
import Navbar    from '../components/Navbar'
import VakMascot from '../components/VakMascot'

// ── Today — the home screen. One job: get the user to do today's 3 reps. ─────
export default function Today() {
  const { user, profile }       = useAuth()
  const { progress, levelInfo } = useProgress()
  const navigate = useNavigate()

  const [completions, setCompletions] = useState([])
  const reps = getTodaysReps()

  useEffect(() => {
    setCompletions(getRepCompletions(user?.id))
  }, [user])

  const firstName = profile?.name?.split(' ')[0] || 'there'
  const streak    = progress?.streak_count ?? 0
  const doneCount = reps.filter(r => completions.some(c => c.id === r.id)).length
  const allDone   = doneCount >= REPS_PER_DAY

  const today = new Date().toLocaleDateString('en-CA')
  const practisedToday = (progress?.last_practice_date || '').slice(0, 10) === today
  const streakInDanger = !practisedToday && streak > 0 && new Date().getHours() >= 20

  const nextRep = reps.find(r => !completions.some(c => c.id === r.id))

  return (
    <div className="min-h-screen" style={{ background: '#050810' }}>
      <Navbar />
      <main className="max-w-lg mx-auto px-4 py-6 animate-fade-in">

        {/* Greeting */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-black text-white">Hi {firstName} 👋</h1>
            <p className="text-sm mt-0.5" style={{ color: '#6B8CAE' }}>
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <div className="animate-float"><VakMascot level={levelInfo?.current?.level || 1} size={56} /></div>
        </div>

        {/* Streak hero */}
        <div
          className="rounded-3xl p-5 mb-5 flex items-center gap-4"
          style={{
            background: streakInDanger
              ? 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(245,158,11,0.08))'
              : 'linear-gradient(135deg, rgba(123,94,167,0.18), rgba(0,196,154,0.06))',
            border: `1px solid ${streakInDanger ? 'rgba(239,68,68,0.4)' : 'rgba(123,94,167,0.3)'}`,
          }}
        >
          <div className="text-5xl">{streakInDanger ? '⏳' : '🔥'}</div>
          <div className="flex-1">
            <div className="text-2xl font-black text-white">
              {streak} day{streak === 1 ? '' : 's'}
            </div>
            <p className="text-sm" style={{ color: streakInDanger ? '#FCA5A5' : '#94A3B8' }}>
              {practisedToday
                ? 'Streak safe for today ✓ Come back tomorrow.'
                : streakInDanger
                ? `Your ${streak}-day streak ends at midnight. One rep saves it.`
                : streak > 0
                ? 'Complete one rep to keep your streak alive.'
                : 'Do your first rep today and start a streak.'}
            </p>
          </div>
        </div>

        {/* Daily goal */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-bold">Today's reps</h2>
          <span className="text-xs font-bold px-3 py-1 rounded-full"
            style={{
              background: allDone ? 'rgba(0,196,154,0.15)' : 'rgba(255,255,255,0.06)',
              color: allDone ? '#00C49A' : '#6B8CAE',
              border: `1px solid ${allDone ? 'rgba(0,196,154,0.35)' : 'rgba(255,255,255,0.1)'}`,
            }}>
            {doneCount}/{REPS_PER_DAY} {allDone && '· done! 🎉'}
          </span>
        </div>

        <div className="space-y-3 mb-6">
          {reps.map(rep => {
            const done = completions.find(c => c.id === rep.id)
            const isNext = !done && nextRep?.id === rep.id
            return (
              <button
                key={rep.id}
                onClick={() => !done && navigate(`/daily-rep/${rep.id}`)}
                disabled={!!done}
                className="w-full text-left rounded-2xl p-4 transition-all"
                style={{
                  background: done
                    ? 'rgba(0,196,154,0.06)'
                    : isNext
                    ? 'linear-gradient(160deg, #171233, #0B1220)'
                    : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${done ? 'rgba(0,196,154,0.25)' : isNext ? 'rgba(123,94,167,0.5)' : 'rgba(255,255,255,0.07)'}`,
                  cursor: done ? 'default' : 'pointer',
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{done ? '✅' : rep.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold uppercase tracking-widest mb-0.5"
                      style={{ color: done ? '#00C49A' : '#7B5EA7' }}>
                      {rep.category} · 60 sec
                    </div>
                    <p className="text-white text-sm font-medium leading-snug">{rep.situation}</p>
                  </div>
                  {done ? (
                    <span className="text-lg font-black shrink-0" style={{ color: '#00C49A' }}>{done.score}%</span>
                  ) : isNext ? (
                    <span className="text-xs font-bold px-3 py-1.5 rounded-full shrink-0 text-white"
                      style={{ background: 'linear-gradient(135deg,#7B5EA7,#9B7EC8)' }}>
                      Speak →
                    </span>
                  ) : null}
                </div>
              </button>
            )
          })}
        </div>

        {/* All done — boss battle CTA */}
        {allDone && (
          <div className="rounded-2xl p-5 mb-6 text-center"
            style={{ background: 'linear-gradient(135deg, rgba(0,196,154,0.1), rgba(123,94,167,0.1))', border: '1px solid rgba(0,196,154,0.3)' }}>
            <div className="text-3xl mb-2">🏆</div>
            <p className="text-white font-bold mb-1">All reps done. Vak is impressed.</p>
            <p className="text-sm mb-4" style={{ color: '#94A3B8' }}>
              Ready for a boss battle? Take on a full scenario and climb the ladder.
            </p>
            <Link to="/practice" className="btn-primary inline-block px-6 py-3 text-sm">
              Go to the Climb →
            </Link>
          </div>
        )}

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-3">
          <Link to="/practice" className="card text-center py-4 hover:opacity-90 transition-opacity">
            <div className="text-2xl mb-1">🧗</div>
            <div className="text-white text-sm font-semibold">The Climb</div>
            <div className="text-xs mt-0.5" style={{ color: '#6B8CAE' }}>Full scenarios</div>
          </Link>
          <Link to="/assessment" className="card text-center py-4 hover:opacity-90 transition-opacity">
            <div className="text-2xl mb-1">🎯</div>
            <div className="text-white text-sm font-semibold">English Score</div>
            <div className="text-xs mt-0.5" style={{ color: '#6B8CAE' }}>Your CEFR level</div>
          </Link>
        </div>

      </main>
    </div>
  )
}
