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

  say_no_professionally: `You are a demanding manager or client in an Indian workplace. The user must practise saying no, pushing back, and setting limits without sounding lazy, rude, or uncooperative.
Rotate through these opening requests: "I need this done by tonight — drop everything else.", "Can you take on three more projects this sprint?", or "I need you to cancel your leave next week for a client visit."
If the user agrees too easily — push harder. If they give a firm but professional no with a reason, acknowledge it warmly. The goal is to make them find the middle ground: assertive, not aggressive.
When the user says "end session", write: [SESSION_ENDED]`,

  leadership_update: `You are a senior VP or CXO in a fast 5-minute leadership sync. The user must give you a crisp, no-fluff update.
Start with: "Okay — you've got two minutes. What's the situation and what do you need from me?"
If they ramble, cut them off: "Can you get to the point?", "What's the one number I should care about?", or "Skip the context — what's the decision?"
If they're sharp and clear, ask a smart follow-up. Reward clarity, punish padding.
When the user says "end session", write: [SESSION_ENDED]`,

  pitch_skeptic: `You are a defensive, budget-conscious senior stakeholder at a large Indian company. The user is pitching a new idea, process change, or product.
Start with: "I'll be honest — I'm not convinced we need this. We're already stretched thin. What have you got?"
Raise real objections: "What's the ROI?", "We tried something like this in 2022 and it failed", "My team can't take on more right now." Don't cave easily. But if they respond with data and empathy, warm up gradually.
When the user says "end session", write: [SESSION_ENDED]`,

  cold_networking: `You are a highly accomplished professional — a senior VC, successful founder, or industry veteran — at a professional event in India. You're polite but your time is valuable.
Start with: "Hi — I don't think we've met. Are you enjoying the event?"
See if the user can make themselves interesting and memorable in a natural, non-transactional way. Give short responses to generic or boring conversation. Open up and ask follow-up questions only when they say something genuinely interesting. Reward curiosity, not flattery.
When the user says "end session", write: [SESSION_ENDED]`,

  conflict_mediation: `You are playing TWO sides of a workplace conflict. "Priya" and "Rahul" are colleagues in a dispute about project ownership and credit. The user is their team lead trying to de-escalate.
Start as Priya: "I'm glad you called this meeting. Rahul keeps presenting my work as his own and I've had enough."
Alternate between Priya and Rahul's perspectives as the conversation unfolds. Escalate slightly if the user doesn't actively de-escalate. Reward responses that acknowledge both sides, identify the root issue, and move toward a practical solution.
When the user says "end session", write: [SESSION_ENDED]`,

  sensitive_conversation: `You are a colleague, teammate, or manager. The user must practise raising a sensitive topic — giving difficult feedback, addressing a personal issue at work, or communicating something uncomfortable without damaging the relationship.
Start with: "Hey — you mentioned you wanted to talk about something? What's up?"
React authentically based on how the user frames it: defensive if they're blunt, open if they're empathetic, confused if they're vague. Reward emotionally intelligent, respectful phrasing. If they're too indirect, gently say you're not sure what they're getting at.
When the user says "end session", write: [SESSION_ENDED]`,
}

