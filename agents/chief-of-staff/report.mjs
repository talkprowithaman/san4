// ─────────────────────────────────────────────────────────────────────────────
// Chief of Staff agent — nightly WhatsApp digest for the founder.
//
// Collects: product metrics (Supabase), uptime (site + Supabase), engineering
// activity and CI failures (GitHub), and the open idea backlog (GitHub issues
// labelled `backlog`). Claude turns that into a short digest; if no
// ANTHROPIC_API_KEY is set, a plain template is used instead. Sent through the
// WhatsApp Business API via Twilio.
//
// Run:  node agents/chief-of-staff/report.mjs            (sends)
//       DRY_RUN=1 node agents/chief-of-staff/report.mjs  (prints, sends nothing)
//
// Every data source is optional and fails soft: a missing secret or an API
// error shows up as "unavailable" in the digest, never as a crashed job.
// Zero dependencies — Node 20+ built-ins only.
// ─────────────────────────────────────────────────────────────────────────────

const env = process.env
const DRY_RUN = env.DRY_RUN === '1'
const SITE_URL = env.SITE_URL || 'https://san4.vercel.app'
const SUPABASE_URL = env.SUPABASE_URL
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY
const REPO = env.GITHUB_REPOSITORY
const GH_TOKEN = env.GITHUB_TOKEN
const SINCE = new Date(Date.now() - 24 * 60 * 60 * 1000)

// Approximate monthly price (₹) per plan, for a rough MRR figure only.
const PLAN_PRICE = { pro: 299, pro_plus: 999 }

const safe = async (label, fn) => {
  try {
    return await fn()
  } catch (e) {
    return { error: `${label}: ${String(e.message || e).slice(0, 120)}` }
  }
}

// ── Supabase ─────────────────────────────────────────────────────────────────
async function sbCount(table, filter = '') {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*${filter}`, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      Prefer: 'count=exact',
      Range: '0-0',
    },
    signal: AbortSignal.timeout(20000),
  })
  if (!r.ok) throw new Error(`${table} HTTP ${r.status}`)
  const total = (r.headers.get('content-range') || '').split('/')[1]
  return Number(total) || 0
}

async function collectProduct() {
  if (!SUPABASE_URL || !SERVICE_KEY) return { error: 'Supabase secrets not set' }
  const since = encodeURIComponent(SINCE.toISOString())
  const [users, newUsers, sessions, waitlist, pro, proPlus] = await Promise.all([
    sbCount('profiles'),
    sbCount('profiles', `&created_at=gte.${since}`),
    sbCount('practice_sessions', `&created_at=gte.${since}`),
    sbCount('waitlist', `&created_at=gte.${since}`),
    sbCount('subscriptions', '&status=eq.active&plan=eq.pro'),
    sbCount('subscriptions', '&status=eq.active&plan=eq.pro_plus'),
  ].map(p => p.catch(() => null)))
  const mrr =
    pro != null && proPlus != null
      ? pro * PLAN_PRICE.pro + proPlus * PLAN_PRICE.pro_plus
      : null
  return { users, newUsers, sessions, waitlist, pro, proPlus, approxMrrInr: mrr }
}

// ── Uptime ───────────────────────────────────────────────────────────────────
async function probe(url, headers = {}) {
  const t0 = Date.now()
  const r = await fetch(url, { headers, signal: AbortSignal.timeout(15000) })
  return { ok: r.ok, status: r.status, ms: Date.now() - t0 }
}

async function collectUptime() {
  const site = await safe('site', () => probe(SITE_URL))
  const auth = SUPABASE_URL
    ? await safe('auth', () =>
        probe(`${SUPABASE_URL}/auth/v1/health`, { apikey: SERVICE_KEY || '' }))
    : { error: 'Supabase URL not set' }
  return { site, auth }
}

// ── GitHub ───────────────────────────────────────────────────────────────────
async function gh(path) {
  const r = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
    headers: {
      Authorization: `Bearer ${GH_TOKEN}`,
      Accept: 'application/vnd.github+json',
    },
    signal: AbortSignal.timeout(20000),
  })
  if (!r.ok) throw new Error(`GitHub HTTP ${r.status} ${path.split('?')[0]}`)
  return r.json()
}

async function collectEngineering() {
  if (!REPO || !GH_TOKEN) return { error: 'GitHub token/repo not set' }
  const [runs, prs, backlog] = await Promise.all([
    gh('/actions/runs?status=completed&per_page=50').catch(e => ({ error: e.message })),
    gh('/pulls?state=closed&sort=updated&direction=desc&per_page=20').catch(() => []),
    gh('/issues?labels=backlog&state=open&per_page=30').catch(() => []),
  ])
  const failedRuns = (runs.workflow_runs || [])
    .filter(r => r.conclusion === 'failure' && new Date(r.created_at) >= SINCE)
    .filter(r => r.name !== 'Nightly report')
    .map(r => r.name)
  const merged = (Array.isArray(prs) ? prs : [])
    .filter(p => p.merged_at && new Date(p.merged_at) >= SINCE)
    .map(p => p.title)
  const ideas = (Array.isArray(backlog) ? backlog : [])
    .filter(i => !i.pull_request)
    .map(i => `#${i.number} ${i.title}`)
  return {
    failedRuns: [...new Set(failedRuns)],
    merged,
    backlogCount: ideas.length,
    backlogTop: ideas.slice(0, 3),
  }
}

