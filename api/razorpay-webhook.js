// ─────────────────────────────────────────────────────────────────────────────
// Razorpay webhook → Supabase entitlement
//
// Flow: user pays on the rzp.io payment link → Razorpay fires
// `payment.captured` → this function verifies the HMAC signature, finds the
// Supabase user by the payer's email, and upserts subscriptions.plan.
//
// Required Vercel env vars (Project → Settings → Environment Variables):
//   RAZORPAY_WEBHOOK_SECRET    — set when creating the webhook in Razorpay
//   SUPABASE_SERVICE_ROLE_KEY  — Supabase → Settings → API → service_role
//   SUPABASE_URL               — falls back to VITE_SUPABASE_URL if unset
//
// Razorpay dashboard setup: Account & Settings → Webhooks → Add:
//   URL:    https://<your-domain>/api/razorpay-webhook
//   Secret: same value as RAZORPAY_WEBHOOK_SECRET
//   Events: payment.captured
// ─────────────────────────────────────────────────────────────────────────────
import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

// Disable Vercel's automatic body parsing — signature verification needs the
// exact raw bytes Razorpay sent.
export const config = { api: { bodyParser: false } }

// Map captured amount (paise) → plan. Anything unrecognised defaults to 'pro'
// so a legitimate payer is never left locked out by a price change.
const AMOUNT_TO_PLAN = {
  29900: 'pro',       // ₹299  — Vak Pro
  99900: 'pro_plus',  // ₹999  — Vak Elite
  159900: 'pro_plus', // ₹1599 — Vak Elite (alt price point)
}

async function readRawBody(req) {
  if (typeof req.body === 'string') return req.body
  if (req.body && typeof req.body === 'object') return JSON.stringify(req.body)
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  return Buffer.concat(chunks).toString('utf8')
}

function verifySignature(rawBody, signature, secret) {
  if (!signature) return false
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

// auth.users isn't exposed through PostgREST, so resolve email → user id via
// the admin API. Fine at prototype scale (single page covers 1000 users).
async function findUserIdByEmail(supabase, email) {
  const target = email.trim().toLowerCase()
  let page = 1
  while (page <= 10) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    const match = data.users.find(u => (u.email || '').toLowerCase() === target)
    if (match) return match.id
    if (data.users.length < 1000) return null
    page += 1
  }
  return null
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret || !supabaseUrl || !serviceKey) {
    console.error('Webhook misconfigured — missing env vars')
    return res.status(500).json({ error: 'Server not configured' })
  }

  const rawBody = await readRawBody(req)

  if (!verifySignature(rawBody, req.headers['x-razorpay-signature'], secret)) {
    console.warn('Webhook signature verification failed')
    return res.status(401).json({ error: 'Invalid signature' })
  }

  let event
  try {
    event = JSON.parse(rawBody)
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' })
  }

  // Only act on captured payments. Acknowledge everything else with 200 so
  // Razorpay doesn't retry events we deliberately ignore.
  if (event.event !== 'payment.captured') {
    return res.status(200).json({ received: true, ignored: event.event })
  }

  const payment = event.payload?.payment?.entity
  const email =
    payment?.email ||
    event.payload?.payment_link?.entity?.customer?.email ||
    null

  if (!email) {
    console.error('payment.captured with no payer email', payment?.id)
    // 200 — retrying won't add an email; handle manually from the dashboard
    return res.status(200).json({ received: true, warning: 'no email on payment' })
  }

  const plan = AMOUNT_TO_PLAN[payment.amount] || 'pro'

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  try {
    const userId = await findUserIdByEmail(supabase, email)

    if (!userId) {
      // Payer used a different email than their San4 account. Don't fail the
      // webhook — log it for manual matching in the Razorpay dashboard.
      console.error(`No San4 account for payer email ${email} (payment ${payment.id})`)
      return res.status(200).json({ received: true, warning: 'no matching account' })
    }

    const periodEnd = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString()

    const { error } = await supabase
      .from('subscriptions')
      .upsert(
        {
          user_id: userId,
          plan,
          status: 'active',
          razorpay_subscription_id: payment.id,
          current_period_end: periodEnd,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
    if (error) throw error

    console.log(`Activated ${plan} for ${email} (payment ${payment.id}, ₹${payment.amount / 100})`)
    return res.status(200).json({ received: true, plan })
  } catch (err) {
    console.error('Webhook processing error:', err.message)
    // 500 → Razorpay retries with backoff, so transient Supabase errors self-heal
    return res.status(500).json({ error: 'Processing failed' })
  }
}
