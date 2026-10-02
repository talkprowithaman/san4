# San4 — Monetization Channels, Models, and Aspirations vs. Requirements

All numbers marked **(assumption)** are placeholders I chose, not San4 data. Replace them with PostHog funnel numbers and the Gemini billing console before relying on them. Rupee amounts are monthly unless stated.

## 0. What San4 sells today (from the repo)

- **Product:** AI speaking/communication coach (mascot "Vak") with voice practice, filler-word/pace/confidence scoring, San4 Score, streaks/XP, a 14-level ladder, meeting prep, teleprompter scripts, Call Analyzer, Resume Builder, body-language mode, regional-language onboarding.
- **Tiers (`src/pages/Pricing.jsx`):** Base Camp ₹0, Vak Pro ₹299 (struck-through ₹499), Vak Elite ₹999.
- **Billing today:** a static Razorpay payment link, then a webhook (`api/razorpay-webhook.js`) that maps the amount paid to a plan. It is one-time per payment, not a true subscription. The Pricing page also says to email the receipt to activate.
- **Distribution:** web (Vercel) plus Android via Capacitor. In the native app, subscribing is sent to the website (web-only purchase).
- **Cost drivers:** Gemini calls (`gemini-2.5-flash-lite` for chat, a TTS preview model for voices) and Supabase.

---

## 1. Every monetization channel I can think of

### A. Direct to consumer (B2C)

