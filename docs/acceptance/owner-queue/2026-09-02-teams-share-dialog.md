# Teams: a class can now be made and invited (2026-09-02)

**What changed.** Stage 3 of `docs/TEAMS_PLAN.md` - the one you ratified on 2026-09-01. A
signed-in user can now create a team, hand out its join code, join one by code or link, see who is
in it, and leave. No migration: it calls what landed the night before.

The door is a single dialog, "Share with a team…", reached from a production - the production
page's header, and the ⋯ menu on a production card. **A user who never opens it sees the word
"team" nowhere**, and an offline build grows none of it at all.

**Deliberately still off: MOVING a production into a team.** The button is there, disabled, with a
line saying why - it needs the team productions list, which is stage 4. Everything that is
enabled works against the real database. This is the one thing to check you are happy with rather
than to check works.

## The route, under a minute

You must be **signed in** - teams are an account feature, and signed out there is nothing to see
(that is the point).

1. `https://noacg.studio/app#/home/productions` - sign in if you are not.
2. Make a production, or open one you have. On its card, the **⋯** menu -> **Share with a team…**
   (or open the production and use **Share with a team…** in its header).
3. **＋ New team…**, name it something like `Arcada TV-26`, keep or edit the name your teammates
   will see, **Create team**.
4. You get the join code screen. **Copy link** is what you would paste into a class chat.

If you want to see the other end: open that link in a private window, or on your phone. Signed
out it offers a free account; signed in it asks one thing, the name teammates see.

## What to look at

- **The join code screen.** It is the thing a teacher reads out across a room - big, monospaced,
  wide-tracked. Is it readable at the back of the class?
- **The pick screen** when you have more than one team: the amber team chip and the member count.
- **The disabled "Move to team"** and the sentence above the footer. Is that an honest half-step
  you are happy to have in the product for one stage, or would you rather the whole door waited
  for stage 4?
- The two rulings that are now built in and are one line each to change if you disagree:
  **any member can see the code and pass it on** (only the owner can rotate it), and **a member
  sees display names only** - nobody's email is ever on that screen.

## What has NOT been seen by anyone

The multi-account story. Everything was walked by one account, so "three students, three logins,
one team" is proven by the database's own self-checks and not yet by three browsers. That is
stage 5 and it is on the plan.

Nothing to approve - this is a "is this the product you asked for" look.
