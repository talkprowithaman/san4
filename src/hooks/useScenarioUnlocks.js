import { useState, useEffect, useCallback } from 'react'
import { useAuth }    from './useAuth'
import { supabase }   from '../lib/supabase'
import { computeUnlocked, UNLOCK_RULES, SCENARIOS } from '../lib/progression'

export function useScenarioUnlocks() {
  const { user } = useAuth()
  const [bestScores,  setBestScores]  = useState({})
  const [unlockedSet, setUnlockedSet] = useState(() => computeUnlocked({}))
  const [loading,     setLoading]     = useState(true)

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return }
    setLoading(true)

    const { data } = await supabase
      .from('practice_sessions')
      .select('scenario_id, overall_score')
      .eq('user_id', user.id)

    // Best score per scenario
    const scores = {}
    data?.forEach(({ scenario_id, overall_score }) => {
      if (!scores[scenario_id] || overall_score > scores[scenario_id]) {
        scores[scenario_id] = overall_score
      }
    })

    setBestScores(scores)
    setUnlockedSet(computeUnlocked(scores))
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  // How many free levels the user has "passed" (scored >= passScore)
  const freePassed = SCENARIOS.filter(s => {
    if (!s.passScore) return false
    return (bestScores[s.id] || 0) >= s.passScore
  }).length

  // Highest level the user has reached (unlocked = in set)
  const highestLevel = SCENARIOS.reduce((max, s) => {
    return unlockedSet.has(s.id) ? Math.max(max, s.level) : max
  }, 0)

  return { bestScores, unlockedSet, loading, freePassed, highestLevel, refetch: load }
}
