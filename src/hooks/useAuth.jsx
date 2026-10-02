import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { create } from 'zustand'
import { migrateGuestScores } from '../lib/san4Score'
import { identifyUser, resetAnalytics, track, EV } from '../lib/analytics'

// ── Global auth store ────────────────────────────────────────────────────────
export const useAuthStore = create((set) => ({
  user:    null,
  profile: null,
  loading: true,
  setUser:    (user)    => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
}))

// ── Hook: initialise + subscribe to auth changes ─────────────────────────────
export function useAuth() {
  const { user, profile, loading, setUser, setProfile, setLoading } = useAuthStore()

  useEffect(() => {
    // Absolute safety net: never let a stuck auth/profile call trap the app on
    // the loading screen (this was the "call-analyzer keeps loading" bug).
    const failsafe = setTimeout(() => setLoading(false), 6000)

    // Get current session (persisted in localStorage -> auto-login on revisit).
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null)
        if (session?.user) { onSignedIn(session.user); fetchProfile(session.user.id) }
        else setLoading(false)
      })
      .catch(() => setLoading(false))

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) { onSignedIn(session.user); fetchProfile(session.user.id) }
      else { setProfile(null); setLoading(false); resetAnalytics() }
    })

    return () => { clearTimeout(failsafe); subscription.unsubscribe() }
  }, [])

  // Runs once per sign-in. Rescues the score a guest earned before signing up
  // (see migrateGuestScores) and backfills the practice_sessions row that the
  // guest run skipped, so the assessment shows in history and feeds the living
  // San4 Score. Must never throw: this is a side-effect, not a gate.
  async function onSignedIn(u) {
    try {
      identifyUser(u.id)
      applyPendingSignup(u)
      const migrated = migrateGuestScores(u.id)
      if (!migrated) return

      track(EV.GUEST_SCORE_MIGRATED, { had_comm: migrated.comm != null, had_cefr: !!migrated.cefr })

      const result = migrated.cefr?.result
      if (!result) return

      // Only insert if this account has no assessment row yet (avoids dupes).
      const { data: existing } = await supabase
        .from('practice_sessions')
        .select('id')
        .eq('user_id', u.id)
        .eq('scenario_id', 'cefr_assessment')
        .limit(1)

      if (existing?.length) return

      await supabase.from('practice_sessions').insert({
        user_id:          u.id,
        scenario_id:      'cefr_assessment',
        scenario_title:   `🎯 CEFR Assessment — ${result.cefr_level}`,
        overall_score:    result.overall_score,
        confidence_score: result.fluency,
        pacing_score:     result.pronunciation,
        duration_seconds: 0,
        feedback:         result.band_description,
        action_item:      result.next_step,
        messages:         [],
      })
    } catch (e) {
      console.warn('guest score migration skipped:', e?.message)
    }
  }

  // Never throws: a failed/slow profile read must still release the loading gate
  // so the user reaches the page (or the login redirect) instead of hanging.
  async function fetchProfile(userId) {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*, subscriptions(*)')
        .eq('id', userId)
        .single()
      setProfile(data)
    } catch (e) {
      console.warn('fetchProfile failed:', e?.message)
    } finally {
      setLoading(false)
    }
  }

  async function signUp(email, password, name, consent) {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: {
        // consent.version/consentedAt are written into profiles by the
        // handle_new_user() trigger — see supabase/schema.sql. This keeps
        // the DPDP consent record atomic with account creation.
        data: {
          name,
          terms_consent_at: consent?.consentedAt,
          terms_version: consent?.version,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (!error) track(EV.SIGNUP_COMPLETED)
    return { data, error }
  }

  // Records mic/voice-processing consent the first time a user starts a
  // recorded practice session. Called from PracticeSession.jsx.
  // Must never throw: a failed write should re-ask next time, not trap the
  // user on the setup screen with a dead "Start Session" button. Also updates
  // the local profile optimistically so we don't re-ask within this session.
  async function recordVoiceConsent(userId) {
    const at = new Date().toISOString()
    const current = useAuthStore.getState().profile
    setProfile({ ...(current || { id: userId }), voice_consent_at: at })
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ voice_consent_at: at })
        .eq('id', userId)
      if (error) throw error
      return true
    } catch (e) {
      console.warn('recordVoiceConsent failed (will re-ask next login):', e.message)
      return false
    }
  }

  // ── Phone (+91) one-time code ─────────────────────────────────────────────
  // Creates the account on first use, so the DPDP consent travels in the
  // user metadata exactly like email signup (handle_new_user writes it).
  async function sendPhoneCode(phone, consent) {
    const { error } = await supabase.auth.signInWithOtp({
      phone,
      options: {
        shouldCreateUser: true,
        data: consent ? { terms_consent_at: consent.consentedAt, terms_version: consent.version } : undefined,
      },
    })
    return { error }
  }

  async function verifyPhoneCode(phone, token) {
    const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' })
    if (!error) track(EV.SIGNUP_COMPLETED, { method: 'phone' })
    return { data, error }
  }

  // ── Google ────────────────────────────────────────────────────────────────
  // OAuth can't carry custom metadata into handle_new_user, so consent (and
  // the onboarding goal) is parked locally and written on first sign-in by
  // applyPendingSignup().
  async function signInWithGoogle(consent) {
    if (consent) setPendingSignup({ consent })
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    return { error }
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
  }

  // Sends a one-tap sign-in link.
  // shouldCreateUser is FALSE on purpose: magic link is sign-IN only. If it
  // could create accounts it would bypass the signup form, and with it the DPDP
  // consent checkbox and the disposable-email block. New users must sign up
  // properly; this only lets existing ones back in without a password.
  async function signInWithMagicLink(email) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    return { error }
  }

  // Sends the "reset your password" email. The link lands on /auth/reset, which
  // exchanges the code for a short-lived session and lets them set a new one.
  async function resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset`,
    })
    return { error }
  }

  // Sets a new password for the user in the current (recovery) session.
  async function updatePassword(password) {
    const { error } = await supabase.auth.updateUser({ password })
    return { error }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return {
    user, profile, loading, signUp, signIn, signOut, recordVoiceConsent, resetPassword, updatePassword,
    signInWithMagicLink, sendPhoneCode, verifyPhoneCode, signInWithGoogle, updateName,
  }
}

// ── Display name (phone and Google signups may not have one yet) ──────────────
async function updateName(userId, name) {
  const clean = String(name || '').trim().slice(0, 80)
  if (!userId || !clean) return false
  const current = useAuthStore.getState().profile
  useAuthStore.getState().setProfile({ ...(current || { id: userId }), name: clean })
  try {
    const { error } = await supabase.from('profiles').update({ name: clean }).eq('id', userId)
    return !error
  } catch {
    return false
  }
}

// ── Pending signup details (consent, goal) applied after the first sign-in ────
const PENDING_KEY = 'san4_pending_signup'

export function setPendingSignup(patch) {
  try {
    const cur = JSON.parse(localStorage.getItem(PENDING_KEY) || '{}')
    localStorage.setItem(PENDING_KEY, JSON.stringify({ ...cur, ...patch }))
  } catch { /* ignore */ }
}

// Writes consent (if the account has none yet), the onboarding goal and a
// display name. Best-effort; never throws.
async function applyPendingSignup(u) {
  let pending = null
  try { pending = JSON.parse(localStorage.getItem(PENDING_KEY) || 'null') } catch { /* ignore */ }
  let goal = null
  try { goal = localStorage.getItem('san4_goal') } catch { /* ignore */ }
  if (!pending && !goal) return
  try {
    const { data: prof } = await supabase.from('profiles')
      .select('terms_consent_at, goal, name').eq('id', u.id).single()
    const patch = {}
    if (pending?.consent && !prof?.terms_consent_at) {
      patch.terms_consent_at = pending.consent.consentedAt
      patch.terms_version = pending.consent.version
    }
    if (goal && !prof?.goal) patch.goal = goal
    const metaName = u.user_metadata?.full_name || u.user_metadata?.name
    if (!prof?.name && (pending?.name || metaName)) patch.name = String(pending?.name || metaName).slice(0, 80)
    if (Object.keys(patch).length) await supabase.from('profiles').update(patch).eq('id', u.id)
    localStorage.removeItem(PENDING_KEY)
  } catch (e) {
    console.warn('pending signup details skipped:', e?.message)
  }
}
