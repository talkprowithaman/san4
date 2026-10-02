// ─────────────────────────────────────────────────────────────────────────────
// The San4 credential — a score someone else can check.
//
// The card is LIGHT by default because it lands on a white feed (LinkedIn,
// a CV PDF). Cream paper, hairline rules, the Outfit numeral doing the work,
// the logo deliberately small, one teal verification tick. No gradient, no
// glow, nothing that reads as a game achievement.
//
// Publishing writes through the publish_credential() RPC (see
// supabase/migrations/credentials.sql), which recomputes the score from the
// account's own session history and checks the Pro plan server-side.
// ─────────────────────────────────────────────────────────────────────────────
import { Capacitor } from '@capacitor/core'
import { supabase } from './supabase'
import { PAPER } from './ink'
import { scoreBand } from './san4Score'

// The public page must be a real web URL, also from inside the Android app.
const WEB_BASE = 'https://san4.vercel.app'
export const credentialBase = () => (Capacitor.isNativePlatform() ? WEB_BASE : window.location.origin)
export const credentialUrl = (code) => `${credentialBase()}/a/${code}`
export const credentialHost = (code) => `${credentialBase().replace(/^https?:\/\//, '')}/a/${code}`

export async function getMyCredential(userId) {
  if (!userId) return null
  try {
    const { data } = await supabase.from('credentials').select('*').eq('user_id', userId).maybeSingle()
    return data || null
  } catch {
    return null
  }
}

// Returns { code } or { error: 'pro_required' | 'no_score_yet' | 'setup' | 'failed' }.
export async function publishCredential({ comm, clarity, structure, name }) {
  const { data, error } = await supabase.rpc('publish_credential', {
    p_comm: Number.isFinite(comm) ? Math.round(comm) : null,
    p_clarity: Number.isFinite(clarity) ? Math.round(clarity) : null,
    p_structure: Number.isFinite(structure) ? Math.round(structure) : null,
    p_name: name || null,
  })
  if (error) {
    const msg = error.message || ''
    if (msg.includes('pro_required')) return { error: 'pro_required' }
    if (msg.includes('no_score_yet')) return { error: 'no_score_yet' }
    // Function missing → the SQL migration hasn't been run yet.
    if (error.code === 'PGRST202' || msg.includes('Could not find the function')) return { error: 'setup' }
    return { error: 'failed' }
  }
  return { code: data }
}

export async function getPublicCredential(code) {
  try {
    const { data, error } = await supabase.rpc('get_credential', { p_code: code })
    if (error) return null
    return Array.isArray(data) ? data[0] || null : data
  } catch {
    return null
  }
}

