import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useScenarioUnlocks } from '../hooks/useScenarioUnlocks'
import { getRep } from '../lib/dailyReps'
import { SCENARIOS, nextLevel } from '../lib/progression'
import { C, F, mono } from '../lib/ink'
import { Screen, Back, Btn, H1, Sub, Spacer, PrivatePill } from '../components/ink/Ink'

// "Text mode" and "score later" are first-class, deliberately chosen modes,
// not fallbacks for when speech fails. Data cost is shown up front.
export const MODES = [
  { id: 'speak',   title: 'Speak it',                  sub: 'Full scoring, including pace and fillers.',       cost: '~4 MB',  costColor: C.dim },
  { id: 'type',    title: 'Type it',                   sub: 'Structure and clarity. Silent, works on one bar.', cost: '~40 KB', costColor: C.teal },
  { id: 'offline', title: 'Record now, score on wifi', sub: 'Saves the take to your phone.',                    cost: '0 KB',   costColor: C.teal, repOnly: true },
]
const MODE_KEY = 'san4_mode'
export const getMode = () => { try { return localStorage.getItem(MODE_KEY) || 'speak' } catch { return 'speak' } }

// ── 13 · How do you want to practise? ──────────────────────────────────────
// Entry points: today's rep (?rep=), a Climb level (?scenario=), or the mic
// in the tab bar (no params → the next level on the Climb).
export default function PracticeMode() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { unlockedSet, bestScores } = useScenarioUnlocks()

  const rep = getRep(params.get('rep'))
  const scenario = rep ? null : (SCENARIOS.find(s => s.id === params.get('scenario')) || nextLevel(unlockedSet, bestScores))
  const [mode, setModeState] = useState(() => {
    const m = getMode()
    return !rep && m === 'offline' ? 'speak' : m
  })

  function pick(m) {
    if (m.repOnly && !rep) return
    setModeState(m.id)
    try { localStorage.setItem(MODE_KEY, m.id) } catch { /* ignore */ }
  }

  function next() {
    if (rep) navigate(`/daily-rep/${rep.id}?mode=${mode}`)
    else navigate(`/session/who?scenario=${scenario.id}&mode=${mode}`)
  }

  return (
    <Screen pad="30px 28px 28px">
      <Back mb={22} />
      <div style={{ ...mono(10, C.lilac, '.14em'), marginBottom: 12 }}>
        {rep ? `DAILY REP · ${rep.category.toUpperCase()}` : `LV ${scenario.level} · ${scenario.title.toUpperCase()}`}
      </div>
      <H1 mb={8}>How do you want to practise?</H1>
      <Sub mb={22} size={13}>Hostel at midnight, shared phone, two bars of signal. All valid reasons.</Sub>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {MODES.map(m => {
          const on = mode === m.id
          const off = m.repOnly && !rep
          return (
            <button key={m.id} onClick={() => pick(m)} disabled={off} style={{
              cursor: off ? 'default' : 'pointer', textAlign: 'left', borderRadius: 18, padding: 17, opacity: off ? 0.5 : 1,
              border: `1px solid ${on ? 'rgba(169,140,224,.5)' : 'rgba(255,255,255,.1)'}`, background: on ? 'rgba(123,94,167,.12)' : 'transparent',
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 7 }}>
                <span style={{ font: `600 15px ${F.sans}`, color: C.paper, flex: 1 }}>{m.title}</span>
                <span style={mono(9.5, m.costColor, 0)}>{off ? 'DAILY REPS ONLY' : m.cost}</span>
              </span>
              <span style={{ display: 'block', fontSize: 12.5, lineHeight: 1.5, color: C.dim }}>{m.sub}</span>
            </button>
          )
        })}
      </div>
      <PrivatePill style={{ marginTop: 20, borderRadius: 14, padding: '11px 14px', alignSelf: 'stretch' }} />
      <Spacer min={24} />
      <Btn onClick={next}>{rep ? 'Start the rep' : 'Choose who you face'}</Btn>
    </Screen>
  )
}
