# Owner rulings - the dated log

Every ruling the owner has given in a session, kept by DATE and moved here verbatim from the
memory store on 2026-09-03. It lives in the repo because the repo can hold it: these are decisions,
they are greppable, and git dates them. Memory keeps only a pointer.

**How to read this file, and it matters more than the content.** Per `docs/MISTAKE_TRIGGERS.md`
("Memory: the weakest trigger"), a ruling here is EVIDENCE, not authority, and the precedence is:
what the owner says now, then the repo's current state, then the newest dated ruling, then older
ones as advisory. **A rule outlives its own why, and the why is what to test.** Several rulings
below were made before the landing queue, before the student-release pivot, and with weaker models;
they describe how we got here rather than where we go. A later section supersedes an earlier one on
the same subject, and where that was already known the text says so inline.

Nothing here was re-checked line by line when it moved. Treat each entry as a claim about its own
date. `docs/GOALS.md` is the current push and outranks everything below.


---

## owner-decisions-2026-08-08


Answers given 2026-08-08, in one pass over nine session handoffs. These are binding and several
CONTRADICT text currently committed in the repo.

**AI / Lite**
- Anonymous Lite stays OFF. The door must say **create an account**, not only "sign in" -
  today `AiStep.tsx` renders `SignInPrompt` with sign-in-only copy and a single "Sign in" button.
- Production Lite is unblocked with `AI_LITE_OVERRIDE_USER_IDS` (owner + class accounts) on the
  Vercel project. Public caps stay honest. Owner action, not code.
- The intent_role_mismatch fix (judge kind against `emittedRoles[0]`) is approved WITH one paid
  ~$0.010 confirmation round. That approval is for that round only - see [[flag-real-money-spend]].
- Best effort at the deadline = **all categories are the target, nothing obviously bad ships**.
  So a category that fails the gallery gets switched off, not shipped.
- Category count is NOT pinned. `quiz` is real and included; the enum is the source; docs stop
  hand-counting. Lite's scope is "the useful catalog", which may grow or shrink.
- §3's build ORDER is guidance, not contract - sequence by dependency and risk.
- **AI never authors a state machine.** Each graphic TYPE owns its states/events; AI picks the
  type and fills content/design, and the machine arrives from the type registry. Where a type's
  intended operator behaviour is not already defined in code, ASK - do not invent one. Target:
  quiz, poll, scoreboard, clock driving real control panels before 2026-08-21. This is much
  smaller than "teach a model to emit machines", which is what the handoff proposed.
  **SUPERSEDED 2026-08-27** - owner: closing the control panel was "old thinking". Custom
  machines/panels are now open on EVERY path (CLI and Lite/Pro), gated, not forbidden. See
  [[owner-decisions-2026-08-27]].

**Pro (see [[noacg-pro-pipeline]])**
- Not retired, not continued mechanically. Before any tactic change, produce an EVIDENCE-BACKED
  diagnosis: where in the pipeline the 5/12 actually breaks, whether it is inherent to
  image-led design or only to this implementation, what was genuinely tried, what realistic
  improvement remains.
- The vision is a MULTI-MODEL pipeline - different models for concept, layout reading, code
  writing, rendered critique - varying by task and category. Not "one model generates everything".
- Pro must end up clearly better than Lite. **Lite and Pro are SEPARATE projects**: Pro is not
  Lite grown up, Lite is not Pro reduced. `src/ai/AGENTS.md` currently implies otherwise.
