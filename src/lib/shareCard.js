// ─────────────────────────────────────────────────────────────────────────────
// Share Card — a branded, WhatsApp/LinkedIn-ready image of the user's result.
// The growth loop: looking employable in public is the most shareable thing
// about San4 (Wordle grid, but for your voice).
//
// generateShareCard() draws a 1080x1350 card on canvas (Instagram portrait,
// also looks right on WhatsApp/LinkedIn) and returns a PNG blob.
// shareCard() uses the native share sheet when available, else downloads.
// ─────────────────────────────────────────────────────────────────────────────

const W = 1080
const H = 1350

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null) // card still renders without the icon
    img.src = src
  })
}

// opts: { big, bigColor?, label, sub?, streak?, name? }
//  big    → the hero stat ("B2", "87%", "3/3")
//  label  → what it is ("English Level", "Daily Rep Score", "Daily goal done")
//  sub    → one supporting line
export async function generateShareCard({ big, bigColor = '#7B5EA7', label, sub, streak, name }) {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  // Background: brand near-black with a soft purple glow
  ctx.fillStyle = '#0B1220'
  ctx.fillRect(0, 0, W, H)
  const glow = ctx.createRadialGradient(W / 2, H * 0.42, 80, W / 2, H * 0.42, 640)
  glow.addColorStop(0, 'rgba(123,94,167,0.28)')
  glow.addColorStop(1, 'rgba(123,94,167,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)

  // Header: swan icon + SAN4 wordmark
  const icon = await loadImage('/san4-icon.png')
  const headerY = 96
  if (icon) {
    const s = 88
    ctx.save()
    roundRect(ctx, W / 2 - 150, headerY, s, s, 22)
    ctx.clip()
    ctx.drawImage(icon, W / 2 - 150, headerY, s, s)
    ctx.restore()
  }
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.font = '900 64px Outfit, DM Sans, sans-serif'
  ctx.fillStyle = '#F4F0E8'
  ctx.fillText('SAN', W / 2 - 40, headerY + 46)
  const sanWidth = ctx.measureText('SAN').width
  ctx.fillStyle = '#7B5EA7'
  ctx.fillText('4', W / 2 - 40 + sanWidth, headerY + 46)

  // Label
  ctx.textAlign = 'center'
  ctx.font = '700 40px DM Sans, sans-serif'
  ctx.fillStyle = '#6B8CAE'
  ctx.fillText(label.toUpperCase(), W / 2, 360)

  // Hero stat
  ctx.font = '900 300px Outfit, DM Sans, sans-serif'
  ctx.fillStyle = bigColor
  ctx.fillText(big, W / 2, 580)

  // Supporting line (wraps to two lines max)
  if (sub) {
    ctx.font = '500 44px DM Sans, sans-serif'
    ctx.fillStyle = '#94A3B8'
    const words = sub.split(' ')
    const lines = ['']
    for (const w of words) {
      const test = (lines[lines.length - 1] + ' ' + w).trim()
      if (ctx.measureText(test).width > W - 220 && lines[lines.length - 1]) lines.push(w)
      else lines[lines.length - 1] = test
    }
    lines.slice(0, 2).forEach((line, i) => ctx.fillText(line, W / 2, 790 + i * 60))
  }

  // Streak chip
  if (streak > 0) {
    const chipW = 340
    roundRect(ctx, W / 2 - chipW / 2, 920, chipW, 92, 46)
    ctx.fillStyle = 'rgba(245,158,11,0.14)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(245,158,11,0.5)'
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.font = '700 44px DM Sans, sans-serif'
    ctx.fillStyle = '#F59E0B'
    ctx.fillText(`🔥 ${streak}-day streak`, W / 2, 968)
  }

  // Name
  if (name) {
    ctx.font = '700 46px Outfit, DM Sans, sans-serif'
    ctx.fillStyle = '#F4F0E8'
    ctx.fillText(name, W / 2, 1110)
  }

  // Footer
  ctx.font = '500 36px DM Sans, sans-serif'
  ctx.fillStyle = '#6B8CAE'
  ctx.fillText('Practise speaking with Vak, the AI communication coach', W / 2, 1210)
  ctx.font = '700 40px Outfit, DM Sans, sans-serif'
  ctx.fillStyle = '#7B5EA7'
  ctx.fillText('san4.vercel.app', W / 2, 1272)

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
}

// Native share sheet with the image when supported (Android/iOS/some desktop),
// otherwise download the PNG so the user can post it anywhere.
export async function shareCard(blob, text) {
  if (!blob) return false
  const file = new File([blob], 'san4-score.png', { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text })
      return true
    } catch { /* user cancelled or share failed; fall through to download */ }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'san4-score.png'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
  return true
}
