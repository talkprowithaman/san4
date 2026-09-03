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

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
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

  return { user, profile, loading, signUp, signIn, signOut, recordVoiceConsent, resetPassword, updatePassword }
}
