import { Link } from 'react-router-dom'
import { getTodaySituation, isDailyChallengeDone } from '../lib/situations'

export default function SituationOfTheDay() {
  const situation = getTodaySituation()
  const done      = isDailyChallengeDone()

  return (
    <div
      className="rounded-3xl p-5 mb-5"
      style={{
        background: done
          ? 'linear-gradient(145deg, rgba(0,196,154,0.08), rgba(0,196,154,0.04))'
          : 'rgba(255,255,255,0.04)',
        border: done
          ? '1px solid rgba(0,196,154,0.25)'
          : '1px solid rgba(255,107,53,0.25)',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{situation.icon}</span>
        <div>
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-black uppercase tracking-widest"
              style={{ color: done ? '#00C49A' : '#FF6B35' }}
            >
              {done ? '✓ Done today' : '🔥 Daily Challenge'}
            </span>
          </div>
          <div className="text-xs" style={{ color: '#6B8CAE' }}>{situation.category}</div>
        </div>
        {!done && (
          <div
            className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(255,107,53,0.12)', color: '#FF6B35' }}
          >
            +XP
          </div>
        )}
      </div>

      {/* Situation text */}
      <p
        className="text-sm leading-relaxed mb-4"
        style={{ color: done ? '#6B8CAE' : '#E2E8F0' }}
      >
        {situation.text}
      </p>

      {/* CTA */}
      {done ? (
        <div className="flex items-center gap-2 text-sm" style={{ color: '#00C49A' }}>
          <span>✅</span>
          <span>You nailed today's challenge. Come back tomorrow!</span>
        </div>
      ) : (
        <Link
          to="/daily-challenge"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all hover:opacity-90"
          style={{
            background: 'linear-gradient(135deg, #FF6B35, #FF8F4F)',
            color: 'white',
            boxShadow: '0 4px 14px rgba(255,107,53,0.3)',
          }}
        >
          🎤 Respond Now →
        </Link>
      )}
    </div>
  )
}
