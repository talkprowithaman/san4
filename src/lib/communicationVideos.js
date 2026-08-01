// ── "Watch this to improve" — weakness → coaching video ──────────────────────
// After San4 scores a real call / practice, each detected weakness is mapped to
// a video the user can watch to fix it. Policy (Aman's call): OUR videos first
// (Talk Pro with Aman — coaches the user AND grows the channel), then fall back
// to a YouTube search when we don't have an owned video for that weakness yet.
//
// The analyzer returns a fixed `weaknesses[]` vocabulary (see gemini.js). Keep
// the keys here in sync with that vocabulary.

const YT = (id) => `https://www.youtube.com/watch?v=${id}`
const YT_THUMB = (id) => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`
const SEARCH = (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`

// Owned videos pulled from the real @talkprowithaman channel (verified live).
// Only weaknesses genuinely covered by an owned video are mapped to one; the
// rest intentionally use a search fallback until Aman films that topic.
const OWNED = {
  confidence: {
    videoId: 'XmnMw1oKsww',
    title: 'FRESHERS Ka INTERVIEW Fear Khatam — This Will CHANGE You Forever',
    channel: 'Talk Pro with Aman',
  },
  charisma: {
    videoId: 'L03lijoMSKw',
    title: 'Psychological Trick to Be Instantly Liked | Conversation Starters',
    channel: 'Talk Pro with Aman',
  },
  presence: {
    videoId: 'r1jSq5vDf_U',
    title: 'Aura-Farming like the KING | 7 Tips from SRK',
    channel: 'Talk Pro with Aman',
  },
  english: {
    videoId: '759k00XfhjE',
    title: 'Every DESI should try this — ENGLISH kaise sikhe',
    channel: 'Talk Pro with Aman',
  },
  networking: {
    videoId: 'u5f8YLiKYnw',
    title: 'How to Network with ANYONE in 2026',
    channel: 'Talk Pro with Aman',
  },
  assertiveness: {
    videoId: 'J4qBTq3zVYs',
    title: 'Not every fight is for you | Strongest word of the Decade',
    channel: 'Talk Pro with Aman',
  },
}

// Search fallbacks — friendly label + the query we send to YouTube.
const SEARCH_FALLBACK = {
  fillers:      { label: 'Cutting filler words (um, matlab, like)', query: 'how to stop using filler words when speaking' },
  pace:         { label: 'Speaking slower and clearer',            query: 'how to speak slower and clearer with pauses' },
  structure:    { label: 'Structuring your point (STAR / PREP)',   query: 'how to structure your answer STAR method PREP' },
  clarity:      { label: 'Making your point easy to follow',       query: 'how to communicate your ideas more clearly' },
  conciseness:  { label: 'Saying more with fewer words',           query: 'how to stop rambling and be concise when speaking' },
  confidence:   { label: 'Sounding more confident',                query: 'how to sound more confident when you speak' },
  charisma:     { label: 'Being more likeable in conversation',    query: 'how to be more charismatic and likeable conversation' },
  english:      { label: 'Improving spoken English',               query: 'how to improve spoken english fluency for professionals' },
  networking:   { label: 'Networking conversations',               query: 'how to network professionally small talk tips' },
  assertiveness:{ label: 'Speaking up and saying no',              query: 'how to be assertive and say no professionally' },
  presence:     { label: 'Executive presence and delivery',        query: 'how to build executive presence when speaking' },
}

// A human label for each weakness key (used when only a search fallback exists).
function labelFor(key) {
  return SEARCH_FALLBACK[key]?.label || key
}

// Given one weakness key, return the best recommendation card.
export function videoForWeakness(key) {
  const k = String(key || '').toLowerCase().trim()
  const owned = OWNED[k]
  if (owned) {
    return {
      weakness: k,
      source: 'owned',
      title: owned.title,
      channel: owned.channel,
      url: YT(owned.videoId),
      thumbnail: YT_THUMB(owned.videoId),
    }
  }
  const fb = SEARCH_FALLBACK[k]
  return {
    weakness: k,
    source: 'search',
    title: fb ? fb.label : `Improve: ${k}`,
    channel: 'YouTube',
    url: SEARCH(fb ? fb.query : `improve ${k} communication skills`),
    thumbnail: null,
  }
}

// Given the analyzer's weaknesses[] (already ranked most-important-first),
// return de-duplicated recommendation cards, capped for a clean UI.
export function recommendedVideos(weaknesses = [], max = 3) {
  const seen = new Set()
  const out = []
  for (const w of weaknesses) {
    const key = String(w || '').toLowerCase().trim()
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(videoForWeakness(key))
    if (out.length >= max) break
  }
  return out
}

export { labelFor }
