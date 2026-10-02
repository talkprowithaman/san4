// ─────────────────────────────────────────────────────────────────────────────
// Ink — the San4 app design system (Claude Design handoff, Sept 2026).
//
// Near-black ink, one purple accent, teal as the only "signal" colour, amber
// for warnings. Outfit for numbers and headlines, DM Sans for body, DM Mono for
// small uppercase labels. Every value here is lifted from the design file, so
// screens can match it exactly with inline styles.
// ─────────────────────────────────────────────────────────────────────────────

export const C = {
  ink:      '#0A0A0C',   // app background
  panel:    '#0E0E12',   // list rows inside a hairline group
  card:     'linear-gradient(165deg,#121218,#0C0C10)',
  cardHi:   'linear-gradient(165deg,#16121F,#0C0C10)', // purple-tinted hero card
  paper:    '#F2F2F0',   // primary text + primary (light) button
  dim:      '#9A9AA8',   // secondary text, never darker (contrast)
  soft:     '#C9C9D2',   // body copy on dark
  bubble:   '#E6E6EA',
  purple:   '#7B5EA7',
  lilac:    '#A98CE0',
  teal:     '#00C49A',
  tealInk:  '#04140F',   // text on a teal button
  amber:    '#F59E0B',
  blue:     '#4FACFE',
  ice:      '#7FC9FF',
  orange:   '#FF6B35',
  violet:   '#8B5CF6',
  red:      '#F87171',
  line:     'rgba(255,255,255,.08)',
  line2:    'rgba(255,255,255,.12)',
  line3:    'rgba(255,255,255,.14)',
  fill:     'rgba(255,255,255,.035)',
  fill2:    'rgba(255,255,255,.025)',
}

export const F = {
  display: 'Outfit, sans-serif',
  sans:    "'DM Sans', sans-serif",
  mono:    "'DM Mono', ui-monospace, monospace",
}

// Light credential surface (the exported card lands on a white feed).
export const PAPER = {
  bg:     '#F4F2ED',
  ink:    '#14141A',
  label:  '#55555F',
  body:   '#54545E',
  teal:   '#0E9E80',
  tealDk: '#06705C',
}

// Zone colours for the Climb, as designed.
export const ZONE_COLORS = {
  base:            '#4FACFE',
  lower:           '#00C49A',
  high:            '#FF6B35',
  summit_approach: '#8B5CF6',
  pro:             '#F59E0B',
}

// Small helpers for the recurring type styles.
export const mono = (size = 10, color = C.dim, spacing = '.16em', weight = 500) => ({
  font: `${weight} ${size}px ${F.mono}`, letterSpacing: spacing, color,
})
export const display = (size, weight = 300, spacing = '-.02em') => ({
  fontFamily: F.display, fontWeight: weight, fontSize: size, letterSpacing: spacing,
})