// ── Digest writing ───────────────────────────────────────────────────────────
function templateDigest(d) {
  const p = d.product
  const lines = [`*San4 nightly — ${d.date}*`, '']
  if (p.error) lines.push(`📊 Product data unavailable (${p.error})`)
  else {
    lines.push(
      `📊 *Product*: ${p.newUsers ?? '?'} new signups (${p.users ?? '?'} total), ` +
        `${p.sessions ?? '?'} practice sessions, ${p.waitlist ?? '?'} waitlist`,
      `💰 Paid: ${p.pro ?? '?'} Pro + ${p.proPlus ?? '?'} Elite` +
        (p.approxMrrInr != null ? ` (~₹${p.approxMrrInr}/mo)` : ''),
    )
  }
  const up = x => (x?.error ? `unknown (${x.error})` : x.ok ? `up ${x.ms}ms` : `DOWN (HTTP ${x.status})`)
  lines.push(`🟢 Site ${up(d.uptime.site)} · Auth ${up(d.uptime.auth)}`)
  const e = d.engineering
  if (e.error) lines.push(`🛠 Engineering data unavailable`)
  else {
    lines.push(
      e.failedRuns.length
        ? `🔴 CI failed: ${e.failedRuns.join(', ')}`
        : '✅ CI: no failures in 24h',
    )
    if (e.merged.length) lines.push(`🚀 Shipped: ${e.merged.slice(0, 3).join('; ')}`)
    if (e.backlogCount)
      lines.push(`📝 Backlog (${e.backlogCount}): ${e.backlogTop.join(' | ')}`)
  }
  lines.push('', 'Reply with an idea to add it to the backlog, or "backlog" to list it.')
  return lines.join('\n')
}

async function claudeDigest(d) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: env.CLAUDE_MODEL || 'claude-haiku-5-5',
      max_tokens: 700,
      system:
        'You are the Chief of Staff for San4, an India-first AI communication coach run by a solo founder. ' +
        'Write the founder\'s nightly WhatsApp digest from the JSON data. Rules: plain text, WhatsApp bold with *single asterisks*, ' +
        'no markdown headers, MAX 900 characters, lead with anything broken or urgent, then numbers, then what shipped, ' +
        'then end with ONE suggested priority for tomorrow based only on the data. Never invent numbers; ' +
        'if a source is unavailable say so in a few words. Last line: ' +
        '"Reply with an idea to add it to the backlog, or \\"backlog\\" to list it."',
      messages: [{ role: 'user', content: JSON.stringify(d) }],
    }),
    signal: AbortSignal.timeout(45000),
  })
  if (!r.ok) throw new Error(`Anthropic HTTP ${r.status}`)
  const j = await r.json()
  const text = (j.content || []).map(c => c.text || '').join('').trim()
  if (!text) throw new Error('empty completion')
  return text
}

// ── WhatsApp (Twilio) ────────────────────────────────────────────────────────
async function sendWhatsApp(body) {
  const { TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: token,
          TWILIO_WHATSAPP_FROM: from, OWNER_WHATSAPP_TO: to,
          TWILIO_CONTENT_SID: contentSid } = env
  if (!sid || !token || !from || !to) throw new Error('Twilio/WhatsApp secrets not set')
  const form = new URLSearchParams({
    From: from.startsWith('whatsapp:') ? from : `whatsapp:${from}`,
    To: to.startsWith('whatsapp:') ? to : `whatsapp:${to}`,
  })
  // Outside WhatsApp's 24h customer-service window only approved templates
  // may be sent. With a template, the digest goes in variable {{1}}.
  if (contentSid) {
    form.set('ContentSid', contentSid)
    form.set('ContentVariables', JSON.stringify({ 1: body.replace(/\n{2,}/g, '\n').slice(0, 1000) }))
  } else {
    form.set('Body', body.slice(0, 1500))
  }
  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form,
    signal: AbortSignal.timeout(20000),
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(`Twilio HTTP ${r.status}: ${j.message || 'send failed'}`)
  return j.sid
}

// ── Main ─────────────────────────────────────────────────────────────────────
const [product, uptime, engineering] = await Promise.all([
  safe('product', collectProduct),
  safe('uptime', collectUptime),
  safe('engineering', collectEngineering),
])
const data = {
  date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }),
  product, uptime, engineering,
}

let digest
if (env.ANTHROPIC_API_KEY) {
  digest = await claudeDigest(data).catch(e => {
    console.warn(`Claude digest failed (${e.message}); using template.`)
    return templateDigest(data)
  })
} else {
  digest = templateDigest(data)
}

console.log('─── digest ───\n' + digest + '\n──────────────')

if (DRY_RUN) {
  console.log('DRY_RUN=1 — not sending.')
} else {
  const sid = await sendWhatsApp(digest)
  console.log(`Sent via Twilio: ${sid}`)
}
