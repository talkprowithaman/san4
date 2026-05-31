import { useEffect, useState } from 'react'
import { LEVELS, getLevelInfo } from '../lib/gamification'

// ── RewardCard ────────────────────────────────────────────────────────────────
// Shown at the top of the practice session report.
// Animates XP counting up, shows streak update, and level-up banner.
export default function RewardCard({ reward }) {
  const [displayXP, setDisplayXP] = useState(0)
  const [showLevelUp, setShowLevelUp] = useState(false)

  // Count-up animation for XP
  useEffect(() => {
    if (!reward?.xpGained) return
    const target   = reward.xpGained
    const steps    = 40
    const stepTime = 600 / steps        // ~600ms total
    const inc      = target / steps
    let cur        = 0

    const timer = setInterval(() => {
      cur = Math.min(cur + inc, target)
      setDisplayXP(Math.round(cur))
      if (cur >= target) clearInterval(timer)
    }, stepTime)

    return () => clearInterval(timer)
  }, [reward])

  // Delay level-up banner so it pops in after the XP counter finishes
  useEffect(() => {
    if (!reward?.leveledUp) return
    const t = setTimeout(() => setShowLevelUp(true), 700)
    return () => clearTimeout(t)
  }, [reward])

  if (!reward) return null

  const newLevelData = LEVELS.find(l => l.level === reward.newLevel)
  const oldLevelData = LEVELS.find(l => l.level === reward.oldLevel)

  return (
    <div className="mb-6 animate-slide-up">

      {/* Main reward row */}
      <div
        className="rounded-2xl p-5 border"
        style={{ background: 'rgba(123,94,167,0.06)', borderColor: 'rgba(123,94,167,0.3)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs uppercase tracking-widest font-semibold mb-1" style={{ color: '#6B8CAE' }}>
              XP Earned
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black" style={{ color: '#7B5EA7' }}>
                +{displayXP}
              </span>
              <span className="text-lg font-bold" style={{ color: '#7B5EA7' }}>XP</span>
            </div>
          </div>

          <div className="text-6xl select-none">
            {reward.leveledUp ? '🎉' : reward.streakCount >= 7 ? '🔥' : '⭐'}
          </div>
        </div>

        {/* Streak pill */}
        <div className="flex items-center gap-3 flex-wrap">
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold"
            style={{ background: 'rgba(123,94,167,0.15)' }}
          >
            <span>🔥</span>
            <span className="text-white">{reward.streakCount}</span>
            <span style={{ color: '#6B8CAE' }}>
              {reward.streakCount === 1 ? 'day streak' : 'day streak'}
            </span>
          </div>

          {reward.streakUpdated && reward.streakCount > 1 && (
            <span className="text-xs font-semibold" style={{ color: '#00C49A' }}>
              +1 streak extended!
            </span>
          )}
          {reward.brokeStreak && (
            <span className="text-xs font-semibold text-red-400">
              Streak reset, keep going!
            </span>
          )}
        </div>
      </div>

      {/* Level-up banner — pops in after XP counter */}
      {showLevelUp && (
        <div
          className="mt-3 rounded-2xl p-4 flex items-center gap-4 animate-pop border"
          style={{ background: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.35)' }}
        >
          <div className="text-4xl">{newLevelData?.icon}</div>
          <div className="flex-1">
            <p className="text-xs uppercase tracking-widest font-semibold mb-0.5" style={{ color: '#F59E0B' }}>
              Level Up!
            </p>
            <p className="text-white font-bold text-base">
              {oldLevelData?.name}
              <span className="mx-2" style={{ color: '#6B8CAE' }}>→</span>
              <span style={{ color: newLevelData?.color }}>{newLevelData?.name}</span>
            </p>
          </div>
          <div className="text-3xl">🎊</div>
        </div>
      )}
    </div>
  )
}
