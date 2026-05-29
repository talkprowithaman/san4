import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useSubscription, FREE_SCENARIO_IDS } from '../hooks/useSubscription'

// ── Scenarios ─────────────────────────────────────────────────────────────────
const SCENARIOS = [
  // ── Free tier ───────────────────────────────────────────────────────────────
  {
    id:         'hr_interview',
    icon:       '💼',
    title:      'HR Interview',
    desc:       'Practise your HR round — strengths, weaknesses, situational questions.',
    duration:   '10–15 min',
    difficulty: 1,
    tags:       ['Job seekers', 'Freshers'],
    glowColor:  'rgba(59,130,246,0.2)',
    borderHover:'rgba(59,130,246,0.4)',
    tier:       'free',
  },
  {
    id:         'social_conversation',
    icon:       '💬',
    title:      'Intro Pitch',
    desc:       'Practise introducing yourself confidently — networking events, new colleagues, first impressions.',
    duration:   '5–10 min',
    difficulty: 1,
    tags:       ['Social confidence', 'Networking'],
    glowColor:  'rgba(16,185,129,0.2)',
    borderHover:'rgba(16,185,129,0.4)',
    tier:       'free',
  },
  {
    id:         'team_meeting',
    icon:       '👥',
    title:      'Daily Standup',
    desc:       'Communicate your updates clearly, handle questions, and sound confident in team standups.',
    duration:   '5–10 min',
    difficulty: 1,
    tags:       ['Team leads', 'Anyone'],
    glowColor:  'rgba(139,92,246,0.2)',
    borderHover:'rgba(139,92,246,0.4)',
    tier:       'free',
  },

  // ── Pro tier ─────────────────────────────────────────────────────────────────
  {
    id:         'salary_negotiation',
    icon:       '💰',
    title:      'Salary Negotiation',
    desc:       'Negotiate your package confidently against an HR with budget constraints.',
    duration:   '5–10 min',
    difficulty: 3,
    tags:       ['High stakes', 'All levels'],
    glowColor:  'rgba(245,158,11,0.2)',
    borderHover:'rgba(245,158,11,0.4)',
    tier:       'pro',
  },
  {
    id:         'client_presentation',
    icon:       '📊',
    title:      'Client Objections',
    desc:       'Present your proposal to a skeptical client and handle tough objections in real time.',
    duration:   '10–20 min',
    difficulty: 2,
    tags:       ['Consultants', 'Sales'],
    glowColor:  'rgba(255,107,53,0.2)',
    borderHover:'rgba(255,107,53,0.4)',
    tier:       'pro',
  },
  {
    id:         'performance_review',
    icon:       '⭐',
    title:      'Performance Review',
    desc:       'Talk about achievements and goals with your manager. Own your wins confidently.',
    duration:   '10–15 min',
    difficulty: 2,
    tags:       ['Working professionals'],
    glowColor:  'rgba(0,196,154,0.2)',
    borderHover:'rgba(0,196,154,0.4)',
    tier:       'pro',
  },
  {
    id:         'gd_round',
    icon:       '🗣️',
    title:      'Group Discussion',
    desc:       'Practise GD rounds for MBA admissions, consulting, and campus placements.',
    duration:   '5–10 min',
    difficulty: 2,
    tags:       ['MBA aspirants', 'Placements'],
    glowColor:  'rgba(236,72,153,0.2)',
    borderHover:'rgba(236,72,153,0.4)',
    tier:       'pro',
  },
  {
    id:         'first_date',
    icon:       '❤️',
    title:      'First Date',
    desc:       'Practise genuine, engaging conversation on a first date. No scripts — just you.',
    duration:   '5–10 min',
    difficulty: 2,
    tags:       ['Social confidence', 'Relationships'],
    glowColor:  'rgba(239,68,68,0.2)',
    borderHover:'rgba(239,68,68,0.4)',
    tier:       'pro',
  },
]

