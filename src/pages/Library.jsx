import { Link } from 'react-router-dom'
import { SCRIPTS } from '../lib/scripts'
import { C, F, mono } from '../lib/ink'
import { TabScreen } from '../components/ink/Ink'
import { ClimbHeader } from './Practice'

// ── 12 · Library — every tool that isn't the daily loop or the Climb ───────
const TOOLS = [
  { to: '/assessment',      title: 'English Score',   desc: 'Your CEFR level, the global standard', tag: 'TEST' },
  { to: '/daily-challenge', title: 'Daily Challenge', desc: 'Situation of the day',                 tag: 'DAILY' },
  { to: '/micro-drill',     title: 'Micro Drills',    desc: 'Rapid-fire speaking exercises',        tag: '2 MIN' },
  { to: '/script-reading',  title: 'Script Reading',  desc: 'Read aloud, get pacing feedback',      tag: `${SCRIPTS.length} SCRIPTS` },
  { to: '/meeting-prep',    title: 'Meeting Prep',    desc: 'Agenda in, talking points out',        tag: 'TOOL' },
  { to: '/call-analyzer',   title: 'Call Analyzer',   desc: 'Upload a recording, get coached',      tag: 'UPLOAD' },
  { to: '/body-language',   title: 'Body Language',   desc: 'On-camera presence feedback',          tag: 'CAMERA' },
  { to: '/reminders',       title: 'Reminders',       desc: 'Nudges that keep the habit',           tag: 'SETUP' },
  { to: '/dashboard',       title: 'Session History', desc: 'Every rep, every score',               tag: 'STATS' },
]

// One-line pitch per script, as designed.
const SCRIPT_SUB = {
  cabin_crew:       'Projection and pace, in front of a full cabin',
  news_anchor:      'Authority without shouting',
  ted_talk:         'Hold a room from the first line',
  weather_forecast: 'Numbers, read cleanly',
  ipl_commentary:   'Energy, at speed',
  product_launch:   'Conviction on a big stage',
}

export default function Library() {
  const readAloud = SCRIPTS.filter(s => SCRIPT_SUB[s.id])
  return (
    <TabScreen header={<ClimbHeader value="library" />}>
      <div style={{ ...mono(10, C.lilac), marginBottom: 10 }}>TOOLS</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: C.line, border: `1px solid ${C.line}`, borderRadius: 16, overflow: 'hidden', marginBottom: 22 }}>
        {TOOLS.map(t => (
          <Link key={t.to} to={t.to} style={{ textDecoration: 'none', background: C.panel, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', font: `600 13.5px ${F.sans}`, color: C.paper }}>{t.title}</span>
              <span style={{ display: 'block', font: `400 11.5px ${F.sans}`, color: C.dim, marginTop: 2 }}>{t.desc}</span>
            </span>
            <span style={{ ...mono(9, C.dim, '.1em'), flex: 'none' }}>{t.tag}</span>
          </Link>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, marginBottom: 10, flexWrap: 'wrap' }}>
        <span style={mono(10, C.lilac)}>READ ALOUD</span>
        <span style={{ font: `400 11px ${F.sans}`, color: C.dim }}>{readAloud.length} scripts, scored on pace and projection</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {readAloud.map(s => (
          <Link key={s.id} to={`/script-reading?script=${s.id}`} style={{
            textDecoration: 'none', border: `1px solid ${C.line}`, background: C.fill2, borderRadius: 16, padding: '14px 15px',
          }}>
            <span style={{ display: 'block', font: `600 13.5px ${F.sans}`, color: C.paper }}>{s.title}</span>
            <span style={{ display: 'block', font: `400 11.5px ${F.sans}`, color: C.dim, marginTop: 3 }}>{SCRIPT_SUB[s.id]}</span>
          </Link>
        ))}
      </div>
    </TabScreen>
  )
}
