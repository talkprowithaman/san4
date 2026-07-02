import { useEffect } from 'react'
import { create }    from 'zustand'
import { supabase }  from '../lib/supabase'
import { useAuthStore } from './useAuth'
import { calcXP, calcStreak, getLevelInfo, levelFromXP } from '../lib/gamification'
import { getFreezes, earnFreeze, consumeFreeze, missedExactlyOneDay } from '../lib/streakFreeze'

// ── Zustand store (shared across all components) ─────────────────────────────
export const useProgressStore = create((set) => ({
  progress:    null,
  loading:     true,
  setProgress: (p) => set({ progress: p }),
  setLoading:  (l) => set({ loading: l }),
}))

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useProgress() {
  const { user }                        = useAuthStore()
  const { progress, loading, setProgress, setLoading } = useProgressStore()

  useEffect(() => {
    // Only fetch once per session (progress === null means not yet loaded)
    if (user && progress === null) fetchProgress()
    else if (!user) setLoading(false)
  }, [user])

  async function fetchProgress() {
    setLoading(true)
    const { data } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', user.id)
      .single()
    setProgress(data || null)
    setLoading(false)
  }

  // ── Award XP after a completed session ──────────────────────────────────────
  // Returns a reward summary used by RewardCard.
  // opts.fixedXP: award a flat amount instead of the score formula — used by
  // Daily Reps (small, frequent wins) so they don't inflate XP like a full
  // session. Streak logic runs either way (a rep keeps the streak alive).
  async function awardXP(score, opts = {}) {
    if (!user) return null

    const cur = progress ?? {
      total_xp: 0, level: 1,
      streak_count: 0, longest_streak: 0,
      last_practice_date: null,
    }

    const xpGained   = opts.fixedXP ?? calcXP(score)
    const newTotalXP = (cur.total_xp || 0) + xpGained
    const oldLevel   = cur.level || 1
    const newLevel   = levelFromXP(newTotalXP)
    const leveledUp  = newLevel > oldLevel

    let { streak, streakUpdated, brokeStreak } = calcStreak(
      cur.last_practice_date,
      cur.streak_count || 0
    )

    // ── Streak freeze rescue ────────────────────────────────────────────────
    // Missed exactly one day with a freeze in the bank: the freeze burns and
    // the streak survives. Longer gaps still reset (freezes don't stack over
    // multi-day absences, or the streak stops meaning anything).
    let freezeUsed = false
    if (brokeStreak && missedExactlyOneDay(cur.last_practice_date) && getFreezes(user.id) > 0) {
      consumeFreeze(user.id)
      streak = (cur.streak_count || 0) + 1
      brokeStreak = false
      freezeUsed = true
    }

    // Earn a freeze at every 7-day milestone (7, 14, 21…), capped at 2 held.
    let freezeEarned = false
    if (streakUpdated && streak > 0 && streak % 7 === 0) {
      const before = getFreezes(user.id)
      freezeEarned = earnFreeze(user.id) > before
    }

    const longestStreak = Math.max(streak, cur.longest_streak || 0)
    const today = new Date().toLocaleDateString('en-CA')

    const updated = {
      user_id:            user.id,
      total_xp:           newTotalXP,
      level:              newLevel,
      streak_count:       streak,
      longest_streak:     longestStreak,
      last_practice_date: today,
      updated_at:         new Date().toISOString(),
    }

    const { data } = await supabase
      .from('user_progress')
      .upsert(updated, { onConflict: 'user_id' })
      .select()
      .single()

    if (data) setProgress(data)

    return {
      xpGained,
      newTotalXP,
      oldLevel,
      newLevel,
      leveledUp,
      streakCount:   streak,
      streakUpdated,
      brokeStreak,
      freezeUsed,
      freezeEarned,
      freezesLeft:   getFreezes(user.id),
    }
  }

  // ── Derived values ───────────────────────────────────────────────────────────
  const levelInfo = progress ? getLevelInfo(progress.total_xp ?? 0) : null

  return {
    progress,
    loading,
    levelInfo,
    awardXP,
    refetch: fetchProgress,
  }
}
