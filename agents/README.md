# San4 agents

## 1. Chief of Staff — nightly WhatsApp digest (built)

Every night at 21:07 IST, `.github/workflows/nightly-report.yml` runs
`agents/chief-of-staff/report.mjs`, which sends you a WhatsApp digest:
signups, practice sessions, paid users (~MRR), site/auth uptime, CI failures,
what shipped, and your idea backlog. Claude writes it if `ANTHROPIC_API_KEY`
is set; otherwise a plain template is used. Missing sources show as
"unavailable" instead of failing the job.

**Replies:** text an idea back and `api/whatsapp-webhook.js` files it as a
GitHub issue labelled `backlog` (tomorrow's digest lists it). Text `backlog`
to see the open list. Only your number is accepted, and Twilio's signature is
verified.

### Setup (one time, ~30 min)

1. **Twilio**: create an account, open *Messaging → Try it out → Send a
   WhatsApp message* and join the **sandbox** from your phone (free, fine to
   start). Later, register a real WhatsApp sender.
2. **GitHub repo secrets** (Settings → Secrets → Actions):
   `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TWILIO_ACCOUNT_SID`,
   `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` (sandbox: `whatsapp:+14155238886`),
   `OWNER_WHATSAPP_TO` (`whatsapp:+91XXXXXXXXXX`), optional `ANTHROPIC_API_KEY`.
3. **Vercel env vars**: `TWILIO_AUTH_TOKEN`, `OWNER_WHATSAPP_TO`,
   `TWILIO_WEBHOOK_URL` (`https://san4.vercel.app/api/whatsapp-webhook`),
   `GH_BACKLOG_TOKEN` (fine-grained PAT, Issues read/write on this repo only),
   `GITHUB_REPOSITORY` (`owner/name`).
4. **Twilio sandbox settings**: set "When a message comes in" to the webhook
   URL above (POST).
5. Create a GitHub label named `backlog`.
6. Test: Actions → *Nightly report* → *Run workflow* (dry run is the default,
   it prints the digest in the log). Untick dry run to send for real.

### Gotchas

- **24-hour window:** WhatsApp only allows free-form messages within 24h of
  your last reply. Replying to the digest keeps it open. For guaranteed
  delivery, get a message template approved and set `TWILIO_CONTENT_SID`
  (the digest goes in variable `{{1}}`).
- The Supabase **service-role key** is a full-access secret. It is only used
  in GitHub Actions and Vercel, never in the browser.
- GitHub can delay scheduled runs by hours under load.

## 2. Next agents (not built)

QA/Tech · Brand/Marketing · Sales/Ops · Funding & Credits · Industry Advisor.
Each reuses the same pattern: a script plus a scheduled workflow, reporting
through the Chief of Staff digest, with every outbound action approved by you.
