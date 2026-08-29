# The OGraf-first strategic review - the costing GOALS.md asked for

**Date:** 2026-08-29

**What changed.** `docs/OGRAF_FIRST_REVIEW.md` is new: the strategic review of moving from
SPX-first to OGraf-first that the "NEXT - OGraf-first" section of GOALS.md said was owed before
any code moves. It answers, against the actual tree and the published spec: what OGraf v1
specifies (Graphics stable 2025-09-17, Server API stable 2026-08-13), what already maps, what
fights, whether OGraf can be the canonical playout contract (yes - as interchange and playout
contract, with the HTML document staying the authoring format and the command log staying the
internal transport behind a Server API facade), what an import proof and an interop test suite
look like, where CasparCG sits, what a native SDI renderer would take, and the verified licence
landscape.

**The route (under a minute).** Open `docs/OGRAF_FIRST_REVIEW.md`, read §1 (the verdict) and
§12 (sequencing). §13 contains the proposed GOALS.md section rewrite, quoted in full - nothing
in GOALS.md was edited; the proposal waits for your yes.

**What to look at / decide:**

1. **The verdict itself** (§1): OGraf becomes the canonical interchange + playout contract; the
   authoring format and the SPX gate stay; the Server API is a facade over the command log, not a
   replacement. Is that the OGraf-first you meant?
2. **The GOALS.md rewrite** (§13): replaces the current OGraf NEXT section with the destination
   statement and a six-rung ladder. Approve, amend, or leave parked.
3. **One flag independent of OGraf** (§11, last row): GSAP's post-Webflow licence prohibits use in
   no-code animation tools that compete with Webflow's visual animation building. NoaCG is a
   no-code animation tool; the defence (broadcast graphics are not Webflow website animation, and
   we emit real GSAP code) is probably sound - but it is a judgment call worth your deliberate
   read, not something a session should wave through.

Nothing else needs you: no code changed, nothing merged into GOALS.md, the 2026-09-12 NOW is
untouched.
