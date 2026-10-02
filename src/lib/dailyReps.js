// ─────────────────────────────────────────────────────────────────────────────
// Daily Reps — the atomic loop. One situation, 60 seconds of speaking, instant
// feedback. One rep a day keeps the streak alive.
//
// Cold start (Duolingo principle): day one is ONE rep. The second unlocks on
// day two of a streak and the third on day three, so the habit forms before
// the ask grows. Rep 1 is the shared "challenge of the day" (same for
// everyone); reps 2 and 3 are drawn from the categories that fit the user's
// onboarding goal.
//
// DRAFT prompt bank written in Aman's coaching voice — Aman refines/replaces.
// Format per rep: situation (context line), prompt (what Vak says aloud),
// focus (what the analyser rewards).
// ─────────────────────────────────────────────────────────────────────────────

export const DAILY_REPS = [
  // ── Assertiveness ──────────────────────────────────────────────────────────
  { id: 'r01', category: 'Assertiveness', emoji: '😤',
    situation: 'Your manager just presented your work as their own, right in front of the whole team.',
    prompt: 'The meeting ends in thirty seconds. Say something. Professional, not passive.',
    focus: 'assertiveness without aggression; owning credit calmly' },
  { id: 'r02', category: 'Assertiveness', emoji: '🙅',
    situation: 'Your manager asks you to work this weekend. For the third weekend in a row.',
    prompt: 'Say no. Without saying sorry, and without sounding lazy.',
    focus: 'firm boundary with a professional reason; no over-apologising' },
  { id: 'r03', category: 'Assertiveness', emoji: '⚖️',
    situation: 'Everyone in the meeting agrees with a plan you think will fail.',
    prompt: 'Disagree with the whole room. Clearly, without heat, in thirty seconds.',
    focus: 'respectful dissent; specific reason, calm tone' },
  { id: 'r04', category: 'Assertiveness', emoji: '🗣️',
    situation: 'A teammate keeps interrupting you in every meeting.',
    prompt: 'Pull them aside after the call and address it without making it awkward.',
    focus: 'direct feedback with warmth; no passive aggression' },

  // ── Interview ──────────────────────────────────────────────────────────────
  { id: 'r05', category: 'Interview', emoji: '💼',
    situation: 'Classic opener, with a twist.',
    prompt: "Tell me about yourself. But you're not allowed to say 'hardworking', 'passionate', or 'team player'.",
    focus: 'specificity over clichés; concrete examples' },
  { id: 'r06', category: 'Interview', emoji: '🚪',
    situation: 'The real reason you left your last job is a toxic boss.',
    prompt: 'Why did you leave your last job? Answer honestly, without badmouthing anyone.',
    focus: 'diplomacy; positive framing without lying' },
  { id: 'r07', category: 'Interview', emoji: '🧊',
    situation: 'The interviewer looks up from your resume, unimpressed.',
    prompt: "“You seem underqualified for this role.” Respond without getting defensive.",
    focus: 'composure under pressure; evidence over emotion' },
  { id: 'r08', category: 'Interview', emoji: '🏆',
    situation: 'Time to brag. Properly.',
    prompt: 'Describe your proudest achievement using numbers, not adjectives.',
    focus: 'quantified impact; structure (situation → action → result)' },

  // ── Money talk ─────────────────────────────────────────────────────────────
  { id: 'r09', category: 'Money', emoji: '💰',
    situation: 'Appraisal season. You know your worth.',
    prompt: 'Ask for a thirty percent raise. Out loud. With a straight face and two reasons.',
    focus: 'confidence; evidence-backed ask; no nervous laughter or hedging' },
  { id: 'r10', category: 'Money', emoji: '📞',
    situation: "You've been on hold with HR for twenty minutes. They finally pick up.",
    prompt: 'Explain the discrepancy in your salary credit in thirty seconds. Firm, but polite.',
    focus: 'clarity under irritation; crisp problem statement + ask' },

  // ── Everyday professional ──────────────────────────────────────────────────
  { id: 'r11', category: 'Workplace', emoji: '😬',
    situation: 'You made a mistake that cost your team two days of work.',
    prompt: 'Own it to your manager. No excuses, and no over-apologising either.',
    focus: 'accountability; solution-forward framing' },
  { id: 'r12', category: 'Workplace', emoji: '🛗',
    situation: "You're in the lift with your CEO. Forty seconds to the ground floor.",
    prompt: "They ask: 'So, what do you do here?' Go.",
    focus: 'crisp self-intro; energy; a memorable one-liner' },
  { id: 'r13', category: 'Workplace', emoji: '🤝',
    situation: 'Your client is angry on a call and talking over you.',
    prompt: 'Take back control of the conversation, calmly.',
    focus: 'de-escalation; acknowledging before redirecting' },
  { id: 'r14', category: 'Workplace', emoji: '🧑‍🏫',
    situation: 'A junior on your team got a lower rating than they expected.',
    prompt: 'They ask you why. Deliver the honest feedback with warmth.',
    focus: 'honesty + empathy; specific growth path' },
  { id: 'r15', category: 'Workplace', emoji: '⏱️',
    situation: 'Your VP has given you exactly two minutes.',
    prompt: "Give a project update they'll remember: the situation, the one number that matters, and what you need from them.",
    focus: 'brevity; leading with the outcome; a clear ask' },

  // ── Charm & clarity ────────────────────────────────────────────────────────
  { id: 'r16', category: 'Charm', emoji: '👵',
    situation: 'Family gathering. Your nani asks what you actually do all day.',
    prompt: 'Explain your job to your grandmother so she genuinely understands it.',
    focus: 'simplicity; zero jargon; analogy use' },
  { id: 'r17', category: 'Charm', emoji: '💍',
    situation: "A distant uncle at a wedding asks: 'Beta, what's your package?'",
    prompt: 'Deflect with grace and humour, without revealing the number or offending him.',
    focus: 'wit; social grace; redirection' },
  { id: 'r18', category: 'Charm', emoji: '📱',
    situation: 'Sales 101. The classic.',
    prompt: "Sell me the phone in your hand. You have forty-five seconds.",
    focus: 'persuasion; benefits over features; a closing line' },
  { id: 'r19', category: 'Charm', emoji: '🎤',
    situation: "Your best friend is winning an award, and you're the emcee.",
    prompt: 'Introduce them to the audience like a professional. Thirty seconds. Make them shine.',
    focus: 'storytelling; warmth; vocal energy' },
  { id: 'r20', category: 'Charm', emoji: '🎯',
    situation: 'Promotion committee meets tomorrow.',
    prompt: 'Pitch yourself for the promotion in exactly three sentences.',
    focus: 'ruthless brevity; impact-first framing' },
]

