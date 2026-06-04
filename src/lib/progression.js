// ─────────────────────────────────────────────────────────────────────────────
// progression.js — single source of truth for the scenario unlock chain
//
// Strategy: PUBG-style skill ladder. Levels 1–10 are free but must be
// *earned* by scoring above the pass threshold in the previous level.
// By the time a user reaches level 10 they are invested — and the Summit
// (levels 11–14) is waiting one subscription away.
// ─────────────────────────────────────────────────────────────────────────────

// ── Unlock rules ──────────────────────────────────────────────────────────────
// Passing `id` with at least `passScore` adds every scenario in `unlocks[]`
// to the user's unlocked set. Multiple rules can unlock the same scenario
// (e.g. either Level 1 OR Level 2 unlocks Level 3).
export const UNLOCK_RULES = [
  { id: 'hr_interview',           passScore: 65, unlocks: ['team_meeting'] },
  { id: 'social_conversation',    passScore: 65, unlocks: ['team_meeting'] },
  { id: 'team_meeting',           passScore: 68, unlocks: ['performance_review'] },
  { id: 'performance_review',     passScore: 70, unlocks: ['gd_round'] },
  { id: 'gd_round',               passScore: 72, unlocks: ['salary_negotiation'] },
  { id: 'salary_negotiation',     passScore: 74, unlocks: ['say_no_professionally'] },
  { id: 'say_no_professionally',  passScore: 76, unlocks: ['client_presentation'] },
  { id: 'client_presentation',    passScore: 78, unlocks: ['cold_networking'] },
  { id: 'cold_networking',        passScore: 80, unlocks: ['leadership_update'] },
  { id: 'leadership_update',      passScore: 82, unlocks: [] }, // free-tier summit
]

// Always unlocked (no prerequisite)
export const ALWAYS_FREE = new Set(['hr_interview', 'social_conversation'])

// Given a map of { scenarioId → bestScore }, return the full set of unlocked IDs
export function computeUnlocked(bestScores = {}) {
  const unlocked = new Set(ALWAYS_FREE)
  UNLOCK_RULES.forEach(({ id, passScore, unlocks }) => {
    if ((bestScores[id] || 0) >= passScore) unlocks.forEach(u => unlocked.add(u))
  })
  return unlocked
}

