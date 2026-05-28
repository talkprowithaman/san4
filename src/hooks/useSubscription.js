import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth }  from './useAuth'

// ── Limits ───────────────────────────────────────────────────────────────────
export const FREE_SESSION_LIMIT = 3   // per week
export const FREE_PREP_LIMIT    = 1   // per week

// Scenarios available on the free tier
export const FREE_SCENARIO_IDS = ['hr_interview', 'social_conversation', 'team_meeting']

function getWeekStart() {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay()) // back to Sunday
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useSubscription() {
  const { user } = useAuth()

  const [plan,             setPlan]    = useState(null)   // 'free' | 'pro' | 'pro_plus'
  const [weeklySessionCount, setWsc]   = useState(0)
  const [weeklyPrepCount,    setWpc]   = useState(0)
  const [loading,          setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    if (!user) { setLoading(false); return }

    const weekStart = getWeekStart()

    const [subRes, sessRes, prepRes] = await Promise.all([
      supabase
        .from('subscriptions')
        .select('plan')
        .eq('user_id', user.id)
        .single(),

      supabase
        .from('practice_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', weekStart),

      supabase
        .from('meeting_preps')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', weekStart),
    ])

    setPlan(subRes.data?.plan || 'free')
    setWsc(sessRes.count  || 0)
    setWpc(prepRes.count  || 0)
    setLoading(false)
  }, [user])

  useEffect(() => { fetchAll() }, [fetchAll])

  const isPro     = plan === 'pro' || plan === 'pro_plus'
  const isProPlus = plan === 'pro_plus'

  return {
    plan,
    isPro,
    isProPlus,
    loading,

    // Weekly counters
    weeklySessionCount,
    weeklyPrepCount,

    // Can they start right now?
    canStartSession: isPro || weeklySessionCount < FREE_SESSION_LIMIT,
    canStartPrep:    isPro || weeklyPrepCount    < FREE_PREP_LIMIT,

    // How many remain
    sessionsRemaining: isPro
      ? Infinity
      : Math.max(0, FREE_SESSION_LIMIT - weeklySessionCount),
    prepsRemaining:    isPro
      ? Infinity
      : Math.max(0, FREE_PREP_LIMIT - weeklyPrepCount),

    refetch: fetchAll,
  }
}
