---
kind: agent
date: 2026-09-03
---

> **Re-kinded 2026-09-03 - a claim, not an opinion.** What changed is one rule about which addresses
> the app rewrites, and that is drivable without his mailbox: a fresh profile opening
> `/app#access_token=...&type=recovery` must keep the address it arrived with. The mail round trip
> is the delivery mechanism, not the thing under test.
# A password-reset link opened on a new device now actually works

**What it was.** Supabase hands the session back in the part of the address after the `#`, so a
reset link comes back as `/app#access_token=…&type=recovery`. The app reads any `#` it does not
recognise as "the editor", and on a browser that has never made anything the boot then replaced
that address with `#/new` to open the wizard - a fraction of a second after the page loaded, and
before the sign-in code had read the token. The token was simply gone: no session, and the "choose
a new password" dialog never appeared. The reader saw the app open normally and had no way to tell
why the link had done nothing.

**What it is now.** Both places that rewrite the address ask the same question first, so an address
the app does not own is left exactly as it arrived.

## See it in under a minute

This one needs a real backend, so do it on the deployed studio rather than a local offline build.

1. In a browser profile you have never used for NoaCG (a fresh profile, or a private window -
   the bug only appears when the browser has made nothing before), ask for a password reset.
2. Open the link from the email in that same fresh browser.
3. The password dialog should appear, and the address bar should still show the long
   `#access_token=...` part. Before this change the address turned into `#/new`, the creation
   wizard opened instead, and nothing you did on that page could set a password.

Also worth one look while you are there: signing in with Google in a fresh profile should still
sign you in.

**Worth knowing it is not fixed.** After that sign-in the app lands on the canvas editor rather
than Home, because the same rule that stops it rewriting the address also stops it moving off the
surface the address implies. That is the other half of the same question and it is written up in
`docs/backlog/auth-return-lands-in-the-editor.md`. It is a wrong screen, not lost work.