| # | Channel | How it earns | Fit |
|---|---|---|---|
| A1 | **Freemium subscription** (current) | Pro ₹299 / Elite ₹999 monthly | Live |
| A2 | **Annual plans** | 10–12× monthly paid upfront (e.g. Pro ₹2,499/yr) | High. Cuts churn and gives cash up front |
| A3 | **Lifetime / founding-member deal** | One-time ₹4,999–9,999, capped seats | High for early cash, but it caps lifetime value. Limit the seats |
| A4 | **Outcome sprint packs** | 30-day non-recurring packs: "Interview Sprint", "Placement Prep", "IELTS/PTE Speaking", "Presentation Week". About ₹499–999 each | High. Matches how people actually buy (a deadline) |
| A5 | **Pay-per-use credits** | Call Analyzer uploads, deep reports, resume reviews sold as credits (e.g. ₹49 per analysis) | Medium-high. Aligns price with your biggest cost |
| A6 | **Resume Builder / ATS tools** | ₹99–299 per export, or bundled | Medium. Existing feature, separate buyer intent |
| A7 | **Certificates & verified San4 Score** | Paid shareable credential, LinkedIn badge, employer-verifiable score (₹199–499) | Medium. Needs score credibility first |
| A8 | **Family / couple / friends plan** | 3–5 seats at a discount | Low-medium. Fits parents buying for kids |
| A9 | **Gifting** | Prepaid Pro codes (festivals, graduation, Raksha Bandhan) | Medium. Cheap to build |
| A10 | **Referral-for-credit** | Both sides get free Pro days. A growth lever that lowers CAC rather than direct revenue | High |
| A11 | **Premium voices / personas / accent packs** | Add-on: global accent personas, celebrity-style or industry personas | Medium |
| A12 | **Kids/teen tier** | Parent-paid speaking confidence program | Low now. Heavy compliance (children's data) |
| A13 | **Tip jar / pay-what-you-want** | Donations from free users | Low |

### B. Human + community

| # | Channel | How it earns |
|---|---|---|
| B1 | **Paid community** | The Notion / WhatsApp / Telegram communities listed in Pro and Elite, sold standalone (₹149–299) |
| B2 | **Group coaching calls** | Monthly calls with Aman (already listed as "soon" in Elite). Sell as events, ₹299–499 per seat |
| B3 | **1:1 human coaching** | ₹1,500–3,000 per session. Also lists as "1×/month" in the compare table |
| B4 | **Coach marketplace** | Vetted coaches pay San4 a 15–25% take rate. San4's AI score is the intake report |
| B5 | **Cohort programs / bootcamps** | 4–6 week live cohorts, ₹4,999–14,999 |
| B6 | **Workshops & webinars** | Ticketed, or free as a lead funnel to Pro |

### C. B2B2C and B2B

| # | Channel | How it earns |
|---|---|---|
| C1 | **Colleges / placement cells** | Per-student annual licence, admin dashboard, cohort leaderboards. Likely your biggest scalable channel in India |
| C2 | **Coaching institutes** (IELTS, CAT/GD-PI, SSC, bank-PO interview) | White-label or per-seat licence |
| C3 | **Corporate L&D / HR** | Per-seat for sales, support, and leadership teams. Includes manager analytics |
| C4 | **BPO / call-centre training** | Call Analyzer is a direct fit (accent, filler words, empathy scoring) |
| C5 | **Sales-team call coaching** | Call Analyzer plus rep scorecards. Higher price per seat than C3 |
| C6 | **Recruiters / staffing firms** | Pre-screen candidates on spoken communication. Pay per assessment |
| C7 | **EdTech / skilling partners** | Embed San4 practice inside a course platform. Revenue share or API fee |
| C8 | **API / white-label SDK** | Metered scoring API (filler words, pace, confidence) for other apps |
| C9 | **Telcos & bundles** | Pre-paid via carrier, OTT-style bundles, bank/credit-card rewards |
| C10 | **Government & NGO skilling** | Skill India, state skilling missions, CSR-funded programs for rural/regional youth |
| C11 | **Industry packs** | Vertical scenario packs (healthcare, BFSI, sales, legal) sold to professionals or firms. Compare table already mentions "Industry packs" |

### D. Advertising, affiliate, and data-adjacent

| # | Channel | How it earns | Caution |
|---|---|---|---|
| D1 | **Sponsored scenarios / challenges** | A brand sponsors a "Pitch for a startup" scenario | Keep sponsors on-brand |
| D2 | **Affiliate** | Courses, mics/headsets, laptops, books, resume services, test-prep | Low effort; must be disclosed |
| D3 | **Job board / recruiter placement** | Employers pay to reach high-scoring users, with opt-in | Needs scale and explicit consent |
| D4 | **Display / rewarded ads** | Ads in the free tier | Weakest fit. Hurts a trust-based coaching product |
| D5 | **Aggregate insights** | Anonymous benchmark reports (communication skill by college/city) sold to institutions | Only with strong consent. Check the Privacy Policy before doing this |
| D6 | **Influencer / creator licensing** | Creators sell their own "challenge packs" on San4, rev share | Medium |

### E. Platform extensions

| # | Channel | How it earns |
|---|---|---|
| E1 | **Live in-meeting assist** (already "soon") | Premium add-on, or a higher Elite price |
| E2 | **Browser/Zoom/Meet extension** | Subscription or per-meeting pricing |
| E3 | **Content licensing** | Sell the scenario/script library to other platforms |
| E4 | **Merch / physical** | Mascot merch, printed certificate. Brand play, not a revenue play |
| E5 | **International pricing** | USD/AED/SGD tiers for the Indian diaspora and the Gulf (accent personas already support this) |

---

## 2. Monetary models

### Assumptions shared by all models **(assumption)**

- **GST:** 18% on digital services. The displayed ₹299 is treated as GST-inclusive, so net revenue is `price ÷ 1.18`.
- **Payment gateway:** about 2% plus GST on the fee.
- **Active users:** about 25% of registered users are active in a month.
- **AI cost per active user per month:** free ₹6, Pro ₹35, Elite ₹120 (Elite is higher because Call Analyzer uploads are audio-heavy). This is the number I trust least. Measure it.
- Costs excluded: Supabase, Vercel, marketing, salaries, support, taxes on profit.

### Model 1 — B2C freemium subscription (the current model)

| | Conservative | Base | Bullish |
|---|---|---|---|
| Registered users | 10,000 | 50,000 | 200,000 |
| Paid conversion | 2% | 4% | 6% |
| Elite share of paid | 5% | 10% | 15% |
| Paying users (Pro / Elite) | 190 / 10 | 1,800 / 200 | 10,200 / 1,800 |
| Gross billings / month | ₹66,800 | ₹7,38,000 | ₹48,48,000 |
| Net of GST | ₹56,600 | ₹6,25,400 | ₹41,08,500 |
| Gateway fees | ₹1,600 | ₹17,400 | ₹1,14,400 |
| AI cost | ₹21,700 | ₹1,50,000 | ₹8,01,000 |
| **Contribution / month** | **₹33,400 (59%)** | **₹4,58,000 (73%)** | **₹31,93,000 (78%)** |

Read this as: the model works if conversion holds, and it is **very sensitive to the AI cost per user and to conversion**. A 1-point drop in conversion moves the base case far more than any price tweak. Note that a free tier with unlimited sessions (see `useSubscription.js`) means the free users are a real cost line.

### Model 2 — Annual-plan overlay on Model 1

If 40% of payers choose an annual plan at 10× monthly (a 2-month discount):
- Cash collected up front rises sharply, and annual payers churn far less than monthly.
- Revenue per annual payer is about 17% lower per month than monthly, but retention more than offsets it.
- Example: 800 of the 2,000 base-case payers on annual at ₹2,990 is about ₹24 lakh collected up front, which funds acquisition.

### Model 3 — Outcome sprint packs (non-recurring)

- Price ₹599 per 30-day pack **(assumption)**.
- Target: 1.5% of registered users buy a pack per month, on top of subscriptions.
- At 50,000 registered users: 750 packs × ₹599 = ₹4.5 lakh gross, about ₹3.8 lakh net of GST per month.
- Strength: it monetises users who would never subscribe monthly. Weakness: no recurring revenue unless you convert pack buyers to Pro afterwards.

### Model 4 — Pay-per-use credits (Call Analyzer)

- Price ₹49 per analysis, with 5 included in Elite **(assumption)**.
- Unit economics: a 10-minute audio analysis is the heaviest AI call in the product, so price it at roughly 3–5× your measured cost.
- Needs real cost data first. Do not set a price until you know cost per analysis.

### Model 5 — B2B2C colleges and placement cells

- Per-student annual licence ₹299 **(assumption)**, about 1,500 students per college, 40% adoption.

| Colleges | Seats | Annual gross | Annual net of GST |
|---|---|---|---|
| 5 | 3,000 | ₹8.97 lakh | ₹7.6 lakh |
| 25 | 15,000 | ₹44.9 lakh | ₹38.0 lakh |
| 100 | 60,000 | ₹1.79 crore | ₹1.52 crore |

- Sales cycles are long (3–9 months), and the buyer is a placement officer, not the student.
- Requires: multi-user admin dashboard, bulk onboarding, invoices, data-processing terms.

### Model 6 — Corporate L&D / sales and BPO coaching

- ₹400 per seat per month **(assumption)**.

| Customers | Seats each | Annual gross | Annual net of GST |
|---|---|---|---|
| 10 | 40 | ₹19.2 lakh | ₹16.3 lakh |
| 40 | 60 | ₹1.15 crore | ₹97.6 lakh |
| 150 | 80 | ₹5.76 crore | ₹4.88 crore |

- Highest revenue per user, slowest to build. Needs SSO, data-privacy commitments, usage analytics, and a sales motion.
- BPO and sales call coaching (using Call Analyzer) is the most defensible entry point.

### Model 7 — Coach marketplace

- 20% take rate on ₹1,500 sessions **(assumption)** → ₹300 per session.
- 300 sessions per month → ₹90,000 per month.
- Low cost, but you take on supply management, quality control, and dispute handling. Only worth it after Model 1 has traffic.

### Model 8 — API / white-label

- Metered, e.g. ₹3 per scored minute **(assumption)**, with a monthly platform minimum.
- Realistic only after the scoring is validated and consistent. Recent commits show the score was recently recalibrated ("70-for-everyone"), so I would not sell this yet.

### Model 9 — Blended Year-1 view (illustrative **assumption**)

| Stream | Month-12 run rate (net of GST) |
|---|---|
| Model 1 (base case) | ₹6.3 lakh / month |
| Model 3 (sprint packs, 30% of the base-case rate) | ₹1.1 lakh / month |
| Model 5 (10 colleges) | ₹1.3 lakh / month (₹15 lakh / yr) |
| Model 6 (5 corporate pilots × 40 seats) | ₹0.7 lakh / month (₹8 lakh / yr) |
| **Total** | **about ₹9 lakh / month** |

It is only reachable if the 50,000-registered-user target is hit. That is the critical dependency, so growth is a bigger risk than pricing.

---

## 3. Aspirations vs. requirements

### Aspirations (what we want)

| # | Aspiration |
|---|---|
| 1 | San4 becomes the default speaking coach for Indian students and young professionals |
| 2 | Recurring, predictable revenue (annual plans plus institutional contracts) |
| 3 | Gross margin above 70% on subscriptions |
| 4 | Low CAC through referrals, community, and shareable San4 Scores |
| 5 | Institutional revenue (colleges, corporates) larger than consumer revenue within 18–24 months |
| 6 | A trusted, employer-recognised San4 Score / certificate |
| 7 | Live in-meeting assist as a flagship Elite feature |
| 8 | Reach into regional-language users and the diaspora (Gulf, SEA, US/UK) |
| 9 | A coach marketplace and creator ecosystem |
| 10 | A profitable free tier that still markets the product |
| 11 | A white-label API revenue line |
| 12 | A fully automated billing and entitlement system with no manual steps |

### Requirements (what must be true) — mapped to aspirations

#### R1. Billing and entitlements — **blocking everything**

| Requirement | Why | State in repo |
|---|---|---|
| Real recurring subscriptions (Razorpay Subscriptions / mandates) with renew, cancel, and failure handling | A payment link is one-off, so renewals are manual | Not present. `razorpay_subscription_id` column exists but is unused |
| Automatic activation, no "email your receipt" step | Manual activation loses conversions and does not scale | Pricing page still says to email the receipt for activation within 2 hours |
| Plan matched by payment, not by email guess | Email mismatch (payer email vs. account email) leaves paid users stuck | Webhook matches on payer email, and maps price to plan by amount |
| Handle `payment.failed`, refunds, cancellations, expiry | Needed for the 30-day guarantee on the Pricing page | Webhook handles `payment.captured` only |
| Honour `current_period_end` (revoke Pro when it lapses) | Otherwise users keep Pro forever | Hook reads `plan` only, not status or period end |
| **Fix subscription RLS: users must not be able to `UPDATE` their own plan** | Currently `"Users can update own subscription"` allows a signed-in user to set `plan='pro_plus'` on their own row, which gives free Elite | Present in `supabase/schema.sql` lines 88–89. Fix first |
| GST invoices, refund workflow | Legal for Indian digital sales; the guarantee is promised on the page | Not present |
| One price source of truth | Price lives in `Pricing.jsx`, the webhook amount map, and the compare table, and they disagree (the compare table shows 3 sessions/week and 8 scenarios, while the plan cards say unlimited and 14 levels) | Inconsistent |

#### R2. Unit economics and instrumentation

- Per-user AI cost tracking (Gemini calls per session, TTS usage, Call Analyzer minutes).
- Per-user daily caps or fair-use limits on free, and on Elite for Call Analyzer.
- A PostHog funnel that goes: visit → signup → first session → score → paywall view → checkout → paid → renewal. PostHog is installed, so add the paywall and checkout events.
- Cohort retention (D1, D7, D30) and payer churn by plan.

#### R3. Product — by revenue channel

| Channel | What must exist first |
|---|---|
| Annual plan / lifetime | Plan IDs for annual and lifetime in the data model, and a distinct webhook mapping |
| Sprint packs | Time-boxed entitlement (expiry date), pack-specific content |
| Credits | A credit ledger table, atomic decrement, refund on failure |
| Certificates / verified score | Score validity (calibration, anti-gaming), identity verification, public verify page |
| Referrals | Referral codes, fraud controls, reward ledger |
| Colleges / corporates | Organisations, seats, roles (admin / learner), bulk invite, SSO for corporates, admin analytics, invoices, data-processing agreement |
| Coach marketplace | Coach onboarding, scheduling, payouts, ratings, dispute handling |
| API / white-label | API keys, rate limits, metering, SLAs, docs |
| Live meeting assist | Real-time audio pipeline, privacy and consent UX, browser extension or desktop app. Hard and costly |
| Regional / international pricing | Multi-currency checkout, regional tax handling |

#### R4. Distribution and platform

- **Android store policy:** the app currently sends users to the website to subscribe. Keep that unless you adopt Google Play Billing, which carries a fee. Re-check Play's current rules before launching, since they change.
- **iOS:** none today. Adding it brings Apple's in-app purchase rules.
- SEO landing pages per audience (students, job seekers, IELTS, sales teams).
- Sharing: San4 Score share cards exist (`shareCard.js`). Make sharing one tap and trackable.

#### R5. Legal, trust, and compliance

- **DPDP Act (India):** consent, purpose limitation, data deletion, children's data. Voice recordings are sensitive. Needed before B2B, aggregate data (D5), and recruiter channels (D3).
- Privacy Policy and Terms must match what is actually done (recordings, AI processors such as Gemini, analytics).
- Refund policy consistent with the 30-day guarantee shown on Pricing.
- Claims like "500+ professionals" in the community and testimonials must be true and sourced.
- No selling of personal data. Any recruiter or employer access must be opt-in.

#### R6. Operational

- Support channel and an SLA, especially for paid users and institutions.
- Content pipeline: new scenarios, scripts, and industry packs on a schedule.
- Sales capacity for B2B (even a part-time founder-led motion).
- Cost controls: Gemini quota and budget alerts, server-side only keys (already moving that way via `/api/gemini`).

### Gap summary

| Aspiration | Biggest gap today |
|---|---|
| Recurring revenue | Payment link is not a subscription. No renewals, no cancellations, no period-end enforcement |
| 70%+ margin | No AI-cost measurement, and unlimited free usage |
| Institutional revenue | No organisation/seat/admin model |
| Trusted certificate | Score calibration only just fixed; no identity or anti-gaming |
| Live meeting assist | Not built; the real-time pipeline is the hardest item on this list |
| Automated billing | Manual receipt-email step; RLS lets users edit their own plan |

---

## 4. Suggested sequencing

1. **Now (blocking):** lock down the `subscriptions` RLS policy, add real recurring billing, automate activation, and reconcile prices across Pricing, the compare table, and the webhook.
2. **Next 30–60 days:** AI-cost tracking, a paywall funnel in PostHog, annual plan, referral loop, one sprint pack (e.g. Interview Sprint).
3. **60–120 days:** credits for Call Analyzer, a Resume Builder paid tier, 3–5 college pilots (founder-led, with a simple admin view).
4. **4–9 months:** organisation/seat model, corporate and BPO pilots on Call Analyzer, verified-score certificate.
5. **Later:** coach marketplace, API, live meeting assist, international pricing.

## 5. Open questions that change the numbers

- What are the current registered users, payers, and monthly Gemini bill? Without these, every table above is a placeholder.
- Is the ₹299 price GST-inclusive?
- Does the 30-day guarantee apply to Elite as well as Pro?
- Is B2B a priority for you, or is B2C the focus for the next year?
