// ResumeDocument — renders a structured resume in a clean, single-column,
// ATS-safe layout modelled on the reference CV: plain text, standard section
// headings, no tables/columns/graphics, selectable text so ATS parsers read it.
// Printing this element (via the parent's Download PDF) yields an ATS-friendly,
// text-based PDF. The San4 Score sits in the header so recruiters see it.

function Section({ title, children }) {
  return (
    <section className="rd-section">
      <h2 className="rd-h2">{title}</h2>
      {children}
    </section>
  )
}

export default function ResumeDocument({ resume, san4 }) {
  if (!resume) return null
  const r = resume
  const contact = [r.location, r.email, r.phone, r.linkedin, r.github, r.portfolio].filter(Boolean)

  return (
    <div className="rd-page" id="rd-page">
      <style>{RD_CSS}</style>

      {/* Header */}
      <header className="rd-head">
        <h1 className="rd-name">{r.name || 'Your Name'}</h1>
        {r.title && <div className="rd-title">{r.title}</div>}
        {contact.length > 0 && <div className="rd-contact">{contact.join('  |  ')}</div>}
        {san4?.score != null && (
          <div className="rd-san4">
            San4 Communication Score: <b>{san4.score}/100</b>{san4.band ? ` (${san4.band})` : ''}
            <span className="rd-san4-verify">  ·  verify at san4.vercel.app</span>
          </div>
        )}
      </header>

      {r.summary && (
        <Section title="Profile Summary">
          <p className="rd-p">{r.summary}</p>
        </Section>
      )}

      {r.experience?.length > 0 && (
        <Section title="Professional Experience">
          {r.experience.map((e, i) => (
            <div key={i} className="rd-exp">
              <div className="rd-exp-row">
                <span className="rd-exp-role">{[e.role, e.company].filter(Boolean).join('  |  ')}</span>
                <span className="rd-exp-dates">{[e.start, e.end].filter(Boolean).join(' – ')}</span>
              </div>
              {e.sub && <div className="rd-exp-sub">{e.sub}</div>}
              {e.bullets?.length > 0 && (
                <ul className="rd-ul">{e.bullets.map((b, j) => <li key={j}>{b}</li>)}</ul>
              )}
            </div>
          ))}
        </Section>
      )}

      {r.skills?.length > 0 && (
        <Section title="Skills">
          <ul className="rd-ul rd-skills">
            {r.skills.map((s, i) => (
              <li key={i}><b>{s.category}:</b> {(s.items || []).join(', ')}</li>
            ))}
          </ul>
        </Section>
      )}

      {r.certifications?.length > 0 && (
        <Section title="Certifications">
          <ul className="rd-ul">{r.certifications.map((c, i) => <li key={i}>{c}</li>)}</ul>
        </Section>
      )}

      {r.achievements?.length > 0 && (
        <Section title="Achievements">
          <ul className="rd-ul">{r.achievements.map((a, i) => <li key={i}>{a}</li>)}</ul>
        </Section>
      )}

      {r.education?.length > 0 && (
        <Section title="Education">
          {r.education.map((ed, i) => (
            <div key={i} className="rd-edu">
              <span className="rd-edu-deg">{[ed.degree, ed.institution].filter(Boolean).join(' - ')}</span>
              {ed.meta && <span className="rd-edu-meta">  {ed.meta}</span>}
            </div>
          ))}
        </Section>
      )}
    </div>
  )
}

const RD_CSS = `
  .rd-page {
    background: #fff; color: #1a1a1a; width: 794px; max-width: 100%;
    margin: 0 auto; padding: 40px 44px;
    font-family: Arial, Helvetica, 'Liberation Sans', sans-serif;
    font-size: 10.5pt; line-height: 1.35;
  }
  .rd-head { text-align: center; margin-bottom: 12px; }
  .rd-name { font-size: 20pt; font-weight: 700; letter-spacing: .5px; margin: 0 0 2px; color: #111; }
  .rd-title { font-size: 10.5pt; color: #333; margin-bottom: 4px; }
  .rd-contact { font-size: 9pt; color: #333; }
  .rd-san4 { margin-top: 6px; font-size: 9pt; color: #111; border-top: 1px solid #ddd; padding-top: 5px; display: inline-block; }
  .rd-san4-verify { color: #666; }
  .rd-section { margin-top: 13px; }
  .rd-h2 {
    font-size: 10.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;
    color: #111; border-bottom: 1.2px solid #333; padding-bottom: 2px; margin: 0 0 6px;
  }
  .rd-p { margin: 0; text-align: justify; }
  .rd-exp { margin-bottom: 9px; }
  .rd-exp-row { display: flex; justify-content: space-between; gap: 12px; }
  .rd-exp-role { font-weight: 700; }
  .rd-exp-dates { white-space: nowrap; color: #333; font-size: 9.5pt; }
  .rd-exp-sub { font-style: italic; color: #444; font-size: 9.5pt; margin-bottom: 2px; }
  .rd-ul { margin: 3px 0 0; padding-left: 18px; }
  .rd-ul li { margin-bottom: 2px; }
  .rd-skills { list-style: none; padding-left: 0; }
  .rd-skills li { margin-bottom: 3px; }
  .rd-edu { margin-bottom: 3px; }
  .rd-edu-deg { font-weight: 600; }
  .rd-edu-meta { color: #333; font-size: 9.5pt; }

  @media print {
    body * { visibility: hidden; }
    #rd-page, #rd-page * { visibility: visible; }
    #rd-page { position: absolute; left: 0; top: 0; width: 100%; padding: 24px 32px; box-shadow: none; }
    @page { size: A4; margin: 12mm; }
  }
`