// ── Main chat function ────────────────────────────────────────────────────────
// options: { eslMode: false }
export async function sendPracticeMessage(scenarioId, history, userMessage, options = {}) {
  const basePrompt = SCENARIO_PROMPTS[scenarioId] || SCENARIO_PROMPTS.hr_interview
  const eslNote    = options.eslMode
    ? '\n\nIMPORTANT: This user is practising in English as a second language (they may think primarily in Hindi, Marathi, or another Indian language). Be warm and patient. If they fumble for a word, gently offer it. Do NOT correct grammar or pronunciation — focus only on communication clarity and confidence.'
    : ''

  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: basePrompt + eslNote,
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
// options: { eslMode: false }
export async function analyzeSession(scenarioTitle, messages, voiceMeta = null, options = {}) {
  const model = genAI.getGenerativeModel({ model: MODEL })

  const userMessages = messages.filter(m => m.role === 'user')
  const transcript   = userMessages.map(m => m.content).join('\n\n')

  const pacingNote = voiceMeta
    ? `The user was speaking aloud (not typing). Their average speaking pace was ${voiceMeta.avgWpm} words per minute (ideal range: 120–160 WPM). Total speaking time: ${voiceMeta.totalSpeakingSeconds}s.`
    : 'This was a text-based session (not voice).'

  const eslNote = options.eslMode
    ? 'IMPORTANT: This is an Indian English / ESL session. The user thinks in another language (Hindi, Marathi, etc.) and is practising in English. Do NOT penalise Indian English sentence structures, accents, or minor grammar. Focus exclusively on communication effectiveness, clarity, and confidence. Note their ESL effort positively in strengths if relevant.'
    : ''

  const prompt = `You are a professional communication coach analysing a spoken practice session.
${eslNote}
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

// ── Quick drill + daily challenge analysis ────────────────────────────────────
// drillType: 'bluf' | 'unexpected_question' | 'daily_challenge'
export async function analyzeQuickDrill(drillType, prompt, userResponse, timeTaken = 0) {
  const model = genAI.getGenerativeModel({ model: MODEL })

  const drillContext = {
    bluf: `The user was given a complex situation and had to explain it starting with the BOTTOM LINE UP FRONT (BLUF) — conclusion first, then context. Check: did they lead with the key point, or did they bury it?`,
    unexpected_question: `The user was hit with an unexpected, high-pressure question and had to answer on the spot. Check: were they coherent, did they structure a response under pressure, did they avoid panicking?`,
    daily_challenge: `The user was given a real-world communication situation and had to respond as they would in real life. Evaluate overall communication quality.`,
  }[drillType] || 'Evaluate the user\'s spoken response.'

  const fullPrompt = `You are a sharp communication coach reviewing a 60-90 second spoken response.

DRILL TYPE: ${drillType.replace(/_/g, ' ').toUpperCase()}
DRILL CONTEXT: ${drillContext}

THE PROMPT/SITUATION GIVEN TO THE USER:
"${prompt}"

THE USER'S RESPONSE (from speech recognition):
"${userResponse || '[No speech detected]'}"

Time taken: ${timeTaken}s

Be specific, direct, and concise. Return JSON only (no markdown):
{
  "score": <integer 0-100>,
  "led_with_point": <boolean, only relevant for BLUF — did they start with the conclusion?>,
  "clarity": <integer 0-100>,
  "confidence": <integer 0-100>,
  "best_moment": "Quote the single best thing they said (under 15 words), or null",
  "one_fix": "The single most important thing to improve — one sentence, very specific",
  "encouragement": "One warm, specific sentence of encouragement"
}`

  const result = await model.generateContent(fullPrompt)
  const text   = result.response.text().trim()

  try {
    const clean = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '')
    return JSON.parse(clean)
  } catch {
    return {
      score: 70, led_with_point: null, clarity: 70, confidence: 70,
      best_moment: null,
      one_fix: 'Try to be more specific with examples in your next response.',
      encouragement: 'Great effort completing the drill — consistency is what builds the skill.',
    }
  }
}

// ── Script reading / teleprompter analysis ────────────────────────────────────
// voiceMeta: { avgWpm, totalSpeakingSeconds, fillerCount, pauseCount }
export async function analyzeScriptReading(scriptTitle, scriptText, transcript, voiceMeta = null) {
  const model = genAI.getGenerativeModel({ model: MODEL })

  const pacingNote = voiceMeta
    ? `Speaking pace: ${voiceMeta.avgWpm} WPM (ideal for clear speech: 120–150 WPM). Total reading time: ${voiceMeta.totalSpeakingSeconds}s. Real-time filler count: ${voiceMeta.fillerCount}. Long pauses detected: ${voiceMeta.pauseCount}.`
    : ''

  const prompt = `You are a professional voice and speech coach analysing a script reading session.

The user was given the following script to read aloud:

SCRIPT TITLE: "${scriptTitle}"
---
${scriptText}
---

WHAT THE USER ACTUALLY SAID (captured by speech recognition):
---
${transcript || '[No speech detected — microphone may not have worked]'}
---

${pacingNote}

Analyse the user's spoken delivery against the original script. Consider:
1. ACCURACY: Did they follow the script? Note key phrases skipped, altered, or added
2. FLUENCY: Was delivery smooth? Look for repeated words, false starts, stumbles
3. FILLER WORDS: Count all fillers in the transcript — um, uh, ah, hmm, aa, eh, you know, like, basically, I mean, sort of, kind of
4. PACING: Was their WPM appropriate for the script context (${scriptTitle})?
5. PAUSES: Were pauses natural/deliberate or nervous/hesitant?

Return JSON only (no markdown, no code fences):
{
  "overall_score": <integer 0-100>,
  "accuracy_score": <integer 0-100, how closely they followed the script>,
  "fluency_score": <integer 0-100, smoothness and naturalness of delivery>,
  "pacing_score": <integer 0-100>,
  "filler_word_count": <integer>,
  "top_filler_words": ["word1", "word2"],
  "missed_phrases": ["important phrase they skipped or significantly altered"],
  "pause_note": "One sentence about their pausing — was it deliberate or nervous?",
  "strengths": ["specific strength with example from their reading", "another strength"],
  "improvements": ["specific improvement with example from transcript", "another improvement"],
  "action_item": "One precise drill for their next reading session",
  "summary": "2-sentence honest assessment of their delivery — be specific, not generic",
  "pacing_note": "One sentence on their speaking pace and what to adjust"
}`

  const result = await model.generateContent(prompt)
  const text   = result.response.text().trim()

  try {
    const clean = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '')
    return JSON.parse(clean)
  } catch {
    return {
      overall_score: 70, accuracy_score: 70, fluency_score: 70, pacing_score: 70,
      filler_word_count: voiceMeta?.fillerCount ?? 0,
      top_filler_words: [],
      missed_phrases: [],
      pause_note: `${voiceMeta?.pauseCount ?? 0} long pause(s) detected during reading.`,
      strengths: ['Completed the full script reading'],
      improvements: ['Focus on maintaining consistent pace throughout'],
      action_item: 'Read the same script again tomorrow and record yourself to hear the difference.',
      summary: 'Session completed. Script reading is one of the fastest ways to improve diction, pace, and confidence.',
      pacing_note: voiceMeta?.avgWpm
        ? `You spoke at approximately ${voiceMeta.avgWpm} WPM — aim for 120–150 WPM for clear, confident delivery.`
        : 'Aim for 120–150 WPM for clear, confident delivery.',
    }
  }
}

// ── Audio model — gemini-1.5-flash is the stable model with confirmed audio support ──
// gemini-flash-latest is a text alias and may not handle inline audio blobs.
const AUDIO_MODEL = 'gemini-1.5-flash'

// ── Regional language map ────────────────────────────────────────────────────
export const LANGUAGES = [
  { code: 'en-US', label: 'English',  nativeName: 'English',  flag: '🌐' },
  { code: 'hi-IN', label: 'Hindi',    nativeName: 'हिंदी',    flag: '🇮🇳' },
  { code: 'mr-IN', label: 'Marathi',  nativeName: 'मराठी',    flag: '🇮🇳' },
  { code: 'te-IN', label: 'Telugu',   nativeName: 'తెలుగు',   flag: '🇮🇳' },
  { code: 'bn-IN', label: 'Bengali',  nativeName: 'বাংলা',    flag: '🇮🇳' },
  { code: 'ta-IN', label: 'Tamil',    nativeName: 'தமிழ்',    flag: '🇮🇳' },
  { code: 'kn-IN', label: 'Kannada',  nativeName: 'ಕನ್ನಡ',   flag: '🇮🇳' },
]

function langNote(langCode) {
  if (!langCode || langCode === 'en-US') return ''
  const lang = LANGUAGES.find(l => l.code === langCode)
  const name = lang?.label || 'an Indian language'
  return `\n\nIMPORTANT: The user is speaking in ${name}. Transcribe their speech as-is. Evaluate their spoken communication in ${name} — fluency, confidence, filler words, and pacing all apply equally. Your JSON values (scores, strengths, improvements, summary, action_item) should be written in English so they're readable in the app UI.`
}

// ── Audio-based session analysis ─────────────────────────────────────────────
// Gemini receives raw audio, transcribes + coaches in one call.
// Uses gemini-1.5-flash (NOT the gemini-flash-latest alias) — confirmed audio support.
export async function analyzeSessionFromAudio(scenarioTitle, audioBase64, mimeType = 'audio/webm', lang = 'en-US') {
  const model  = genAI.getGenerativeModel({ model: AUDIO_MODEL })
  const prompt = `You are a professional communication coach.
Listen to this audio recording from a "${scenarioTitle}" practice session.
Focus only on the human speaker. Ignore any AI/TTS voice you may hear.${langNote(lang)}

First, transcribe exactly what the human speaker said.
Then analyse their spoken communication quality.

Return JSON only (no markdown, no code fences):
{
  "transcript": "exact transcription of what the human speaker said",
  "overall_score": <integer 0-100>,
  "confidence_score": <integer 0-100>,
  "pacing_score": <integer 0-100>,
  "filler_word_count": <integer count of um/uh/ah/like/basically/you know>,
  "top_filler_words": ["list", "of", "actual", "fillers", "used"],
  "strengths": ["specific observation citing something they actually said"],
  "improvements": ["specific improvement with an example from what they said"],
  "action_item": "One precise, actionable drill for their next session",
  "summary": "2-sentence honest coaching assessment — cite something specific they said",
  "pacing_note": "One sentence on their speaking pace and what to adjust"
}`

  try {
    const result = await model.generateContent([
      { inlineData: { mimeType, data: audioBase64 } },
      { text: prompt },
    ])
    const text = result.response.text().trim()
    return JSON.parse(text.replace(/^```json\s*/i, '').replace(/\s*```$/i, ''))
  } catch (err) {
    console.warn('analyzeSessionFromAudio failed:', err.message)
    return null   // caller falls back to text-based analysis
  }
}

// ── Audio-based script-reading analysis ───────────────────────────────────────
export async function analyzeScriptReadingFromAudio(
  scriptTitle, scriptText, audioBase64, mimeType = 'audio/webm', lang = 'en-US'
) {
  const model  = genAI.getGenerativeModel({ model: AUDIO_MODEL })
  const prompt = `You are a professional voice and speech coach.
Listen to this audio of someone reading a script aloud.${langNote(lang)}

SCRIPT TITLE: "${scriptTitle}"
ORIGINAL SCRIPT:
---
${scriptText}
---

Compare what they actually said against the script. Evaluate:
1. ACCURACY — did they follow the script or skip/change key phrases?
2. FLUENCY — smooth delivery without hesitations or false starts?
3. PACING — ideal is 120–150 WPM for most scripts; IPL/sports commentary faster
4. FILLER WORDS — um, uh, ah, hmm, "you know", "basically", "I mean", "sort of"
5. LONG PAUSES — nervous gaps (>2s) vs deliberate dramatic pauses

Return JSON only (no markdown, no code fences):
{
  "transcript": "exact transcription of what they said",
  "overall_score": <integer 0-100>,
  "accuracy_score": <integer 0-100>,
  "fluency_score": <integer 0-100>,
  "pacing_score": <integer 0-100>,
  "filler_word_count": <integer>,
  "top_filler_words": ["um", "uh", ...],
  "missed_phrases": ["key phrases from script they skipped or changed"],
  "pause_note": "One sentence on their pausing — nervous or deliberate?",
  "pacing_note": "One sentence on speaking speed with WPM estimate",
  "strengths": ["specific observed strength from their reading"],
  "improvements": ["specific improvement with example from their reading"],
  "action_item": "One precise drill before the next reading session",
  "summary": "2-sentence honest assessment — cite specifics from their reading"
}`

  try {
    const result = await model.generateContent([
      { inlineData: { mimeType, data: audioBase64 } },
      { text: prompt },
    ])
    const text = result.response.text().trim()
    return JSON.parse(text.replace(/^```json\s*/i, '').replace(/\s*```$/i, ''))
  } catch (err) {
    console.warn('analyzeScriptReadingFromAudio failed:', err.message)
    return null
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
