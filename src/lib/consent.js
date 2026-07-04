// Single source of truth for the Privacy Policy / ToS version referenced by
// the signup consent checkbox (Auth.jsx), the audit trail written to
// profiles.terms_version (see supabase/schema.sql), and the policy page
// itself (PrivacyPolicy.jsx). Bump PRIVACY_POLICY_VERSION whenever the
// policy text materially changes so old consents stay attributable to the
// version the user actually saw (DPDP requires informed, specific consent).
export const PRIVACY_POLICY_VERSION = '2026-07-02'
export const PRIVACY_POLICY_EFFECTIVE_DATE = '2 July 2026'
