// ─────────────────────────────────────────────────────────────────────────────
// Gemini proxy — keeps the API key server-side
//
// The client (web + Android APK) never holds the Gemini key. It POSTs a
// { model, contents, systemInstruction?, generationConfig? } request here and
// this function forwards it to Gemini using the server-only GEMINI_API_KEY.
//
// Required Vercel env var:
//   GEMINI_API_KEY  — same value you previously had in VITE_GEMINI_API_KEY
//
// Optional (recommended) — gates the proxy to logged-in users so it can't be
// abused as an open Gemini relay. If unset, the proxy still works but is open:
//   SUPABASE_URL                (or VITE_SUPABASE_URL)
//   SUPABASE_SERVICE_ROLE_KEY   (or SUPABASE_ANON_KEY)
// ─────────────────────────────────────────────────────────────────────────────
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'

const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

// Validate the caller's Supabase session. Returns { ok } — when Supabase env
// isn't configured we skip the check so the proxy still works out of the box.
async function verifyUser(req) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return { ok: true, skipped: true }
  const header = req.headers.authorization || ''
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return { ok: false }
  try {
    const supa = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data, error } = await supa.auth.getUser(token)
    if (error || !data?.user) return { ok: false }
    return { ok: true, userId: data.user.id }
  } catch {
    return { ok: false }
  }
}

export default async function handler(req, res) {
  // CORS — the Android app calls from origin https://localhost (cross-origin
  // to the Vercel domain). The Supabase JWT is the real access gate.
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' })
  if (!genAI)                  return res.status(500).json({ error: 'GEMINI_API_KEY not configured' })

  const auth = await verifyUser(req)
  if (!auth.ok) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const { model, contents, systemInstruction, generationConfig } = req.body || {}
    if (!model || !Array.isArray(contents)) {
      return res.status(400).json({ error: 'Missing model or contents' })
    }

    const m = genAI.getGenerativeModel({ model, systemInstruction, generationConfig })
    const result = await m.generateContent({ contents })
    return res.status(200).json({ text: result.response.text() })
  } catch (err) {
    console.error('Gemini proxy error:', err.message)
    return res.status(502).json({ error: 'Upstream error', detail: err.message })
  }
}
