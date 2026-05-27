import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'

const SCENARIOS = [
  {
    id:         'hr_interview',
    icon:       '💼',
    title:      'HR Interview',
    desc:       'Practice your HR round — strengths, weaknesses, situational questions, and more.',
    duration:   '10–15 min',
    difficulty: 'Beginner',
    tags:       ['Job seekers', 'Freshers', 'Career changers'],
    color:      'border-blue-500/30 hover:border-blue-500/60',
    badge:      'badge-blue',
  },
  {
    id:         'client_presentation',
    icon:       '📊',
    title:      'Client Presentation',
    desc:       'Present your ideas, proposals, or updates to a skeptical but fair client.',
    duration:   '10–20 min',
    difficulty: 'Intermediate',
    tags:       ['Consultants', 'Sales', 'IT professionals'],
    color:      'border-primary/30 hover:border-primary/60',
    badge:      'badge-orange',
  },
  {
    id:         'performance_review',
    icon:       '⭐',
    title:      'Performance Review',
    desc:       'Talk about your achievements, challenges, and goals with your manager.',
    duration:   '10–15 min',
    difficulty: 'Intermediate',
    tags:       ['Working professionals', 'Managers'],
    color:      'border-teal/30 hover:border-teal/60',
    badge:      'badge-teal',
  },
  {
    id:         'salary_negotiation',
    icon:       '💰',
    title:      'Salary Negotiation',
    desc:       'Negotiate your package confidently with an HR manager who has budget constraints.',
    duration:   '5–10 min',
    difficulty: 'Advanced',
    tags:       ['All professionals', 'High stakes'],
    color:      'border-yellow-500/30 hover:border-yellow-500/60',
    badge:      'badge-orange',
  },
  {
    id:         'team_meeting',
    icon:       '👥',
    title:      'Team Meeting',
    desc:       'Present an idea or update to your team. Handle questions and pushback.',
    duration:   '10–15 min',
    difficulty: 'Beginner',
    tags:       ['Team leads', 'Anyone who presents in meetings'],
    color:      'border-purple-500/30 hover:border-purple-500/60',
    badge:      'badge-blue',
  },
  {
    id:         'gd_round',
    icon:       '🗣️',
    title:      'Group Discussion',
    desc:       'Practice GD rounds for MBA admissions, consulting assessments, and campus placements.',
    duration:   '5–10 min',
    difficulty: 'Intermediate',
    tags:       ['MBA aspirants', 'Campus placements'],
    color:      'border-pink-500/30 hover:border-pink-500/60',
    badge:      'badge-orange',
  },
]

const DIFFICULTY_COLOR = {
  Beginner:     'text-teal',
  Intermediate: 'text-primary',
  Advanced:     'text-red-400',
}

export default function Practice() {
  const navigate = useNavigate()

  function startSession(scenario) {
    navigate(`/practice/${scenario.id}`, { state: { scenario } })
  }

  return (
    <div className="min-h-screen bg-navy-900">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-3xl font-black text-white">Choose Your Scenario</h1>
          <p className="text-muted mt-1">Pick a situation you want to practice. The AI will play the other person.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {SCENARIOS.map(s => (
            <button
              key={s.id}
              onClick={() => startSession(s)}
              className={`card text-left transition-all border ${s.color} group cursor-pointer`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="text-4xl">{s.icon}</div>
                <span className={`${s.badge} text-xs`}>{s.difficulty}</span>
              </div>

              <h3 className="text-white font-bold text-lg mb-1.5 group-hover:text-primary transition-colors">
                {s.title}
              </h3>
              <p className="text-muted text-sm leading-relaxed mb-4">{s.desc}</p>

              <div className="flex items-center justify-between text-xs text-muted border-t border-navy-600 pt-3 mt-auto">
                <span>⏱ {s.duration}</span>
                <span className="text-primary opacity-0 group-hover:opacity-100 transition-opacity font-semibold">
                  Start →
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 mt-3">
                {s.tags.map(t => (
                  <span key={t} className="bg-navy-800 text-muted text-xs px-2 py-0.5 rounded-full">{t}</span>
                ))}
              </div>
            </button>
          ))}
        </div>

        {/* Tip */}
        <div className="mt-8 card border-navy-500 flex items-start gap-3">
          <div className="text-xl">💡</div>
          <div>
            <span className="text-white font-semibold">Pro tip: </span>
            <span className="text-muted text-sm">Treat every session like the real thing. The AI will push back just like a real interviewer or client would. Discomfort during practice = confidence during the real thing.</span>
          </div>
        </div>
      </main>
    </div>
  )
}
