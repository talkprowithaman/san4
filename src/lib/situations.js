// ── Daily Situations — rotate by day-of-year ──────────────────────────────────
// 30 situations; index = dayOfYear % 30

export const SITUATIONS = [
  {
    id:       's01',
    text:     'Your manager stops you in the corridor: "Quick update — how\'s the project going?" You have 30 seconds.',
    category: 'Workplace',
    icon:     '🏢',
    tip:      'Lead with your status in one sentence, then add the one biggest blocker or win.',
  },
  {
    id:       's02',
    text:     'You\'re at a dinner and seated next to a senior industry leader you\'ve never met. They turn to you: "So — what do you do?"',
    category: 'Networking',
    icon:     '🍽️',
    tip:      'Skip the job title. Lead with the problem you solve or the impact you create.',
  },
  {
    id:       's03',
    text:     'A colleague just interrupted you for the third time in a team meeting. It\'s your turn to speak again. Reclaim the floor — clearly, without aggression.',
    category: 'Assertiveness',
    icon:     '🗣️',
    tip:      'Name what happened without drama: "I wasn\'t done — let me finish." Then continue.',
  },
  {
    id:       's04',
    text:     'Your client calls frustrated: "I expected the deliverable yesterday. What happened?" Respond without making excuses.',
    category: 'Professional',
    icon:     '📞',
    tip:      'Acknowledge, take responsibility briefly, and pivot immediately to your solution and new timeline.',
  },
  {
    id:       's05',
    text:     'You\'re introduced on stage to give a 3-minute talk — but nobody told you what to speak about until 10 seconds ago. The topic: "What I wish I had known earlier in my career."',
    category: 'Public Speaking',
    icon:     '🎤',
    tip:      'Pick ONE story. One lesson. One call to action. Don\'t try to cover everything.',
  },
  {
    id:       's06',
    text:     'Your boss asks you to handle a task that\'s clearly outside your role and you\'re already overloaded. Say no — professionally and without burning the relationship.',
    category: 'Assertiveness',
    icon:     '🚫',
    tip:      'Offer context (what you\'re currently handling), then suggest alternatives — not just a flat "no".',
  },
  {
    id:       's07',
    text:     'You\'ve just joined a WhatsApp group call with 8 senior executives. Someone asks: "Can you quickly explain what your team does and why it matters to us?"',
    category: 'Executive Communication',
    icon:     '📱',
    tip:      'Business impact first. Department name last. One sentence per idea.',
  },
  {
    id:       's08',
    text:     'A junior team member is consistently late on deadlines. You need to give them feedback without demotivating them.',
    category: 'Leadership',
    icon:     '👤',
    tip:      'Separate the behaviour from the person. Describe the impact, ask for their perspective, then agree on a fix.',
  },
  {
    id:       's09',
    text:     'You\'re at a job interview. The interviewer asks: "Tell me about a time you completely failed at something."',
    category: 'Interview',
    icon:     '💼',
    tip:      'Use STAR but end on what you learned and how it changed your approach. The failure is not the story — the growth is.',
  },
  {
    id:       's10',
    text:     'Your friend asks you to explain your job to their 10-year-old child. Go.',
    category: 'Clarity',
    icon:     '🧒',
    tip:      'No jargon. Analogies only. "It\'s like being the person who..." Usually reveals how well you actually understand your own work.',
  },
  {
    id:       's11',
    text:     'You\'ve been asked to kick off a team meeting that has no clear agenda. People are waiting. Start it.',
    category: 'Leadership',
    icon:     '📋',
    tip:      'State the goal of the meeting in one sentence. Then get everyone oriented: "We have 30 minutes. Let\'s cover X, Y, Z."',
  },
  {
    id:       's12',
    text:     'Someone in a social gathering asks about a topic you know nothing about. They expect you to have an opinion. Respond honestly without losing credibility.',
    category: 'Social',
    icon:     '🎭',
    tip:      '"I haven\'t followed this closely — help me understand your take?" is the smartest thing you can say.',
  },
  {
    id:       's13',
    text:     'You disagree with your manager\'s decision in front of the team. You need to push back — diplomatically, without undermining their authority.',
    category: 'Workplace',
    icon:     '⚖️',
    tip:      'Ask questions before stating your view. "What would help me understand this better is — what\'s the trade-off we\'re accepting here?"',
  },
  {
    id:       's14',
    text:     'A recruiter calls out of the blue: "I have 2 minutes — why should my client hire you over everyone else?" Go.',
    category: 'Career',
    icon:     '📲',
    tip:      'This is a pitch, not a resume recap. Lead with your unique angle, not your years of experience.',
  },
  {
    id:       's15',
    text:     'You\'re presenting data to a non-technical audience. One person says: "I don\'t understand these numbers. What does this actually mean for our business?"',
    category: 'Communication',
    icon:     '📊',
    tip:      'Translate numbers into consequences: not "revenue is down 12%" but "we\'ll need to reduce headcount if this continues."',
  },
  {
    id:       's16',
    text:     'You need to apologise to a client for a mistake your team made. Make it genuine, not corporate.',
    category: 'Professional',
    icon:     '🙏',
    tip:      'Name the specific mistake. Take clear ownership. State what changes going forward. No "sorry if you felt..."',
  },
  {
    id:       's17',
    text:     'Someone at a networking event says: "I\'ve heard of your company, but I\'m not sure what you actually do." Explain it in under 60 seconds.',
    category: 'Networking',
    icon:     '🌐',
    tip:      'Problem → solution → who you serve → one result. That\'s the formula.',
  },
  {
    id:       's18',
    text:     'Your team is demoralized after a tough quarter. You\'re their team lead. Give them a short, genuine pep talk — not corporate fluff.',
    category: 'Leadership',
    icon:     '💪',
    tip:      'Acknowledge the difficulty first. Never skip over the hard part. Then reframe around what\'s in their control.',
  },
  {
    id:       's19',
    text:     'Someone asks you to recommend a book that changed how you think. You haven\'t read anything recent. Be honest and interesting at the same time.',
    category: 'Social',
    icon:     '📚',
    tip:      'The best answer is often a genuine story about how you learned something, even without a book.',
  },
  {
    id:       's20',
    text:     'You\'re leaving a voicemail for someone very senior who doesn\'t know you. You have 30 seconds. Make them want to call back.',
    category: 'Professional',
    icon:     '📟',
    tip:      'Name + why they should care + specific ask + callback number. In that order. No small talk.',
  },
  {
    id:       's21',
    text:     'A new joiner asks you: "What do I actually need to know to survive here — not the official answer?" Give them the real picture.',
    category: 'Mentoring',
    icon:     '🧭',
    tip:      'The most memorable advice is always specific to your actual experience, not generic career wisdom.',
  },
  {
    id:       's22',
    text:     'You\'re on a panel. Someone asks a question you genuinely don\'t know the answer to — in front of 200 people.',
    category: 'Public Speaking',
    icon:     '🎙️',
    tip:      '"That\'s a genuinely great question and I want to give you an accurate answer, not a fast one — can I follow up?" is always an option.',
  },
  {
    id:       's23',
    text:     'A difficult conversation you\'ve been avoiding for weeks. Someone you work closely with has a hygiene issue affecting the team. Address it.',
    category: 'Sensitive',
    icon:     '💬',
    tip:      'Private. Kind. Direct. Brief. "I\'m raising this because I respect you and I wanted you to hear it from me, not someone else."',
  },
  {
    id:       's24',
    text:     'You\'re pitching your startup idea at a dinner to a potential early investor. They\'ve given you 90 seconds.',
    category: 'Entrepreneurship',
    icon:     '🚀',
    tip:      'Problem (10 sec) → solution (15 sec) → why now, why you (20 sec) → traction (10 sec) → the ask (5 sec).',
  },
  {
    id:       's25',
    text:     'A heated argument is breaking out between two people at a family gathering. You\'re in the middle. Step in — without taking sides.',
    category: 'Social',
    icon:     '🏠',
    tip:      'Interrupt the pattern, not the people. "Can we just take a breath for a second?" Then redirect to the underlying need, not the position.',
  },
  {
    id:       's26',
    text:     'You\'ve been asked to give an honest reference call for someone who\'s good but not great. Be truthful and fair without damaging their chances unfairly.',
    category: 'Ethics',
    icon:     '🤝',
    tip:      'Speak to what they genuinely excel at. For gaps, frame them as "they\'re still developing in X" — specific and honest.',
  },
  {
    id:       's27',
    text:     'You\'re ending a meeting that has run over time with nothing resolved. Wrap it up in a way that makes the time feel worthwhile.',
    category: 'Facilitation',
    icon:     '⏰',
    tip:      'Summarise the 1–2 decisions made, name who owns the next step, and confirm the follow-up date. End with energy.',
  },
  {
    id:       's28',
    text:     'Someone is clearly unhappy with your work but is being passive-aggressive instead of direct. Draw the real issue out — calmly.',
    category: 'EQ',
    icon:     '🧠',
    tip:      '"I can sense something\'s off — I\'d rather address it directly than let it sit. What\'s actually bothering you?"',
  },
  {
    id:       's29',
    text:     'You\'ve just been promoted. Your first team meeting as the new manager. Several team members are older than you. Open the meeting.',
    category: 'Leadership',
    icon:     '👑',
    tip:      'Don\'t assert authority — earn it. Start by listening. "Before I share my thoughts, I want to understand what\'s working for you and what isn\'t."',
  },
  {
    id:       's30',
    text:     'You\'re on a date and your date asks: "What\'s something about yourself that surprises people?" Answer honestly — not the rehearsed version.',
    category: 'Social',
    icon:     '✨',
    tip:      'The question is a test for self-awareness, not for impressiveness. The honest, slightly vulnerable answer always wins.',
  },
]

// ── Get today's situation ─────────────────────────────────────────────────────
export function getTodaySituation() {
  const now        = new Date()
  const start      = new Date(now.getFullYear(), 0, 0)
  const dayOfYear  = Math.floor((now - start) / 86400000)
  return SITUATIONS[dayOfYear % SITUATIONS.length]
}

// ── localStorage key for today ────────────────────────────────────────────────
export function getDailyChallengeKey() {
  const d = new Date()
  return `san4_daily_${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

export function isDailyChallengeDone() {
  return !!localStorage.getItem(getDailyChallengeKey())
}

export function markDailyChallengeDone() {
  localStorage.setItem(getDailyChallengeKey(), '1')
}
