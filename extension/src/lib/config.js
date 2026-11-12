// Shared config for the San4 Live Coach extension.
export const SAN4_API_BASE = 'https://san4.vercel.app'
export const SAN4_APP_URL  = 'https://san4.vercel.app'
export const GEMINI_PROXY  = `${SAN4_API_BASE}/api/gemini`

// Text model for transcript analysis (matches the app's scoring model family).
export const TEXT_MODEL = 'gemini-2.5-flash-lite'

// Audio model — confirmed to accept inline audio (matches the app's AUDIO_MODEL).
export const AUDIO_MODEL = 'gemini-flash-latest'

// Minimum spoken seconds before "Stop & coach" will score (avoid empty analyses).
export const MIN_COACH_SECONDS = 20
