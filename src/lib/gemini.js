import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY)

// ── Model name — update here if it changes ───────────────────────────────────
const MODEL = 'gemini-flash-latest'

// ── Scenario system prompts ───────────────────────────────────────────────────
const SCENARIO_PROMPTS = {
  hr_interview: `You are a senior HR interviewer at a top Indian MNC (like TCS, Infosys, Deloitte, or HDFC Bank).
Conduct a realistic HR interview over voice. The user is speaking to you — treat their words as spoken, not typed.
Ask one question at a time. Start with "Tell me about yourself."
After each answer, give a brief natural reaction (not feedback), then ask the next question.
Be professional but warm. Use Indian corporate context.
When the user says "end session" or "stop" or "finish", stop and write: [SESSION_ENDED]`,

  social_conversation: `You are a confident, friendly person at a professional networking event in India.
The user needs to practise their intro pitch — how they introduce themselves and make genuine conversation.
Start with: "Hey! Haven't seen you here before. I'm Rahul. What do you do?"
Be natural, warm, and curious. Ask follow-up questions. Gently probe if their intro is vague.
If they trail off or use too many filler words, give subtle prompts like "Go on?" or "And then?"
When the user says "end session", write: [SESSION_ENDED]`,

  team_meeting: `You are a senior colleague in a daily standup / team meeting. The user is presenting their update.
Start with: "Morning! Let's keep it quick — what are you working on today and are there any blockers?"
Push for clarity if the update is vague. Ask "What's the expected outcome?" or "Is anything blocked?"
Be direct but collegial. When user says "end session", write: [SESSION_ENDED]`,

  client_presentation: `You are a skeptical but fair client at an Indian enterprise company listening to a vendor pitch.
Ask tough but reasonable questions. Push back on claims without data.
Start with: "Alright, you have 15 minutes. What have you got for us?"
Stay in character. When the user says "end session", write: [SESSION_ENDED]`,

  performance_review: `You are a manager conducting an annual performance review for a direct report.
Ask about achievements, challenges, and goals. Probe for specifics — "give me a concrete example."
Start with: "Thanks for coming in. How do you feel this year went overall?"
Be encouraging but push for concrete evidence. When user says "end session", write: [SESSION_ENDED]`,

  salary_negotiation: `You are an HR manager in a salary negotiation. You have budget constraints but want to retain talent.
Start with: "So I understand you wanted to discuss your compensation. What's on your mind?"
Be realistic — don't give in immediately. Counter their points professionally.
When user says "end session", write: [SESSION_ENDED]`,

  gd_round: `You are a group discussion moderator at a top B-school or consulting firm assessment centre.
Facilitate a GD on a current India-relevant topic. The user opens the discussion.
After they speak, add a counter-point and invite them to respond or expand.
Start with: "Welcome everyone. Today's GD topic is: 'Should India prioritise economic growth over environmental sustainability?' Please begin."
When user says "end session", write: [SESSION_ENDED]`,

  first_date: `You are on a first date with the user at a café in India. You're curious, warm, and genuine.
Start with: "Hi! It's nice to finally meet in person. How was the commute?"
Keep the conversation natural and flowing. Ask follow-ups. Share a little about yourself too.
Gently reflect back if they seem nervous or give very short answers.
When the user says "end session", write: [SESSION_ENDED]`,
}

// ── Main chat function ────────────────────────────────────────────────────────
export async function sendPracticeMessage(scenarioId, history, userMessage) {
  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: SCENARIO_PROMPTS[scenarioId] || SCENARIO_PROMPTS.hr_interview,
  })

  const geminiHistory = history.map(msg => ({
    role:  msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }],
  }))

  const chat   = model.startChat({ history: geminiHistory })
  const result = await chat.sendMessage(userMessage)
  return result.response.text()
}

