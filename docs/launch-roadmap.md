# San4 Frontend Launch Roadmap

Scope: frontend only. Backend work (tables, auth, payments, cloud functions) is listed only as a **dependency**.

## How to read this

- **Effort** (frontend only): **S** = under 1 day, **M** = 2 to 4 days, **L** = 1 to 2 weeks.
- **Impact** (1 to 5): how much it moves the funnel (reach, signup, activation, revenue or referrals).
- **Priority** = impact divided by effort, adjusted for dependencies.
  - **P0** = must ship before launch.
  - **P1** = launch window, weeks 1 to 4.
  - **P2** = after launch, once there is data.
- **Starting point** = what already exists in the repo today. This keeps effort estimates honest.

## What exists today (so we don't rebuild it)

| Already in the repo | Where |
|---|---|
| Landing, How It Works, Why It Matters, San4 Score, Pricing, Resume Builder, Extension pages | `src/pages/`, routes in `src/App.jsx` |
| Guest assessment, with guest score kept through signup | `Assessment.jsx`, fix in #23 |
| Share card (1080x1350 PNG, native share sheet) | `src/lib/shareCard.js` |
| PostHog analytics with a `track()` helper and pageviews | `src/lib/analytics.js` |
| Plans: Base Camp ₹0, Vak Pro ₹299 (was ₹499), Vak Elite ₹999 | `Pricing.jsx` |
| Android wrapper (Capacitor), web-only purchase for Play policy | `android/`, `capacitor.config.json` |
| Reminders, streaks, XP, Daily Rep, Daily Challenge | `Reminders.jsx`, `DailyRep.jsx`, `DailyChallenge.jsx` |

**Not in the repo yet:** owner/coach/teacher concept, class codes, invites, referral links, UTM capture, group dashboards, owner-specific pricing, owner landing pages.

---

## P0: Ship before launch

| # | Item | Effort | Impact | Starting point | Backend dependency |
|---|---|---|---|---|---|
| 1 | **UTM and source capture**: read `utm_*` and `?ref=` on first visit, store it, attach to signup and PostHog | S | 5 | Extend `analytics.js` | Store `source` on the profile (one column) |
| 2 | **Funnel events** in PostHog for every step: landing view, assessment start, assessment done, signup, first rep done, paywall view, upgrade click, share click | S | 5 | `track()` already exists | None |
| 3 | **Four owner landing pages** from one shared template (`/for-coaches`, `/for-teachers`, `/for-corporates`, `/for-consultants`). Copy is in `owner-landing-pages.md` | M | 5 | Copy marketing components from `Landing.jsx` | None |
| 4 | **Owner "Join the pilot" form** (name, role, audience size, WhatsApp number). Can post to a form tool or the cloud. Lets us start *concierge* onboarding without building the dashboard first | S | 5 | New small component | A table or any form endpoint |
| 5 | **Share card upgrade**: add the sharer's referral link or QR, plus a "Challenge a friend" caption and pre-filled WhatsApp text | S | 4 | `shareCard.js` exists | Referral code per user (can be the user id for now) |
| 6 | **Funnel QA**: run guest → score → signup → first rep on a phone and desktop, web and Android. Confirm the guest score survives signup | S | 4 | Fix #23 shipped | None |
| 7 | **Social preview tags** (Open Graph / Twitter) per owner page. As a single-page app on Vercel, route-level tags need prerendering or Vercel rewrites | S | 3 | `vercel.json` | None |
| 8 | **Proof section with real content only**: founder story, product screenshots, session counts once true. No invented testimonials | S | 3 | `aman.jpg`, product screenshots | None |

**P0 total:** about 1.5 to 2 weeks for one frontend developer.

---

## P1: Launch window (weeks 1 to 4)

