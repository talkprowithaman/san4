import { useAuth } from '../hooks/useAuth'
import { useProgress } from '../hooks/useProgress'
import { useSessions } from '../hooks/useSessions'
import { getTodaysReps } from '../lib/dailyReps'
import { getFreezes, getFrozenDays, missedExactlyOneDay, MAX_FREEZES } from '../lib/streakFreeze'
import { C, F, mono } from '../lib/ink'
import { Back, Btn, FlameIcon, FreezeIcon, TabBar } from '../components/ink/Ink'

const dayKey = (d) => new Date(d).toLocaleDateString('en-CA')
const WEEK = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const CELL = {
  d: { bg: 'rgba(123,94,167,.9)', bd: 'rgba(169,140,224,.9)', fg: '#fff' },       // spoke
  z: { bg: 'rgba(79,172,254,.16)', bd: 'rgba(79,172,254,.6)', fg: C.ice },        // frozen
  t: { bg: 'transparent', bd: 'rgba(245,158,11,.7)', fg: C.amber },               // today, not yet
  p: { bg: 'rgba(255,255,255,.04)', bd: 'rgba(255,255,255,.1)', fg: C.dim },      // missed
  f: { bg: 'transparent', bd: 'rgba(255,255,255,.1)', fg: C.dim },               // future
}

function Card({ children, style }) {
  return <div style={{ padding: 18, borderRadius: 20, border: `1px solid ${C.line}`, marginBottom: 14, ...style }}>{children}</div>
}

