// ─────────────────────────────────────────────────────────────────────────────
// WhatsApp reply webhook → idea backlog
//
// The nightly digest (agents/chief-of-staff) is sent through Twilio. When the
// founder replies, Twilio POSTs here. Each reply becomes a GitHub issue
// labelled `backlog`; the next digest lists them. Texting "backlog" returns
// the open list instead.
//
// Security: (1) Twilio's X-Twilio-Signature is verified, and (2) only the
// owner's number is accepted. Anything else gets a 403 and is never stored.
//
// Vercel env vars:
//   TWILIO_AUTH_TOKEN      — verifies the signature
//   OWNER_WHATSAPP_TO      — e.g. whatsapp:+91XXXXXXXXXX (only sender allowed)
//   TWILIO_WEBHOOK_URL     — the exact public URL set in Twilio, e.g.
//                            https://san4.vercel.app/api/whatsapp-webhook
//   GH_BACKLOG_TOKEN       — fine-grained PAT, Issues: read & write on this repo
//   GITHUB_REPOSITORY      — owner/name
//
// Twilio setup: Messaging → WhatsApp sender (or sandbox) → "When a message
// comes in" → POST to the URL above.
// ─────────────────────────────────────────────────────────────────────────────
import crypto from 'node:crypto'

const twiml = text =>
  `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${String(text)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</Message></Response>`

function validSignature(url, params, signature, token) {
  if (!signature) return false
  const data = url + Object.keys(params).sort().map(k => k + params[k]).join('')
  const expected = crypto.createHmac('sha1', token).update(data).digest('base64')
  const a = Buffer.from(expected), b = Buffer.from(signature)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

const gh = (path, init = {}) =>
  fetch(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.GH_BACKLOG_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
  })

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { TWILIO_AUTH_TOKEN, OWNER_WHATSAPP_TO, TWILIO_WEBHOOK_URL,
          GH_BACKLOG_TOKEN, GITHUB_REPOSITORY } = process.env
  if (!TWILIO_AUTH_TOKEN || !OWNER_WHATSAPP_TO || !TWILIO_WEBHOOK_URL ||
      !GH_BACKLOG_TOKEN || !GITHUB_REPOSITORY) {
    console.error('whatsapp-webhook misconfigured — missing env vars')
    return res.status(500).end()
  }

  const params = req.body && typeof req.body === 'object' ? req.body : {}
  if (!validSignature(TWILIO_WEBHOOK_URL, params, req.headers['x-twilio-signature'], TWILIO_AUTH_TOKEN)) {
    return res.status(403).end()
  }
  const norm = s => String(s || '').replace(/^whatsapp:/, '').replace(/\s/g, '')
  if (norm(params.From) !== norm(OWNER_WHATSAPP_TO)) return res.status(403).end()

  const text = String(params.Body || '').trim()
  res.setHeader('Content-Type', 'text/xml')
  if (!text) return res.status(200).send(twiml('Empty message — send me an idea.'))

  try {
    if (/^(backlog|list)$/i.test(text)) {
      const r = await gh('/issues?labels=backlog&state=open&per_page=15')
      const issues = (await r.json()).filter(i => !i.pull_request)
      return res.status(200).send(twiml(
        issues.length
          ? `Backlog (${issues.length}):\n` + issues.map(i => `#${i.number} ${i.title}`).join('\n')
          : 'Backlog is empty.'))
    }

    const title = text.replace(/\s+/g, ' ').slice(0, 80)
    const r = await gh('/issues', {
      method: 'POST',
      body: JSON.stringify({
        title,
        body: `${text}\n\n_Added via WhatsApp on ${new Date().toISOString()}_`,
        labels: ['backlog'],
      }),
    })
    if (!r.ok) throw new Error(`GitHub HTTP ${r.status}`)
    const issue = await r.json()
    return res.status(200).send(twiml(`Logged as backlog #${issue.number} ✅`))
  } catch (e) {
    console.error('whatsapp-webhook error:', e.message)
    return res.status(200).send(twiml('Could not save that — try again in a minute.'))
  }
}
