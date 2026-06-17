import { Link, useNavigate } from 'react-router-dom'
import { Capacitor }        from '@capacitor/core'
import { useAuth }         from '../hooks/useAuth'
import { useSubscription } from '../hooks/useSubscription'

// Google Play forbids in-app payment for digital subscriptions. In the native
// app we send users to the website to subscribe (web-only purchase model);
// the app reads their plan back from Supabase. On web, Razorpay runs as normal.
const IS_NATIVE = Capacitor.isNativePlatform()
const WEB_BASE  = 'https://san4-delta.vercel.app'
import VakMascot           from '../components/VakMascot'
import Navbar              from '../components/Navbar'

// ── Plan definitions ──────────────────────────────────────────────────────────
// Strategy: free = Base Camp (earn each level by scoring), Pro = Summit
const PLANS = [
  {
    id:        'free',
    name:      '⛺ Base Camp',
    tagline:   'Earn every level. No limits.',
    price:     '₹0',
    period:    '/ month',
    badge:     '🆓 FREE FOREVER',
    badgeColor:'#00C49A',
    border:    'rgba(0,196,154,0.3)',
    glow:      'rgba(0,196,154,0.06)',
    level:     1,
    cta:       'Start climbing free',
    ctaStyle:  'secondary',
    features: [
      { text: 'Levels 1–2 always unlocked (HR Interview, Intro Pitch)', included: true },
      { text: 'Levels 3–10 free — unlock by scoring above pass threshold', included: true },
      { text: 'Unlimited sessions on all unlocked levels',               included: true },
      { text: 'Filler word detection, pacing, confidence scores',        included: true },
      { text: 'Streaks, XP, level-up system, Vak evolution',            included: true },
      { text: 'Basic teleprompter scripts (2 free + 2 via progression)', included: true },
      { text: '1 meeting prep per week',                                  included: true },
      { text: 'Daily Missions & Situation of the Day',                   included: true },
      { text: 'Summit scenarios (Levels 11–14)',                         included: false },
      { text: 'All teleprompter scripts',                                included: false },
      { text: 'Body Language coaching (camera-on mode)',                 included: false },
      { text: 'Notion community access',                                 included: false },
      { text: 'Live meeting assist',                                     included: false },
    ],
  },
  {
    id:        'pro',
    name:      '🏔️ Vak Pro',
    tagline:   'Conquer The Summit. All 14 levels.',
    price:     '₹299',
    original:  '₹499',
    period:    '/ month',
    badge:     '⚡ MOST POPULAR',
    badgeColor:'#F59E0B',
    border:    'rgba(245,158,11,0.45)',
    glow:      'rgba(245,158,11,0.07)',
    level:     4,
    popular:   true,
    cta:       'Unlock The Summit →',
    ctaStyle:  'primary',
    features: [
      { text: 'Everything in Base Camp',                               included: true },
      { text: 'Summit Levels 11–14: Pitch to a Skeptic, Conflict Mediation, Sensitive Conversation, First Date', included: true },
      { text: 'All 6 teleprompter scripts (IPL Commentary, Product Launch + more)', included: true },
      { text: 'Body Language coaching — camera-on analysis',           included: true },
      { text: 'Deep coaching reports with actionable specifics',       included: true },
      { text: 'Unlimited meeting prep',                                included: true },
      { text: 'Regional language support (Hindi, Marathi, Telugu…)',   included: true },
      { text: 'Notion community — 500+ professionals climbing together', included: true },
    ],
  },
  {
    id:        'pro_plus',
    name:      '👑 Vak Elite',
    tagline:   'Where the summit becomes your launchpad.',
    price:     '₹999',
    period:    '/ month',
    badge:     '💎 ELITE',
    badgeColor:'#8B5CF6',
    border:    'rgba(139,92,246,0.4)',
    glow:      'rgba(139,92,246,0.07)',
    level:     5,
    comingSoon: false,
    cta:       'Join Elite →',
    ctaStyle:  'ghost',
    features: [
      { text: 'Everything in Vak Pro',                                 included: true },
      { text: 'Live meeting assist — real-time coaching in your meetings', included: true, soon: true },
      { text: 'WhatsApp/Telegram elite community (close-knit, curated)', included: true },
      { text: 'Priority support & early feature access',               included: true },
      { text: 'Monthly group coaching call with Aman',                 included: true, soon: true },
    ],
  },
]

