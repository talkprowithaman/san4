// Analysis client — turns a call transcript into a San4 coaching report by
// calling the SAME /api/gemini proxy the web app uses (CORS is open, and there
// is a rate-limited guest lane so this works before we wire Supabase auth).
//
// Keeping the weakness vocabulary identical to src/lib/gemini.js means the
// extension's recommendations (communicationVideos.js) map cleanly.
import { GEMINI_PROXY, TEXT_MODEL, AUDIO_MODEL } from './config.js'

const WEAKNESS_VOCAB = [
  'fillers', 'pace', 'structure', 'clarity', 'conciseness',
  'confidence', 'charisma', 'english', 'networking', 'assertiveness', 'presence',
]

function reportSchema() {
  return `{
  "transcript": "<faithfully, exactly what the user said, including fillers; empty string if no intelligible speech>",
  "summary": "2-sentence honest read on how they came across",
  "overall_score": <integer 0-100>,
  "clarity_score": <integer 0-100>,
  "confidence_score": <integer 0-100>,
  "filler_word_count": <integer>,
  "top_filler_words": ["fillers you actually heard, English or Hindi"],
  "strengths": ["specific positive with example", "another"],
  "improvements": ["specific, actionable improvement", "another"],
  "fixes": [{"issue": "a weak line, quoting them", "better": "the same point rewritten well"}],
  "weaknesses": ["1-3, most important first, ONLY from: ${WEAKNESS_VOCAB.join(', ')}"],
  "action_items": ["one concrete behaviour for the next call"]
}`
}

// Raw mic audio -> transcript + coaching in ONE Gemini call (reliable, and
// handles Hindi/Hinglish, unlike the Web Speech API which also fights Meet for
// the mic). Mirrors the web app's analyzeMeetingRecording.
export async function analyzeAudio(audioBase64, mimeType = 'audio/webm', { context = '', authToken = null } = {}) {
  const prompt = `You are an executive communication coach. The attached audio was recorded from ONE person's microphone during a real work call. That microphone owner (the user, the primary voice: the loudest, closest, most continuous speaker) is the ONLY person you coach.

CRITICAL — single-speaker rule:
- Coach and transcribe ONLY the primary microphone owner.
- Other participants may leak in faintly through speakers (quieter, distant, echoey). IGNORE them completely. Do NOT transcribe, quote, count, or score any secondary/background voice. Never attribute another person's words to the user.
- If the audio contains almost no clear primary-speaker speech (e.g. the user stayed silent and you mostly hear faint others), return an empty transcript and do not invent content.

Transcribe what the primary speaker said, then coach HOW they communicated, not the meeting outcome. Be honest and calibrated: reserve 85+ for genuinely excellent delivery, most professionals land 55-75. Never fabricate numbers.

${context ? `Context: "${context}"\n` : ''}Write every user-facing string like a real person talking. No em dashes.

Return JSON only (no markdown, no code fences):
${reportSchema()}`

  const headers = { 'Content-Type': 'application/json' }
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`

  const res = await fetch(GEMINI_PROXY, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: AUDIO_MODEL,
      contents: [{ role: 'user', parts: [
        { inlineData: { mimeType, data: audioBase64 } },
        { text: prompt },
      ] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  })

  if (res.status === 429) throw new Error('rate_limited')
  if (!res.ok) throw new Error(`proxy_${res.status}`)
  const data = await res.json()
  const parsed = extractJson(data.text)
  if (!parsed || typeof parsed.overall_score !== 'number') throw new Error('bad_analysis')
  if (!String(parsed.transcript || '').trim()) throw new Error('no_speech')
  return parsed
}

function buildPrompt(transcript, context) {
  return `You are an executive communication coach. Below is a transcript of what ONE person (the user) said during a real work call. Coach how they communicated, not the meeting outcome. Be honest, specific, and calibrated: reserve 85+ for genuinely excellent delivery, most professionals land 55-75.

${context ? `Context: "${context}"\n` : ''}
Transcript of the user's speech:
"""
${transcript}
"""

Write every user-facing string like a real person talking. No em dashes.

Return JSON only (no markdown, no code fences):
{
  "summary": "2-sentence honest read on how they came across",
  "overall_score": <integer 0-100>,
  "clarity_score": <integer 0-100>,
  "confidence_score": <integer 0-100>,
  "filler_word_count": <integer>,
  "top_filler_words": ["fillers you actually see, English or Hindi"],
  "strengths": ["specific positive with example", "another"],
  "improvements": ["specific, actionable improvement", "another"],
  "fixes": [{"issue": "a weak line, quoting them", "better": "the same point rewritten well"}],
  "weaknesses": ["1-3, most important first, ONLY from: ${WEAKNESS_VOCAB.join(', ')}"],
  "action_items": ["one concrete behaviour for the next call"]
}`
}

function extractJson(text) {
  if (!text) return null
  const cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
  try { return JSON.parse(cleaned) } catch {}
  const s = cleaned.indexOf('{'); const e = cleaned.lastIndexOf('}')
  if (s !== -1 && e !== -1 && e > s) { try { return JSON.parse(cleaned.slice(s, e + 1)) } catch {} }
  return null
}

// authToken: optional Supabase access token (once account-linking is wired).
export async function analyzeTranscript(transcript, { context = '', authToken = null } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`

  const res = await fetch(GEMINI_PROXY, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: TEXT_MODEL,
      contents: [{ role: 'user', parts: [{ text: buildPrompt(transcript, context) }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  })

  if (res.status === 429) throw new Error('rate_limited')
  if (!res.ok) throw new Error(`proxy_${res.status}`)
  const data = await res.json()
  const parsed = extractJson(data.text)
  if (!parsed || typeof parsed.overall_score !== 'number') throw new Error('bad_analysis')
  return parsed
}

export { WEAKNESS_VOCAB }