| # | Item | Effort | Impact | Starting point | Backend dependency |
|---|---|---|---|---|---|
| 9 | **Invite link and class code join flow**: owner shares a link or code, learner joins a group at signup | M | 5 | Auth and signup flow | `groups` and `group_members` tables, join RPC |
| 10 | **Owner dashboard v1** (read-only): list of learners, San4 Score, streak, last active, trend line | L | 5 | Dashboard and Progress pages for layout patterns | Row-level security so owners see only their group |
| 11 | **First-run activation checklist** that ends with the first completed rep | M | 4 | `Today.jsx`, `DailyRep.jsx` | None |
| 12 | **Owner pricing page**: plans for Coach, Classroom and Team on `/pricing`, with a "Talk to us" option until self-serve exists | M | 4 | `Pricing.jsx` plan array | Payments for group plans (decision needed) |
| 13 | **Assign a challenge to a group** (pick a scenario or Daily Challenge, set a due date) | M | 4 | `DailyChallenge.jsx` | Assignments table |
| 14 | **WhatsApp and email opt-in** at signup, with the reminder choice in `Reminders.jsx` | S | 3 | `Reminders.jsx` | Messaging provider |
| 15 | **Paywall moments**: show the upgrade prompt at the moment of value (a locked Summit level, camera-on Body Language, Call Analyzer) rather than only on `/pricing` | S | 4 | Locked states already exist | None |
| 16 | **Play Store listing assets** (screenshots, feature graphic, short description) | M | 3 | `android/` wrapper | None |
| 17 | **Regional-language landing toggle** (Hindi first), reusing the mother-tongue onboarding strings | M | 3 | Mother-tongue onboarding (#16) | None |

---

## P2: After launch, driven by data

| # | Item | Effort | Impact | Backend dependency |
|---|---|---|---|---|
| 18 | Group leaderboard and cohort stats | M | 3 | Aggregate queries |
| 19 | Branded or white-label PDF progress report | M | 3 | None (client-side PDF) |
| 20 | Affiliate and referral earnings page for coaches | L | 3 | Payouts, tracking |
| 21 | Weekly progress summary screen and email | M | 3 | Scheduled job |
| 22 | Interactive 60-second demo on the landing page | M | 3 | None |
| 23 | Group-level comparison for corporate buyers (before vs after) | M | 3 | Aggregates |
| 24 | Programmatic SEO pages (one per speaking topic) | L | 3 | None |

---

## Suggested sequencing

| Week | Ship |
|---|---|
| **1** | #1, #2 (measure everything), #6 (QA), then #3 starts |
| **2** | #3, #4, #5, #7, #8, so the owner pages and the pilot form go live and **launch can start** |
| **3 to 4** | #9 and #10 (needs backend), #11, #15 |
| **5 to 6** | #12, #13, #14, #16, #17 |
| **After** | P2 in order of what the funnel data shows |

## Honest launch posture

Owner features (#9, #10, #13) take longest and depend on backend. So the first launch should be a **concierge pilot**:

1. Owner landing pages and the pilot form go live in week 2.
2. First 10 to 20 owners are onboarded by hand: you give them a signup link with `?ref=their-code`, and they share it.
3. Their learners' progress is shared manually (a screenshot or a sheet) until the dashboard ships.
4. This tests whether owners care, before building the full group system.

The owner pages must label group features as **"Pilot"** until they're live (see the status tags in `owner-landing-pages.md`).

## Metrics to watch from day one

| Funnel step | Event | Target to learn |
|---|---|---|
| Visit → try | landing view → assessment start | % of visitors who try |
| Try → signup | assessment done → signup | % who save their score |
| Signup → activate | signup → first rep done | % who finish one rep within 24h |
| Activate → habit | active on day 7 | 7-day return rate |
| Habit → pay | paywall view → upgrade click | upgrade rate |
| Owner funnel | owner page view → pilot form submit | % of owners who apply |
| Referral | share click → new signup with `ref` | signups per share |

Decide targets after the first 2 weeks of data. Any number picked now would be a guess.

## Open decisions (need an answer before the P1 work)

1. **Owner pricing:** free for owners with paid learners, a per-seat price, or a flat monthly fee?
2. **Payments for groups:** the current Razorpay link is per individual. Group billing needs a decision.
3. **Owner incentive:** commission, free Vak Pro, or revenue share?
4. **Student data:** minors in schools need a parental-consent and privacy position before the teacher flow goes live. Check with `PrivacyPolicy.jsx` and `ResponsibleAI.jsx`.
