// ─────────────────────────────────────────────────────────────────────────────
// Daily Reps — the atomic loop. One situation, 60 seconds of speaking, instant
// feedback. Three reps a day keeps the streak alive.
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

export function getTodaysReps(date = new Date()) {
  const seed = hashString(dayKey(date))
  const n = DAILY_REPS.length
  const start = seed % n
  const step = 1 + (seed % (n - 1))
  const picks = []
  const seen = new Set()
  // Bounded walk: a stride sharing a factor with n cycles over < 3 distinct
  // indices, so cap at n hops…
  for (let j = 0; j < n && picks.length < REPS_PER_DAY; j++) {
    const idx = (start + j * step) % n
    if (!seen.has(idx)) {
      seen.add(idx)
      picks.push(DAILY_REPS[idx])
    }
  }
  // …then fill any remainder linearly (deterministic, can't loop forever).
  for (let idx = 0; idx < n && picks.length < REPS_PER_DAY; idx++) {
    if (!seen.has(idx)) {
      seen.add(idx)
      picks.push(DAILY_REPS[idx])
    }
  }
  return picks
}

// ── Completion tracking (localStorage, per user per day) ─────────────────────
function completionKey(userId, date = new Date()) {
  return `san4_reps_${userId || 'guest'}_${dayKey(date)}`
}

export function getRepCompletions(userId) {
  try {
    return JSON.parse(localStorage.getItem(completionKey(userId)) || '[]')
  } catch {
    return []
  }
}

export function saveRepCompletion(userId, repId, score) {
  const done = getRepCompletions(userId).filter(c => c.id !== repId)
  done.push({ id: repId, score, at: Date.now() })
  try {
    localStorage.setItem(completionKey(userId), JSON.stringify(done))
  } catch { /* ignore */ }
  return done
}

export function getRep(repId) {
  return DAILY_REPS.find(r => r.id === repId) || null
}