- **Creative Mode is RETIRED**, superseded by Pro. Mine it for lessons, failed approaches,
  benchmarks and reusable code; stop carrying it as a parallel path.
  (Supersedes [[creative-mode-plan]]'s "paused".)

**Catalog variety - the biggest item**
- The sameness measured in `docs/LOOKS_AND_PALETTES.md` is a REAL problem, and it is not about
  palette count. Needed: more distinct design families, compositions, typography treatments,
  spacing systems, shapes, image treatments, animation styles, visual personalities.
- **No recognisable NoaCG house look.** Graphics should read as if from different broadcasters,
  shows, brands, sports productions, events, streams, designers.
- Explicitly NOT solved by palette re-skins of the same layout, and not by hundreds of
  low-value near-duplicates. Start with an investigation - where the repetition comes from,
  which designs are genuinely distinct vs variants of one idea, what directions are missing -
  then propose systematic expansion. Do not treat today's Look count as a target.
- OPEN VERIFICATION owed: can every template really take arbitrary colours on its relevant
  elements, or are some designs effectively welded to their original palette? Unmeasured.

**Kits**
- The "no orphan graphics" goal is stronger than the handoff read it: not "a kit can reference
  this design" but **a user must never fall in love with one catalog graphic and find no
  matching production package around it**. Every good design needs a coherent family (lower
  third, titles, score, fullscreen, bug...) around it.
- So the 119 kit-unreachable designs are triaged first: distinct direction worth expanding into
  a kit, or near-duplicate that should not be. Letting kit choices name a DESIGN is a means, not
  the goal.
- Every kit gets a coherent default look, and "look" means palette AND typography, spacing,
  shape, layout language, image treatment, motion. Defaults, never locks.
- User-facing text unifies on **kit**; `TemplatePack` / `PACKS` / `resolvePack` stay.

**Wizard (re-design/handoff.md is current product direction)**
- Do the Browse redesign: first page + "Show 12 more", one type dropdown. **Update the specs and
  `src/templates/AGENTS.md` to match the intended UX** rather than preserving old behaviour
  because a spec asserts it. Preserve the underlying filtering capability. No parallel UI system.
- Entry cards keep CLICK-TO-ACT (no radio + Continue). Element colors stays COLLAPSED but must be
  obvious to open, and the alpha control is never compacted away.
- "Reveal in steps" stays below the fold - keep the Direction controls. But the current checkbox
  is INSUFFICIENT: it needs to define which elements reveal, in what order, and how each step
  behaves.

**Surfaces**
- Feedback button belongs in the WIZARD and on HOME, not only the editor shell.
- /join gets the `@font-face` so a published brand font actually renders.
- Commit `re-design/` (currently untracked, main checkout only - agents cannot see the pictures
  they are building toward). Trim `src/components/wizard/AGENTS.md` (116,064 B of a 120,000 B
  cap). Make `check-shared-instructions.mjs` report per-chain headroom on success.
- Owner runs `docs/STUDENT_RELEASE_ACCEPTANCE.md` §1-§6 on real hardware, cloud door first,
  against a KIT-built production. Class accounts created after that walk proves out.

---

## owner-decisions-2026-08-27


Owner answers, 2026-08-27, given on the phone in the orchestrator session. Binding; several are
not yet in any repo file - the next wave lands them.

**The big one - custom control panels open everywhere.** The 2026-08-08 "AI never authors
machines" stance is, in the owner's own words, old thinking: *"We need to open custom controls
for every model... we need to update it so we can do any graphic, have any control panel, and
ensure it will always work."* Applies to the CLI/agent door AND Lite/Pro - the safety model is
the GATES (validate green, `noacg inspect` shown to the user as the panel review, every operator
event walked in the bench), not prohibition. *"We want to give this to our customers."*
Partially supersedes [[owner-decisions-2026-08-08]].
Clarified same day: **Lite/Pro is DIRECTION ONLY - build later**, after the student release, when
AI work resumes; the CLI road may move first. And **priorities are unchanged: the 2026-09-12
student production stays the NOW** - the control-panel road advances only in spare capacity.

**Ratified as planned:**
- Wizard behaviour step: offer-by-predicate, default to NO behaviour, never interrogate, honest
  "something else" exit (node editor + agent door) that records the ask as feedback.
- Proving: per-type OPERATOR STORY in prose, proven in cloud + dashboard + offline export.
  Credits first. Owner will answer per-category "how should this graphic run" questions in chat
  (offered the evening of 2026-08-27); answers should be treated as direction, "not too strict",
  and *"many of these things already work well"*.
- Browse dropdown: **Option A** - one grouped dropdown (shelves as optgroups, member categories
  as options), the type chip row goes, style row stays the only chips.
- In-app hint links to /docs: make them AMBER via one app-wide CSS rule (they render default
  light blue today).
- Standing-routine cadences confirmed (weekly Mon 09:45, monthly 1st + 15th).

**Credits intent (the first operator story, owner's words):** paste the WHOLE credit list as one
text; a clear separator (colon or similar) splits role from name - exact separator is open, the
WHY is what binds; short and long credits both; roles and names styled differently, side by side
or stacked. The system, not the user, handles per-name structure.

**Editor (Advanced surface):** the symptom he remembers is SPACE not playing the timeline; if
space plays, "I guess it's fixed". Explicitly deprioritized - *"don't stress about it"* - the
whole timeline/canvas gets redesigned later; he steers people away from the editor today.

One dictation artifact: a Swedish passage about course-assignment weights in the same answer was
his teaching notes, ruled ignore - not NoaCG.

**Process rulings, evening 2026-08-27** (the durable rules landed in
`.agent-workflows/orchestrator.md` the same day - this records the intent and what is NOT built):
- Take the owner progressively OUT of the loop: agents answer their own questions with a
  recommendation and proceed; owner vetoes after the fact via a wave-end alignment
  questionnaire. Money, past-main, external accounts, direction forks still wait. *"Iterate with
  speed... but be safe"* - waking to a broken program is the one unacceptable outcome; safety
  stays priority one.
- Continuations verify the landed work with fresh eyes BEFORE continuing from the handoff.
- Every report names one lesson learned and applied next wave.
- Max plan: tokens not the constraint - ultracode/subagents welcome for big decisions and
  verification.
- **NOT BUILT, future session to design: the COUNCIL OF HELPERS** - advisors on different
  aspects (focus vs north star, competition, quality) chiming in every few days, catching the
  owner's own admitted drift (*"I put the North Star on a clear goal, and then I start fixing
  small bugs... I forget the big picture"*) and assisting agent decisions. Overlaps the
  coherence cadence and the monthly routines - the design session must reconcile, not stack, a
  fourth mechanism.

---

## owner-decisions-2026-08-29


Owner rulings, 2026-08-29 afternoon (answered the day-wave questionnaire):

1. **Countdown Update re-arms: KEEP.** Re-arming only when the clock's own fields changed is
   "the least surprising behavior".
2. **SVG import default stays the FULL ladder** (widen - wrap - shrink) - PROVIDED it is
   deterministic and reliable, and "the ladder should respect the authored design rather than
   silently destroying it". That caveat is the acceptance bar for future fitting work.
3. **Output health is not permanently hidden.** End state: a simple green "healthy" indicator
   visible whenever an output is relevant, plus an expandable TECHNICIAN view (connection state,
   latency/buffering, memory pressure, dropped frames/errors). Backlogged
   (`docs/backlog/output-health-indicator.md`), deliberately not built yet. Simple dot = operator
   calm; detail view = technician substance.
4. **EBU/OGraf: build working OGraf playout FIRST, on the existing NoaCG player/output
   architecture** (the /output renderer + control log) - never a separate playout system. All
   outreach (ograf.dev listing, EBU pitch signup, working-group email) waits until EBU/YLE can
   test NoaCG in a real production. Supersedes the "signup this week" urgency in the 08-29
   day-wave handoff. Related: [[product-direction]], [[gtm-competitive]].
5. **Multi-harness delegation (2026-08-29 evening).** Claude usage limits are near; the owner has
   a Codex subscription and a Google subscription. Ruling: everything stays CONTROLLED FROM
   CLAUDE CODE; clear, well-specced tasks may be delegated to Codex NOW ("I also allow you to use
   Codex for work you think is suited for right now") - start small, do not break the working
   wave machinery. Google Antigravity CLI: install and trial it the same way (needs the owner's
   Google login - interactive step). Long-term wish: the orchestrator learns which harness fits
   which task class. Codex remains NOT an autonomous wave peer (no watch loop) - reached via the
   rescue workflow from inside a Claude session, or user-started.
   **Why:** capacity headroom + harness diversity; the owner called it next-gen orchestration.
   **How to apply:** night waves include at most one bounded Codex-delegated row until trust is
   built; first trial = mechanical bulk edits (the Codex sweet spot per the delegation rule).

---

## owner-decisions-2026-08-30


Answers to the questions the night wave left. All five are rulings, not preferences.

**1. Poll score updates - held by default, live by opt-in.** *"Usually people will use it just to
show the results, so the poll does not have to automatically update. However, we should give that
possibility to those who want it. There could be a checkbox that you can check if you want to
automatically update the score on the screen during a live broadcast."* So: the shipped default
stays "reveal on Show result", and a checkbox turns on live ticking during the broadcast.

**2. The Google CLI permission file - option A, with caution.** Install
`C:\Users\ahonemi\.gemini\antigravity-cli\settings.json` WITH its `deny` lines, because the goal is
autonomous agents - but the open risk must be closed rather than accepted: it is unknown whether
that machine-global `deny` also binds his own interactive `agy` and silently stops it writing
files. Whoever installs it MUST test that afterwards and report, not assume. *"Let's go with A but
with caution."*

**3. The push-parsing permission hook - build it, scoped as narrowly as possible.** *"We want to
have autonomous agents, but scope it as narrowly as you can so we don't put ourselves at any extra
risk."* Pre-approve exactly the safe `git push` shape that no text prefix can express; nothing
wider.

**4. The growth rule - geometry AND purpose, never category.** Write the rule, but it *"shouldn't
depend only on a category. It should depend on the geometry and what is the why of the graphic and
how it works with other graphics."* His worked example, and it is the useful part: **a quiz or text
box played one after another should keep the SAME size between items** - in Who Wants To Be A
Millionaire the question box does not resize with the question, and that is right by design taste,
not by accident. So a graphic in a SEQUENCE is a case for constant size even where the geometry
alone would argue for growing. *"We should have real-life examples and logic being used here... I
don't know how to write it in but do your best."* See [[owner-taste-rules-composition]].

**5. Autonomy, ratified and extended** - see [[fix-dont-ask]], which carries it as a standing rule.

## Evening rulings, same day

**6. THE OWNER'S EYES ARE NEVER A BLOCKER - this is a standing rule, not an answer.** *"One thing
we should do is not block too much of other work just because I can't test something. We have so
many things to work on anyway."* And: *"It's up to me to test what I need to test. You don't have
to block any work just because I haven't tested something or something is not done... nothing
should block stuff. We can always improve on stuff."* This REVERSES the orchestrator's
owner-attention rule, which queued owner-observable work behind machinery once the owner queue
passed roughly ten unwalked items. Combined with his ruling that nothing in that queue expires,
**the owner queue is a RECORD, not a gate**: it is where work waits to be seen, never where work
waits to be started. A plan that reports "the push is blocked on your eyes" is making his backlog
into a dependency, and he does not want one. **On Tuesday 2026-09-01 he writes a long to-do list**
for us to follow.

**7. SVG import is the most important thing right now** (his words, evening of 2026-08-30) - which
is consistent with `docs/GOALS.md` `## NOW`, where SVG import is how a student's own artwork gets
in.

**8. Codex effort: high most of the time, medium the floor, low only for easy tasks.** *"The low
reasoning worries me... important coding tasks should be on high... I have more faith in GPT SOL
than in Gemini."* `~/.codex/config.toml` was on `low` and is now `medium`. `gpt-5.6-sol` is the
ONLY model the ChatGPT subscription exposes through Codex - ten other names were probed and all
refused - so effort is the only knob there is.

**9. Antigravity default is `gemini-3.7-flash-high`**, on measurement: equal correctness to
`gemini-3.1-pro-high`, 3.3x faster, more detail. *"It's a newer model so it's fine."* High
reasoning for most tasks, lower where a task plainly does not need it.

**10. Delegate most mechanical work to Codex, verified by Claude**, and **`/check` becomes
permanent for night sessions** (the trial was to run to 2026-09-04; one day caught nine real
issues on a single branch).

**11. The `ebu/ograf` spec issue - ANSWERED YES, and it is already filed.** *"Yes, I think it would
be good to inform EBU about that lack, but right now we have to design around it and then implement
it when we can."* Filed as **https://github.com/ebu/ograf/issues/82** under `miwco`, purely
technical, pitching nothing and inviting nobody, so the outreach ruling in
[[owner-decisions-2026-08-29]] is untouched. The design that does not wait on it is
`docs/OGRAF_STATE_IN_FIELDS.md`. An earlier version of this entry said the question was still open -
it was not; do not file a second issue.

One claim corrected while filing it: the spec does not *drop* a graphic's returned state, it leaves
it **undeclared**, and the reference implementation forwards it. The gap is real but narrower than
first reported, and wider in a different way - it affects all four action endpoints, and the
Graphics spec contradicts itself between its prose and its type definitions.

---

## owner-decisions-2026-09-03


**Read for intent, not for the letter - and this reaches frozen artifacts, not only live words.**
A ruling, given after the orchestrator turned a number in a receipt's own slug into a requirement
and had a session file the deviation as a decision he was owed. Verbatim, in full:

> *"this is exactly the kind of literalism we need to remove from the Orchestrator. Numbers,
> wording, implementation ideas, and old receipts should not become binding owner requirements
> unless I clearly made that specific detail the point. Infer the underlying intent and use your
> own judgment to achieve it better. Here the intent is simply that the byte budget works reliably
> and fails safely before running out of room. If 4,096 bytes is the better technical solution, use
> it. This should not have needed an owner decision."*

He also said he does not believe he ever specified 99%, and he is right - the number came from the
receipt slug `agents-md-warning-fails-at-99` and from a paraphrased `asked:` line, which is
paraphrase twice over. **So: 4,096 bytes stands, and the question should never have been put to
him.**

**What this ruling is NOT.** It is not permission to override him. The same message says to achieve
his intent *better*, and better is measured against what he wanted, never against what a session
would rather build. The detail still binds wherever he made it the point - a taste ruling, a named
date, a figure he arrived at himself, an explicit "it must be X". Where a session genuinely cannot
tell, it serves the intent and REPORTS; it does not stop to ask.

**The same day, on autonomy - the two quotes the contracts point here for.** These are the live-word
half of the rule above, and the orchestrator core and `orchestrator/pushback.md` both cite this
section rather than reprinting them:

> *"use your own reasoning...*
> *Tell me about significant decisions afterward and I can always revert them."*

> *"I may suggest something that is not actually in NoaCG's best interest... maintain the larger
> plan, vision, and goals and work toward them independently rather than treating everything I say
> as an unquestionable instruction."*

Implemented as **INTENT BINDS, THE DETAIL DOES NOT** in `.agent-workflows/orchestrator.md`, with
its counter-half beside it, the reporting consequence in `orchestrator/pushback.md`, the row-facing
half in `orchestrator/prompts.md`, the same rule for receipts in `docs/backlog/README.md`, and the
story in `orchestrator/incidents.md` ("the 99% that nobody asked for").

### The orchestrator review brief, evening 2026-09-03

Given as the brief for the next orchestrator review, after the first real day and night waves.
Rulings, in the owner's own framing; paraphrased where marked.

- **"We do not slow down. We only speed up."** Claude Code Max was at about 45% of its weekly
  allowance after two days of orchestrator use. The answer is never pacing: no daily token
  budgets, no "save Claude for later in the week". Remove waste and route work into capacity that
  is already paid for; if more capacity eventually has to be bought, that is acceptable, but first
  prove the current subscriptions are not being wasted.
- **The objective is verified useful work per unit of constrained capacity**, and it is never
  optimised by reducing useful throughput. Never penalise using an expensive model where it
  materially improves the outcome.
- **Codex is available by default.** *"The owner will explicitly say at wave start when Codex is
  needed elsewhere and is off limits for that wave."* Absent that, use the Codex subscription
  productively rather than preserving unused quota. **GPT Sol on high reasoning is highly valued
  and should be used substantially where it performs well.** Supersedes the 2026-09-01 evening
  ordering "Antigravity first, Codex last". An upgrade is justified only by evidence that Codex
  capacity regularly becomes a real constraint, routing into it is reliable, and more of it would
  turn into more verified work; do not hard-code that decision anywhere.
- **Antigravity: exploit it where evidence supports it.** Its Claude/GPT pool exposes older,
  non-frontier models; that is current evidence, not a reason to abandon the pool. Test Gemini
  and the abundant models aggressively on mechanical work, bulk transformations, straightforward
  investigation and bounded implementation. Cheap generation followed by expensive redo is not
  economical: grade every `(harness, model, task-class)` by actual results.
- **Opus stays a primary implementation model and the persistent master.** Find waste before
  reducing valuable Opus work. **Fable stays the high-leverage resource for consequential work**
  (architecture, strategic decisions, difficult debugging, adversarial review, important design
  judgement) and is never spent on mechanical bulk.
- **A tool observation is evidence about a version, never a permanent ruling.** Codex and
  Antigravity update almost daily. "This harness cannot write", "this flag does not exist", "this
  model is unavailable" are re-probed after a meaningful software change, cheaply, and never left
  to disable a capability for good. Model names, quota readings and provider economics do not
  belong in permanent hot orchestrator context.
- **Knowledge fires at the point of action, or it is dead documentation.** The measured failure:
  an instruction exists, is not read when needed, the mistake happens, and the document is found
  afterwards. The ladder for a recurring failure is hook, script, test or runtime mechanism first;
  then durable structured state; then a precise context pointer; skill prose only where the
  judgement itself needs it. Never solve it by loading every memory into every session.
- **The owner is not the universal expert.** Coding questions go to the coding agents, design
  questions to design expertise and evidence, architecture to expert judgement, factual questions
  to investigation, experimentally answerable questions to an experiment. A question is not
  escalated because several approaches exist. The owner is the source of product intent,
  priorities, genuinely personal taste, business constraints, irreversible or external decisions,
  and corrections; an owner suggestion is not automatically technical truth, and the orchestrator
  may challenge it when evidence shows a better way to the same goal. Explicit current rulings
  bind until superseded; old opinions do not silently become constraints. **Owner unavailable is
  not a reason for the useful frontier to stop moving.**
- **Dates express ordering, dependencies, targets and priority - never "not before" gates.** If
  something planned for December is ready, useful and safe now, do it now unless a real dependency
  makes waiting valuable. The owner manages real-world timing with students and Yle; the
  orchestrator keeps NoaCG moving. Software is never finished: find the most valuable actionable
  work, improve, verify, land, reassess, continue.
- **Economy is something the orchestrator actively checks**, at whichever layer is
  architecturally right (plan-time routing, post-wave spend review, the outcome ledger) - not
  crammed into `/check` because the word "check" was used.
- **Change policy for the orchestrator itself:** at most three to five evidence-backed
  improvements per review, no giant rewrites, every new rule earns its recurring context cost,
  experiment before adding a permanent rule. Preserve: one persistent authoritative master,
  serialized landing, order-free waves, exact-SHA verification, risk-scaled independent review,
  durable state, owner receipts, handoff draining, deliberate collision planning, no structural
  dependency on one harness, no interactive permission dependency unattended, mechanisms over
  prose, progressive disclosure, and the common-path measurement.

---

## operator-stories-2026-08-27


How the owner wants each graphic type to run on air. Direction, "not too strict" - the WHY binds,
the mechanism is the session's to design. Sits under [[owner-decisions-2026-08-27]]; proving
order starts with credits.

- **Credits**: whole list pasted as ONE text; a separator (colon-ish, exact form open) splits
  role from name; short and long variants; roles styled differently from names; side-by-side or
  stacked layouts. AMENDED 2026-08-28 (walk): operator SPEED control on anything scrolling;
  scrolls ALL THE WAY THROUGH by default (never parks names/logo mid-screen); an optional end
  beat (logo/text) may follow. Repo copy: docs/backlog/scrolling-speed-and-through.md.
- **Ticker/crawl**: one pasted list (one item per line), loops until Out; list editable
  mid-show, new items enter on the next pass.
- **Scoreboard**: current model RIGHT - Goal A = flag + score in one press; +/- for corrections;
  Full time independent.
- **Quiz**: lock -> reveal stays the taught default path, but direct reveal without lock is
  allowed.
- **Poll/vote**: audience votes live via /join, bars fill from real votes, operator only decides
  WHEN results show. (Offline/manual entry not ruled on - the recommended option he took was
  audience-first.)
- **Timer/countdown**: duration set beforehand, starts on TAKE, at zero HOLDS at 0:00 until
  taken out.
- **Stat readouts**: play = count 0 -> value (fixed 2026-08-27); UPDATE while on air = animate
  old -> new, never snap, never recount from zero.
- **Lists** (agenda, lineup, standings): rows pasted as one field; NEXT reveals row by row (a
  show-all option acceptable).
- **Alerts/notifications**: BOTH stories, per design - breaking-news strap stays until Out; a
  follower/donation pop plays, holds briefly, self-outs.
- **Results boards**: depends on the design - award-style steps to the winner with Next,
  standings-style enters whole. Both stories needed.
- **Reveal cards**: staged - taken on air hidden/teased, ONE Reveal press fires the moment.
- **Holding**: ambient loop until Out. **Transition/stinger**: fires once, self-completing, no
  Out.
- **Simple graphics** (lower-third, title, topic, info, question, quote, caption, bug, sponsor,
  CTA, product, map): type - Take - Update (clean swap) - Out is the standard story. BUT stay
  OPEN: any of them may grow behaviour (bug cycling logo/clock/sponsor, map moving on cue,
  sponsor rotation, rapid caption/question stepping) - and if a richer one is easier to ship as
  its own type/name, that is fine. Owner's guardrail: *"let's not make this too difficult for
  us"* - openness over machinery.
