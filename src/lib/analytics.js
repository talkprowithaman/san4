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

// Our privacy posture, asserted in one place. PostHog fetches REMOTE config from
// the project (…/array/<key>/config.js) which can re-enable autocapture and
// session replay after init, so we also re-assert this in `loaded` below.
const PRIVACY = {
  autocapture: false,              // explicit events only — no accidental PII
  disable_session_recording: true, // never record the screen
  capture_pageview: false,         // we send these ourselves (SPA router)
  disable_surveys: true,           // no survey scripts on our pages
  capture_dead_clicks: false,
  capture_performance: false,      // no web-vitals autocapture
}

export function initAnalytics() {
  if (ready || !KEY) return
  try {
    posthog.init(KEY, {
      api_host: HOST,
      ...PRIVACY,
      person_profiles: 'identified_only',
      persistence: 'localStorage',
      // Stop PostHog pulling remote project config / flags. Without this the
      // server config is merged after init and silently re-enables autocapture
      // and session replay, overriding the PRIVACY block above.
      advanced_disable_flags: true,
      advanced_disable_decide: true,
      advanced_disable_feature_flags: true,
      advanced_disable_feature_flags_on_first_load: true,
      loaded: (ph) => {
        // Remote project config is merged AFTER init and was observed flipping
        // autocapture/session-recording back on. Re-assert, and hard-stop any
        // recording that may have started, so the client is authoritative.
        try {
          ph.set_config(PRIVACY)
          ph.stopSessionRecording?.()
        } catch { /* ignore */ }
      },
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
