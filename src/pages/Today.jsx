import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth }     from '../hooks/useAuth'
import { useProgress } from '../hooks/useProgress'
import { getTodaysReps, getRepCompletions, REPS_PER_DAY } from '../lib/dailyReps'
import { getFreezes } from '../lib/streakFreeze'
import { generateShareCard, shareCard } from '../lib/shareCard'
import { computeSan4Score, scoreBand } from '../lib/san4Score'
import { supabase } from '../lib/supabase'
import Navbar    from '../components/Navbar'
import VakMascot from '../components/VakMascot'

// ── Today — the home screen. One job: get the user to do today's 3 reps. ─────
export default function Today() {
  const { user, profile }       = useAuth()
  const { progress, levelInfo } = useProgress()
  const navigate = useNavigate()

  const [completions, setCompletions] = useState([])
  const [san4Score, setSan4Score] = useState(null)
  const reps = getTodaysReps()

  useEffect(() => {
    setCompletions(getRepCompletions(user?.id))
  }, [user])

  // The living San4 Score: assessment communication axis blended with the
  // user's last 10 scored activities.
  useEffect(() => {
    if (!user) return
    supabase
      .from('practice_sessions')
      .select('overall_score')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => setSan4Score(computeSan4Score(data || [], user.id)))
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
          <div className="animate-float"><VakMascot level={levelInfo?.current?.level || 1} size={56} mood={allDone ? 'celebrating' : 'neutral'} /></div>
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
            <div className="flex items-center gap-2">
              <div className="text-2xl font-black text-white">
                {streak} day{streak === 1 ? '' : 's'}
              </div>
              {getFreezes(user?.id) > 0 && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                  title="A streak freeze automatically saves your streak if you miss one day. Earn one every 7-day milestone."
                  style={{ background: 'rgba(79,172,254,0.12)', color: '#4FACFE', border: '1px solid rgba(79,172,254,0.3)' }}>
                  🧊 ×{getFreezes(user?.id)}
                </span>
              )}
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

        {/* San4 Score: the number that goes on your CV */}
        <Link to={san4Score != null ? '/progress' : '/assessment'}
          className="block rounded-3xl p-5 mb-5 transition-all hover:opacity-95"
          style={{
            background: 'linear-gradient(160deg,#10192E,#0B1220)',
            border: `1px solid ${san4Score != null ? `${scoreBand(san4Score).color}55` : 'rgba(255,255,255,0.08)'}`,
          }}>
          {san4Score != null ? (
            <div className="flex items-center gap-4">
              <div className="text-4xl font-black" style={{ color: scoreBand(san4Score).color }}>
                {san4Score}
              </div>
              <div className="flex-1">
                <div className="text-white font-bold text-sm">
                  San4 Score · {scoreBand(san4Score).name}
                </div>
                <p className="text-xs mt-0.5" style={{ color: '#6B8CAE' }}>
                  {scoreBand(san4Score).blurb} Every rep moves this number.
                </p>
              </div>
              <span className="text-xs font-bold" style={{ color: '#7B5EA7' }}>View →</span>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="text-3xl">🎯</div>
              <div className="flex-1">
                <div className="text-white font-bold text-sm">Get your San4 Score</div>
                <p className="text-xs mt-0.5" style={{ color: '#6B8CAE' }}>
                  One number for how you communicate. 2 minutes, free.
                </p>
              </div>
              <span className="text-xs font-bold" style={{ color: '#7B5EA7' }}>Start →</span>
            </div>
          )}
        </Link>

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
            <div className="flex gap-3 justify-center">
              <Link to="/practice" className="btn-primary inline-block px-6 py-3 text-sm">
                Go to the Climb →
              </Link>
              <button
                onClick={async () => {
                  const blob = await generateShareCard({
                    big: `${REPS_PER_DAY}/${REPS_PER_DAY}`,
                    bigColor: '#00C49A',
                    label: 'Daily reps done',
                    sub: 'Three speaking challenges, one take each.',
                    streak,
                    name: profile?.name || '',
                  })
                  shareCard(blob, `Daily speaking reps done on San4 🎤🔥 ${streak}-day streak. Practise with Vak free: san4.vercel.app`)
                }}
                className="px-6 py-3 rounded-2xl font-bold text-sm text-white transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg,#7B5EA7,#9B7EC8)' }}
              >
                📲 Share
              </button>
            </div>
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
