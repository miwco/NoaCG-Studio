# The control-panel road v2 - the owner's rewrite brief (2026-08-28, verbatim)

The owner reviewed `docs/CONTROL_PANEL_ROAD.md` on the 2026-08-28 walk and answered with this
brief. It supersedes the plan's current framing where they conflict; the rewrite session works
FROM this text. Captured verbatim, dictation intact.

---

**Goal.** Review and rewrite the NoaCG control-panel / playout plan so its foundations can grow
from today's simple graphics into professional broadcast-scale operation: sports, esports,
elections, automated newsrooms, audience interaction, multi-operator productions and large live
events. Do not turn this into an enterprise-feature roadmap. The immediate goal is to make sure
we are not choosing foundational abstractions now that professional systems have already learned
are limiting.

**Why.** NoaCG is still catching up with mature systems such as Ross XPression/DashBoard, Vizrt,
Singular.live, MXMZ, Flowics and similar modern playout platforms. These systems have decades of
production experience behind them. Before inventing new interaction models, study the relevant
patterns they have already proven. Borrow the lessons and abstractions that make sense for
NoaCG. Innovation can come through iteration later; first we need a foundation capable of
reaching that professional level. The long-term bar should be high: a major sports event,
esports tournament, election show, automated newsroom or Eurovision/Olympics-scale production
should be architecturally possible on NoaCG without replacing its foundations. A useful
principle from professional sports control: **the operator should understand football, not the
graphics software.** That usually means fewer, more meaningful controls rather than exposing
every technical capability.

**Reconsider: graphic contract vs operator workflow.** Keep the strong existing principle that
the graphic is the source of truth for its fields, actions, machine, legal transitions and
default control metadata. But reconsider the absolute rule that customizing the operator panel
must always mean editing the graphic. Professional systems commonly separate what the graphic
CAN do from how a particular production/operator wants to OPERATE it. The generated panel
remains NoaCG's zero-configuration default and must always be complete and usable. However,
investigate whether NoaCG should eventually support a lightweight production-level control
view/profile that can arrange, hide, rename, emphasize or combine capabilities already declared
by graphics - without duplicating or inventing their behaviour. Do not create a second graphic
model or arbitrary per-template panel code unless there is a compelling reason.

**Think beyond one graphic.** The per-type operator stories are valuable and stay. Add a
PRODUCTION operator story: real operators run shows, not isolated templates. The architecture
must eventually handle preview vs program; cue/rundown operation; graphic/layer replacement;
multiple simultaneous graphics; Next; editing upcoming content without disturbing on-air
content; emergency clear/out; operator conflicts; multiple controllers/operators; recovery after
reload/disconnection; automation/newsroom control. Do not necessarily build these now. Make sure
today's foundation does not make them difficult later.

**Shared data and state.** Revisit wording such as "each graphic carries its own backend." The
intent - avoiding one giant type-specific universal backend - is good. But professional
productions often have shared production truth consumed by many graphics: match score, teams,
election results, audience votes, timing, newsroom data. NoaCG graphics should remain portable
and own their presentation/behaviour while being able to BIND to shared production data/state
where appropriate. Avoid a future where the score has to be independently updated inside the
scorebug, the fullscreen result, the halftime graphic and the standings graphic.

**Validation.** "Every operator arrow fired once" proves action coverage, not broadcast safety.
Think about professional failure cases: repeated Take/Update; Out during another transition;
duplicated events; refresh/reconnection; renderer/controller restart; stale state; simultaneous
operators; interruption halfway through an action; recovery to a known on-air state. Do not
over-engineer now, but the long-term invariant is DETERMINISTIC, RECOVERABLE AND SAFE OPERATION,
not merely executable actions.

**Staged vs live changes.** Make the safety boundary explicit. Default mental model:
typing/editing STAGES content; operator actions intentionally change LIVE state; explicit
live-data bindings may update live automatically. A beginner should be able to predict whether
something they do will immediately affect the output.

**Agent responsibility.** First inspect the existing NoaCG architecture, contracts, docs and
tests. Then review relevant established patterns from professional playout/control systems
rather than designing from first principles. Use competitors as evidence, not as requirements -
NoaCG should remain much simpler and more approachable. Where the current plan already has the
right abstraction, preserve it. Where these suggestions conflict with the existing architecture
or create unnecessary machinery, identify that and propose the simpler approach that still
preserves the long-term intent. Do not convert this into a large implementation plan or
prematurely build enterprise features. The two questions to keep asking: *if NoaCG eventually
has to operate a major live sports event, esports tournament or automated newsroom, will this
decision still be a good foundation?* And equally: *can we keep today's experience simple enough
that a student or first-time operator can use it without understanding the underlying
machinery?* Both must remain true.

**Done when** the rewritten road has: generated-from-the-graphic controls as the simple default;
graphic capabilities and operator workflow clearly separated where appropriate; production-level
operation with a place in the architecture; shared production data/state possible; predictable
staged/live behaviour; validation aimed at deterministic and recoverable on-air behaviour; no
premature enterprise complexity; and no foundational decision that prevents NoaCG from
eventually reaching the capabilities demonstrated by mature professional playout systems. **Call
out any current assumption in the plan that should not become a long-term invariant.**
