// ── Micro-drill prompts ───────────────────────────────────────────────────────

// BLUF = Bottom Line Up Front: explain a complex situation starting with the conclusion

export const BLUF_SITUATIONS = [
  {
    id: 'b01',
    situation: 'Your Q3 sales were down 18% vs target. The reason: a product bug affected the checkout flow for 3 weeks. It\'s now fixed, and the pipeline for Q4 looks strong. Explain this to your CEO — lead with the bottom line.',
    context: 'CEO briefing',
  },
  {
    id: 'b02',
    situation: 'Your team missed a deadline because two engineers were sick and a third was pulled into another project by HR without your knowledge. The client hasn\'t noticed yet. Explain to your VP what happened — lead with the bottom line.',
    context: 'VP escalation',
  },
  {
    id: 'b03',
    situation: 'You did a 3-month analysis of your company\'s customer support data. Key finding: 64% of all tickets are about the same 3 issues, which could be fixed with better onboarding documentation. Explain to the Head of Product — lead with the bottom line.',
    context: 'Product team briefing',
  },
  {
    id: 'b04',
    situation: 'A vendor you\'ve been working with for 2 years is raising prices by 30%. You\'ve found two alternatives — one cheaper but untested, one 10% more expensive but reliable. You recommend the reliable one. Explain to your manager — lead with your recommendation first.',
    context: 'Procurement decision',
  },
  {
    id: 'b05',
    situation: 'You ran a marketing campaign that cost ₹5 lakhs and brought in ₹3 lakhs of direct revenue — apparently a loss. But it also generated 450 new email signups, 12 enterprise leads, and 3 media mentions. Explain the full picture to the CFO — lead with your overall assessment.',
    context: 'CFO debrief',
  },
  {
    id: 'b06',
    situation: 'Your startup\'s runway is currently 8 months. You\'ve identified two options: cut costs and extend to 14 months but slow growth, or raise a bridge round now while you still have leverage. You prefer the bridge round. Pitch this to your co-founder — lead with your recommendation.',
    context: 'Founder discussion',
  },
  {
    id: 'b07',
    situation: 'A team member you value highly has received a competing offer and is likely to leave in 2 weeks if you don\'t act. HR says there\'s a 10% budget for a counter-offer. You think you need at least 20% to retain them. Explain the situation to your Director — lead with the urgency.',
    context: 'Retention emergency',
  },
  {
    id: 'b08',
    situation: 'Your new app feature launched 2 weeks ago. Daily active users are up 12%, but your support ticket volume also doubled. Deeper analysis shows the feature is loved but confusing to new users specifically. Explain to your CTO — lead with the key insight.',
    context: 'Product post-launch',
  },
  {
    id: 'b09',
    situation: 'You just learned that a major competitor is about to launch a product that directly overlaps with your roadmap for next quarter. Your team has 4 engineers and 6 weeks. You have a view on how to respond. Explain to your leadership team — lead with your recommended response.',
    context: 'Competitive response',
  },
  {
    id: 'b10',
    situation: 'You interviewed 12 candidates for a senior role over 6 weeks. You found one strong fit, but they\'re asking for ₹40L — ₹8L above your approved budget. You think they\'re worth it. Explain to HR — lead with your recommendation.',
    context: 'Hiring decision',
  },
]

export const UNEXPECTED_QUESTIONS = [
  {
    id: 'q01',
    question: 'If you had to cut your team\'s workload by 50% starting Monday — what goes first, and why?',
    category: 'Leadership',
  },
  {
    id: 'q02',
    question: 'What\'s a belief you held strongly five years ago that you no longer believe today?',
    category: 'Self-awareness',
  },
  {
    id: 'q03',
    question: 'You have ₹10 lakhs and 6 months. What business would you start, and what\'s the first thing you\'d do?',
    category: 'Entrepreneurship',
  },
  {
    id: 'q04',
    question: 'If you had to explain what \'emotional intelligence\' actually means to a 15-year-old, what would you say?',
    category: 'Communication',
  },
  {
    id: 'q05',
    question: 'What\'s the most important lesson your biggest failure taught you — and did you actually change because of it?',
    category: 'Growth',
  },
  {
    id: 'q06',
    question: 'Your best team member tells you they\'re leaving in 2 weeks, no negotiation. What do you do in the next 48 hours?',
    category: 'Crisis',
  },
  {
    id: 'q07',
    question: 'What\'s one thing about Indian work culture that you\'d change immediately if you had the power — and why haven\'t others changed it yet?',
    category: 'Opinion',
  },
  {
    id: 'q08',
    question: 'Explain the concept of \'compound interest\' using something that has nothing to do with money.',
    category: 'Clarity',
  },
  {
    id: 'q09',
    question: 'You\'re told you have one sentence to make a first impression at the most important meeting of your career. What\'s the sentence?',
    category: 'Impact',
  },
  {
    id: 'q10',
    question: 'What skill do you have that almost nobody knows about — and how did you get it?',
    category: 'Storytelling',
  },
  {
    id: 'q11',
    question: 'If a 22-year-old asked you for the single best piece of career advice — not the generic kind — what would you actually say?',
    category: 'Mentoring',
  },
  {
    id: 'q12',
    question: 'Describe the most difficult conversation you\'ve ever had to have. What made it hard, and how did it go?',
    category: 'EQ',
  },
  {
    id: 'q13',
    question: 'If you could go back and not pursue your current career — what would you have done instead, and why?',
    category: 'Reflection',
  },
  {
    id: 'q14',
    question: 'What\'s one thing that most people in your industry are wrong about?',
    category: 'Opinion',
  },
  {
    id: 'q15',
    question: 'Your team is in a meeting that\'s going in circles for 40 minutes. You\'re not the senior-most person. How do you break the pattern?',
    category: 'Leadership',
  },
]

// ── Get a random drill ────────────────────────────────────────────────────────
export function getRandomBluf() {
  return BLUF_SITUATIONS[Math.floor(Math.random() * BLUF_SITUATIONS.length)]
}

export function getRandomQuestion() {
  return UNEXPECTED_QUESTIONS[Math.floor(Math.random() * UNEXPECTED_QUESTIONS.length)]
}
