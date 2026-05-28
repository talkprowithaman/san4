import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'

const SCENARIOS = [
  {
    id:         'hr_interview',
    icon:       '💼',
    title:      'HR Interview',
    desc:       'Practise your HR round — strengths, weaknesses, situational questions.',
    duration:   '10–15 min',
    difficulty: 1,
    xpRange:    '100–225',
    tags:       ['Job seekers', 'Freshers'],
    glowColor:  'rgba(59,130,246,0.2)',
    borderHover:'rgba(59,130,246,0.4)',
  },
  {
    id:         'client_presentation',
    icon:       '📊',
    title:      'Client Presentation',
    desc:       'Present your proposal to a skeptical but fair client. Handle objections.',
    duration:   '10–20 min',
    difficulty: 2,
    xpRange:    '100–225',
    tags:       ['Consultants', 'Sales'],
    glowColor:  'rgba(255,107,53,0.2)',
    borderHover:'rgba(255,107,53,0.4)',
  },
  {
    id:         'performance_review',
    icon:       '⭐',
    title:      'Performance Review',
    desc:       'Talk about achievements and goals with your manager. Own your wins.',
    duration:   '10–15 min',
    difficulty: 2,
    xpRange:    '100–225',
    tags:       ['Working professionals'],
    glowColor:  'rgba(0,196,154,0.2)',
    borderHover:'rgba(0,196,154,0.4)',
  },
  {
    id:         'salary_negotiation',
    icon:       '💰',
    title:      'Salary Negotiation',
    desc:       'Negotiate your package confidently against an HR with budget constraints.',
    duration:   '5–10 min',
    difficulty: 3,
    xpRange:    '100–225',
    tags:       ['High stakes', 'All levels'],
    glowColor:  'rgba(245,158,11,0.2)',
    borderHover:'rgba(245,158,11,0.4)',
  },
  {
    id:         'team_meeting',
    icon:       '👥',
    title:      'Team Meeting',
    desc:       'Present an idea to your team. Handle questions and pushback with clarity.',
    duration:   '10–15 min',
    difficulty: 1,
    xpRange:    '100–225',
    tags:       ['Team leads', 'Anyone'],
    glowColor:  'rgba(139,92,246,0.2)',
    borderHover:'rgba(139,92,246,0.4)',
  },
  {
    id:         'gd_round',
    icon:       '🗣️',
    title:      'Group Discussion',
    desc:       'Practise GD rounds for MBA admissions, consulting, and campus placements.',
    duration:   '5–10 min',
    difficulty: 2,
    xpRange:    '100–225',
    tags:       ['MBA aspirants', 'Placements'],
    glowColor:  'rgba(236,72,153,0.2)',
    borderHover:'rgba(236,72,153,0.4)',
  },
  {
    id:         'social_conversation',
    icon:       '💬',
    title:      'Social Conversation',
    desc:       'Practise talking to someone new at a social event. Build genuine rapport.',
    duration:   '5–10 min',
    difficulty: 1,
    xpRange:    '100–225',
    tags:       ['Social anxiety', 'Confidence'],
    glowColor:  'rgba(16,185,129,0.2)',
    borderHover:'rgba(16,185,129,0.4)',
    isNew:      true,
  },
  {
    id:         'first_date',
    icon:       '❤️',
    title:      'First Date',
    desc:       'Practise genuine, engaging conversation on a first date. No scripts — just you.',
    duration:   '5–10 min',
    difficulty: 2,
    xpRange:    '100–225',
    tags:       ['Social confidence', 'Relationships'],
    glowColor:  'rgba(239,68,68,0.2)',
    borderHover:'rgba(239,68,68,0.4)',
    isNew:      true,
  },
]

function DifficultyStars({ level }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3].map(i => (
        <span key={i} style={{ fontSize: '10px', color: i <= level ? '#F59E0B' : 'rgba(255,255,255,0.2)' }}>
          ★
        </span>
      ))}
    </div>
  )
}

export default function Practice() {
  const navigate = useNavigate()

  function startSession(scenario) {
    navigate(`/practice/${scenario.id}`, { state: { scenario } })
  }

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

        {/* Quest grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {SCENARIOS.map(s => (
            <button
              key={s.id}
              onClick={() => startSession(s)}
              className="quest-card group"
              style={{ '--hover-border': s.borderHover }}
            >
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
                  {s.isNew && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(0,196,154,0.15)', color: '#00C49A' }}>
                      NEW
                    </span>
                  )}
                </div>
              </div>

              {/* Title */}
              <h3
                className="text-white font-bold text-base mb-1.5 group-hover:text-primary transition-colors text-left"
              >
                {s.title}
              </h3>

              {/* Desc */}
              <p className="text-sm leading-relaxed mb-4 text-left" style={{ color: '#6B8CAE' }}>
                {s.desc}
              </p>

              {/* Footer */}
              <div
                className="flex items-center justify-between pt-3"
                style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: '#6B8CAE' }}>⏱ {s.duration}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold" style={{ color: '#F59E0B' }}>
                    ⭐ +{s.xpRange} XP
                  </span>
                  <span
                    className="text-sm font-bold opacity-0 group-hover:opacity-100 transition-all"
                    style={{ color: '#FF6B35' }}
                  >
                    Play →
                  </span>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 mt-3">
                {s.tags.map(t => (
                  <span
                    key={t}
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.05)', color: '#6B8CAE' }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>

        {/* Bottom tip */}
        <div
          className="mt-8 rounded-2xl px-5 py-4 flex items-start gap-3"
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
    </div>
  )
}