// ── UI helpers ────────────────────────────────────────────────────────────────
function DifficultyStars({ level }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3].map(i => (
        <span key={i} style={{ fontSize: '10px', color: i <= level ? '#F59E0B' : 'rgba(255,255,255,0.2)' }}>★</span>
      ))}
    </div>
  )
}

// ── Upgrade modal ─────────────────────────────────────────────────────────────
function UpgradeModal({ reason, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="relative max-w-sm w-full rounded-3xl p-7 animate-slide-up"
        style={{
          background: 'linear-gradient(145deg, #0F1E35, #091522)',
          border: '1px solid rgba(255,107,53,0.35)',
          boxShadow: '0 0 60px rgba(255,107,53,0.15)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="text-center mb-5">
          <div className="text-4xl mb-3">🔒</div>
          <h3 className="text-white font-black text-xl mb-2">Vak Pro required</h3>
          <p className="text-sm leading-relaxed" style={{ color: '#6B8CAE' }}>
            {reason}
          </p>
        </div>

        {/* What you get */}
        <div
          className="rounded-2xl p-4 mb-5"
          style={{ background: 'rgba(255,107,53,0.07)', border: '1px solid rgba(255,107,53,0.2)' }}
        >
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#FF6B35' }}>
            Vak Pro — ₹299/month
          </p>
          {[
            'Unlimited sessions',
            'Full scenario library (8 scenarios)',
            'Deep coaching reports',
            'Unlimited meeting prep',
            'Live meeting overlay (beta)',
          ].map(f => (
            <div key={f} className="flex items-center gap-2 mb-1.5">
              <span className="text-xs" style={{ color: '#00C49A' }}>✓</span>
              <span className="text-xs text-white">{f}</span>
            </div>
          ))}
        </div>

        <Link
          to="/pricing"
          className="btn-primary w-full text-center text-sm mb-3"
          onClick={onClose}
        >
          See plans →
        </Link>
        <button
          onClick={onClose}
          className="w-full text-sm py-2 transition-colors"
          style={{ color: '#6B8CAE' }}
        >
          Maybe later
        </button>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Practice() {
  const navigate = useNavigate()
  const {
    isPro,
    loading: subLoading,
    canStartSession,
    sessionsRemaining,
    weeklySessionCount,
  } = useSubscription()

  const [upgradeModal, setUpgradeModal] = useState(null) // null | string (reason)

  function startSession(scenario) {
    const isFreeScenario = FREE_SCENARIO_IDS.includes(scenario.id)

    // Gate: scenario tier
    if (!isPro && !isFreeScenario) {
      setUpgradeModal(
        `${scenario.title} is a Vak Pro scenario. Upgrade to unlock salary negotiation, client objections, performance reviews, and more.`
      )
      return
    }

    // Gate: weekly session limit (free users only)
    if (!isPro && !canStartSession) {
      setUpgradeModal(
        `You've used all 3 free sessions this week. Upgrade to Vak Pro for unlimited practice — every day, any scenario.`
      )
      return
    }

    navigate(`/practice/${scenario.id}`, { state: { scenario } })
  }

  const freeSessions  = SCENARIOS.filter(s => s.tier === 'free')
  const proSessions   = SCENARIOS.filter(s => s.tier === 'pro')

  return (
    <div className="min-h-screen" style={{ background: '#060E1A' }}>

      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div style={{
          position: 'absolute', top: '-80px', left: '50%', transform: 'translateX(-50%)',
          width: '600px', height: '300px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,107,53,0.07) 0%, transparent 70%)',
        }} />
      </div>

      <Navbar />

      <main className="max-w-5xl mx-auto px-4 py-7 relative z-10">

        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-3 text-sm font-semibold"
            style={{ background: 'rgba(255,107,53,0.12)', color: '#FF6B35', border: '1px solid rgba(255,107,53,0.2)' }}>
            ⚔️ Choose Your Quest
          </div>
          <h1 className="text-3xl font-black text-white">What do you want to conquer?</h1>
          <p className="mt-2 text-sm" style={{ color: '#6B8CAE' }}>
            Each session earns up to <span style={{ color: '#F59E0B', fontWeight: 700 }}>+225 XP</span>.
            Score 90%+ for an excellence bonus.
          </p>
        </div>

        {/* Weekly limit pill (free users) */}
        {!subLoading && !isPro && (
          <div className="flex items-center justify-center mb-6">
            <div
              className="flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm"
              style={{
                background: canStartSession ? 'rgba(0,196,154,0.08)' : 'rgba(239,68,68,0.08)',
                border: `1px solid ${canStartSession ? 'rgba(0,196,154,0.25)' : 'rgba(239,68,68,0.25)'}`,
              }}
            >
              <span>{canStartSession ? '🟢' : '🔴'}</span>
              <span style={{ color: canStartSession ? '#00C49A' : '#F87171' }}>
                {canStartSession
                  ? `${sessionsRemaining} free session${sessionsRemaining !== 1 ? 's' : ''} left this week`
                  : 'Weekly limit reached — resets Sunday'}
              </span>
              <span className="text-xs" style={{ color: '#6B8CAE' }}>
                ({weeklySessionCount}/3 used)
              </span>
              <Link
                to="/pricing"
                className="text-xs font-bold px-3 py-1 rounded-full transition-all hover:opacity-90"
                style={{ background: '#FF6B35', color: 'white' }}
              >
                Upgrade →
              </Link>
            </div>
          </div>
        )}

        {/* ── Free tier scenarios ──────────────────────────────────────────── */}
        <div className="mb-3 flex items-center gap-3">
          <div className="text-xs font-bold uppercase tracking-widest" style={{ color: '#6B8CAE' }}>
            🆓 Vak's Nest — Free
          </div>
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {freeSessions.map(s => (
            <ScenarioCard
              key={s.id}
              scenario={s}
              locked={false}
              dimmed={!canStartSession && !isPro}
              onClick={() => startSession(s)}
            />
          ))}
        </div>

        {/* ── Pro tier scenarios ───────────────────────────────────────────── */}
        <div className="mb-3 flex items-center gap-3">
          <div className="text-xs font-bold uppercase tracking-widest" style={{ color: '#FF6B35' }}>
            ⚡ Vak Pro — ₹299/month
          </div>
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
          {!isPro && (
            <Link
              to="/pricing"
              className="text-xs font-bold px-3 py-1.5 rounded-full transition-all hover:opacity-90"
              style={{ background: 'rgba(255,107,53,0.15)', color: '#FF6B35', border: '1px solid rgba(255,107,53,0.25)' }}
            >
              Unlock all →
            </Link>
          )}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {proSessions.map(s => (
            <ScenarioCard
              key={s.id}
              scenario={s}
              locked={!isPro}
              dimmed={false}
              onClick={() => startSession(s)}
            />
          ))}
        </div>

        {/* Pro upsell banner (free users) */}
        {!isPro && (
          <div
            className="rounded-3xl p-6 mb-6 flex flex-col sm:flex-row items-center gap-5"
            style={{
              background: 'linear-gradient(135deg, rgba(255,107,53,0.08) 0%, rgba(99,102,241,0.06) 100%)',
              border: '1px solid rgba(255,107,53,0.25)',
            }}
          >
            <div className="text-4xl">🦢</div>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-white font-black text-lg mb-1">Unlock all 8 scenarios with Vak Pro</h3>
              <p className="text-sm" style={{ color: '#6B8CAE' }}>
                Salary negotiation, client objections, performance reviews, GD rounds + deep coaching reports.
                ₹299/month — cancel anytime.
              </p>
            </div>
            <Link to="/pricing" className="btn-primary text-sm py-3 px-6 shrink-0">
              See plans →
            </Link>
          </div>
        )}

        {/* ── Teleprompter Mode entry ── */}
        <Link
          to="/script-reading"
          className="flex items-center gap-4 rounded-3xl p-5 mb-5 transition-all hover:brightness-110"
          style={{
            background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(139,92,246,0.05))',
            border: '1px solid rgba(139,92,246,0.25)',
          }}
        >
          <div
            className="shrink-0 w-12 h-12 flex items-center justify-center rounded-2xl text-2xl"
            style={{ background: 'rgba(139,92,246,0.15)' }}
          >
            📜
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white font-black text-sm mb-0.5">Teleprompter Mode</div>
            <div className="text-xs" style={{ color: '#6B8CAE' }}>
              Read real scripts aloud — Vak catches every filler, pause, and pace issue live
            </div>
          </div>
          <span style={{ color: '#A78BFA', fontSize: '1.1rem' }}>→</span>
        </Link>

        {/* Bottom tip */}
        <div
          className="rounded-2xl px-5 py-4 flex items-start gap-3"
          style={{ background: 'linear-gradient(135deg, #0F1E35, #091522)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <span className="text-xl">💡</span>
          <div>
            <span className="text-white font-bold text-sm">Pro tip: </span>
            <span className="text-sm" style={{ color: '#6B8CAE' }}>
              Treat every session like the real thing. Discomfort during practice = confidence when it counts.
              Score 90%+ to earn the <span style={{ color: '#F59E0B' }}>Excellence bonus (+25 XP)</span>.
            </span>
          </div>
        </div>

        <div className="h-6" />
      </main>

      {/* Upgrade modal */}
      {upgradeModal && (
        <UpgradeModal reason={upgradeModal} onClose={() => setUpgradeModal(null)} />
      )}
    </div>
  )
}

// ── Scenario card ─────────────────────────────────────────────────────────────
function ScenarioCard({ scenario: s, locked, dimmed, onClick }) {
  return (
    <button
      onClick={onClick}
      className="quest-card group relative text-left"
      style={{
        '--hover-border': locked ? 'rgba(255,107,53,0.4)' : s.borderHover,
        opacity: dimmed ? 0.6 : 1,
      }}
    >
      {/* Lock overlay */}
      {locked && (
        <div
          className="absolute inset-0 rounded-[inherit] z-10 flex items-center justify-center flex-col gap-1"
          style={{ backdropFilter: 'blur(1px)', background: 'rgba(6,14,26,0.45)' }}
        >
          <span className="text-2xl">🔒</span>
          <span
            className="text-xs font-bold px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(255,107,53,0.2)', color: '#FF6B35', border: '1px solid rgba(255,107,53,0.35)' }}
          >
            Vak Pro
          </span>
        </div>
      )}

      {/* Top row */}
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
          style={{ background: s.glowColor }}
        >
          {s.icon}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <DifficultyStars level={s.difficulty} />
          {s.tier === 'free' && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(0,196,154,0.15)', color: '#00C49A' }}>
              FREE
            </span>
          )}
        </div>
      </div>

      <h3 className="text-white font-bold text-base mb-1.5 group-hover:text-primary transition-colors">
        {s.title}
      </h3>

      <p className="text-sm leading-relaxed mb-4" style={{ color: '#6B8CAE' }}>
        {s.desc}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <span className="text-xs" style={{ color: '#6B8CAE' }}>⏱ {s.duration}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold" style={{ color: '#F59E0B' }}>⭐ +100–225 XP</span>
          <span className="text-sm font-bold opacity-0 group-hover:opacity-100 transition-all" style={{ color: '#FF6B35' }}>
            {locked ? 'Unlock →' : 'Play →'}
          </span>
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mt-3">
        {s.tags.map(t => (
          <span key={t} className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(255,255,255,0.05)', color: '#6B8CAE' }}>
            {t}
          </span>
        ))}
      </div>
    </button>
  )
}
