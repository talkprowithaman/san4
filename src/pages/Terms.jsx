import { Link } from 'react-router-dom'
import MarketingHeader from '../components/MarketingHeader'

// Grievance contact is mandatory under the IT Rules, 2021 and DPDP Act, 2023.
// Keep these in sync with PrivacyPolicy.jsx.
const GRIEVANCE_EMAIL    = 'privacy@san4.ai'
const REGISTERED_ADDRESS = '[Registered address pending incorporation]'
const GOVERNING_CITY     = '[City], India'
const LAST_UPDATED       = '2 July 2026'

function H({ n, children }) {
  return <h2 className="text-white font-bold text-lg mt-8 mb-2">{n}. {children}</h2>
}
function P({ children }) {
  return <p className="text-sm leading-relaxed mb-3" style={{ color: '#94A3B8' }}>{children}</p>
}

export default function Terms() {
  return (
    <div className="min-h-screen" style={{ background: '#050810', color: '#F1F5F9' }}>
      <MarketingHeader />
      <main className="max-w-3xl mx-auto px-6 lg:px-10 py-14">
        <h1 className="text-3xl font-black text-white mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>Terms &amp; Conditions</h1>
        <p className="text-xs mb-8" style={{ color: '#6B8CAE' }}>Last updated: {LAST_UPDATED} · Governed by the laws of India</p>

        <P>
          These Terms govern your use of San4 (the "Service"), an AI-assisted communication coaching product. By creating an account or using the Service, you agree to these Terms. If you do not agree, please do not use the Service. Please also read our <Link to="/privacy" className="underline" style={{ color: '#A78BFA' }}>Privacy Policy</Link> and <Link to="/responsible-ai" className="underline" style={{ color: '#A78BFA' }}>Responsible AI</Link> commitments, which form part of these Terms.
        </P>

        <H n="1">Eligibility</H>
        <P>You must be at least 18 years old to create an account. If you are a minor, you may use the Service only with the involvement and verifiable consent of a parent or lawful guardian, in line with the Digital Personal Data Protection Act, 2023 ("DPDP Act"). You confirm the information you give us is accurate.</P>

        <H n="2">What San4 is, and is not</H>
        <P>San4 is an educational, self-improvement tool. It gives AI-generated feedback and a "San4 Score" to help you practise how you communicate. It is not professional advice, and it is not a certification, qualification, or guarantee. Scores and feedback are indicative and should be treated as coaching, not as an assessment recognised by any employer, examination body, or authority unless expressly stated. We do not promise any specific outcome such as a job, promotion, or exam result.</P>

        <H n="3">Your account</H>
        <P>You are responsible for keeping your login credentials secure and for activity under your account. Tell us promptly at {GRIEVANCE_EMAIL} if you suspect unauthorised use.</P>

        <H n="4">Acceptable use</H>
        <P>You agree to use the Service lawfully and not to:</P>
        <ul className="text-sm space-y-1.5 mb-3 pl-5 list-disc" style={{ color: '#94A3B8' }}>
          <li>use it for any purpose that is unlawful under Indian law, including the Bharatiya Nyaya Sanhita, 2023 ("BNS") and the Information Technology Act, 2000;</li>
          <li>upload, record, or submit another person's voice, personal data, or a call recording without their informed consent;</li>
          <li>submit content that is obscene, defamatory, harassing, hateful, threatening, infringing, or that promotes illegal acts;</li>
          <li>attempt to reverse-engineer, scrape, overload, disrupt, or gain unauthorised access to the Service or its AI systems;</li>
          <li>use the Service to build a competing product or to train other AI models on our outputs.</li>
        </ul>
        <P>We may suspend or remove content or accounts that breach these rules, and where required, report unlawful activity to the appropriate authorities.</P>

        <H n="5">Your content and voice data</H>
        <P>You keep ownership of what you say and submit ("User Content"). You grant San4 a limited licence to process your User Content solely to provide and improve the coaching features you use. Voice recordings are sent to our AI processor to be analysed and are not stored as audio after scoring. How we handle personal data is described in our <Link to="/privacy" className="underline" style={{ color: '#A78BFA' }}>Privacy Policy</Link>, consistent with the DPDP Act.</P>

        <H n="6">AI limitations</H>
        <P>The Service relies on third-party AI models (currently Google Gemini). AI output can be inaccurate, incomplete, or inconsistent, and may reflect limitations or bias in the underlying models. You should apply your own judgement and not rely on the Service for decisions with legal, financial, medical, or safety consequences. See our <Link to="/responsible-ai" className="underline" style={{ color: '#A78BFA' }}>Responsible AI</Link> page.</P>

        <H n="7">Payments</H>
        <P>Some features are paid. Prices are shown in Indian Rupees and may include applicable taxes. Payments are processed by our payment partner (Razorpay); we do not store your card details. Subscription and one-time purchase terms, including any refund or cancellation rights, are shown at the point of purchase. Statutory consumer rights under Indian law are not affected.</P>

        <H n="8">Intellectual property</H>
        <P>San4, including the app, the Vak character, the San4 Score, branding, and content we create, is owned by us or our licensors and is protected by law. These Terms do not transfer any of our intellectual property to you.</P>

        <H n="9">Third-party services</H>
        <P>The Service uses third parties such as Google (Gemini AI), Supabase (hosting and authentication), and Razorpay (payments). Your use of the Service may also be subject to their terms. We are not responsible for third-party services we do not control.</P>

        <H n="10">Suspension and termination</H>
        <P>You may stop using the Service at any time. We may suspend or end your access if you breach these Terms or use the Service unlawfully. Sections that by their nature should survive termination (for example intellectual property, disclaimers, and limitation of liability) will continue to apply.</P>

        <H n="11">Disclaimers and limitation of liability</H>
        <P>The Service is provided on an "as is" and "as available" basis. To the maximum extent permitted by applicable Indian law, we exclude implied warranties and are not liable for indirect or consequential loss, or for loss arising from your reliance on AI output. Nothing in these Terms limits any liability that cannot be limited under law. Where liability is permitted to be capped, our total liability is limited to the amount you paid us in the three months before the claim.</P>

        <H n="12">Indemnity</H>
        <P>You agree to indemnify San4 against claims arising from your misuse of the Service or your breach of these Terms, including uploading another person's data without consent.</P>

        <H n="13">Governing law and jurisdiction</H>
        <P>These Terms are governed by the laws of India. Subject to any applicable consumer-protection rights, the courts at {GOVERNING_CITY} will have jurisdiction over disputes.</P>

        <H n="14">Grievances</H>
        <P>For any complaint, or to exercise your rights, contact our Grievance Officer at {GRIEVANCE_EMAIL} (registered office: {REGISTERED_ADDRESS}). We aim to acknowledge complaints within the timelines required under the IT Rules, 2021 and the DPDP Act.</P>

        <H n="15">Changes</H>
        <P>We may update these Terms as the product and the law evolve. Material changes will be notified in the app or by email. Continuing to use the Service after changes take effect means you accept the updated Terms.</P>

        <div className="mt-10"><Link to="/" className="text-sm" style={{ color: '#6B8CAE' }}>← Back to home</Link></div>
      </main>
    </div>
  )
}
