import { Link } from 'react-router-dom'
import MarketingHeader from '../components/MarketingHeader'

const GRIEVANCE_EMAIL = 'privacy@san4.ai'
const LAST_UPDATED    = '2 July 2026'

function H({ children }) { return <h2 className="text-white font-bold text-lg mt-8 mb-2">{children}</h2> }
function P({ children }) { return <p className="text-sm leading-relaxed mb-3" style={{ color: '#94A3B8' }}>{children}</p> }

export default function ResponsibleAI() {
  return (
    <div className="min-h-screen" style={{ background: '#050810', color: '#F1F5F9' }}>
      <MarketingHeader />
      <main className="max-w-3xl mx-auto px-6 lg:px-10 py-14">
        <h1 className="text-3xl font-black text-white mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>Responsible AI</h1>
        <p className="text-xs mb-8" style={{ color: '#6B8CAE' }}>Last updated: {LAST_UPDATED} · India</p>

        <P>
          San4 uses AI to coach how you communicate. Because AI is powerful and personal, we build and operate it within India's legal framework and widely accepted responsible-AI principles. This page explains the guardrails we hold ourselves to. It sits alongside our <Link to="/terms" className="underline" style={{ color: '#A78BFA' }}>Terms</Link> and <Link to="/privacy" className="underline" style={{ color: '#A78BFA' }}>Privacy Policy</Link>.
        </P>

        <H>The frameworks we follow</H>
        <P>We design San4 to be consistent with:</P>
        <ul className="text-sm space-y-1.5 mb-3 pl-5 list-disc" style={{ color: '#94A3B8' }}>
          <li><b className="text-white">Digital Personal Data Protection Act, 2023 (DPDP Act)</b>: lawful, consent-based processing of your personal data, with your rights respected.</li>
          <li><b className="text-white">Information Technology Act, 2000 and the IT Rules, 2021</b>: due diligence, content responsibility, and a grievance mechanism.</li>
          <li><b className="text-white">Bharatiya Nyaya Sanhita, 2023 (BNS)</b>: we do not permit the Service to be used for unlawful conduct, and we act on illegal misuse.</li>
          <li><b className="text-white">MeitY advisories on AI and NITI Aayog's Principles for Responsible AI</b>: safety, inclusivity, transparency, accountability, privacy, and human oversight.</li>
        </ul>

        <H>Consent and data minimisation</H>
        <P>We ask for clear, specific consent before recording your voice, and again before analysing a real call. We collect only what a feature needs. Voice recordings are sent to our AI processor to be analysed and are not stored as audio after scoring. You can withdraw consent and request deletion at any time. Details are in the <Link to="/privacy" className="underline" style={{ color: '#A78BFA' }}>Privacy Policy</Link>.</P>

        <H>Only your voice</H>
        <P>Our live features are designed to coach the account holder. In the Live Coach, we capture your microphone, apply echo cancellation to keep other participants out, and instruct the AI to focus only on the primary speaker. You are responsible for having any consent required before recording a call that includes other people.</P>

        <H>Human oversight and limitations</H>
        <P>AI output can be wrong or biased. San4 is a coaching aid, not an authority. Scores and feedback are indicative and should not be used for hiring, admission, legal, medical, or financial decisions on their own. You stay in control, and we encourage you to apply your own judgement.</P>

        <H>Fairness and inclusion</H>
        <P>We build for India's many accents and for Hindi-English code-switching, and we judge communication, not grammar or accent, so speakers are not penalised for how English sounds. Where we find the AI treating users unfairly, we work to correct it.</P>

        <H>Transparency</H>
        <P>We tell you when you are interacting with AI, which model processes your audio (currently Google Gemini), and what each feature does with your data. We do not secretly record you; recording is always something you start.</P>

        <H>Security</H>
        <P>We use reputable infrastructure providers and access controls to protect your data, and we handle any personal-data breach in line with the DPDP Act, including notifying the Data Protection Board of India and affected users where required.</P>

        <H>Reporting a concern</H>
        <P>If you believe the AI has behaved unsafely or unfairly, or you want to exercise your rights, contact our Grievance Officer at {GRIEVANCE_EMAIL}. We take responsible-AI concerns seriously and will respond within the timelines required by law.</P>

        <div className="mt-10"><Link to="/" className="text-sm" style={{ color: '#6B8CAE' }}>← Back to home</Link></div>
      </main>
    </div>
  )
}
