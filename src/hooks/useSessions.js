import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './useAuth'
import { useProgress } from './useProgress'
import { computeSan4Score } from '../lib/san4Score'
import { getRep, getRepCompletions } from '../lib/dailyReps'
import { analyzeDailyRep } from '../lib/gemini'
import { keepRep } from '../lib/repScoring'
import { listTakes, deleteTake, isOnline } from '../lib/offlineQueue'

const dayKey = (d) => new Date(d).toLocaleDateString('en-CA')

// Recent practice history, plus everything Today / Streak / Me derive from it:
// the live San4 Score, which days were practised, minutes spoken this week.
export function useSessions(days = 45) {
  const { user } = useAuthStore()
  const [rows, setRows] = useState(null)
  const [stats, setStats] = useState({ total: 0, first: null, last10: [] })

  const load = useCallback(async () => {
    if (!user) { setRows([]); return }
    const since = new Date(Date.now() - days * 86_400_000).toISOString()
    const [recent, all, first, last10] = await Promise.all([
      supabase.from('practice_sessions')
        .select('scenario_id, overall_score, duration_seconds, created_at')
        .eq('user_id', user.id).gte('created_at', since)
        .order('created_at', { ascending: false }).limit(400),
      supabase.from('practice_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id).gt('overall_score', 0),
      supabase.from('practice_sessions')
        .select('created_at').eq('user_id', user.id)
        .order('created_at', { ascending: true }).limit(1),
      supabase.from('practice_sessions')
        .select('overall_score').eq('user_id', user.id)
        .order('created_at', { ascending: false }).limit(10),
    ]).catch(() => [{}, {}, {}, {}])
    setRows(recent?.data || [])
    setStats({ total: all?.count || 0, first: first?.data?.[0]?.created_at || null, last10: last10?.data || [] })
  }, [user, days])

  useEffect(() => { load() }, [load])

  const list = rows || []
  // The score uses the last 10 scored rows, whatever their age.
  const score = rows ? computeSan4Score(stats.last10, user?.id) : null

  const practiceDays = new Set(list.map(r => dayKey(r.created_at)))
  // Local rep completions also count (a kept rep is a practised day even if
  // the history insert hasn't landed yet).
  for (let i = 0; i < 7; i++) {
    const d = new Date(Date.now() - i * 86_400_000)
    if (getRepCompletions(user?.id, d).length) practiceDays.add(dayKey(d))
  }

  const weekStart = new Date(); weekStart.setHours(0, 0, 0, 0)
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7)) // Monday
  const secondsThisWeek = list
    .filter(r => new Date(r.created_at) >= weekStart)
    .reduce((a, r) => a + (r.duration_seconds || 0), 0)

  return {
    loading: rows === null,
    rows: list,
    score,
    practiceDays,
    minutesThisWeek: Math.round(secondsThisWeek / 60),
    sessionsTotal: stats.total,
    firstSessionAt: stats.first,
    refetch: load,
  }
}

// Scores takes recorded with "Record now, score on wifi" once a connection is
// back. Each take is credited to the day it was recorded, then deleted from
// the phone.
export function useOfflineSync(onSynced) {
  const { user } = useAuthStore()
  const { awardXP } = useProgress()
  const [pending, setPending] = useState(0)

  const sync = useCallback(async () => {
    if (!user) return
    const takes = await listTakes(user.id)
    setPending(takes.length)
    if (!takes.length || !isOnline()) return
    let done = 0
    for (const take of takes) {
      const rep = getRep(take.repId)
      if (!rep) { await deleteTake(take.id); continue }
      try {
        const buf = await take.blob.arrayBuffer()
        const bytes = new Uint8Array(buf); let bin = ''
        for (let i = 0; i < bytes.length; i += 8192) bin += String.fromCharCode(...bytes.subarray(i, i + 8192))
        const analysis = await analyzeDailyRep(rep, btoa(bin), take.mimeType)
        if (!analysis) continue // keep it; try again next time
        await keepRep({ user, rep, analysis, seconds: take.seconds, awardXP, date: new Date(take.recordedAt) })
        await deleteTake(take.id)
        done++
      } catch (e) {
        console.warn('offline take sync failed:', e?.message)
      }
    }
    setPending((await listTakes(user.id)).length)
    if (done) onSynced?.(done)
  }, [user]) // eslint-disable-line

  useEffect(() => {
    sync()
    window.addEventListener('online', sync)
    return () => window.removeEventListener('online', sync)
  }, [sync])

  return { pending }
}
