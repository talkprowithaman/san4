// ─────────────────────────────────────────────────────────────────────────────
// San4 Gamification — pure utility functions (no side effects, fully testable)
// ─────────────────────────────────────────────────────────────────────────────

// ── Level definitions ─────────────────────────────────────────────────────────
export const LEVELS = [
  { level: 1, name: 'Hesitant',    icon: '🌱', color: '#6B8CAE', minXP: 0    },
  { level: 2, name: 'Aware',       icon: '🔹', color: '#3B82F6', minXP: 300  },
  { level: 3, name: 'Expressive',  icon: '💎', color: '#8B5CF6', minXP: 800  },
  { level: 4, name: 'Influential', icon: '⚡', color: '#F59E0B', minXP: 1800 },
  { level: 5, name: 'Vaksiddha',   icon: '🦚', color: '#10B981', minXP: 4000 },
]

// ── Get full level info from a totalXP number ─────────────────────────────────
export function getLevelInfo(totalXP) {
  let current = LEVELS[0]
  let next    = LEVELS[1] || null

  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (totalXP >= LEVELS[i].minXP) {
      current = LEVELS[i]
      next    = LEVELS[i + 1] || null
      break
    }
  }

  const xpIntoLevel    = totalXP - current.minXP
  const xpForLevel     = next ? next.minXP - current.minXP : 1
  const progressPercent = next
    ? Math.min(100, Math.round((xpIntoLevel / xpForLevel) * 100))
    : 100

  return { current, next, xpIntoLevel, xpForLevel, progressPercent }
}

// ── XP awarded per session ─────────────────────────────────────────────────────
// Base:             50 XP  (showing up counts)
// Score bonus:      floor(score * 1.5)  →  0–150 XP
// Excellence bonus: +25 if score ≥ 90
// Max per session:  225 XP
export function calcXP(score) {
  const base             = 50
  const scoreBonus       = Math.floor((score || 0) * 1.5)
  const excellenceBonus  = score >= 90 ? 25 : 0
  return base + scoreBonus + excellenceBonus
}

// ── Streak calculation ────────────────────────────────────────────────────────
// Returns the new streak count and whether it changed.
// Uses local date (not UTC) to avoid midnight-timezone surprises.
export function calcStreak(lastPracticeDateRaw, currentStreak) {
  const toLocal = (d) =>
    new Date(d).toLocaleDateString('en-CA') // → "YYYY-MM-DD"

  const today     = toLocal(Date.now())
  const yesterday = toLocal(Date.now() - 86_400_000)

  if (!lastPracticeDateRaw) {
    // Very first session ever
    return { streak: 1, streakUpdated: true, brokeStreak: false }
  }

  const last = typeof lastPracticeDateRaw === 'string'
    ? lastPracticeDateRaw.slice(0, 10)
    : toLocal(lastPracticeDateRaw)

  if (last === today) {
    // Already practiced today — don't double-count
    return { streak: currentStreak, streakUpdated: false, brokeStreak: false }
  }

  if (last === yesterday) {
    // Consecutive day — extend streak
    return { streak: currentStreak + 1, streakUpdated: true, brokeStreak: false }
  }

  // Missed at least one day — reset
  return {
    streak:         1,
    streakUpdated:  true,
    brokeStreak:    currentStreak > 1,
  }
}

// ── Level number from totalXP (convenience) ───────────────────────────────────
export function levelFromXP(totalXP) {
  let level = 1
  for (const l of LEVELS) {
    if (totalXP >= l.minXP) level = l.level
  }
  return level
}
