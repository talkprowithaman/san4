import { useEffect } from 'react'
import { create }    from 'zustand'
import { supabase }  from '../lib/supabase'
import { useAuthStore } from './useAuth'
import { calcXP, calcStreak, getLevelInfo, levelFromXP } from '../lib/gamification'

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
  async function awardXP(score) {
    if (!user) return null

    const cur = progress ?? {
      total_xp: 0, level: 1,
      streak_count: 0, longest_streak: 0,
      last_practice_date: null,
    }

    const xpGained   = calcXP(score)
    const newTotalXP = (cur.total_xp || 0) + xpGained
    const oldLevel   = cur.level || 1
    const newLevel   = levelFromXP(newTotalXP)
    const leveledUp  = newLevel > oldLevel

    const { streak, streakUpdated, brokeStreak } = calcStreak(
      cur.last_practice_date,
      cur.streak_count || 0
    )
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
