// ── Disposable / temporary email blocking ────────────────────────────────────
// Signups from throwaway inboxes (temp-mail.org, 10minutemail, etc.) inflate
// user counts, poison retention data, and let one person farm unlimited free
// scores. We want real, reachable addresses.
//
// This is the CLIENT-side check: instant feedback in the form. It is trivially
// bypassable on its own, so it is paired with a database trigger that rejects
// the same domains at insert time (see supabase/migrations/block_disposable_emails.sql).
//
// Kept as a curated list of the highest-volume providers rather than an
// exhaustive one: a huge list bloats the bundle and still misses new domains,
// while these cover the overwhelming majority of real-world throwaway signups.

const DISPOSABLE_DOMAINS = new Set([
  // temp-mail.org network (very common in India)
  'temp-mail.org', 'tempmail.com', 'temp-mail.io', 'tempmail.net', 'tempmailo.com',
  'neowd.com', 'rteet.com', 'dpptd.com', 'mrotzis.com', 'vddaz.com', 'zlorkun.com',
  'kimasoft.com', 'inkiny.com', 'bltiwd.com', 'gushijr.com', 'fexpost.com',
  // 10 minute mail family
  '10minutemail.com', '10minutemail.net', '10minemail.com', '20minutemail.com',
  // guerrilla mail
  'guerrillamail.com', 'guerrillamail.net', 'guerrillamail.org', 'guerrillamail.biz',
  'sharklasers.com', 'grr.la', 'spam4.me', 'pokemail.net',
  // mailinator
  'mailinator.com', 'mailinator.net', 'mailinator2.com', 'notmailinator.com',
  'reallymymail.com', 'binkmail.com', 'bobmail.info', 'suremail.info',
  // yopmail
  'yopmail.com', 'yopmail.fr', 'yopmail.net', 'cool.fr.nf', 'jetable.fr.nf',
  // throwaway / trash
  'throwawaymail.com', 'trashmail.com', 'trashmail.de', 'trash-mail.com',
  'wegwerfmail.de', 'mytrashmail.com', 'tempinbox.com', 'dispostable.com',
  'fakeinbox.com', 'spamgourmet.com', 'mailnesia.com', 'mintemail.com',
  'getnada.com', 'nada.email', 'emailondeck.com', 'tempr.email',
  'discard.email', 'mailde.info', 'moakt.com', 'tmpmail.org', 'tmpeml.com',
  'luxusmail.org', 'byom.de', 'anonbox.net', 'mohmal.com', 'inboxkitten.com',
  'harakirimail.com', 'incognitomail.com', 'burnermail.io', 'maildrop.cc',
  'mailcatch.com', 'mailexpire.com', 'spambox.us', 'spambog.com',
  'einrot.com', 'cuvox.de', 'dayrep.com', 'armyspy.com', 'fleckens.hu',
  'gustr.com', 'jourrapide.com', 'rhyta.com', 'superrito.com', 'teleworm.us',
  'linshiyouxiang.net', 'chacuo.net', 'emlhub.com', 'emlpro.com',
])

// Common giveaway substrings for domains not on the list yet.
const SUSPICIOUS_PATTERNS = [
  'tempmail', 'temp-mail', 'throwaway', 'trashmail', 'guerrilla',
  'mailinator', 'yopmail', 'fakemail', 'fake-mail', 'disposable',
  '10minute', 'minutemail', 'burnermail', 'dropmail',
]

export function emailDomain(email) {
  return String(email || '').trim().toLowerCase().split('@')[1] || ''
}

// True when the address looks like a throwaway inbox.
export function isDisposableEmail(email) {
  const domain = emailDomain(email)
  if (!domain) return false
  if (DISPOSABLE_DOMAINS.has(domain)) return true
  return SUSPICIOUS_PATTERNS.some(p => domain.includes(p))
}

// One message, used by the signup form.
export const DISPOSABLE_MESSAGE =
  'Please use a permanent email address. Temporary inboxes cannot receive your score updates or reset links.'

export { DISPOSABLE_DOMAINS }
