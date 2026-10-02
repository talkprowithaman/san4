import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth }     from '../hooks/useAuth'
import { useProgress } from '../hooks/useProgress'
import { useScenarioUnlocks } from '../hooks/useScenarioUnlocks'
import { useSessions, useOfflineSync } from '../hooks/useSessions'
import { getTodaysReps, getRepCompletions, repsUnlockedToday } from '../lib/dailyReps'
import { SCENARIOS, ZONES, nextLevel } from '../lib/progression'
import { C, F, mono, ZONE_COLORS } from '../lib/ink'
import { TabScreen, MicIcon, FlameIcon, ChevronIcon, Notice } from '../components/ink/Ink'

const DIFFICULTY = { Assertiveness: 2, Interview: 2, Money: 3, Workplace: 2, Charm: 1 }

function Stat({ label, value }) {
  return (
    <div style={{ flex: 1, padding: '11px 12px', borderRadius: 14, background: C.fill, border: '1px solid rgba(255,255,255,.07)', minWidth: 0 }}>
      <div style={mono(9, C.dim, '.12em')}>{label}</div>
      <div style={{ font: `600 13px ${F.sans}`, marginTop: 4, lineHeight: 1.3 }}>{value}</div>
    </div>
  )
}

function SectionHead({ title, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10, gap: 10 }}>
      <span style={{ font: `600 14px ${F.sans}` }}>{title}</span>
      {right}
    </div>
  )
}

const titleCase = (s) => s.toLowerCase().replace(/\b\w/g, m => m.toUpperCase())