// ── Scenario catalogue ────────────────────────────────────────────────────────
export const SCENARIOS = [
  // ── ⛺ BASE CAMP ─────────────────────────────────────────────────────────
  {
    id: 'hr_interview', level: 1, icon: '💼', title: 'HR Interview',
    desc: '"Tell me about yourself." Handle competency questions with structure and confidence.',
    passScore: 65, tier: 'always_free', zone: 'base',
    xpOnPass: 75, color: '#3B82F6', difficulty: 1,
    tags: ['Job seekers', 'Foundational'],
    unlockHint: 'Score 65%+ to unlock Daily Standup (Level 3)',
  },
  {
    id: 'social_conversation', level: 2, icon: '💬', title: 'Intro Pitch',
    desc: 'Introduce yourself at a professional event. Confident, warm, genuinely interesting.',
    passScore: 65, tier: 'always_free', zone: 'base',
    xpOnPass: 75, color: '#3B82F6', difficulty: 1,
    tags: ['Social confidence', 'Networking'],
    unlockHint: 'Score 65%+ to unlock Daily Standup (Level 3)',
  },

  // ── 🌲 LOWER SLOPES ──────────────────────────────────────────────────────
  {
    id: 'team_meeting', level: 3, icon: '👥', title: 'Daily Standup',
    desc: 'Communicate your update in a team standup. No rambling — outcomes first.',
    passScore: 68, tier: 'unlock', zone: 'lower',
    xpOnPass: 100, color: '#00C49A', difficulty: 1,
    tags: ['Workplace', 'Teams'],
    prereqDisplay: 'Level 1 or 2 · 65%+',
    unlockHint: 'Score 68%+ to unlock Performance Review (Level 4)',
  },
  {
    id: 'performance_review', level: 4, icon: '⭐', title: 'Performance Review',
    desc: 'Advocate for yourself in your annual review. Own your wins with specific evidence.',
    passScore: 70, tier: 'unlock', zone: 'lower',
    xpOnPass: 110, color: '#00C49A', difficulty: 2,
    tags: ['Career growth', 'High stakes'],
    prereqDisplay: 'Level 3 · 68%+',
    unlockHint: 'Score 70%+ to unlock Group Discussion (Level 5)',
  },
  {
    id: 'gd_round', level: 5, icon: '🗣️', title: 'Group Discussion',
    desc: 'MBA and placement GD rounds. Structure arguments, listen, invite counter-arguments.',
    passScore: 72, tier: 'unlock', zone: 'lower',
    xpOnPass: 125, color: '#00C49A', difficulty: 2,
    tags: ['MBA aspirants', 'Placements'],
    prereqDisplay: 'Level 4 · 70%+',
    unlockHint: 'Score 72%+ to unlock Salary Negotiation (Level 6)',
  },

  // ── ⛰️ HIGH CAMP ──────────────────────────────────────────────────────────
  {
    id: 'salary_negotiation', level: 6, icon: '💰', title: 'Salary Negotiation',
    desc: 'Negotiate your package confidently against HR with real budget constraints.',
    passScore: 74, tier: 'unlock', zone: 'high',
    xpOnPass: 150, color: '#FF6B35', difficulty: 3,
    tags: ['High stakes', 'All levels'],
    prereqDisplay: 'Level 5 · 72%+',
    unlockHint: 'Score 74%+ to unlock Level 7',
  },
  {
    id: 'say_no_professionally', level: 7, icon: '🚫', title: 'Say No Professionally',
    desc: 'Push back on unreasonable demands from your boss or client. Firm, polite, no bridges burned.',
    passScore: 76, tier: 'unlock', zone: 'high',
    xpOnPass: 165, color: '#FF6B35', difficulty: 2,
    tags: ['Assertiveness', 'Workplace'],
    prereqDisplay: 'Level 6 · 74%+',
    unlockHint: 'Score 76%+ to unlock Level 8',
  },
  {
    id: 'client_presentation', level: 8, icon: '📊', title: 'Client Objections',
    desc: 'Present your proposal to a skeptical enterprise client. Handle tough objections with data.',
    passScore: 78, tier: 'unlock', zone: 'high',
    xpOnPass: 180, color: '#FF6B35', difficulty: 3,
    tags: ['Consultants', 'Sales'],
    prereqDisplay: 'Level 7 · 76%+',
    unlockHint: 'Score 78%+ to unlock Level 9',
  },

  // ── 🏔️ SUMMIT APPROACH ──────────────────────────────────────────────────
  {
    id: 'cold_networking', level: 9, icon: '🤝', title: 'Cold Networking',
    desc: 'Walk up to a VIP at a professional event and make yourself genuinely memorable.',
    passScore: 80, tier: 'unlock', zone: 'summit_approach',
    xpOnPass: 200, color: '#8B5CF6', difficulty: 3,
    tags: ['Networking', 'Career growth'],
    prereqDisplay: 'Level 8 · 78%+',
    unlockHint: 'Score 80%+ to unlock Leadership Update — the free-tier summit',
  },
  {
    id: 'leadership_update', level: 10, icon: '📈', title: 'Leadership Update',
    desc: 'Give a crisp 2-minute briefing to a CXO. No fluff. Bottom line first. The ultimate free challenge.',
    passScore: 82, tier: 'unlock', zone: 'summit_approach',
    xpOnPass: 225, color: '#8B5CF6', difficulty: 3,
    tags: ['Executive presence', 'Corporate'],
    prereqDisplay: 'Level 9 · 80%+',
    unlockHint: null,
    isSummit: true,
  },

  // ── 👑 THE SUMMIT (Pro) ──────────────────────────────────────────────────
  {
    id: 'pitch_skeptic', level: 11, icon: '🎯', title: 'Pitch to a Skeptic',
    desc: 'Convince a defensive, budget-conscious stakeholder with data, empathy, and precision.',
    passScore: null, tier: 'pro', zone: 'pro',
    xpOnPass: 225, color: '#F59E0B', difficulty: 3,
    tags: ['Influence', 'Strategy'],
  },
  {
    id: 'conflict_mediation', level: 12, icon: '⚖️', title: 'Conflict Mediation',
    desc: 'Two colleagues at war. You are the team lead — de-escalate without choosing sides.',
    passScore: null, tier: 'pro', zone: 'pro',
    xpOnPass: 225, color: '#F59E0B', difficulty: 3,
    tags: ['Leadership', 'Team dynamics'],
  },
  {
    id: 'sensitive_conversation', level: 13, icon: '💬', title: 'Sensitive Conversation',
    desc: 'Raise a difficult topic — feedback, a personal issue, an uncomfortable truth — with care.',
    passScore: null, tier: 'pro', zone: 'pro',
    xpOnPass: 225, color: '#F59E0B', difficulty: 2,
    tags: ['EQ', 'Relationships'],
  },
  {
    id: 'first_date', level: 14, icon: '❤️', title: 'First Date',
    desc: 'Build genuine, flowing conversation on a first date. No scripts — just authentic you.',
    passScore: null, tier: 'pro', zone: 'pro',
    xpOnPass: 225, color: '#F59E0B', difficulty: 2,
    tags: ['Social confidence', 'Relationships'],
  },
]

// ── Zone display metadata ─────────────────────────────────────────────────────
export const ZONES = [
  {
    key: 'base',
    icon: '⛺', label: 'BASE CAMP',
    sub: 'Free · Always unlocked · Start your climb here',
    color: '#3B82F6', bg: 'rgba(59,130,246,0.07)',
    border: 'rgba(59,130,246,0.25)',
  },
  {
    key: 'lower',
    icon: '🌲', label: 'LOWER SLOPES',
    sub: 'Free · Unlock by passing the previous level',
    color: '#00C49A', bg: 'rgba(0,196,154,0.07)',
    border: 'rgba(0,196,154,0.25)',
  },
  {
    key: 'high',
    icon: '⛰️', label: 'HIGH CAMP',
    sub: 'Free · High stakes. The climb gets serious.',
    color: '#FF6B35', bg: 'rgba(255,107,53,0.07)',
    border: 'rgba(255,107,53,0.25)',
  },
  {
    key: 'summit_approach',
    icon: '🏔️', label: 'SUMMIT APPROACH',
    sub: 'Free · Elite territory. Very few make it here.',
    color: '#8B5CF6', bg: 'rgba(139,92,246,0.07)',
    border: 'rgba(139,92,246,0.25)',
  },
  {
    key: 'pro',
    icon: '👑', label: 'THE SUMMIT',
    sub: 'Vak Pro · ₹299/month · Where legends speak',
    color: '#F59E0B', bg: 'rgba(245,158,11,0.07)',
    border: 'rgba(245,158,11,0.35)',
    isPro: true,
  },
]