export const REPS_PER_DAY = 3
export const REP_MAX_SECONDS = 60

// ── Today's reps — deterministic per calendar day ─────────────────────────────
// Everyone gets the same 3 reps on a given day (shared experience → talkable,
// like Wordle), rotating through the whole bank.
function dayKey(d = new Date()) {
  return d.toLocaleDateString('en-CA') // YYYY-MM-DD, local time
}

function hashString(s) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

// Onboarding goal → the rep categories that serve it best.
export const GOAL_CATEGORIES = {
  placement: ['Interview', 'Money'],
  gd:        ['Assertiveness', 'Charm'],
  client:    ['Workplace', 'Assertiveness'],
  daily:     ['Charm', 'Workplace'],
}

// Deterministic stride walk over `pool`, seeded by `seedKey`.
function strideWalk(pool, seedKey, count, exclude = new Set()) {
  const n = pool.length
  if (n === 0) return []
  const seed = hashString(seedKey)
  const start = seed % n
  const step = n > 1 ? 1 + (seed % (n - 1)) : 1
  const picks = []
  const seen = new Set()
  // Bounded walk: a stride sharing a factor with n cycles over fewer indices,
  // so cap at n hops…
  for (let j = 0; j < n && picks.length < count; j++) {
    const idx = (start + j * step) % n
    if (!seen.has(idx) && !exclude.has(pool[idx].id)) { seen.add(idx); picks.push(pool[idx]) }
  }
  // …then fill any remainder linearly (deterministic, can't loop forever).
  for (let idx = 0; idx < n && picks.length < count; idx++) {
    if (!seen.has(idx) && !exclude.has(pool[idx].id)) { seen.add(idx); picks.push(pool[idx]) }
  }
  return picks
}

// The challenge of the day: everyone gets the same one (talkable, like Wordle).
export function getDailyChallenge(date = new Date()) {
  return strideWalk(DAILY_REPS, dayKey(date), 1)[0]
}

// Today's reps. Rep 1 is shared; reps 2 and 3 follow the user's goal.
export function getTodaysReps(date = new Date(), goal = getGoal()) {
  const first = getDailyChallenge(date)
  const cats = GOAL_CATEGORIES[goal]
  const pool = cats ? DAILY_REPS.filter(r => cats.includes(r.category)) : DAILY_REPS
  const rest = strideWalk(pool, `${dayKey(date)}:${goal || 'any'}`, REPS_PER_DAY - 1, new Set([first.id]))
  if (rest.length < REPS_PER_DAY - 1) {
    const taken = new Set([first.id, ...rest.map(r => r.id)])
    rest.push(...strideWalk(DAILY_REPS, `${dayKey(date)}:fill`, REPS_PER_DAY - 1 - rest.length, taken))
  }
  return [first, ...rest]
}

// How many of today's reps are open. Streak days completed BEFORE today
// decide it: 0 → 1 rep, 1 → 2 reps, 2+ → all 3.
export function repsUnlockedToday(progress, date = new Date()) {
  const streak = progress?.streak_count || 0
  const last = (progress?.last_practice_date || '').slice(0, 10)
  const today = dayKey(date)
  const yesterday = dayKey(new Date(date.getTime() - 86_400_000))
  let before = 0
  if (last === today) before = Math.max(0, streak - 1)
  else if (last === yesterday) before = streak
  return Math.min(REPS_PER_DAY, before + 1)
}

// ── Onboarding goal (placement | gd | client | daily) ───────────────────────
const GOAL_KEY = 'san4_goal'
export function getGoal() {
  try { return localStorage.getItem(GOAL_KEY) || null } catch { return null }
}
export function setGoal(goal) {
  try { localStorage.setItem(GOAL_KEY, goal) } catch { /* ignore */ }
}

// ── Completion tracking (localStorage, per user per day) ─────────────────────
function completionKey(userId, date = new Date()) {
  return `san4_reps_${userId || 'guest'}_${dayKey(date)}`
}

export function getRepCompletions(userId, date = new Date()) {
  try {
    return JSON.parse(localStorage.getItem(completionKey(userId, date)) || '[]')
  } catch {
    return []
  }
}

export function saveRepCompletion(userId, repId, score, date = new Date()) {
  const done = getRepCompletions(userId, date).filter(c => c.id !== repId)
  done.push({ id: repId, score, at: Date.now() })
  try {
    localStorage.setItem(completionKey(userId, date), JSON.stringify(done))
  } catch { /* ignore */ }
  return done
}

export function getRep(repId) {
  return DAILY_REPS.find(r => r.id === repId) || null
}