// ── 09 · Today — the home screen. One job: get today's rep spoken. ──────────
export default function Today() {
  const { user, profile } = useAuth()
  const { progress } = useProgress()
  const { unlockedSet, bestScores, highestLevel } = useScenarioUnlocks()
  const { score, minutesThisWeek, refetch } = useSessions()
  const [completions, setCompletions] = useState([])
  const { pending } = useOfflineSync(() => { setCompletions(getRepCompletions(user?.id)); refetch() })
  const navigate = useNavigate()

  useEffect(() => { setCompletions(getRepCompletions(user?.id)) }, [user])

  const reps = getTodaysReps()
  const unlocked = repsUnlockedToday(progress)
  const isDone = (rep) => completions.find(c => c.id === rep.id)
  const doneCount = reps.slice(0, unlocked).filter(isDone).length
  const hero = reps.slice(0, unlocked).find(r => !isDone(r)) || reps[0]
  const heroDone = isDone(hero)

  const today = new Date().toLocaleDateString('en-CA')
  const practisedToday = (progress?.last_practice_date || '').slice(0, 10) === today
  const streak = progress?.streak_count ?? 0
  const atRisk = !practisedToday && streak > 0 && new Date().getHours() >= 18

  const firstName = profile?.name?.split(' ')[0] || ''
  const dateLine = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  const level = nextLevel(unlockedSet, bestScores)
  const zone = ZONES.find(z => z.key === level?.zone)
  const nextNo = level ? level.level + 1 : null

  const note = (() => {
    if (pending > 0) return `${pending} take${pending === 1 ? '' : 's'} saved on your phone. ${pending === 1 ? 'It scores' : 'They score'} as soon as you are back online.`
    if (atRisk) return `Your ${streak}-day streak ends at midnight. One rep saves it. Sixty seconds.`
    if (doneCount === 0) return unlocked === 1 ? 'One rep today. That is the whole ask.' : 'You speak fastest when you are nervous. Today, start slow on purpose.'
    if (doneCount < unlocked) return 'One down. The next one is the one you usually skip.'
    if (unlocked < reps.length) return `Done for today. Rep ${unlocked + 1} unlocks tomorrow, once this becomes a habit.`
    return 'Three for three. That is how the number moves.'
  })()

  const goRep = (rep) => navigate(`/session/mode?rep=${rep.id}`)

  return (
    <TabScreen>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <div style={{ font: `400 12.5px ${F.sans}`, color: C.dim }}>{dateLine}</div>
          <div style={{ fontFamily: F.display, fontWeight: 400, fontSize: 21, marginTop: 2 }}>{firstName || 'Today'}</div>
        </div>
        <div style={{ display: 'flex', gap: 7 }}>
          <Link to="/streak" aria-label="Your streak" style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 11px', borderRadius: 20, textDecoration: 'none',
            border: `1px solid ${atRisk ? 'rgba(245,158,11,.45)' : 'rgba(123,94,167,.35)'}`, background: atRisk ? 'rgba(245,158,11,.08)' : 'rgba(123,94,167,.1)',
          }}>
            <FlameIcon color={atRisk ? C.amber : C.lilac} />
            <span style={{ font: `600 12px ${F.mono}`, color: atRisk ? C.amber : C.lilac }}>{streak}</span>
          </Link>
          <Link to={score != null ? '/me' : '/assessment'} aria-label="Your San4 Score" style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 11px', borderRadius: 20, textDecoration: 'none',
            border: '1px solid rgba(0,196,154,.3)', background: 'rgba(0,196,154,.08)',
          }}>
            <span style={{ font: `600 12px ${F.mono}`, color: C.teal }}>{score != null ? score : 'GET SCORE'}</span>
          </Link>
        </div>
      </div>

      {/* Stat strip */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <Stat label="TODAY" value={`${doneCount} of ${unlocked} rep${unlocked === 1 ? '' : 's'}`} />
        <Stat label="THIS WEEK" value={`${minutesThisWeek} min spoken`} />
        <Stat label="LEVEL" value={`${Math.max(1, highestLevel)} of ${SCENARIOS.length}`} />
      </div>

      {/* Today's challenge */}
      <SectionHead title="Today's challenge" right={<span style={mono(10, C.dim, 0)}>{hero === reps[0] ? 'EVERYONE GETS THE SAME ONE' : `REP ${reps.indexOf(hero) + 1} OF ${unlocked}`}</span>} />
      <div style={{
        border: `1px solid ${heroDone ? 'rgba(0,196,154,.3)' : 'rgba(169,140,224,.45)'}`,
        background: heroDone ? 'rgba(0,196,154,.06)' : 'rgba(123,94,167,.1)', borderRadius: 22, padding: 20, marginBottom: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={mono(10, heroDone ? C.teal : C.lilac, '.14em')}>
            {heroDone ? `DONE TODAY · ${heroDone.score}` : `${hero.category.toUpperCase()} · 60 SEC`}
          </span>
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: C.dim }} />
          <span style={mono(10, C.dim, 0)}>DAILY REP</span>
          <span style={{ flex: 1 }} />
          <span style={{ display: 'flex', gap: 3 }} aria-label={`Difficulty ${DIFFICULTY[hero.category] || 2} of 3`}>
            {[1, 2, 3].map(i => (
              <span key={i} style={{ width: 5, height: 5, borderRadius: 1, background: i <= (DIFFICULTY[hero.category] || 2) ? C.lilac : 'rgba(255,255,255,.15)' }} />
            ))}
          </span>
        </div>
        <p style={{ margin: '0 0 6px', fontFamily: F.display, fontWeight: 400, fontSize: 19, lineHeight: 1.35 }}>{hero.situation}</p>
        <p style={{ margin: '0 0 18px', fontSize: 12.5, lineHeight: 1.5, color: C.dim }}>{hero.prompt}</p>
        <button onClick={() => goRep(hero)} style={{
          width: '100%', border: 'none', cursor: 'pointer', padding: 15, borderRadius: 14, background: C.purple, color: '#fff',
          font: `700 14.5px ${F.sans}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
        }}>
          <MicIcon size={17} width={1.8} />
          {heroDone ? 'Practise again' : 'Speak'}
        </button>
      </div>

      {/* The rest of today's reps: done, open, or visibly locked */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
        {reps.map((rep, i) => {
          if (rep === hero) return null
          const done = isDone(rep)
          const open = i < unlocked
          return (
            <button key={rep.id} onClick={() => open && goRep(rep)} disabled={!open} style={{
              width: '100%', textAlign: 'left', cursor: open ? 'pointer' : 'default', borderRadius: 14, padding: '11px 14px',
              border: `1px solid ${done ? 'rgba(0,196,154,.25)' : C.line}`, background: done ? 'rgba(0,196,154,.05)' : 'transparent',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span style={{ ...mono(9.5, done ? C.teal : open ? C.lilac : C.dim, '.1em'), flex: 'none', width: 40 }}>REP {i + 1}</span>
              <span style={{ flex: 1, minWidth: 0, font: `500 12.5px ${F.sans}`, color: open ? C.soft : C.dim, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {open ? rep.situation : i === unlocked ? 'Opens tomorrow if today is done' : `Opens on day ${i + 1} of your streak`}
              </span>
              <span style={mono(10, done ? C.teal : C.dim, 0)}>{done ? done.score : open ? '' : 'LOCKED'}</span>
            </button>
          )
        })}
      </div>

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        {[
          { to: '/warm-up', k: 'WARM UP · 20 SEC', t: 'Tongue twister, three times fast' },
          { to: '/script-reading?script=cabin_crew', k: 'READ ALOUD · 60 SEC', t: 'Cabin crew announcement' },
        ].map(a => (
          <Link key={a.to} to={a.to} style={{ flex: 1, textDecoration: 'none', border: `1px solid ${C.line}`, background: C.fill2, borderRadius: 16, padding: '13px 14px' }}>
            <span style={{ display: 'block', ...mono(9, C.dim, '.12em') }}>{a.k}</span>
            <span style={{ display: 'block', font: `600 13px ${F.sans}`, color: C.paper, marginTop: 5, lineHeight: 1.3 }}>{a.t}</span>
          </Link>
        ))}
      </div>

      {/* Pick up the climb */}
      {level && <>
        <SectionHead title="Pick up the climb" right={
          <Link to="/practice" style={{ font: `500 11.5px ${F.sans}`, color: C.lilac, textDecoration: 'none' }}>All {SCENARIOS.length} levels</Link>
        } />
        <button onClick={() => navigate(level.tier === 'pro' ? '/pro' : `/session/mode?scenario=${level.id}`)} style={{
          width: '100%', textAlign: 'left', cursor: 'pointer', border: '1px solid rgba(169,140,224,.4)', background: 'rgba(123,94,167,.08)',
          borderRadius: 18, padding: '15px 16px', display: 'flex', alignItems: 'center', gap: 13, marginBottom: 18,
        }}>
          <span style={{ ...mono(10, ZONE_COLORS[level.zone] || C.blue, 0), flex: 'none' }}>LV {level.level}</span>
          <span style={{ flex: 1 }}>
            <span style={{ display: 'block', font: `600 14px ${F.sans}`, color: C.paper }}>{level.title}</span>
            <span style={{ display: 'block', font: `400 12px ${F.sans}`, color: C.dim, marginTop: 3 }}>
              {level.passScore
                ? `Next in ${zone ? titleCase(zone.label) : 'the Climb'} · pass ${level.passScore}% to open Level ${nextNo}`
                : 'The Summit · Pro'}
            </span>
          </span>
          <ChevronIcon />
        </button>
      </>}

      {/* Vak's note */}
      {atRisk && doneCount === 0
        ? <Notice tone="amber">{note}</Notice>
        : (
          <div style={{ padding: '16px 18px', borderRadius: 18, border: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, border: '1px solid rgba(169,140,224,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.lilac }} />
            </div>
            <p style={{ margin: 0, flex: 1, fontSize: 12.5, lineHeight: 1.55, color: C.dim }}>{note}</p>
          </div>
        )}
    </TabScreen>
  )
}