// LinkedIn "Add to profile" → Licenses & certifications, pre-filled.
export function linkedInAddUrl({ score, code, date = new Date() }) {
  const band = scoreBand(score)?.name || ''
  const d = new Date(date)
  const p = new URLSearchParams({
    startTask: 'CERTIFICATION_NAME',
    name: `San4 Score ${score} · ${band}`,
    organizationName: 'San4',
    issueYear: String(d.getFullYear()),
    issueMonth: String(d.getMonth() + 1),
  })
  if (code) {
    p.set('certUrl', credentialUrl(code))
    p.set('certId', code)
  }
  return `https://www.linkedin.com/profile/add?${p.toString()}`
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
export const fmtCredDate = (d) => {
  if (!d) return ''
  const x = new Date(d)
  return Number.isNaN(x.getTime()) ? '' : `${x.getDate()} ${MONTHS[x.getMonth()]} ${x.getFullYear()}`
}

// ── PNG export of the light card (1200×760, 2x of the 420px design) ─────────
function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

export async function renderCredentialPng({ score, name, sessions, date, code, clarity, structure }) {
  try { await document.fonts?.ready } catch { /* draw with fallbacks */ }
  const S = 2.6 // scale from the 420px-wide design card
  const W = Math.round(420 * S)
  const hasSubs = Number.isFinite(clarity) || Number.isFinite(structure)
  const H = Math.round((hasSubs ? 330 : 270) * S)
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')
  const band = scoreBand(score)

  ctx.fillStyle = PAPER.bg
  roundRect(ctx, 0, 0, W, H, 22 * S); ctx.fill()

  const pad = 34 * S
  // Header: small logo + SAN4, VERIFIED CREDENTIAL
  const icon = await loadImage('/san4-icon.png')
  if (icon) {
    ctx.save(); roundRect(ctx, pad, 34 * S, 26 * S, 26 * S, 8 * S); ctx.clip()
    ctx.drawImage(icon, pad, 34 * S, 26 * S, 26 * S); ctx.restore()
  }
  ctx.fillStyle = PAPER.ink
  ctx.font = `600 ${16 * S}px Outfit, sans-serif`
  ctx.textBaseline = 'middle'
  ctx.fillText('SAN4', pad + 36 * S, 47 * S)
  ctx.font = `500 ${9.5 * S}px 'DM Mono', monospace`
  ctx.fillStyle = PAPER.label
  ctx.textAlign = 'right'
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${1.9 * S}px`
  ctx.fillText('VERIFIED CREDENTIAL', W - pad, 47 * S)
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px'
  ctx.textAlign = 'left'

  // Ring
  const cx = pad + 59 * S, cy = 94 * S + 59 * S, r = 54 * S
  ctx.lineWidth = 3 * S
  ctx.strokeStyle = 'rgba(0,0,0,.09)'
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke()
  ctx.strokeStyle = PAPER.teal; ctx.lineCap = 'round'
  ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (score / 100)); ctx.stroke()
  ctx.fillStyle = PAPER.ink
  ctx.font = `300 ${50 * S}px Outfit, sans-serif`
  ctx.textAlign = 'center'
  ctx.fillText(String(score), cx, cy + 2 * S)
  ctx.textAlign = 'left'

  // Band + blurb
  const tx = pad + 118 * S + 22 * S
  ctx.fillStyle = PAPER.label
  ctx.font = `500 ${9.5 * S}px 'DM Mono', monospace`
  ctx.fillText('SAN4 SCORE', tx, 128 * S)
  ctx.fillStyle = PAPER.ink
  ctx.font = `500 ${26 * S}px Outfit, sans-serif`
  ctx.fillText(band.name, tx, 156 * S)
  ctx.fillStyle = PAPER.body
  ctx.font = `400 ${12.5 * S}px 'DM Sans', sans-serif`
  ctx.fillText(band.blurb, tx, 182 * S)
  ctx.fillText(`Scored across ${sessions} timed speaking session${sessions === 1 ? '' : 's'}.`, tx, 199 * S)

  // Rule
  let y = 238 * S
  ctx.fillStyle = 'rgba(0,0,0,.1)'
  ctx.fillRect(pad, y, W - pad * 2, 1 * S)

  if (hasSubs) {
    y += 22 * S
    let x = pad
    for (const [label, v] of [['CLARITY', clarity], ['STRUCTURE', structure]]) {
      if (!Number.isFinite(v)) continue
      ctx.fillStyle = PAPER.label; ctx.font = `500 ${9 * S}px 'DM Mono', monospace`
      ctx.fillText(label, x, y)
      ctx.fillStyle = PAPER.ink; ctx.font = `400 ${21 * S}px Outfit, sans-serif`
      ctx.fillText(String(v), x, y + 22 * S)
      x += 110 * S
    }
    y += 58 * S
  } else {
    y += 26 * S
  }

  // Footer: name + sessions/date, verify chip
  ctx.fillStyle = PAPER.ink; ctx.font = `600 ${14 * S}px 'DM Sans', sans-serif`
  ctx.fillText(name || 'San4 member', pad, y)
  ctx.fillStyle = '#6E6E7A'; ctx.font = `500 ${10 * S}px 'DM Mono', monospace`
  ctx.fillText(`${sessions} SESSION${sessions === 1 ? '' : 'S'} · ASSESSED ${fmtCredDate(date)}`, pad, y + 18 * S)

  if (code) {
    const label = credentialHost(code)
    ctx.font = `500 ${9.5 * S}px 'DM Mono', monospace`
    const tw = ctx.measureText(label).width
    const cw = tw + 34 * S, ch = 26 * S
    const bx = W - pad - cw, by = y - 4 * S
    ctx.strokeStyle = 'rgba(14,158,128,.4)'; ctx.lineWidth = 1 * S
    roundRect(ctx, bx, by, cw, ch, 8 * S); ctx.stroke()
    ctx.strokeStyle = PAPER.teal; ctx.lineWidth = 2 * S
    ctx.beginPath(); ctx.moveTo(bx + 10 * S, by + 13 * S); ctx.lineTo(bx + 13 * S, by + 16 * S); ctx.lineTo(bx + 19 * S, by + 9 * S); ctx.stroke()
    ctx.fillStyle = PAPER.tealDk
    ctx.fillText(label, bx + 25 * S, by + 13 * S)
  }

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
}
