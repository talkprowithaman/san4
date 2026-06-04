import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth }  from './useAuth'

// ── Model change: sessions are no longer rate-limited on free tier ────────────
// Content (score-gating via the progression system) is now the mechanism that
// drives upgrades — not session counts. Free users can replay any unlocked
// level as many times as they need. Pro unlocks Levels 11-14 and elite perks.
export const FREE_PREP_LIMIT = 1  // meeting prep still limited to 1/week

// Backward-compat — still exported so old imports don't break
export const FREE_SESSION_LIMIT = Infinity
export const FREE_SCENARIO_IDS  = [
  'hr_interview','social_conversation','team_meeting','performance_review',
  'gd_round','salary_negotiation','say_no_professionally','client_presentation',
  'cold_networking','leadership_update',
]

function getWeekStart() {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay())
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useSubscription() {
  const { user } = useAuth()

  const [plan,           setPlan]    = useState(null)   // 'free' | 'pro' | 'pro_plus'
  const [weeklyPrepCount, setWpc]   = useState(0)
  const [loading,        setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    if (!user) { setLoading(false); return }

    const weekStart = getWeekStart()

    const [subRes, prepRes] = await Promise.all([
      supabase.from('subscriptions').select('plan').eq('user_id', user.id).single(),
      supabase.from('meeting_preps')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', weekStart),
    ])

    setPlan(subRes.data?.plan || 'free')
    setWpc(prepRes.count || 0)
    setLoading(false)
  }, [user])

  useEffect(() => { fetchAll() }, [fetchAll])

  const isPro     = plan === 'pro' || plan === 'pro_plus'
  const isProPlus = plan === 'pro_plus'  // 'elite' tier

  return {
    plan,
    isPro,
    isProPlus,
    loading,

    weeklyPrepCount,

    // Sessions are always allowed — content gates progress, not counts
    canStartSession:   true,
    sessionsRemaining: Infinity,
    weeklySessionCount: 0,  // backward-compat stub

    // Meeting prep still gated (1/week free)
    canStartPrep:  isPro || weeklyPrepCount < FREE_PREP_LIMIT,
    prepsRemaining: isPro ? Infinity : Math.max(0, FREE_PREP_LIMIT - weeklyPrepCount),

    refetch: fetchAll,
  }
}