// ── Pricing page ──────────────────────────────────────────────────────────────
export default function Pricing() {
  const { user }    = useAuth()
  const { plan: currentPlan, isPro } = useSubscription()
  const navigate = useNavigate()

  function handleCta(plan) {
    if (plan.id === 'free') {
      navigate(user ? '/dashboard' : '/auth?mode=signup')
      return
    }

    // ── Native app: no in-app digital payment (Play policy). Open the website
    // pricing page in the system browser so the user subscribes on the web. ──
    if (IS_NATIVE) {
      window.open(`${WEB_BASE}/pricing`, '_system')
      return
    }

    if (plan.comingSoon) {
      window.open('mailto:aman@san4.in?subject=Vak Pro Plus Waitlist', '_blank')
      return
    }
    if (plan.id === 'pro' || plan.id === 'pro_plus') {
      // Pre-fill email so you can match payment to account in Razorpay dashboard
      const base = 'https://rzp.io/rzp/m54y50n'
      const url  = user?.email
        ? `${base}?prefill[email]=${encodeURIComponent(user.email)}`
        : base
      window.open(url, '_blank')
    }
  }

  const isLoggedIn = !!user

  return (
    <div className="min-h-screen" style={{ background: '#050810' }}>

      {/* Fixed background glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div style={{
          position: 'absolute', top: '-100px', right: '-100px',
          width: '600px', height: '600px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(123,94,167,0.08) 0%, transparent 65%)',
        }} />
        <div style={{
          position: 'absolute', bottom: '-100px', left: '-100px',
          width: '500px', height: '500px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 65%)',
        }} />
      </div>

      {/* Navbar (logged-in users get full nav, guests get minimal) */}
      {isLoggedIn ? (
        <Navbar />
      ) : (
        <nav
          className="sticky top-0 z-50 flex items-center justify-between px-6 h-16"
          style={{ background: 'rgba(6,14,26,0.88)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        >
          <Link to="/" className="text-xl font-black text-white tracking-tight">
            San<span style={{ color: '#7B5EA7' }}>4</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/auth" className="text-sm font-medium transition-colors" style={{ color: '#6B8CAE' }}>Sign in</Link>
            <Link to="/auth?mode=signup" className="text-sm font-bold text-white px-4 py-2 rounded-full transition-all hover:opacity-90"
              style={{ background: '#7B5EA7' }}>
              Join free
            </Link>
          </div>
        </nav>
      )}

      <main className="max-w-6xl mx-auto px-4 py-12 relative z-10">

        {/* Hero */}
        <div className="text-center mb-14 animate-fade-in">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4 text-sm font-semibold"
            style={{ background: 'rgba(139,92,246,0.12)', color: '#A78BFA', border: '1px solid rgba(139,92,246,0.25)' }}
          >
            🦢 Simple, honest pricing
          </div>
          <h1 className="text-4xl lg:text-5xl font-black text-white mb-4">
            Choose your path with Vak
          </h1>
          <p className="text-lg max-w-xl mx-auto" style={{ color: '#6B8CAE' }}>
            Start free, no card needed. Upgrade when you're ready to go deeper.
          </p>

          {/* Founding offer banner */}
          <div
            className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-2xl text-sm font-semibold"
            style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#F59E0B' }}
          >
            🎉 Early Bird: Pro at ₹299 instead of ₹399. Lock it in before we scale.
          </div>
        </div>

        {/* Plans grid */}
        <div className="grid lg:grid-cols-3 gap-6 items-start">
          {PLANS.map((plan) => {
            // In the native app, paid plans send users to the web to subscribe —
            // relabel the button and clear the "coming soon" disabled state so it
            // remains tappable.
            const displayPlan = IS_NATIVE && plan.id !== 'free'
              ? { ...plan, cta: 'Subscribe on the web', comingSoon: false }
              : plan
            return (
              <PlanCard
                key={plan.id}
                plan={displayPlan}
                isCurrent={currentPlan === plan.id}
                onCta={() => handleCta(plan)}
              />
            )
          })}
        </div>

        {/* FAQ / reassurance row */}
        <div className="mt-16 grid sm:grid-cols-3 gap-6 text-center">
          {[
            { icon: '🔒', title: 'Secure payments', body: 'Powered by Razorpay. Your card details never touch our servers.' },
            { icon: '↩️', title: 'Cancel anytime',  body: 'No annual lock-in. Cancel your Pro plan at any time, no questions asked.' },
            { icon: '🇮🇳', title: 'Made for India',  body: 'Indian scenarios, Indian pricing. No dollar conversion, no US bias.' },
          ].map(({ icon, title, body }) => (
            <div key={title} className="px-4">
              <div className="text-3xl mb-3">{icon}</div>
              <div className="text-white font-bold text-sm mb-1">{title}</div>
              <p className="text-xs leading-relaxed" style={{ color: '#6B8CAE' }}>{body}</p>
            </div>
          ))}
        </div>

        {/* Compare table */}
        <div className="mt-16">
          <h2 className="text-white font-black text-2xl text-center mb-8">Full comparison</h2>
          <div
            className="rounded-3xl overflow-hidden"
            style={{ border: '1px solid rgba(255,255,255,0.07)' }}
          >
            {/* Header */}
            <div className="grid grid-cols-4 text-xs font-bold uppercase tracking-widest"
              style={{ background: 'linear-gradient(160deg, #10192E 0%, #0B1220 100%)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="px-5 py-4" style={{ color: '#6B8CAE' }}>Feature</div>
              {PLANS.map(p => (
                <div key={p.id} className="px-3 py-4 text-center" style={{ color: p.badgeColor }}>
                  {p.name}
                </div>
              ))}
            </div>

            {/* Rows */}
            {[
              { label: 'Sessions per week',        free: '3',        pro: 'Unlimited', plus: 'Unlimited' },
              { label: 'Scenarios',                free: '3',        pro: '8',         plus: '8 + packs' },
              { label: 'Feedback depth',           free: 'Basic',    pro: 'Deep',      plus: 'Deep' },
              { label: 'Meeting prep',             free: '1/week',   pro: 'Unlimited', plus: 'Unlimited' },
              { label: 'Streaks & XP',             free: '✓',        pro: '✓',         plus: '✓' },
              { label: 'Progress dashboard',       free: ',',        pro: '✓',         plus: '✓' },
              { label: 'Live meeting overlay',     free: ',',        pro: 'Beta',      plus: '✓' },
              { label: 'Indian English mode',      free: ',',        pro: 'Soon',      plus: 'Soon' },
              { label: '1:1 human coaching',       free: ',',        pro: ',',         plus: '1×/month' },
              { label: 'Industry packs',           free: ',',        pro: ',',         plus: '✓' },
            ].map((row, i) => (
              <div
                key={row.label}
                className="grid grid-cols-4 text-sm"
                style={{
                  background: i % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <div className="px-5 py-3.5" style={{ color: '#94A3B8' }}>{row.label}</div>
                {[row.free, row.pro, row.plus].map((val, j) => (
                  <div key={j} className="px-3 py-3.5 text-center font-semibold"
                    style={{ color: val === ',' ? 'rgba(255,255,255,0.15)' : val === '✓' ? '#00C49A' : '#E2E8F0' }}>
                    {val}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="h-12" />
      </main>
    </div>
  )
}

// ── Plan card component ────────────────────────────────────────────────────────
function PlanCard({ plan, isCurrent, onCta }) {
  return (
    <div
      className="rounded-3xl p-6 relative flex flex-col"
      style={{
        background: `rgba(255,255,255,0.04)`,
        border: `1px solid ${plan.border}`,
        boxShadow: plan.popular ? `0 0 60px ${plan.glow}, 0 0 0 1px ${plan.border}` : `0 0 30px ${plan.glow}`,
        opacity: plan.comingSoon ? 0.8 : 1,
      }}
    >
      {/* Popular ribbon */}
      {plan.popular && (
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-black text-white whitespace-nowrap"
          style={{ background: 'linear-gradient(135deg, #7B5EA7, #9B7EC8)', boxShadow: '0 4px 14px rgba(123,94,167,0.4)' }}
        >
          ⚡ Most Popular
        </div>
      )}

      {/* Plan header */}
      <div className="text-center mb-6">
        {/* Vak mascot */}
        <div className="flex justify-center mb-3 animate-float">
          <VakMascot level={plan.level} size={80} />
        </div>

        {/* Badge */}
        <div
          className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full mb-3"
          style={{ background: `${plan.badgeColor}15`, color: plan.badgeColor, border: `1px solid ${plan.badgeColor}30` }}
        >
          {plan.badge}
        </div>

        <h2 className="text-white font-black text-xl mb-1">{plan.name}</h2>
        <p className="text-xs" style={{ color: '#6B8CAE' }}>{plan.tagline}</p>

        {/* Price */}
        <div className="mt-4 flex items-baseline justify-center gap-2">
          <span className="text-4xl font-black text-white">{plan.price}</span>
          <span className="text-sm" style={{ color: '#6B8CAE' }}>{plan.period}</span>
        </div>
        {plan.original && (
          <div className="text-xs mt-1" style={{ color: '#6B8CAE' }}>
            <s>{plan.original}</s>
            <span className="ml-2 font-bold" style={{ color: '#00C49A' }}>25% off</span>
          </div>
        )}
      </div>

      {/* Features */}
      <div className="flex-1 space-y-2.5 mb-6">
        {plan.features.map((f, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <span className="text-sm mt-0.5 shrink-0" style={{
              color: f.included ? '#00C49A' : f.soon ? '#F59E0B' : 'rgba(255,255,255,0.2)',
            }}>
              {f.included ? '✓' : f.soon ? '⏳' : '✗'}
            </span>
            <span className="text-sm leading-snug" style={{
              color: f.included ? '#E2E8F0' : f.soon ? '#F59E0B' : 'rgba(255,255,255,0.3)',
            }}>
              {f.text}
              {f.soon && <span className="ml-1.5 text-xs font-bold" style={{ color: '#F59E0B' }}>(soon)</span>}
            </span>
          </div>
        ))}
      </div>

      {/* CTA */}
      {isCurrent ? (
        <div
          className="text-center py-3 rounded-2xl text-sm font-bold"
          style={{ background: 'rgba(255,255,255,0.06)', color: '#6B8CAE' }}
        >
          ✓ Your current plan
        </div>
      ) : (
        <>
          <button
            onClick={onCta}
            disabled={plan.comingSoon}
            className={`w-full py-3.5 rounded-2xl text-sm font-bold transition-all hover:opacity-90 active:scale-95 ${
              plan.ctaStyle === 'primary' ? 'text-white' :
              plan.ctaStyle === 'secondary' ? '' : ''
            }`}
            style={
              plan.ctaStyle === 'primary'
                ? { background: 'linear-gradient(135deg, #7B5EA7, #9B7EC8)', boxShadow: '0 4px 20px rgba(123,94,167,0.35)', color: 'white' }
                : plan.ctaStyle === 'secondary'
                ? { background: 'rgba(0,196,154,0.12)', border: '1px solid rgba(0,196,154,0.3)', color: '#00C49A' }
                : { background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)', color: '#A78BFA' }
            }
          >
            {plan.cta} {plan.comingSoon ? '' : '→'}
          </button>
          {plan.id === 'pro' && (
            <p className="text-center text-xs mt-3" style={{ color: '#6B8CAE' }}>
              After payment, email your receipt to{' '}
              <a href="mailto:aman@san4.in" style={{ color: '#00C49A', fontWeight: 600 }}>
                aman@san4.in
              </a>
              {' '}to activate Pro within 2 hours.
            </p>
          )}
        </>
      )}
    </div>
  )
}
