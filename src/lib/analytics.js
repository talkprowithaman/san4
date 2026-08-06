// ── Product analytics (PostHog) ───────────────────────────────────────────────
// Why: we could not answer "what is our D7 retention?" — no instrumentation
// existed. This is the measurement layer for the core funnel:
//   land → assessment → score → signup → first rep → return → resume/paid
//
// Privacy posture (DPDP Act 2023, and our /responsible-ai commitments):
//   • autocapture OFF — we never hoover up clicks/inputs, so no accidental PII
//     from resume fields, job descriptions, or transcripts.
//   • session recording OFF — we never replay a user's screen.
//   • We send SCORES and BANDS, never transcripts, resume content, or audio.
//   • identify() sends only the Supabase user id (a random uuid), never email.
//   • No-ops safely when VITE_POSTHOG_KEY is unset, so dev and CI are unaffected.

import posthog from 'posthog-js'

const KEY  = import.meta.env.VITE_POSTHOG_KEY
const HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com'

let ready = false

export function initAnalytics() {
  if (ready || !KEY) return
  try {
    posthog.init(KEY, {
      api_host: HOST,
      autocapture: false,              // explicit events only — no accidental PII
      disable_session_recording: true, // never record the screen
      capture_pageview: false,         // we send these ourselves (SPA router)
      person_profiles: 'identified_only',
      persistence: 'localStorage',
    })
    ready = true
  } catch (e) {
    console.warn('analytics init failed:', e?.message)
  }
}

// Fire-and-forget: analytics must never break a user flow.
export function track(event, props = {}) {
  if (!ready) return
  try { posthog.capture(event, props) } catch { /* ignore */ }
}

export function trackPageview(path) {
  if (!ready) return
  try { posthog.capture('$pageview', { $current_url: path }) } catch { /* ignore */ }
}

// Only the opaque user id — never email, name, or phone.
export function identifyUser(userId) {
  if (!ready || !userId) return
  try { posthog.identify(userId) } catch { /* ignore */ }
}

export function resetAnalytics() {
  if (!ready) return
  try { posthog.reset() } catch { /* ignore */ }
}

// ── Event names ───────────────────────────────────────────────────────────────
// Kept in one place so the funnel stays consistent and typo-free.
export const EV = {
  // Acquisition → activation
  ASSESSMENT_STARTED:   'assessment_started',
  ASSESSMENT_COMPLETED: 'assessment_completed',
  SIGNUP_COMPLETED:     'signup_completed',
  GUEST_SCORE_MIGRATED: 'guest_score_migrated',
  // Core habit loop (retention)
  REP_COMPLETED:        'rep_completed',
  SESSION_COMPLETED:    'session_completed',
  // Credential / distribution flywheel
  RESUME_GENERATED:     'resume_generated',
  RESUME_DOWNLOADED:    'resume_downloaded',
  EXTENSION_CTA:        'extension_cta_clicked',
  // Monetisation
  UPGRADE_CLICKED:      'upgrade_clicked',
}
