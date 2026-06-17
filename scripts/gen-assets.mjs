// Rasterises the branded Vak artwork (verified visually in _assetpreview.html)
// into the source PNGs @capacitor/assets needs, then you run:
//   npx @capacitor/assets generate --android
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'

mkdirSync('assets', { recursive: true })

// ── The Vak swan (mascot viewBox 0 0 160 180), confident level-5 styling ──
const VAK = `
  <g transform="translate(42,140) rotate(74)">
    <path d="M 0,5 C -26,-9 -64,1 -76,13 C -63,29 -26,24 0,18 Z" fill="#EBF5FD"/>
    <path d="M -1,11 C -23,7 -54,13 -65,21 C -50,27 -23,21 -1,16 Z" fill="#B8D8EE" opacity="0.28"/>
  </g>
  <g transform="translate(118,140) rotate(-74)">
    <path d="M 0,5 C 26,-9 64,1 76,13 C 63,29 26,24 0,18 Z" fill="#EBF5FD"/>
    <path d="M 1,11 C 23,7 54,13 65,21 C 50,27 23,21 1,16 Z" fill="#B8D8EE" opacity="0.28"/>
  </g>
  <ellipse cx="80" cy="148" rx="40" ry="27" fill="#E8F4FC"/>
  <ellipse cx="77" cy="153" rx="27" ry="15" fill="#B0D0E8" opacity="0.2"/>
  <path d="M 40,148 Q 27,160 33,170 Q 44,158 53,152 Z" fill="#C0DCEE" opacity="0.42"/>
  <path d="M 82,122 C 64,96 114,93 97,68" stroke="#DFF0FA" stroke-width="21" stroke-linecap="round" fill="none"/>
  <circle cx="96" cy="50" r="21" fill="#EAF5FD"/>
  <ellipse cx="96" cy="26" rx="5" ry="9.5" fill="#8B5CF6"/>
  <circle cx="96" cy="18" r="4" fill="#C4B5FD"/>
  <ellipse cx="85" cy="29" rx="4" ry="7.5" transform="rotate(-22 85 29)" fill="#6366F1"/>
  <circle cx="80" cy="23" r="2.8" fill="#818CF8"/>
  <ellipse cx="107" cy="29" rx="4" ry="7.5" transform="rotate(22 107 29)" fill="#6366F1"/>
  <circle cx="112" cy="23" r="2.8" fill="#818CF8"/>
  <circle cx="107" cy="46" r="7.5" fill="white"/>
  <circle cx="107" cy="46" r="5.2" fill="#0A0F1E"/>
  <circle cx="109" cy="43" r="2.2" fill="white"/>
  <circle cx="107" cy="46" r="7" fill="none" stroke="#F59E0B" stroke-width="1.4" opacity="0.7"/>
  <path d="M 115,50 L 128,54 L 115,58 Q 113,54 115,50 Z" fill="#F59E0B"/>
`

const BG_GRADIENT = `
  <radialGradient id="bg" cx="38%" cy="30%" r="88%">
    <stop offset="0%" stop-color="#5A4690"/>
    <stop offset="48%" stop-color="#241B42"/>
    <stop offset="100%" stop-color="#070B1A"/>
  </radialGradient>`

const iconOnly = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>${BG_GRADIENT}</defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <g transform="translate(216,150) scale(3.7)">${VAK}</g>
</svg>`

const iconBackground = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>${BG_GRADIENT}</defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
</svg>`

// Foreground art kept smaller/centred so launcher masks never clip the swan.
const iconForeground = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <g transform="translate(252,176) scale(3.3)">${VAK}</g>
</svg>`

// Splash: just the swan on the brand navy (no text → no font dependency).
const splash = `<svg xmlns="http://www.w3.org/2000/svg" width="2732" height="2732" viewBox="0 0 2732 2732">
  <rect width="2732" height="2732" fill="#050810"/>
  <g transform="translate(766,646) scale(7.5)">${VAK}</g>
</svg>`

async function png(svg, file, size) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(`assets/${file}`)
  console.log('✓', file, `${size}×${size}`)
}

await png(iconOnly,       'icon-only.png',       1024)
await png(iconBackground, 'icon-background.png', 1024)
await png(iconForeground, 'icon-foreground.png', 1024)
await png(splash,         'splash.png',          2732)
await png(splash,         'splash-dark.png',     2732)
console.log('Source assets written to assets/')
