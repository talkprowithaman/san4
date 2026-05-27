import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY)

// ── Scenario system prompts ──────────────────────────────────────────────────
const SCENARIO_PROMPTS = {
  hr_interview: `You are a senior HR interviewer at a top Indian MNC (like TCS, Infosys, Deloitte, or HDFC Bank).
Conduct a realistic HR interview. Ask one question at a time. Start with "Tell me about yourself."
After each answer, give a brief natural reaction (not feedback), then ask the next question.
Be professional but warm. Use Indian corporate context.
When the user says "end session", stop and write: [SESSION_ENDED]`,

  client_presentation: `You are a skeptical but fair client at an Indian enterprise company listening to a vendor pitch.
Ask tough but reasonable questions. Push back occasionally.
Start with: "Alright, you have 15 minutes. What have you got for us?"
Stay in character throughout. When the user says "end session", write: [SESSION_ENDED]`,

  performance_review: `You are a manager conducting a performance review for a direct report.
Ask about achievements, challenges, and goals. Probe for specifics.
Start with: "Thanks for coming in. How do you feel this quarter went overall?"
Be encouraging but push for concrete examples. When user says "end session", write: [SESSION_ENDED]`,

  salary_negotiation: `You are an HR manager in a salary negotiation. You have budget constraints but want to retain good talent.
Start with: "So I understand you wanted to discuss your compensation. What's on your mind?"
Be realistic — don't give in too easily but don't be unreasonable. When user says "end session", write: [SESSION_ENDED]`,

  team_meeting: `You are a senior colleague in a team meeting where the user needs to present an idea or update.
Play a realistic team member — ask clarifying questions, challenge assumptions politely, and engage.
Start with: "Alright, the floor is yours. What did you want to share with the team?"
When user says "end session", write: [SESSION_ENDED]`,

  gd_round: `You are a group discussion moderator at a top B-school or consulting firm assessment centre.
The topic will be given by the user. Push them to take a clear stand and defend it.
Start with: "Welcome. Today's GD topic is whatever topic you give me. Please go ahead and open the discussion."
When user says "end session", write: [SESSION_ENDED]`,
}

// ── Main chat function ───────────────────────────────────────────────────────
export async function sendPracticeMessage(scenarioId, history, userMessage) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
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

// ── Session analysis ─────────────────────────────────────────────────────────
export async function analyzeSession(scenarioTitle, messages) {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

  const transcript = messages
    .filter(m => m.role === 'user')
    .map(m => m.content)
    .join('\n\n')

  const prompt = `You are a professional communication coach. Analyze this transcript from a "${scenarioTitle}" practice session.

TRANSCRIPT:
${transcript}

Return a JSON object with exactly this structure (no markdown, just JSON):
{
  "overall_score": <integer 0-100>,
  "confidence_score": <integer 0-100>,
  "pacing_score": <integer 0-100>,
  "filler_word_count": <integer>,
  "top_filler_words": ["word1", "word2"],
  "strengths": ["strength 1", "strength 2"],
  "improvements": ["improvement 1", "improvement 2"],
  "action_item": "One specific, actionable thing to practice for next time",
  "summary": "2-sentence honest assessment of this session"
}`

  const result = await model.generateContent(prompt)
  const text   = result.response.text().trim()

  try {
    // Strip markdown code fences if present
    const clean = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '')
    return JSON.parse(clean)
  } catch {
    return {
      overall_score: 70, confidence_score: 70, pacing_score: 70,
      filler_word_count: 0, top_filler_words: [],
      strengths: ['Completed the session'], improvements: ['Keep practicing'],
      action_item: 'Practice this scenario again tomorrow.',
      summary: 'Session completed. Keep practicing to see improvement.',
    }
  }
}

// ── Meeting prep ─────────────────────────────────────────────────────────────
export async function generateTalkingPoints(meetingTitle, agenda) {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

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
        { point: 'Introduce your main objective', tip: 'State it in one clear sentence', priority: 'high' },
        { point: 'Share key supporting points', tip: 'Use numbers and specifics', priority: 'high' },
        { point: 'Address potential objections', tip: 'Acknowledge concerns before they are raised', priority: 'medium' },
        { point: 'Propose clear next steps', tip: 'End with a specific ask or action', priority: 'high' },
      ],
      opening_line: 'Thank you for your time. Here is what I would like to cover today.',
      watch_out: 'Stay focused on the main objective — avoid going off-topic.',
    }
  }
}
