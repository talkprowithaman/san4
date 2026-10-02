// ─────────────────────────────────────────────────────────────────────────────
// Keeping a take. Only the take the user keeps is scored and saved: retries
// before that are never stored or counted. Used by the live Daily Rep screen
// and by the offline queue sync, so both paths credit a rep the same way.
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from './supabase'
import { track, EV } from './analytics'
import { getTodaysReps, saveRepCompletion } from './dailyReps'
import { fetchSan4Score, getLastMetrics, saveLastMetrics } from './san4Score'

export async function keepRep({ user, rep, analysis, seconds = 0, awardXP, date = new Date() }) {
  const scoreBefore = await fetchSan4Score(user?.id)
  const prevMetrics = getLastMetrics(user?.id)

  track(EV.REP_COMPLETED, { score: analysis.score, filler_count: analysis.filler_count ?? 0 })

  const done = saveRepCompletion(user?.id, rep.id, analysis.score, date)
  const isDayComplete = getTodaysReps(date).every(r => done.some(c => c.id === r.id))
  const xp = isDayComplete ? 35 : 20
  const reward = awardXP ? await awardXP(analysis.score, { fixedXP: xp }) : null

  if (user) {
    await supabase.from('practice_sessions').insert({
      user_id:           user.id,
      scenario_id:       'daily_rep',
      scenario_title:    `Daily Rep · ${rep.category}`,
      overall_score:     analysis.score,
      confidence_score:  analysis.score,
      pacing_score:      analysis.score,
      filler_word_count: analysis.filler_count ?? 0,
      duration_seconds:  Math.round(seconds),
      feedback:          analysis.win,
      action_item:       analysis.fix,
      messages:          [],
    }).then(() => {}, () => {})
  }

  const scoreAfter = await fetchSan4Score(user?.id)
  const metrics = {
    clarity:   Number.isFinite(analysis.clarity) ? analysis.clarity : null,
    structure: Number.isFinite(analysis.structure) ? analysis.structure : null,
  }
  if (metrics.clarity != null || metrics.structure != null) saveLastMetrics(user?.id, metrics)

  return { xp, reward, isDayComplete, scoreBefore, scoreAfter, metrics, prevMetrics }
}
