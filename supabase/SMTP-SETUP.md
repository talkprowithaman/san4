# Fixing "email rate limit exceeded" at signup

## What actually happened

Supabase projects ship with a **built-in email sender**, and San4 is still using it.
That sender is deliberately crippled — Supabase documents it as being for
development only, with **no deliverability guarantees** and a very low hourly cap
(on free projects this has been as low as **2 emails per hour, for the whole
project**, not per user).

So the third person to sign up in any given hour gets:

```
email rate limit exceeded
```

Nothing is broken in our code. We are simply using a mailer that was never meant
to carry real signups. **Until this is changed, San4 cannot onboard more than a
couple of users an hour**, which makes any launch push pointless.

There is a second, quieter cost: mail from the built-in sender is far more likely
to land in spam, because it is sent from Supabase's shared infrastructure rather
than from `san4.in`.

## What was already fixed in code

The app no longer shows users the raw API string. `src/lib/authErrors.js` maps
Supabase errors to plain English, and the signup path now uses it — previously
`Auth.jsx` passed `err.message` straight to the UI, which is why you saw the
developer-facing wording.

That is a bandage. It makes the failure understandable; it does not raise the cap.

## The actual fix: connect your own SMTP (free)

**Resend** has a free tier that comfortably covers early San4 — 3,000 emails per
month / 100 per day at the time of writing — and costs nothing. (Brevo and
Mailgun have comparable free tiers if you prefer.) Verify the current limits when
you sign up; providers change them.

### 1. Create the sender

1. Sign up at <https://resend.com> and add the domain **san4.in**.
2. Resend gives you DNS records (SPF/DKIM, usually a `TXT` and a `CNAME` or two).
   Add them wherever san4.in's DNS is managed, then hit Verify.
   *This step is what stops San4 mail landing in spam — don't skip it.*
3. Create an **API key** with send permission.

### 2. Point Supabase at it

Supabase Dashboard → **Project Settings → Authentication → SMTP Settings** →
enable *Custom SMTP*:

| Field | Value |
|---|---|
| Host | `smtp.resend.com` |
| Port | `587` |
| Username | `resend` |
| Password | your Resend API key |
| Sender email | `vak@san4.in` (must be on the verified domain) |
| Sender name | `Vak from San4` |

### 3. Raise the cap

Custom SMTP does **not** lift Supabase's own limiter by itself. Go to
**Authentication → Rate Limits → "Rate limit for sending emails"** and raise it
(it defaults to something conservative like 30/hour). Set it to whatever your
provider's daily allowance supports — 100/hour is a sane starting point on
Resend's free tier.

### 4. Verify

```bash
gh workflow run supabase-keepalive.yml      # confirms auth still healthy
```

Then sign up with a fresh address and confirm:
- the email arrives **from `san4.in`**, not from Supabase
- it lands in the inbox, not spam
- three signups in a row all succeed

## Note on the email templates

The four branded templates in `supabase/email-templates/` are unaffected by this
change — they live in Supabase (Authentication → Emails) and are used whichever
sender is configured. Switching to Resend does not require re-pasting them.
