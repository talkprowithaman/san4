import { GoogleGenerativeAI } from '@google/generative-ai'
import { Capacitor } from '@capacitor/core'
import { supabase }  from './supabase'

// ── Gemini transport — via serverless proxy ──────────────────────────────────
// The API key lives only on the server (/api/gemini). The client builds the
// request and POSTs it through the proxy so the key is never in the web bundle
// or the Android APK.
//
// Web: same-origin '/api/gemini' (Vite dev forwards it to the deployment).
// Native: absolute URL — the WebView origin (https://localhost) has no /api.
const API_BASE = Capacitor.isNativePlatform() ? 'https://san4.vercel.app' : ''

// Migration fallback: while VITE_GEMINI_API_KEY is still set (i.e. before the
// server-side GEMINI_API_KEY is configured), fall back to calling Gemini
// directly so the live app never breaks. Once VITE_GEMINI_API_KEY is removed
// from the deployment, this path is dead and the key is fully protected.
const LEGACY_KEY = import.meta.env.VITE_GEMINI_API_KEY
let _legacySdk = null
function legacySdk() {
  if (!_legacySdk && LEGACY_KEY) _legacySdk = new GoogleGenerativeAI(LEGACY_KEY)
  return _legacySdk
}

// Core call: returns the model's response text. `contents` is a Gemini
// Content[] (array of { role, parts }).
async function geminiRequest({ model, contents, systemInstruction, generationConfig }) {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`${API_BASE}/api/gemini`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({ model, contents, systemInstruction, generationConfig }),
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      throw new Error(`proxy ${res.status}: ${detail.slice(0, 160)}`)
    }
    const data = await res.json()
    return (data.text || '').trim()
  } catch (err) {
    if (legacySdk()) {
      console.warn('Gemini proxy unavailable, using legacy direct key:', err.message)
      const m = legacySdk().getGenerativeModel({ model, systemInstruction, generationConfig })
      const result = await m.generateContent({ contents })
      return result.response.text().trim()
    }
    throw err
  }
}

// Single-turn helper: `parts` is a string or an array of Part objects.
function geminiGenerate(model, parts, opts = {}) {
  const userParts = typeof parts === 'string' ? [{ text: parts }] : parts
  return geminiRequest({ model, contents: [{ role: 'user', parts: userParts }], ...opts })
}

// ── Model names — update here if they change ─────────────────────────────────
// Chat/interactive: flash-lite responds in ~1s. The 'gemini-flash-latest'
// alias now resolves to a thinking model that takes 15-30s per reply —
// measured 2026-06-11 — which made sessions feel broken. Do not use it
// for anything interactive.
const MODEL = 'gemini-2.5-flash-lite'

// ── Natural neural TTS (the interviewer's voice) ────────────────────────────
// Browser speechSynthesis sounds robotic; Gemini TTS is genuinely natural.
// Returns raw PCM (base64) + sampleRate — the caller wraps it in WAV and plays
// it. While the migration key (VITE_GEMINI_API_KEY) is present we call Google
// directly (same trust model as the legacy fallback above); otherwise we POST
// to an /api/tts proxy (to be added server-side when the key moves off-client).
const TTS_MODEL = 'gemini-2.5-flash-preview-tts'
const TTS_VOICE = 'Sulafat' // warm, natural