// ── Session analysis — voice-aware ────────────────────────────────────────────
// voiceMeta: { avgWpm, totalSpeakingSeconds } — optional, pass null for text mode
export async function analyzeSession(scenarioTitle, messages, voiceMeta = null) {
  const model = genAI.getGenerativeModel({ model: MODEL })

  const userMessages = messages.filter(m => m.role === 'user')
  const transcript   = userMessages.map(m => m.content).join('\n\n')

  const pacingNote = voiceMeta
    ? `The user was speaking aloud (not typing). Their average speaking pace was ${voiceMeta.avgWpm} words per minute (ideal range: 120–160 WPM). Total speaking time: ${voiceMeta.totalSpeakingSeconds}s.`
    : 'This was a text-based session (not voice).'

  const prompt = `You are a professional communication coach analysing a spoken practice session.
Scenario: "${scenarioTitle}"
${pacingNote}

USER TRANSCRIPT:
${transcript}

Analyse this transcript carefully for:
- Filler words: um, uh, like, you know, basically, so, right, actually, literally, kind of, sort of
- Hedging language (weak confidence signals): "I think maybe", "I'm not sure but", "I guess", "probably", "hopefully"
- Response depth: are answers specific with examples, or vague and brief?
- Pacing: do responses feel rushed (short, incomplete) or well-structured?
${voiceMeta ? `- Speaking pace: ${voiceMeta.avgWpm} WPM (flag if < 100 or > 200)` : ''}

Return JSON only (no markdown, no code fences):
{
  "overall_score": <integer 0-100>,
  "confidence_score": <integer 0-100, based on word choice, hedging, specificity>,
  "pacing_score": <integer 0-100>,
  "filler_word_count": <integer>,
  "top_filler_words": ["word1", "word2"],
  "strengths": ["specific strength with example from transcript", "another specific strength"],
  "improvements": ["specific improvement with example", "another improvement"],
  "action_item": "One precise, actionable drill for next session",
  "summary": "2-sentence honest assessment — be specific, not generic"${voiceMeta ? `,
  "pacing_note": "One sentence on their speaking pace and what to do about it"` : ''}
}`

  const result = await model.generateContent(prompt)
  const text   = result.response.text().trim()

  try {
    const clean = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '')
    return JSON.parse(clean)
  } catch {
    return {
      overall_score: 70, confidence_score: 70, pacing_score: 70,
      filler_word_count: 0, top_filler_words: [],
      strengths: ['Completed the session'],
      improvements: ['Keep practicing daily'],
      action_item: 'Practice this scenario again tomorrow.',
      summary: 'Session completed. Regular practice builds real confidence.',
    }
  }
}

// ── Meeting prep ──────────────────────────────────────────────────────────────
export async function generateTalkingPoints(meetingTitle, agenda) {
  const model = genAI.getGenerativeModel({ model: MODEL })

  const prompt = `You are a communication strategist helping an Indian professional prepare for a "${meetingTitle}" meeting.

MEETING CONTEXT / AGENDA:
${agenda}

Generate 6-8 prioritised talking points they must cover. For each point include a one-line tip on HOW to say it confidently.

Return JSON only (no markdown):
{
  "talking_points": [
    {
      "point": "Clear, specific talking point",
      "tip": "One-line delivery tip",
      "priority": "high|medium|low"
    }
  ],
  "opening_line": "A strong opening line to start the meeting with",
  "watch_out": "One thing to be careful about in this meeting"
}`

  const result = await model.generateContent(prompt)
  const text   = result.response.text().trim()

  try {
    const clean = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '')
    return JSON.parse(clean)
  } catch {
    return {
      talking_points: [
        { point: 'Introduce your main objective clearly', tip: 'State it in one sentence — no preamble', priority: 'high' },
        { point: 'Share key supporting points with data', tip: 'Use numbers and specific examples', priority: 'high' },
        { point: 'Address potential objections proactively', tip: 'Acknowledge concerns before they are raised', priority: 'medium' },
        { point: 'Propose clear next steps', tip: 'End with a specific ask or action item', priority: 'high' },
      ],
      opening_line: 'Thank you for your time. Here is what I would like to cover today.',
      watch_out: 'Stay focused on the main objective — avoid going off-topic.',
    }
  }
}
