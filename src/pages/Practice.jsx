import { useNavigate } from 'react-router-dom'
import { useSubscription } from '../hooks/useSubscription'
import { useScenarioUnlocks } from '../hooks/useScenarioUnlocks'
import { SCENARIOS, ZONES } from '../lib/progression'
import { C, F, mono, ZONE_COLORS } from '../lib/ink'
import { TabScreen, Segmented, H1 } from '../components/ink/Ink'

const ZONE_SUB = {
  base:            'Free, always open',
  lower:           'Unlock by passing the level below',
  high:            'High stakes. It gets serious.',
  summit_approach: 'Very few get here',
  pro:             'Pro · ₹299 per month',
}

// Card copy, as designed: one line each, no dashes.
const DESC = {
  hr_interview:           '"Tell me about yourself." Competency questions with structure.',
  social_conversation:    'Introduce yourself at a professional event. Warm, genuinely interesting.',
  team_meeting:           'Your update in a standup. Outcomes first, no rambling.',
  performance_review:     'Advocate for yourself. Own your wins with evidence.',
  gd_round:               'Placement and MBA GD rounds. Cut in without being rude.',
  salary_negotiation:     'Negotiate against HR with real budget constraints.',
  say_no_professionally:  'Push back on an unreasonable ask. No bridges burned.',
  client_presentation:    'A skeptical enterprise client. Handle objections with data.',
  cold_networking:        'Walk up to a VIP and make yourself memorable.',
  leadership_update:      'Two minutes with a CXO. Bottom line first.',
  pitch_skeptic:          'A defensive, budget-conscious stakeholder.',
  conflict_mediation:     'Two colleagues at war. De-escalate without taking sides.',
  sensitive_conversation: 'Raise an uncomfortable truth with care.',
  first_date:             'Genuine, flowing conversation. No scripts.',
}

// Shared header for the Climb and the Library (one tab, two shelves).
export function ClimbHeader({ value }) {
  const navigate = useNavigate()
  return (
    <>
      <H1 size={26} mb={4} style={{ lineHeight: 1.15 }}>{value === 'levels' ? 'The Climb' : 'Library'}</H1>
      <p style={{ margin: '0 0 14px', fontSize: 12.5, lineHeight: 1.5, color: C.dim }}>
        {value === 'levels' ? `${SCENARIOS.length} levels. Pass one to open the next.` : 'Everything that is not the daily rep or the ladder.'}
      </p>
      <Segmented value={value} onChange={v => navigate(v === 'levels' ? '/practice' : '/library')}
        options={[{ value: 'levels', label: 'Levels' }, { value: 'library', label: 'Library' }]} />
    </>
  )
}

// ── 11 · The Climb — all 14 levels in their five zones ─────────────────────
export default function Practice() {
  const navigate = useNavigate()
  const { isPro } = useSubscription()
  const { bestScores, unlockedSet, loading } = useScenarioUnlocks()

  function stateOf(s) {
    if (s.tier === 'pro') return isPro ? 'open' : 'pro'
    const best = bestScores[s.id] || 0
    if (s.passScore && best >= s.passScore) return 'done'
    if (s.tier === 'always_free' || unlockedSet.has(s.id)) return 'open'
    return 'locked'
  }

  return (
    <TabScreen header={<ClimbHeader value="levels" />}>
      {loading
        ? <p style={{ ...mono(11, C.dim, '.1em'), textAlign: 'center', padding: '40px 0' }}>LOADING YOUR CLIMB</p>
        : ZONES.map(z => {
          const color = ZONE_COLORS[z.key]
          return (
            <div key={z.key} style={{ marginBottom: 22 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, marginBottom: 10, flexWrap: 'wrap' }}>
                <span style={mono(10, color)}>{z.label}</span>
                <span style={{ font: `400 11px ${F.sans}`, color: C.dim }}>{ZONE_SUB[z.key]}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {SCENARIOS.filter(s => s.zone === z.key).map(s => {
                  const st = stateOf(s)
                  const locked = st === 'locked' || st === 'pro'
                  const best = bestScores[s.id] || 0
                  const meta = st === 'done' ? `BEST ${best}%`
                    : st === 'pro' ? 'PRO'
                    : st === 'locked' ? (s.prereqDisplay || '').replace('+', '')
                    : s.passScore ? `PASS ${s.passScore}% · ${s.xpOnPass} XP${best ? ` · BEST ${best}%` : ''}` : `${s.xpOnPass} XP`
                  return (
                    <button key={s.id}
                      onClick={() => (st === 'pro' ? navigate('/pro') : st === 'locked' ? null : navigate(`/session/mode?scenario=${s.id}`))}
                      aria-disabled={st === 'locked'}
                      style={{
                        width: '100%', textAlign: 'left', cursor: st === 'locked' ? 'default' : 'pointer', borderRadius: 16, padding: '14px 15px',
                        display: 'flex', gap: 12, alignItems: 'flex-start',
                        border: `1px solid ${st === 'done' ? 'rgba(0,196,154,.28)' : st === 'open' ? 'rgba(169,140,224,.4)' : 'rgba(255,255,255,.07)'}`,
                        background: st === 'done' ? 'rgba(0,196,154,.05)' : st === 'open' ? C.fill : 'transparent',
                      }}>
                      <span style={{ ...mono(9.5, st === 'done' ? C.teal : locked ? C.dim : color, 0), flex: 'none', paddingTop: 3, width: 34 }}>LV {s.level}</span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', font: `600 14px ${F.sans}`, color: locked ? C.soft : C.paper }}>{s.title}</span>
                        <span style={{ display: 'block', font: `400 11.5px ${F.sans}`, color: C.dim, marginTop: 3, lineHeight: 1.45 }}>{DESC[s.id] || s.desc}</span>
                        <span style={{ display: 'block', ...mono(9.5, st === 'done' ? C.teal : st === 'pro' ? C.amber : locked ? C.dim : C.lilac, '.08em'), marginTop: 7 }}>
                          {st === 'locked' ? meta.toUpperCase() : meta}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      {!isPro && (
        <button onClick={() => navigate('/pro')} style={{
          width: '100%', border: '1px dashed rgba(245,158,11,.4)', background: 'rgba(245,158,11,.06)', cursor: 'pointer', borderRadius: 16,
          padding: 15, textAlign: 'left', color: C.amber, font: `600 12.5px/1.5 ${F.sans}`,
        }}>
          The Summit opens with Pro. Four scenarios, no unlock chain.
        </button>
      )}
    </TabScreen>
  )
}