export async function synthesizeSpeech(text) {
  const trimmed = (text || '').trim()
  if (!trimmed) throw new Error('no text')

  const body = {
    // Keep the style cue SHORT — long instructions make the TTS model return
    // finishReason "OTHER" with no audio.
    contents: [{ parts: [{ text: `Say warmly and naturally: ${trimmed}` }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: TTS_VOICE } } },
    },
  }

  if (LEGACY_KEY) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${TTS_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': LEGACY_KEY },
        body: JSON.stringify(body),
      }
    )
    if (!res.ok) throw new Error(`tts ${res.status}`)
    const data = await res.json()
    const part = data?.candidates?.[0]?.content?.parts?.find(p => p.inlineData)
    if (!part?.inlineData?.data) throw new Error('no audio')
    const rate = parseInt((part.inlineData.mimeType?.match(/rate=(\d+)/) || [])[1], 10) || 24000
    return { audioBase64: part.inlineData.data, sampleRate: rate }
  }

  const res = await fetch(`${API_BASE}/api/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: trimmed }),
  })
  if (!res.ok) throw new Error(`tts proxy ${res.status}`)
  const data = await res.json()
  if (!data?.audioBase64) throw new Error('no audio')
  return { audioBase64: data.audioBase64, sampleRate: data.sampleRate || 24000 }
}

// ── Daily Rep — instant feedback on one 60-second spoken answer ──────────────
// The atomic loop: must be FAST (flash-lite, one call) and tiny (one score,
// one win, one fix). Returns null on failure — callers show a retry, never a
// fabricated score.
export async function analyzeDailyRep(rep, audioBase64, mimeType = 'audio/webm') {
  const prompt = `You are Vak, San4's warm but honest communication coach for Indian professionals. The user was given this 60-second speaking challenge:

SITUATION: ${rep.situation}
CHALLENGE: ${rep.prompt}
WHAT GOOD LOOKS LIKE: ${rep.focus}

LISTEN to their spoken attempt (audio attached). Indian English / Hinglish is fine — never penalise accent or code-switching. Judge communication: did they meet the challenge, how confident and clear did they sound, filler words (English AND Hindi — umm, matlab, jaise ki, you know).

Return JSON only (no markdown, no code fences):
{
  "score": <integer 0-100, honest — 80+ means genuinely strong>,
  "win": "<ONE specific thing they did well, quoting or referencing their actual words>",
  "fix": "<ONE specific, actionable thing to do better next time>",
  "filler_count": <integer, fillers you actually heard>,
  "transcript": "<what they said, faithfully>"
}`

  try {
    const text = await geminiGenerate(MODEL, [
      { text: prompt },
      { inlineData: { mimeType, data: audioBase64 } },
    ])
    const clean = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '')
    const parsed = JSON.parse(clean)
    if (typeof parsed.score !== 'number') return null
    return parsed
  } catch (err) {
    console.error('Daily rep analysis failed:', err)
    return null
  }
}

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

// ── Fixed opening lines — instant session start, no API round-trip ───────────
// These mirror the 'Start with: "…"' instruction in each scenario prompt, so
// the model believes it already delivered them when the conversation continues.
export const OPENING_LINES = {
  hr_interview:           "Thanks for coming in — please, have a seat. Let's get started. Tell me about yourself.",
  social_conversation:    "Hey! Haven't seen you here before. I'm Rahul. What do you do?",
  team_meeting:           "Morning! Let's keep it quick — what are you working on today and are there any blockers?",
  client_presentation:    "Alright, you have 15 minutes. What have you got for us?",
  performance_review:     "Thanks for coming in. How do you feel this year went overall?",
  salary_negotiation:     "So I understand you wanted to discuss your compensation. What's on your mind?",
  gd_round:               "Welcome everyone. Today's GD topic is: 'Should India prioritise economic growth over environmental sustainability?' Please begin.",
  first_date:             "Hi! It's nice to finally meet in person. How was the commute?",
  say_no_professionally:  "I need this done by tonight — drop everything else.",
  leadership_update:      "Okay — you've got two minutes. What's the situation and what do you need from me?",
  pitch_skeptic:          "I'll be honest — I'm not convinced we need this. We're already stretched thin. What have you got?",
  cold_networking:        "Hi — I don't think we've met. Are you enjoying the event?",
  conflict_mediation:     "I'm glad you called this meeting. Rahul keeps presenting my work as his own and I've had enough.",
  sensitive_conversation: "Hey — you mentioned you wanted to talk about something? What's up?",
}

// ── Main chat function ────────────────────────────────────────────────────────
// options: { eslMode: false }
export async function sendPracticeMessage(scenarioId, history, userMessage, options = {}) {
  const basePrompt = SCENARIO_PROMPTS[scenarioId] || SCENARIO_PROMPTS.hr_interview
  const eslNote    = options.eslMode
    ? '\n\nIMPORTANT: This user is practising in English as a second language (they may think primarily in Hindi, Marathi, or another Indian language). Be warm and patient. If they fumble for a word, gently offer it. Do NOT correct grammar or pronunciation — focus only on communication clarity and confidence.'
    : ''
  // Persona overlay — varies the counterpart's accent / context (personas.js).
  const personaNote = options.personaPrompt || ''

  const geminiHistory = history.map(msg => ({
    role:  msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }],
  }))

  // Gemini requires the conversation to open with a user turn. With the
  // hardcoded opening line, history starts with Vak ('model') — seed one.
  if (geminiHistory.length > 0 && geminiHistory[0].role === 'model') {
    geminiHistory.unshift({ role: 'user', parts: [{ text: 'Start the session now.' }] })
  }

  const contents = [...geminiHistory, { role: 'user', parts: [{ text: userMessage }] }]
  return geminiRequest({ model: MODEL, contents, systemInstruction: basePrompt + eslNote + personaNote })
}

// ── Session analysis — voice-aware ────────────────────────────────────────────
// voiceMeta: { avgWpm, totalSpeakingSeconds } — optional, pass null for text mode
// options: { eslMode: false }
export async function analyzeSession(scenarioTitle, messages, voiceMeta = null, options = {}) {
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

  const text = await geminiGenerate(MODEL, prompt)

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

  const text = await geminiGenerate(MODEL, fullPrompt)

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

  const text = await geminiGenerate(MODEL, prompt)

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

// ── Audio/vision model — used once per session for the end-of-session report ──
// gemini-1.5-flash was RETIRED by Google (404s as of 2026-06) — every audio
// analysis silently failed and fell back to generic feedback. The flash-latest
// alias is slower (thinking model) but multimodal and quality-focused; fine
// for the one analysis call behind the "Vak is reviewing…" screen.
const AUDIO_MODEL = 'gemini-flash-latest'

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

function safeJsonParse(text, fallback = null) {
  try {
    return JSON.parse(text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim())
  } catch {
    return fallback
  }
}

// ── CEFR assessment — top-of-funnel score ────────────────────────────────────
// The 2-minute front door: the user reads a passage + answers a spontaneous
// question, Gemini returns a CEFR band (A1–C2) and 0-100 sub-scores. We already
// compute the same dimensions in session analysis — this packages them as the
// onboarding hook.
export async function analyzeCEFRAssessment(audioBase64, mimeType = 'audio/webm', promptText = '') {
  const prompt = `You are a certified language assessor evaluating a spoken English sample using the CEFR (Common European Framework of Reference) scale: A1, A2, B1, B2, C1, C2.

The speaker was asked to: ${promptText || 'read a short passage aloud and then answer a spontaneous question about their work.'}

Listen to the recording. First transcribe what the human said. Then assess their spoken English across four dimensions and assign an overall CEFR level. Be fair but honest — most Indian professionals land in the B1–B2 range. Reserve C1/C2 for genuinely advanced, near-native fluency.

Return JSON only (no markdown, no code fences):
{
  "transcript": "exact transcription of what the speaker said",
  "cefr_level": "one of A1, A2, B1, B2, C1, C2",
  "cefr_label": "short human label, e.g. 'Upper Intermediate'",
  "overall_score": <integer 0-100>,
  "pronunciation": <integer 0-100>,
  "grammar": <integer 0-100>,
  "vocabulary": <integer 0-100>,
  "fluency": <integer 0-100>,
  "band_description": "2-sentence description of what this CEFR level means for real-world communication",
  "strengths": ["one specific strength citing what they said", "another"],
  "improvements": ["one specific, actionable improvement", "another"],
  "next_step": "One concrete next practice recommendation to move up a band"
}`

  try {
    const text = await geminiGenerate(AUDIO_MODEL, [
      { inlineData: { mimeType, data: audioBase64 } },
      { text: prompt },
    ])
    return safeJsonParse(text, null)
  } catch (err) {
    console.warn('analyzeCEFRAssessment failed:', err.message)
    return null
  }
}

// ── Call Analyzer — real meeting recording feedback (Vak Elite) ───────────────
// User uploads a Zoom/Meet/Teams recording (audio or video). Gemini reviews the
// user's contribution and returns meeting-grade coaching.
export async function analyzeMeetingRecording(mediaBase64, mimeType = 'audio/webm', context = '') {
  const prompt = `You are an executive communication coach reviewing a recording of a real work meeting (e.g. a Zoom, Google Meet, or Microsoft Teams call).

${context ? `Context the user gave about this meeting: "${context}"` : ''}

Multiple people may be speaking. Focus your coaching on the user's OWN contributions — how they communicated, not the meeting outcome. Estimate where you can; never fabricate exact numbers you cannot infer.

Return JSON only (no markdown, no code fences):
{
  "summary": "2-sentence honest assessment of how the user came across in this meeting",
  "overall_score": <integer 0-100>,
  "talk_ratio_note": "Estimate how much the user spoke vs others, and whether that was appropriate",
  "clarity_score": <integer 0-100>,
  "confidence_score": <integer 0-100>,
  "filler_word_count": <integer estimate>,
  "top_filler_words": ["list", "of", "fillers", "you", "heard"],
  "key_moments": ["A specific moment where the user did well or poorly, quoting/paraphrasing what was said"],
  "strengths": ["specific strength with example", "another"],
  "improvements": ["specific, actionable improvement with example", "another"],
  "action_items": ["One concrete behaviour to change in the next meeting", "another"],
  "what_to_say_differently": "One specific sentence the user said, rewritten the way a polished communicator would have said it"
}`

  try {
    const text = await geminiGenerate(AUDIO_MODEL, [
      { inlineData: { mimeType, data: mediaBase64 } },
      { text: prompt },
    ])
    return safeJsonParse(text, null)
  } catch (err) {
    console.warn('analyzeMeetingRecording failed:', err.message)
    return null
  }
}

// ── Audio-based session analysis ─────────────────────────────────────────────
// Gemini receives raw audio, transcribes + coaches in one call.
// Uses gemini-1.5-flash (NOT the gemini-flash-latest alias) — confirmed audio support.
export async function analyzeSessionFromAudio(scenarioTitle, audioBase64, mimeType = 'audio/webm', lang = 'en-US') {
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
    const text = await geminiGenerate(AUDIO_MODEL, [
      { inlineData: { mimeType, data: audioBase64 } },
      { text: prompt },
    ])
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
    const text = await geminiGenerate(AUDIO_MODEL, [
      { inlineData: { mimeType, data: audioBase64 } },
      { text: prompt },
    ])
    return JSON.parse(text.replace(/^```json\s*/i, '').replace(/\s*```$/i, ''))
  } catch (err) {
    console.warn('analyzeScriptReadingFromAudio failed:', err.message)
    return null
  }
}

// ── Body language — single frame quick analysis ──────────────────────────────
// Called every ~30 s during the session for live coaching tips.
// Uses gemini-1.5-flash which supports inline image data.
export async function analyzeBodyLanguageFrame(scriptTitle, frameBase64, mimeType = 'image/jpeg') {
  // Live tip fires every 30 s — must use the fast model (flash-lite is
  // multimodal too); the thinking model would still be mid-response when
  // the next frame arrives.
  const prompt = `You are an expert communication coach specialising in body language and non-verbal delivery.

Analyse this single video frame of someone reading/delivering a speech.
Script: "${scriptTitle}"

In this snapshot, quickly assess:
1. POSTURE — upright and confident, or slouching?
2. EYE CONTACT — looking at the camera (audience), or down at the script?
3. FACIAL EXPRESSION — engaged and confident, nervous, or blank?
4. HAND/SHOULDER TENSION — relaxed or stiff?

Return JSON only (no markdown):
{
  "posture_score": <integer 0-100>,
  "eye_contact_score": <integer 0-100>,
  "expression_score": <integer 0-100>,
  "gesture_score": <integer 0-100>,
  "overall_presence": <integer 0-100>,
  "instant_tip": "One ultra-specific, actionable tip for THIS exact moment — under 12 words",
  "observation": "What you specifically observe in this frame — 1 sentence, very concrete"
}`

  try {
    const text = await geminiGenerate(MODEL, [
      { inlineData: { mimeType, data: frameBase64 } },
      { text: prompt },
    ])
    return JSON.parse(text.replace(/^```json\s*/i, '').replace(/\s*```$/i, ''))
  } catch (err) {
    console.warn('analyzeBodyLanguageFrame failed:', err.message)
    return null
  }
}

// ── Body language — full session analysis (multiple frames + optional audio) ──
// Sends up to 6 evenly-spaced frames and the audio recording to Gemini
// for a comprehensive, session-level body language coaching report.
export async function analyzeBodyLanguageFull(
  scriptTitle, scriptText, frames = [], audioBase64 = null, audioMimeType = 'audio/webm'
) {
  const parts = []

  // Add up to 6 frames (evenly spaced across the session)
  const selected = frames.length <= 6 ? frames : (() => {
    const step = (frames.length - 1) / 5
    return [0,1,2,3,4,5].map(i => frames[Math.round(i * step)])
  })()

  selected.forEach(f => {
    parts.push({ inlineData: { mimeType: f.mimeType || 'image/jpeg', data: f.base64 } })
  })

  // Add audio if available
  if (audioBase64) {
    parts.push({ inlineData: { mimeType: audioMimeType, data: audioBase64 } })
  }

  parts.push({ text: `You are an expert communication coach specialising in body language, executive presence, and non-verbal delivery. You are reviewing ${selected.length} video frames from a speech/script-reading session${audioBase64 ? ', plus the full audio recording' : ''}.

Script being delivered: "${scriptTitle}"
---
${scriptText ? scriptText.slice(0, 600) : '(custom script)'}
---

Analyse the speaker's complete body language and physical presence across the full session. Be specific — cite exactly what you see. Avoid generic advice.

Assess each dimension:
1. POSTURE — consistent? Straight back, open chest, vs. slouching or shrinking?
2. EYE CONTACT — % of time looking at camera (audience) vs. looking down at script?
3. FACIAL EXPRESSION — range and match to content? Engaged vs. blank or tense?
4. HAND GESTURES — purposeful and natural, or stiff, hidden, or fidgeting?
5. OVERALL PRESENCE — do they command attention? Is there energy and intentionality?

Return JSON only (no markdown, no code fences):
{
  "overall_score": <integer 0-100>,
  "posture_score": <integer 0-100>,
  "eye_contact_score": <integer 0-100>,
  "expression_score": <integer 0-100>,
  "gesture_score": <integer 0-100>,
  "presence_score": <integer 0-100>,
  "strengths": ["specific observed strength with detail", "another strength"],
  "improvements": ["specific improvement with example from what you saw", "another improvement"],
  "action_item": "The single highest-impact thing to practise before the next session",
  "summary": "2-sentence honest assessment of their physical presence — be specific, not generic",
  "coaching_notes": {
    "posture": "Specific posture observation + 1-line advice",
    "eye_contact": "Specific eye contact observation + 1-line advice",
    "gestures": "Specific gesture observation + 1-line advice",
    "expression": "Specific expression observation + 1-line advice"
  }
}` })

  try {
    const text = await geminiGenerate(AUDIO_MODEL, parts)
    return JSON.parse(text.replace(/^```json\s*/i, '').replace(/\s*```$/i, ''))
  } catch (err) {
    console.warn('analyzeBodyLanguageFull failed:', err.message)
    return null
  }
}

// ── Meeting prep ──────────────────────────────────────────────────────────────
export async function generateTalkingPoints(meetingTitle, agenda) {
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

  const text = await geminiGenerate(MODEL, prompt)

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
