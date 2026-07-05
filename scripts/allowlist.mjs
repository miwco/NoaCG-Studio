// Admin tool: manage the invite-only allowlist (Era 5.1). The allowlist is the single source of
// truth the enforce_allowlist auth hook checks — an email must be on it to create an account.
//
// Usage (run from a trusted machine; the service_role key is read from env and never stored):
//   SUPABASE_URL=https://xxxx.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=... \
//   node scripts/allowlist.mjs add you@example.com          # allowlist an email (Google testers)
//   node scripts/allowlist.mjs invite you@example.com       # allowlist + email a magic sign-up link
//
// This is the OPEN-repo manual admin path. The hosted instance's automated invite flow lives in
// the private repo. Nothing here embeds a secret.

import { createClient } from '@supabase/supabase-js';

const [cmd, rawEmail] = process.argv.slice(2);
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.');
  process.exit(1);
}
if (!rawEmail || !['add', 'invite'].includes(cmd)) {
  console.error('Usage: node scripts/allowlist.mjs <add|invite> <email>');
  process.exit(1);
}

const email = rawEmail.toLowerCase();
const admin = createClient(url, key, { auth: { persistSession: false } });

// Always allowlist the address first (what the auth hook actually checks).
const { error: allowErr } = await admin.from('allowlist').upsert({ email }, { onConflict: 'email' });
if (allowErr) {
  console.error('Allowlist failed:', allowErr.message);
  process.exit(1);
}
console.log(`✓ ${email} is allowlisted.`);

// `invite` additionally emails a magic sign-up link (for email/password testers). Google testers
// need only the allowlist entry above — the hook admits them on first OAuth login.
if (cmd === 'invite') {
  const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email);
  if (inviteErr) {
    console.error('Invite email failed:', inviteErr.message);
    process.exit(1);
  }
  console.log(`✓ Invite email sent to ${email}.`);
}
