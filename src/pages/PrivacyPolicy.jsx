import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { PRIVACY_POLICY_EFFECTIVE_DATE } from '../lib/consent'

// TODO(Aman): fill in once the operating entity is incorporated —
// see business_status memory (trademark/Udyam currently under "San4 Media").
// A grievance officer contact is mandatory under DPDP Act 2023, s.13 / Rule 10.
const LEGAL_ENTITY_NAME   = '[San4, legal entity name pending incorporation]'
const GRIEVANCE_OFFICER   = '[Name pending]'
const GRIEVANCE_EMAIL     = 'privacy@san4.ai'
const REGISTERED_ADDRESS  = '[Registered address pending incorporation]'

function Section({ id, title, children }) {
  return (
    <section id={id} className="mb-8 scroll-mt-24">
      <h2 className="text-lg font-black text-white mb-3">{title}</h2>
      <div className="text-sm leading-relaxed space-y-3" style={{ color: '#A9BCD4' }}>
        {children}
      </div>
    </section>
  )
}

const TOC = [
  ['who-we-are',      '1. Who we are'],
  ['what-we-collect', '2. What data we collect'],
  ['why-we-collect',  '3. Why we collect it (purpose limitation)'],
  ['voice-data',      '4. Voice & AI processing, a special note'],
  ['legal-basis',     '5. Your consent'],
  ['sharing',         '6. Who we share data with'],
  ['transfers',       '7. Cross-border data transfer'],
  ['retention',       '8. How long we keep it'],
  ['security',        '9. Security'],
  ['rights',          '10. Your rights under the DPDP Act'],
  ['children',        '11. Children\'s data'],
  ['cookies',         '12. Cookies & analytics'],
  ['breach',          '13. Data breach notification'],
  ['grievance',       '14. Grievance officer'],
  ['changes',         '15. Changes to this policy'],
]

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen" style={{ background: '#050810' }}>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">

        <div className="mb-10">
          <h1 className="text-2xl sm:text-3xl font-black text-white mb-2">Privacy Policy</h1>
          <p className="text-sm" style={{ color: '#6B8CAE' }}>
            Effective {PRIVACY_POLICY_EFFECTIVE_DATE} · Governs your use of San4 (the "Service", "we", "us")
            and compliant with India's Digital Personal Data Protection Act, 2023 ("DPDP Act").
          </p>
        </div>

        {/* Table of contents */}
        <div className="rounded-2xl p-5 mb-10 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5"
          style={{ background: 'linear-gradient(160deg, #10192E 0%, #0B1220 100%)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {TOC.map(([id, label]) => (
            <a key={id} href={`#${id}`} className="text-xs py-1 hover:text-white transition-colors"
              style={{ color: '#7B5EA7' }}>{label}</a>
          ))}
        </div>

        <Section id="who-we-are" title="1. Who we are">
          <p>
            San4 ("Sanchaar") is an AI communication coaching product operated by {LEGAL_ENTITY_NAME},
            based in India ({REGISTERED_ADDRESS}). Under the DPDP Act, we act as the <strong>Data
            Fiduciary</strong>. We decide the purpose and means of processing your personal data.
          </p>
        </Section>

        <Section id="what-we-collect" title="2. What data we collect">
          <p><strong>Account data:</strong> name, email address, password (hashed by our auth
            provider, Supabase, and we never see it in plain text), and profile details you add
            (role, goal).</p>
          <p><strong>Voice & session data:</strong> audio recordings of your practice sessions,
            auto-generated transcripts, filler-word counts, pacing/confidence scores, meeting
            agendas and AI-generated talking points you create in Meeting Prep.</p>
          <p><strong>Payment data:</strong> your subscription plan and status. We do <em>not</em>
            collect or store your card/UPI details. Payments are handled entirely by Razorpay,
            a licensed payment aggregator.</p>
          <p><strong>Technical data:</strong> device/browser type, IP address, and basic usage
            logs, collected for security and to keep the Service working reliably.</p>
        </Section>

        <Section id="why-we-collect" title="3. Why we collect it (purpose limitation)">
          <p>We only process your data for the specific purposes below, nothing broader:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Running your practice sessions and generating AI feedback (confidence, pacing, filler words, action items)</li>
            <li>Building your progress history so trends over time are meaningful</li>
            <li>Processing payments and managing your subscription</li>
            <li>Account security, fraud prevention, and debugging Service errors</li>
            <li>Sending essential account/service emails (e.g. confirmation, password reset)</li>
          </ul>
          <p>We do not sell your personal data, and we do not use your voice recordings or
            transcripts to train third-party AI models.</p>
        </Section>

        <Section id="voice-data" title="4. Voice & AI processing, a special note">
          <p>
            Because San4's core feature involves recording and analysing your voice, we treat
            audio and transcripts as sensitive data with extra care:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Recording only happens during an active practice session that you started, and only after you've given voice-specific consent (see the checkbox before every session)</li>
            <li>Audio is sent to our AI processor (currently Google Gemini, see §6) solely to transcribe your speech and generate your feedback report. It is not reviewed by San4 staff except to investigate a bug or a report you raise</li>
            <li>You can request deletion of any session's audio/transcript at any time (see §10)</li>
          </ul>
        </Section>

        <Section id="legal-basis" title="5. Your consent">
          <p>
            Under the DPDP Act, we process your personal data on the basis of your free,
            specific, informed, and unambiguous <strong>consent</strong>, given via an
            affirmative action:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>At signup, by ticking the consent checkbox that links to this policy</li>
            <li>Before your first voice-recorded session, by confirming the on-screen voice-recording notice</li>
          </ul>
          <p>
            We keep a timestamped record of both, tied to your account. You may withdraw
            consent at any time (see §10). This will not affect processing already carried
            out before withdrawal, but will stop future recording and may limit which features
            you can use (e.g. voice practice requires voice consent).
          </p>
        </Section>

        <Section id="sharing" title="6. Who we share data with">
          <p>We share data only with processors who help us run the Service, under contract, and only to the extent needed:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>Supabase</strong>: authentication and database hosting (account data, session history)</li>
            <li><strong>Google (Gemini API)</strong>: AI processing of your practice conversations, voice transcription, and speech synthesis</li>
            <li><strong>Razorpay</strong>: payment processing (India-licensed payment aggregator)</li>
            <li><strong>Vercel</strong>: application hosting</li>
          </ul>
          <p>We do not share your data with advertisers or data brokers. We may disclose data
            if legally required to (e.g. a valid order from an Indian court or authority).</p>
        </Section>

        <Section id="transfers" title="7. Cross-border data transfer">
          <p>
            Some processors above (notably Google) may process data on servers outside India.
            The DPDP Act permits this unless the destination country is specifically restricted
            by the Central Government. As of this policy's effective date, no such restriction
            applies to our processors. We select processors that maintain strong security and
            contractual data-protection commitments regardless of location.
          </p>
        </Section>

        <Section id="retention" title="8. How long we keep it">
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>Account data:</strong> for as long as your account is active, plus a limited period after deletion for legal/accounting records</li>
            <li><strong>Session recordings & transcripts:</strong> retained so you can track progress over time; deletable individually or in bulk on request (§10)</li>
            <li><strong>Payment records:</strong> retained as required under Indian tax/accounting law</li>
          </ul>
          <p>When you delete your account, we erase or anonymise your personal data within a
            reasonable period, except where retention is legally required.</p>
        </Section>

        <Section id="security" title="9. Security">
          <p>
            We use industry-standard safeguards: encrypted connections (TLS) for all data in
            transit, row-level security on our database so you can only ever access your own
            records, and AI API keys kept server-side (never exposed to the browser). No system
            is 100% secure, but we continuously work to reduce risk.
          </p>
        </Section>

        <Section id="rights" title="10. Your rights under the DPDP Act">
          <p>As a Data Principal, you have the right to:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>Access</strong> a summary of the personal data we hold about you</li>
            <li><strong>Correct or update</strong> inaccurate or incomplete data</li>
            <li><strong>Erase</strong> your data (individual sessions or your entire account) once it's no longer needed for the purpose it was collected</li>
            <li><strong>Withdraw consent</strong> at any time, as easily as you gave it</li>
            <li><strong>Nominate</strong> another individual to exercise these rights on your behalf in the event of death or incapacity</li>
            <li><strong>Grievance redressal</strong>: raise a complaint with us first (§14), and escalate to the Data Protection Board of India if unresolved</li>
          </ul>
          <p>
            To exercise any of these, email <a href={`mailto:${GRIEVANCE_EMAIL}`} className="font-semibold hover:text-white transition-colors" style={{ color: '#7B5EA7' }}>{GRIEVANCE_EMAIL}</a> from
            your registered email address. We'll respond within a reasonable timeframe.
          </p>
        </Section>

        <Section id="children" title="11. Children's data">
          <p>
            San4 is intended for users aged 18 and above. We do not knowingly collect data from
            anyone under 18. If you believe a minor has created an account, contact us and we
            will remove it.
          </p>
        </Section>

        <Section id="cookies" title="12. Cookies & analytics">
          <p>
            We currently use only strictly-necessary cookies/local storage (for login sessions
            and your in-app preferences like language). If we enable product analytics (e.g.
            Mixpanel or Google Analytics) in future, we will update this policy and this section
            before doing so, and such tools will only collect anonymised usage patterns, never
            your voice recordings or session content.
          </p>
        </Section>

        <Section id="breach" title="13. Data breach notification">
          <p>
            If a personal data breach occurs that is likely to affect you, we will notify the
            Data Protection Board of India and affected users as required under the DPDP Act,
            without undue delay.
          </p>
        </Section>

        <Section id="grievance" title="14. Grievance officer">
          <p>
            Grievance Officer: {GRIEVANCE_OFFICER}<br />
            Email: <a href={`mailto:${GRIEVANCE_EMAIL}`} className="font-semibold hover:text-white transition-colors" style={{ color: '#7B5EA7' }}>{GRIEVANCE_EMAIL}</a><br />
            Address: {REGISTERED_ADDRESS}
          </p>
        </Section>

        <Section id="changes" title="15. Changes to this policy">
          <p>
            We may update this policy as San4 evolves (e.g. new features, new processors). When
            changes are material, we'll ask for fresh consent rather than relying on your
            original one. The version you agreed to is recorded on your account.
          </p>
        </Section>

        <p className="text-xs mt-10" style={{ color: '#243D5F' }}>
          <Link to="/" className="hover:text-muted transition-colors">← Back to San4</Link>
        </p>
      </main>
    </div>
  )
}
