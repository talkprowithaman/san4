// ─────────────────────────────────────────────────────────────────────────────
// Vak — the Hamsa swan of Saraswati
// Sanskrit: Vak (वाक्) = speech · Hamsa (हंस) = swan
//
// Level 1 (Hesitant):    wings folded, eye cast slightly down
// Level 2 (Aware):       wings starting to lift, looking forward
// Level 3 (Expressive):  wings half-spread, confident
// Level 4 (Influential): wings wide, golden glint in eye
// Level 5 (Vaksiddha):   full display — wings high, sparkles, golden aura
// ─────────────────────────────────────────────────────────────────────────────

const WING_ANGLE = { 1: 5, 2: 22, 3: 42, 4: 60, 5: 74 }

// Moods — Vak reacts to what's happening (expression sheet, in SVG):
//  neutral     default, driven purely by level
//  thinking    eye up, thought dots (Vak is analysing)
//  listening   eye locked forward, sound arcs by the ear (your turn to speak)
//  encouraging soft open beak, a crown sparkle (Vak is with you)
//  celebrating wings high, open beak, sparkles + confetti (you did it)
//  proud       golden aura and iris, calm (a strong result)
export default function VakMascot({ level = 1, size = 160, mood = 'neutral', className = '' }) {
  const celebrating = mood === 'celebrating'
  const thinking    = mood === 'thinking'
  const listening   = mood === 'listening'
  const encouraging = mood === 'encouraging'
  const proud       = mood === 'proud'

  const angle  = celebrating ? 74 : (WING_ANGLE[Math.min(5, Math.max(1, level))] || 5)
  const isL5   = level === 5 || celebrating
  const isL4p  = level >= 4 || celebrating || proud
  const isL3p  = level >= 3 || celebrating || proud || encouraging
  const isL2p  = level >= 2 || celebrating || proud || encouraging || listening

  // Eye: down when hesitant, up when thinking, locked forward when listening
  const pupil = thinking
    ? { cx: 105, cy: 43 }
    : listening
    ? { cx: 108, cy: 46 }
    : level <= 1 && mood === 'neutral'
    ? { cx: 105, cy: 48 }
    : { cx: 107, cy: 46 }

  const beakOpen = celebrating || encouraging

  return (
    <svg
      width={size}
      height={size * 1.125}
      viewBox="0 0 160 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ overflow: 'visible' }}
    >
      {/* ── Ambient aura (level 3+) ─────────────────────────────────────── */}
      {isL3p && (
        <ellipse cx="80" cy="108"
          rx={isL5 ? 72 : 62} ry={isL5 ? 68 : 58}
          fill={isL4p ? '#F59E0B' : '#6366F1'}
          opacity={isL5 ? 0.18 : isL4p ? 0.11 : 0.07}
        />
      )}

      {/* ── Left wing ───────────────────────────────────────────────────── */}
      <g transform={`translate(42,140) rotate(${angle})`}>
        {/* Main wing */}
        <path d="M 0,5 C -26,-9 -64,1 -76,13 C -63,29 -26,24 0,18 Z"
          fill="#EBF5FD" opacity={level === 1 ? 0.65 : 0.92} />
        {/* Inner feather shadow */}
        <path d="M -1,11 C -23,7 -54,13 -65,21 C -50,27 -23,21 -1,16 Z"
          fill="#B8D8EE" opacity="0.28" />
        {/* Feather lines (level 3+) */}
        {isL3p && [0.28, 0.52, 0.76].map((t, i) => (
          <line key={i}
            x1={-76 * t}        y1={13 * (1 - t * 0.5)}
            x2={-76 * t * 0.87} y2={29 * t * 0.72}
            stroke={isL5 ? '#F59E0B' : '#9AC8E2'}
            strokeWidth="0.9"
            opacity={isL5 ? 0.7 : 0.42}
          />
        ))}
      </g>

      {/* ── Right wing ──────────────────────────────────────────────────── */}
      <g transform={`translate(118,140) rotate(-${angle})`}>
        <path d="M 0,5 C 26,-9 64,1 76,13 C 63,29 26,24 0,18 Z"
          fill="#EBF5FD" opacity={level === 1 ? 0.65 : 0.92} />
        <path d="M 1,11 C 23,7 54,13 65,21 C 50,27 23,21 1,16 Z"
          fill="#B8D8EE" opacity="0.28" />
        {isL3p && [0.28, 0.52, 0.76].map((t, i) => (
          <line key={i}
            x1={76 * t}        y1={13 * (1 - t * 0.5)}
            x2={76 * t * 0.87} y2={29 * t * 0.72}
            stroke={isL5 ? '#F59E0B' : '#9AC8E2'}
            strokeWidth="0.9"
            opacity={isL5 ? 0.7 : 0.42}
          />
        ))}
      </g>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <ellipse cx="80" cy="148" rx="40" ry="27" fill="#E8F4FC" />
      {/* Body depth */}
      <ellipse cx="77" cy="153" rx="27" ry="15" fill="#B0D0E8" opacity="0.2" />
      {/* Tail */}
      <path d="M 40,148 Q 27,160 33,170 Q 44,158 53,152 Z" fill="#C0DCEE" opacity="0.42" />
      {/* Wing-body overlap shadow */}
      <ellipse cx="80" cy="138" rx="34" ry="10" fill="#A8C8E0" opacity="0.14" />

      {/* ── Neck (iconic S-curve) ─────────────────────────────────────── */}
      {/* Outer neck body */}
      <path d="M 82,122 C 64,96 114,93 97,68"
        stroke="#DFF0FA" strokeWidth="21" strokeLinecap="round" fill="none" />
      {/* Neck shadow */}
      <path d="M 80,122 C 65,98 111,95 96,70"
        stroke="#A8C8E0" strokeWidth="7" strokeLinecap="round" fill="none" opacity="0.22" />

      {/* ── Head ────────────────────────────────────────────────────────── */}
      <circle cx="96" cy="50" r="21" fill="#EAF5FD" />
      <ellipse cx="93" cy="55" rx="13" ry="11" fill="#A8C8E0" opacity="0.16" />

      {/* ── Saraswati crown (Hamsa crest) ────────────────────────────── */}
      {/* Center lotus petal */}
      <ellipse cx="96" cy="26" rx="5" ry="9.5"
        fill="#8B5CF6" opacity={isL2p ? 1 : 0.32} />
      <circle cx="96" cy="18" r="4"
        fill="#C4B5FD" opacity={isL2p ? 1 : 0.28} />
      {/* Left petal */}
      <ellipse cx="85" cy="29" rx="4" ry="7.5"
        transform="rotate(-22, 85, 29)"
        fill="#6366F1" opacity={isL2p ? 0.88 : 0.22} />
      <circle cx="80" cy="23" r="2.8"
        fill="#818CF8" opacity={isL2p ? 0.92 : 0.2} />
      {/* Right petal */}
      <ellipse cx="107" cy="29" rx="4" ry="7.5"
        transform="rotate(22, 107, 29)"
        fill="#6366F1" opacity={isL2p ? 0.88 : 0.22} />
      <circle cx="112" cy="23" r="2.8"
        fill="#818CF8" opacity={isL2p ? 0.92 : 0.2} />
      {/* Crown glow for high levels */}
      {isL4p && (
        <ellipse cx="96" cy="20" rx="9" ry="7" fill="#A78BFA" opacity="0.38" />
      )}

      {/* ── Eye ─────────────────────────────────────────────────────────── */}
      <circle cx="107" cy="46" r="7.5" fill="white" />
      {/* Pupil — mood-aware (down when hesitant, up when thinking, forward when listening) */}
      <circle cx={pupil.cx} cy={pupil.cy} r="5.2" fill="#0A0F1E" />
      {/* Catchlight */}
      <circle cx="109" cy="43" r="2.2" fill="white" />
      {/* Golden iris ring (level 3+ or proud) */}
      {(isL3p || proud) && (
        <circle cx="107" cy="46" r="7"
          fill="none" stroke="#F59E0B" strokeWidth="1.2" opacity="0.48" />
      )}

      {/* ── Beak — opens when Vak is cheering you on ────────────────────── */}
      {beakOpen ? (
        <>
          <path d="M 115,49 L 128,50 L 115,55 Q 113,52 115,49 Z" fill="#F59E0B" />
          <path d="M 115,56 L 126,58 L 115,60 Q 113,58 115,56 Z" fill="#D97706" />
        </>
      ) : (
        <>
          <path d="M 115,50 L 128,54 L 115,58 Q 113,54 115,50 Z" fill="#F59E0B" />
          <line x1="115" y1="54" x2="128" y2="54"
            stroke="#D97706" strokeWidth="0.7" opacity="0.5" />
        </>
      )}

      {/* ── Thought dots (thinking) ─────────────────────────────────────── */}
      {thinking && (
        <g fill="#A78BFA">
          <circle cx="119" cy="30" r="2.2" opacity="0.55" />
          <circle cx="127" cy="22" r="3"   opacity="0.75" />
          <circle cx="137" cy="13" r="3.8" opacity="0.95" />
        </g>
      )}

      {/* ── Sound arcs (listening) ──────────────────────────────────────── */}
      {listening && (
        <g stroke="#00C49A" fill="none" strokeLinecap="round">
          <path d="M 134,46 Q 139,54 134,62" strokeWidth="2"   opacity="0.85" />
          <path d="M 141,42 Q 148,54 141,66" strokeWidth="1.6" opacity="0.5" />
        </g>
      )}

      {/* ── Crown sparkle (encouraging) ─────────────────────────────────── */}
      {encouraging && !isL5 && (
        <path d="M 122,16 L 123.6,12 L 125.2,16 L 129.2,17.6 L 125.2,19.2 L 123.6,23.2 L 122,19.2 L 118,17.6 Z"
          fill="#F59E0B" opacity="0.9" />
      )}

      {/* ── Confetti (celebrating) ──────────────────────────────────────── */}
      {celebrating && (
        <g>
          <circle cx="36"  cy="30"  r="2.4" fill="#00C49A" opacity="0.85" />
          <circle cx="132" cy="86"  r="2"   fill="#4FACFE" opacity="0.8" />
          <circle cx="44"  cy="92"  r="1.8" fill="#F59E0B" opacity="0.85" />
          <rect x="140" y="26" width="4" height="4" rx="1" transform="rotate(24,142,28)" fill="#A78BFA" opacity="0.9" />
          <rect x="24"  y="60" width="4" height="4" rx="1" transform="rotate(-18,26,62)" fill="#F87171" opacity="0.8" />
        </g>
      )}

      {/* ── Water ripples (level 2+) ────────────────────────────────────── */}
      {isL2p && (
        <g opacity="0.2">
          <ellipse cx="80" cy="174" rx="52" ry="6"
            stroke="#9AC8E0" strokeWidth="1.5" fill="none" />
          <ellipse cx="80" cy="179" rx="36" ry="4"
            stroke="#9AC8E0" strokeWidth="1" fill="none" />
        </g>
      )}

      {/* ── Level 5 sparkles ─────────────────────────────────────────────── */}
      {isL5 && (
        <>
          {/* 4-point gold star left */}
          <path d="M 13,66 L 15.5,60 L 18,66 L 24,68.5 L 18,71 L 15.5,77 L 13,71 L 7,68.5 Z"
            fill="#F59E0B" opacity="0.92" />
          {/* 4-point purple star right */}
          <path d="M 147,54 L 149,49 L 151,54 L 156,56 L 151,58 L 149,63 L 147,58 L 142,56 Z"
            fill="#A78BFA" opacity="0.9" />
          {/* Scattered dots */}
          <circle cx="20"  cy="118" r="2.5" fill="#00C49A" opacity="0.72" />
          <circle cx="152" cy="103" r="2"   fill="#F59E0B" opacity="0.65" />
          <circle cx="26"  cy="44"  r="1.8" fill="#A78BFA" opacity="0.8" />
          <circle cx="156" cy="40"  r="2"   fill="#F59E0B" opacity="0.65" />
        </>
      )}

      {/* ── Level 5 dashed orbit ─────────────────────────────────────────── */}
      {isL5 && (
        <circle cx="80" cy="108" r="70"
          fill="none" stroke="#F59E0B"
          strokeWidth="1" opacity="0.14"
          strokeDasharray="5 10"
        />
      )}
    </svg>
  )
}