// ── 10 · Your streak — Duolingo's structure, San4's ink ────────────────────
// Rules come from the code: a freeze is earned at every seventh day (max two
// held) and covers exactly one missed day, automatically.
export default function Streak() {
  const { user } = useAuth()
  const { progress } = useProgress()
  const { practiceDays } = useSessions(40)

  const today = dayKey(Date.now())
  const yesterday = dayKey(Date.now() - 86_400_000)
  const last = (progress?.last_practice_date || '').slice(0, 10)
  const practisedToday = last === today || practiceDays.has(today)
  const freezes = getFreezes(user?.id)
  const frozen = new Set(getFrozenDays(user?.id))

  // A streak is alive if the last practice was today or yesterday, or the day
  // before with a freeze waiting to cover the gap.
  const raw = progress?.streak_count || 0
  const alive = last === today || last === yesterday || (missedExactlyOneDay(last) && freezes > 0)
  const count = alive ? raw : 0
  const next = Math.max(7, Math.ceil((count + 1) / 7) * 7)
  const atRisk = count > 0 && !practisedToday
  const recentFreeze = [...frozen].find(d => (Date.now() - new Date(d).getTime()) < 7 * 86_400_000)

  // This week, Monday first.
  const now = new Date()
  const monday = new Date(now); monday.setHours(0, 0, 0, 0)
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  const week = WEEK.map((label, i) => {
    const d = new Date(monday.getTime() + i * 86_400_000)
    const k = dayKey(d)
    const kind = practiceDays.has(k) ? 'd' : frozen.has(k) ? 'z' : k === today ? 't' : d > now ? 'f' : 'p'
    return { label, kind, k }
  })

  const month = Array.from({ length: 30 }, (_, i) => {
    const k = dayKey(Date.now() - (29 - i) * 86_400_000)
    return practiceDays.has(k) ? 'rgba(123,94,167,.75)' : frozen.has(k) ? 'rgba(79,172,254,.25)' : 'rgba(255,255,255,.05)'
  })

  const sub = count === 0
    ? 'Do one rep today and it starts again from one.'
    : count === 1 && practisedToday
      ? 'First day. Come back tomorrow and it becomes a streak.'
      : atRisk
        ? 'Not practised yet today.'
        : `Safe for today. ${count} day${count === 1 ? '' : 's'} without missing.`

  const banner = atRisk
    ? { title: `Your ${count}-day streak ends at midnight`, body: 'One rep saves it. Sixty seconds.', c: C.amber, bg: 'rgba(245,158,11,.09)', bd: 'rgba(245,158,11,.4)' }
    : recentFreeze
      ? { title: `A freeze saved ${new Date(recentFreeze).toLocaleDateString('en-GB', { weekday: 'long' })}`, body: `You missed one day and a freeze covered it. Earn the next at day ${next}.`, c: C.blue, bg: 'rgba(79,172,254,.09)', bd: 'rgba(79,172,254,.35)' }
      : null

  return (
    <div style={{ minHeight: '100dvh', background: C.ink, color: C.paper, display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 480, animation: 'fadeUp .35s ease both' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 'calc(env(safe-area-inset-top, 0px) + 16px) 22px 8px' }}>
          <Back to="/today" mb={0} />
          <span style={{ flex: 1, font: `600 14px ${F.sans}` }}>Your streak</span>
        </div>

        <div style={{ padding: '10px 22px 120px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: 22, borderRadius: 24, background: C.cardHi, border: '1px solid rgba(169,140,224,.35)', marginBottom: 14 }}>
            <FlameIcon size={46} width={1.3} color={atRisk ? C.amber : C.lilac} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontFamily: F.display, fontWeight: 300, fontSize: 46, lineHeight: 1, letterSpacing: '-.04em' }}>{count}</span>
                <span style={{ font: `500 14px ${F.sans}`, color: C.dim }}>{count === 1 ? 'day' : 'days'}</span>
              </div>
              <p style={{ margin: '8px 0 0', fontSize: 12.5, lineHeight: 1.5, color: C.soft }}>{sub}</p>
            </div>
          </div>

          {banner && (
            <div style={{ padding: '15px 17px', borderRadius: 18, background: banner.bg, border: `1px solid ${banner.bd}`, marginBottom: 14 }}>
              <div style={{ font: `600 13px ${F.sans}`, color: banner.c }}>{banner.title}</div>
              <p style={{ margin: '5px 0 0', fontSize: 12.5, lineHeight: 1.5, color: C.soft }}>{banner.body}</p>
            </div>
          )}

          <Card>
            <div style={{ ...mono(10), marginBottom: 14 }}>THIS WEEK</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {week.map(d => {
                const st = CELL[d.kind]
                return (
                  <div key={d.k} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
                    <div style={{ width: '100%', aspectRatio: '1', borderRadius: 12, background: st.bg, border: `1px solid ${st.bd}`, display: 'flex', alignItems: 'center', justifyContent: 'center', font: `600 11px ${F.mono}`, color: st.fg }}>
                      {d.kind === 'z' ? 'F' : ''}
                    </div>
                    <span style={mono(10, C.dim, 0)}>{d.label}</span>
                  </div>
                )
              })}
            </div>
          </Card>

          <Card>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ font: `600 13.5px ${F.sans}` }}>Next milestone</span>
              <span style={mono(10, C.lilac, '.12em')}>DAY {next}</span>
            </div>
            <div style={{ height: 4, borderRadius: 3, background: 'rgba(255,255,255,.1)', overflow: 'hidden', marginBottom: 10 }}>
              <div style={{ height: '100%', borderRadius: 3, background: C.purple, width: `${Math.round(count / next * 100)}%`, transition: 'width .6s ease' }} />
            </div>
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: C.dim }}>{next - count} to go. Every seventh day earns a freeze.</p>
          </Card>

          <Card style={{ border: '1px solid rgba(79,172,254,.28)', background: 'rgba(79,172,254,.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <FreezeIcon />
              <span style={{ flex: 1, font: `600 13.5px ${F.sans}` }}>Streak freezes</span>
              <span style={{ font: `600 13px ${F.mono}`, color: C.ice }}>{freezes} of {MAX_FREEZES}</span>
            </div>
            <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.55, color: C.soft }}>
              {freezes > 0
                ? 'Covers one missed day, automatically. You never have to remember it.'
                : 'You earn one at every seventh day. Maximum two at a time.'}
            </p>
          </Card>

          <Card>
            <div style={{ ...mono(10), marginBottom: 14 }}>LAST 30 DAYS</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10,1fr)', gap: 5 }}>
              {month.map((bg, i) => <span key={i} style={{ aspectRatio: '1', borderRadius: 5, background: bg }} />)}
            </div>
            <div style={{ display: 'flex', gap: 14, marginTop: 14, flexWrap: 'wrap' }}>
              {[['rgba(123,94,167,.75)', 'SPOKE'], ['rgba(79,172,254,.25)', 'FROZEN'], ['rgba(255,255,255,.05)', 'MISSED']].map(([bg, l]) => (
                <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, ...mono(10, C.dim, 0) }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: bg }} />{l}
                </span>
              ))}
            </div>
          </Card>

          <Btn to={practisedToday ? '/today' : `/session/mode?rep=${getTodaysReps()[0].id}`} style={{ padding: 16, borderRadius: 15, fontSize: 14.5 }}>{practisedToday ? 'Back to Today' : "Do today's rep"}</Btn>
          <p style={{ margin: '12px 0 0', textAlign: 'center', fontSize: 11.5, lineHeight: 1.5, color: C.dim }}>
            A rep counts the moment you finish speaking. No penalty for retaking it.
          </p>
        </div>
      </div>
      <TabBar />
    </div>
  )
}
