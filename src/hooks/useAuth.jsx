import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { create } from 'zustand'

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
    // Get current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('*, subscriptions(*)')
      .eq('id', userId)
      .single()
    setProfile(data)
    setLoading(false)
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

  async function signOut() {
    await supabase.auth.signOut()
  }

  return { user, profile, loading, signUp, signIn, signOut, recordVoiceConsent }
}
