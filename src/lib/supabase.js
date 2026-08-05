import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnon, {
  auth: {
    persistSession: true,      // keep the session in localStorage -> auto-login
    autoRefreshToken: true,    // silently refresh so it doesn't expire mid-use
    detectSessionInUrl: true,  // handle the OAuth/magic-link callback
  },
})
