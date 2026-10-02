import { PAPER, F } from '../../lib/ink'
import { scoreBand } from '../../lib/san4Score'
import { credentialHost, fmtCredDate } from '../../lib/credential'
import { ScoreRing, CheckIcon } from './Ink'

// The light credential card (design 2a / screen 19). Reads as a credential,
// not a game achievement: cream paper, hairlines, one teal tick.
export default function CredentialCard({ score, name, sessions = 0, date, code, clarity, structure }) {
  const band = score != null ? scoreBand(score) : null
  const blurb = score == null ? 'Take the 2-minute test to get your number.'
    : score >= 70 ? band.blurb : 'Keep going. Seventy is where it starts paying off.'
  return (
    <div style={{ background: PAPER.bg, borderRadius: 20, padding: 22, color: PAPER.ink }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <img src="/san4-icon.png" alt="San4" width={22} height={22} style={{ borderRadius: 7, display: 'block' }} />
          <span style={{ fontFamily: F.display, fontWeight: 600, fontSize: 14, letterSpacing: '.02em' }}>SAN4</span>
        </div>
        <span style={{ font: `500 9px ${F.mono}`, letterSpacing: '.2em', color: PAPER.label }}>VERIFIED CREDENTIAL</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18 }}>
        <ScoreRing score={score} size={96} stroke={3} color={PAPER.teal} track="rgba(0,0,0,.09)" label={null} numSize={40} numColor={PAPER.ink} />
        <div style={{ flex: 1, paddingBottom: 6, minWidth: 0 }}>
          <div style={{ font: `500 9px ${F.mono}`, letterSpacing: '.18em', color: PAPER.label, marginBottom: 6 }}>SAN4 SCORE</div>
          <div style={{ fontFamily: F.display, fontWeight: 500, fontSize: 21, letterSpacing: '-.015em' }}>{band ? band.name : 'Not yet'}</div>
          <p style={{ margin: '6px 0 0', fontSize: 11.5, lineHeight: 1.45, color: PAPER.body }}>{blurb}</p>
        </div>
      </div>
      {(Number.isFinite(clarity) || Number.isFinite(structure)) && (
        <div style={{ display: 'flex', gap: 24, marginTop: 16 }}>
          {[['CLARITY', clarity], ['STRUCTURE', structure]].filter(([, v]) => Number.isFinite(v)).map(([l, v]) => (
            <div key={l}>
              <div style={{ font: `500 9px ${F.mono}`, letterSpacing: '.16em', color: PAPER.label }}>{l}</div>
              <div style={{ fontFamily: F.display, fontSize: 19, fontWeight: 400, marginTop: 3 }}>{v}</div>
            </div>
          ))}
        </div>
      )}
      <div style={{ height: 1, background: 'rgba(0,0,0,.1)', margin: '18px 0 14px' }} />
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ font: `600 13px ${F.sans}` }}>{name || 'Your name'}</div>
          <div style={{ font: `500 9px ${F.mono}`, color: PAPER.label, marginTop: 4, letterSpacing: '.04em' }}>
            {sessions} SESSION{sessions === 1 ? '' : 'S'}{date ? ` · ${fmtCredDate(date)}` : ''}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 9px', border: `1px solid ${code ? 'rgba(6,112,92,.4)' : 'rgba(0,0,0,.15)'}`, borderRadius: 8, flex: 'none' }}>
          {code && <CheckIcon size={10} color={PAPER.tealDk} />}
          <span style={{ font: `500 9px ${F.mono}`, color: code ? PAPER.tealDk : PAPER.label, letterSpacing: '.08em' }}>
            {code ? credentialHost(code) : 'NOT PUBLISHED'}
          </span>
        </div>
      </div>
    </div>
  )
}
