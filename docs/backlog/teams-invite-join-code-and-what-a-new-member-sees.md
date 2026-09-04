---
v: 1
source: owner
raised: 2026-09-04
state: unstarted
asked: "right now we cannot send an invitation to an email. That would be nice. We can just use the link. There is also the join code, but I don't know how to use that. I opened up the link with my phone, created an account, and now I got in. The surprising part was that I could see all the productions and all the graphics from my main account, so it doesn't seem to be working as intended."
---
# Teams: no email invitation, a join code with no door, and a new member seeing too much

**Filed:** 2026-09-04. **Source:** owner, walking `2026-09-02-teams-share-dialog` on production
(`776aa8cf`) by inviting himself on a phone and creating a second account.

## Why

Three findings from one walk. They are different sizes and the third may not be a bug at all, which
is exactly why they should not be fixed as one job.

### 1. There is no email invitation, and now there could be

`ShareWithTeamDialog.tsx` has no email field and no send path; the only mention of email in it is
the line telling users that addresses are never shown. Sharing is a link, or the join code behind
that link.

This was a reasonable place to stop while the project had no working mail. That changed on
2026-09-04: custom SMTP through Resend is live, authenticated with DKIM, SPF and DMARC, and the
rate limit is 60 new users an hour. A teacher inviting a class of thirty by pasting a link into
thirty places is the workflow this removes.

### 2. The join code exists but has no door

`JoinTeamDialog` is reachable only at `/app#/join-team/<code>` (`App.tsx:424` renders it purely
from the route). Once you are there the code IS editable, so a second code can be pasted in. But
there is no entry point anywhere in the app for someone holding only a code - no "join a team"
menu item, no field on the home screen. So the code can only be redeemed by someone who already
has a join LINK, which makes it redundant with the link and unusable on its own.

That is why the owner could not work out how to use it, and his confusion is the finding: a code
that cannot be typed in anywhere is a code that does not exist for the user.

### 3. A new member saw "all the productions and all the graphics" - REPRODUCE THIS FIRST

> The surprising part was that I could see all the productions and all the graphics from my main
> account, so it doesn't seem to be working as intended.

**The policies as written say this should be impossible**, which is a reason to reproduce it
carefully rather than to relax. Every select policy that could carry this is scoped:

- `documents_select_own` (0001) is `auth.uid() = user_id`, and no later migration ever widens it -
  0018 and 0020 only add restrictive suspension checks.
- `team_productions_member_select` (0054) requires `is_team_member(team_id)`, so it exposes
  productions explicitly shared with that team and nothing else.

So there are two very different explanations and they need opposite responses:

**(a) He recognised starter content as his own.** A fresh account on a fresh device shows the
catalog and the default state, which looks similar to any other account's. Not a bug, though it
would still say something about the second account's first-run experience being indistinguishable
from a populated one.

**(b) A real cross-account read**, through a path that does not go via those policies - a definer
function that never meets a policy, a share that attached more than the one production, or a
client-side list built from something unscoped. That is a security defect and outranks everything
else in this file.

**The discriminator is one question and costs nothing:** were the productions carrying the names
HE gave them, or were they generic starter items? He has not been asked yet. Ask before
investigating, because the two answers send the work to completely different places.

Note what he did NOT test, so nobody assumes it: he did not edit anything, did not add a graphic,
did not open a queue, and did not play anything out. Where a second member's new graphics live is
unknown, not known-broken.

## What it would take

1. Settle finding 3 with the question above. If (b), it is a security row and jumps the queue.
2. A door for the join code - a place to type one - or drop the code and keep only links.
3. Email invitations, now that mail works. The infrastructure exists; this is a form, a send and
   an invite record.

## Evidence

- Owner walk, 2026-09-04, verbatim in the receipt above.
- `src/components/teams/ShareWithTeamDialog.tsx`, `JoinTeamDialog.tsx`, `src/App.tsx:424`.
- `supabase/migrations/0001_documents.sql`, `0054_team_productions.sql`.
- The SMTP work landed the same day: `docs/acceptance/owner-queue/2026-09-01-smtp-oauth-provisioning.md`.

## Finding 3, answered with counts - probably NOT a leak, and a UX problem instead

Asked whether the productions carried his own names, the owner measured both accounts:

> The productions have the same name, but one thing I noticed is that it doesn't have all the
> productions, and it doesn't have all my graphics. [...] The Sport Day production, I can't see on
> my phone.
>
> On graphics, I have fewer imported graphics. I have 21 imported on my main account and 3 on the
> phone, and I have 83 graphics on my main account and 44 on this custom account I just created.

**A partial subset rules out both earlier explanations.** It is not starter content, because the
names are his. It is not an unscoped read of `documents`, because that would show all 83 and all 21.
What a new account CAN legitimately see is the public catalog plus the productions actually shared
with the team - and a partial, named subset is exactly the shape that produces.

**So the leading reading is that the policies are doing their job**, and the real defect is that
nothing in the interface distinguishes "shared with this team" from "mine". The owner could not
tell which of the 44 he was entitled to, and neither could a reader of his report. That is the same
complaint as `docs/backlog/signed-in-looks-identical-to-signed-out.md`, one level in: the product
does not show the boundary it is enforcing.

**The check that settles it, and it belongs to an agent rather than to him.** Count what a FRESH
account with no team sees. If that is 41 graphics and 0 imported, then the phone's 44 and 3 are
the catalog plus exactly what the shared production carried, the policies held, and this becomes a
UI row. If a fresh account sees fewer than that, the difference is unexplained and it goes back to
being a security row. Nobody has run it.

**One passage was dictated and did not survive transcription**, so it is deliberately not
interpreted here: *"On my main account, I can see all this one as its own production, but I can see
it on the phone."* It contradicts itself about the AI production and needs re-asking rather than
guessing.

### Correction, same day: the catalog arithmetic above does not hold

The reading immediately above guessed that 44 was "the catalog plus what the shared production
carried". That was checked and is wrong: `src/templates/` holds 553 template sources and the build
prerenders 502 catalog pages, so the catalog is not a ~41-item baseline that could make the numbers
work. The catalog is BROWSED, not counted as a user's saved graphics.

**A fresh account should therefore start with zero saved graphics, and this one showed 44.** That
is not explained, and the comfortable reading is retracted. The remaining candidates:

- The shared production genuinely contains 44 graphics, in which case the counts are correct and
  the only defect is that nothing says which are the team's.
- `community_templates` (0004) is public by design and is being counted as the user's graphics,
  which would be a counting bug rather than a leak.
- A genuine partial cross-account read, which is a security row.

**The discriminator, and it is a question rather than a count:** on the phone, is there any graphic
belonging to a production that is NOT visible there? The owner already established that Sport Day
does not appear on the phone. If a Sport Day graphic does, the boundary is broken; if every visible
graphic belongs to a visible production, it is not.

Until that is answered, treat this as unresolved and potentially a security defect. Do not let the
retracted paragraph above be read as clearance.
