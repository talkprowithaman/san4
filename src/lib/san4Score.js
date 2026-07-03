// ─────────────────────────────────────────────────────────────────────────────
// The San4 Score — one number for how you communicate.
//
// The anchor of the whole product: a CIBIL-style score for spoken
// communication that users can show on LinkedIn and their CV. It is
// language-agnostic (it scores HOW you communicate, not your English) and it
// is a LIVING number: seeded by the assessment's communication axis, then
// continuously updated by every rep and practice session.
//
// v1 blend: 40% latest assessment communication score (if taken) +
// 60% recency-weighted average of the last 10 scored activities.
// ─────────────────────────────────────────────────────────────────────────────

export const SCORE_BANDS = [
  { min: 85, name: 'Influential', color: '#10B981', blurb: 'People act on what you say.' },
  { min: 70, name: 'Confident',   color: '#00C49A', blurb: 'Clear, assured, listened to.' },
  { min: 55, name: 'Clear',       color: '#F59E0B', blurb: 'Understood, with rough edges.' },
  { min: 40, name: 'Developing',  color: '#FB923C', blurb: 'The base is there. Build on it.' },
  { min: 0,  name: 'Hesitant',    color: '#F87171', blurb: 'Every rep from here counts double.' },
]

export function scoreBand(score) {
  return SCORE_BANDS.find(b => score >= b.min) || SCORE_BANDS[SCORE_BANDS.length - 1]
}

// ── Latest assessment communication score (saved by Assessment.jsx) ──────────
const commKey = (userId) => `san4_comm_${userId || 'guest'}`

export function saveCommScore(userId, score) {
  try { localStorage.setItem(commKey(userId), String(score)) } catch { /* ignore */ }
}

export function getCommScore(userId) {
  try {
    const n = parseInt(localStorage.getItem(commKey(userId)) || '', 10)
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

// ── The score itself ──────────────────────────────────────────────────────────
// sessions: rows with overall_score (newest first, as Dashboard/Today fetch).
// Returns null when there's nothing to score yet (no fabricated numbers).
export function computeSan4Score(sessions = [], userId) {
  const scored = sessions
    .filter(s => Number.isFinite(s?.overall_score) && s.overall_score > 0)
    .slice(0, 10)

  let recentAvg = null
  if (scored.length > 0) {
    // Recency weights: newest counts most (10, 9, 8, …)
    let sum = 0
    let wsum = 0
    scored.forEach((s, i) => {
      const w = 10 - i
      sum += s.overall_score * w
      wsum += w
    })
    recentAvg = sum / wsum
  }

  const comm = getCommScore(userId)

  if (recentAvg == null && comm == null) return null
  if (recentAvg == null) return Math.round(comm)
  if (comm == null) return Math.round(recentAvg)
  return Math.round(0.4 * comm + 0.6 * recentAvg)
}
