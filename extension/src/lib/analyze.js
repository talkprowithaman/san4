// Analysis client — turns a call transcript into a San4 coaching report by
// calling the SAME /api/gemini proxy the web app uses (CORS is open, and there
// is a rate-limited guest lane so this works before we wire Supabase auth).
//
// Keeping the weakness vocabulary identical to src/lib/gemini.js means the
// extension's recommendations (communicationVideos.js) map cleanly.
import { GEMINI_PROXY, TEXT_MODEL } from './config.js'

const WEAKNESS_VOCAB = [
  'fillers', 'pace', 'structure', 'clarity', 'conciseness',
  'confidence', 'charisma', 'english', 'networking', 'assertiveness', 'presence',
]

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
