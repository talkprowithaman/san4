// ─────────────────────────────────────────────────────────────────────────────
// Streak Freeze — Duolingo's single most effective retention item.
//
// Rules (v1):
//  - You EARN one freeze automatically every 7-day streak milestone (7, 14, …).
//  - You can hold at most MAX_FREEZES at a time.
//  - If you miss exactly ONE day, a freeze is consumed automatically and your
//    streak survives. Miss two or more days and the streak resets (freezes
//    can't cover long gaps, otherwise the streak means nothing).
//
// Storage: localStorage per user (v1). TODO: move to a `streak_freezes` column
// on user_progress in Supabase so it follows the user across devices.
// ─────────────────────────────────────────────────────────────────────────────

export const MAX_FREEZES = 2

const key = (userId) => `san4_freezes_${userId || 'guest'}`

export function getFreezes(userId) {
  try {
    const n = parseInt(localStorage.getItem(key(userId)) || '0', 10)
    return Number.isFinite(n) ? Math.max(0, Math.min(MAX_FREEZES, n)) : 0
  } catch {
    return 0
  }
}

export function earnFreeze(userId) {
  const next = Math.min(MAX_FREEZES, getFreezes(userId) + 1)
  try { localStorage.setItem(key(userId), String(next)) } catch { /* ignore */ }
  return next
}

export function consumeFreeze(userId) {
  const next = Math.max(0, getFreezes(userId) - 1)
  try { localStorage.setItem(key(userId), String(next)) } catch { /* ignore */ }
  return next
}

// Did the user miss exactly one calendar day? (Practised day-before-yesterday,
// nothing yesterday.) That's the only gap a freeze can cover.
export function missedExactlyOneDay(lastPracticeDateRaw) {
  if (!lastPracticeDateRaw) return false
  const toLocal = (d) => new Date(d).toLocaleDateString('en-CA')
  const dayBeforeYesterday = toLocal(Date.now() - 2 * 86_400_000)
  const last = typeof lastPracticeDateRaw === 'string'
    ? lastPracticeDateRaw.slice(0, 10)
    : toLocal(lastPracticeDateRaw)
  return last === dayBeforeYesterday
}
