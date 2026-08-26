/**
 * The editor's PlayoutSimulator lifecycle (play/stop/next/settle/scrub/snap), moved inside the
 * preview document. PlayoutSimulator.tsx used to own `window.__activeTl`/`__scrubTl` directly
 * through `contentWindow` — those are live GSAP timeline objects, which cannot cross
 * `postMessage`, so the composition itself has to run where the timelines live. See
 * composeDocument.ts's `simulate` option, which serializes `runSimCommand` (this file) into the
 * document via `.toString()`.
 *
 * STRINGIFICATION HAZARD: `.toString()` captures only a function's own source text, not its
 * closure. A reference to an imported binding compiles fine here but throws `ReferenceError`
 * inside the document, where no such import exists (settleGraphic.ts's `reportGraphicBox` hit
 * exactly this bug once — see its comment). So `runSimCommand` calls only two named helpers,
 * `killAllTimelines`/`resetGraphicInline`, which composeDocument.ts embeds under those exact
 * names; every other piece of state that would otherwise need a module-level closure (the
 * pending auto-out timer, the settled flag, the Continue step count) lives ON the window instead
 * (`__simAutoOut`/`__simSettled`/`__simStep`), so a single `.toString()` of `runSimCommand` is
 * fully self-contained. Its own recursive call (the auto-out timer firing `sim-stop`) is safe
 * without any name-matching discipline at all — a named function expression's name is bound
 * within its own body (and everything nested inside it) regardless of what outer variable it
 * ends up assigned to.
 */

/** A settled/running GSAP timeline handle — the house entrance/exit builders' return value. */
export interface SimTimeline {
  pause: (t?: number) => void;
  /** suppressEvents=true jumps without firing callbacks (clocks/loops stay idle). */
  progress: (p: number, suppressEvents?: boolean) => void;
  duration: () => number;
  /** Read the playhead, or move it: `time(seconds, true)` jumps without firing callbacks. */
  time: ((value: number, suppressEvents?: boolean) => void) & (() => number);
  /** Direct children; `false` = do not descend into nested timelines. GSAP always has it - the
   *  optionality is for the hand-written `buildInTimeline` a foreign import can ship. */
  getChildren?: (nested: boolean) => { startTime: () => number; totalDuration: () => number }[];
  kill: () => void;
}

/** The template globals the simulator drives — the SPX contract, the house builder contract,
 *  and the state-machine (v2 interpreter) surface — plus the simulator's own window-scoped state. */
export type SimWindow = Window & {
  update?: (data: string) => void;
  play?: () => void;
  stop?: () => void;
  next?: () => void;
  buildInTimeline?: () => SimTimeline;
  buildOutTimeline?: () => SimTimeline;
  /** Steps templates: reveal the next Continue line; returns the tween (null when done). */
  revealNextStep?: () => SimTimeline | null;
  /** State machine: dispatch one operator event through the serial queue. */
  noacgDispatch?: (event: string, payload?: Record<string, string>) => SimTimeline | null;
  /** State machine: snap to states instantly ({group: state}; null = all to initial). */
  noacgSnap?: (
    assignments: Record<string, string> | null,
    opts?: { timers?: boolean },
  ) => { groups: Record<string, string> };
  /** State machine: the current state pointers. */
  noacgMachineState?: () => { groups: Record<string, string> };
  /** State machine: the machine the interpreter is running (groups, for the branch lookup). */
  noacgMachine?: { groups: Array<{ id: string }> };
  /** State machine: the timeline a state plays when ENTERED. */
  noacgEnterTimeline?: (group: { id: string }, stateId: string) => SimTimeline | null;
  /** GSAP, for killing stray tweens (killAllTimelines) and resetting inline props
   *  (resetGraphicInline). */
  gsap?: {
    killTweensOf: (target: string) => void;
    set: (targets: unknown, vars: Record<string, unknown>) => void;
  };
  /** The SPX template definition — `out` (the auto-exit hold, ms/'manual'/'none') lives here,
   *  baked into the document's own HTML, so the auto-out timer needs nothing from the app. */
  SPXGCTemplateDefinition?: { out?: string };
  /** The timeline the simulator is currently running (drives a pushed playhead). Phase:
   *  'in' | 'out' | 'step-N' (N = the 2-based Continue step) | 'state:<groupId>:<stateId>'.
   *  `runId` (a monotonic counter, `__simRunSeq`) stamps every NEW timeline object so a listener
   *  reading the pushed playhead can tell "a new run started" from "the same run continuing"
   *  without the object-identity check `contentWindow` access used to allow. */
  __activeTl?: { phase: string; tl: SimTimeline; runId: number } | null;
  /** The timeline view's paused scrub timeline — rebuilt per phase. */
  __scrubTl?: { phase: string; tl: SimTimeline; runId: number } | null;
  __simAutoOut?: ReturnType<typeof setTimeout> | null;
  __simSettled?: boolean;
  __simStep?: number;
  __simRunSeq?: number;
};

/** Kill whatever the simulator started (timelines own object-target tweens too, which a plain
 *  killTweensOf('*') would miss — same reasoning as the infographics runtime). Self-contained:
 *  no closures over imports or outer variables (see the file-level note). */
export function killAllTimelines(w: SimWindow): void {
  w.__activeTl?.tl.kill();
  w.__scrubTl?.tl.kill();
  w.__activeTl = null;
  w.__scrubTl = null;
  w.gsap?.killTweensOf('*');
}

/** Return the graphic to its clean CSS resting state before a fresh entrance. An exit can leave
 *  inline props the next entrance never resets — most visibly when the phases are a mix (a Blur
 *  exit leaves filter:blur on the box; a Slide entrance never touches filter, so a replay starts
 *  already blurred). The root is the document's own first `<div>` (the same convention
 *  `reportGraphicBox` uses) rather than the app's `detectPrefix(template.html)`, which this
 *  function has no access to once it is stringified into the document. Self-contained for the
 *  same reason as `killAllTimelines`. */
export function resetGraphicInline(w: SimWindow): void {
  if (!w.gsap) return;
  const root = w.document.body?.querySelector('div');
  if (!root) return;
  w.gsap.set([root, ...root.querySelectorAll('*')], { clearProps: 'all' });
  // clearProps wipes every inline style, and one of them belongs to the DATA layer rather than
  // to the motion: an image field with no picture hides itself inline (setFieldValue removes the
  // src and sets display:none). Left cleared, an empty logo slot draws as a broken-image box on
  // the canvas. The emitted runtime restates the same truth after its own reset.
  root.querySelectorAll('img[id]').forEach((img) => {
    if (!img.getAttribute('src')) (img as HTMLElement).style.display = 'none';
  });
}

/** A single simulator command, as sent by PlayoutSimulator.tsx over previewProtocol.ts's
 *  `PreviewCmd` union (the 'sim-play'/'sim-stop'/'sim-next'/'sim-settle'/'scrub'/'snap' variants;
 *  composeDocument.ts's `simulate` script maps each straight onto this shape). */
export interface SimCommand {
  action: 'sim-play' | 'sim-stop' | 'sim-next' | 'sim-settle' | 'scrub' | 'snap';
  /** Sample data (a JSON string, the shape `update()` takes) — 'sim-play'/'sim-settle'/'scrub'. */
  data?: string;
  /** 'scrub' only: the phase ('in' | 'out' | 'step-N' | 'state:<groupId>:<stateId>') and the
   *  time (seconds) to pause it at. */
  phase?: string;
  time?: number;
  /** 'scrub' only, branch phases: the state the branch is entered FROM (blocks/animMachine.ts
   *  `canonicalPath`, computed app-side — the document has no access to the template model). */
  from?: string;
  /** 'snap' only: the state assignments (null = every group to its initial). */
  assignments?: Record<string, string> | null;
  timers?: boolean;
}

/**
 * Run one simulator command against `w`. Mirrors PlayoutSimulator.tsx's former
 * playIn/playOut/playNext/settle/scrubCommand-effect logic exactly (see that file's git history
 * for the original, pre-conversion version) — only WHERE it runs changed, not what it does.
 * Never throws outward: composeDocument.ts's message listener wraps every call in try/catch,
 * consistent with every other best-effort preview command in this codebase.
 *
 * Every helper this needs beyond `killAllTimelines`/`resetGraphicInline` (which composeDocument.ts
 * embeds separately, under those exact names) is nested INSIDE this function rather than a
 * sibling module-level one — `.toString()` only captures a function's own source text, so a
 * reference to a sibling function would compile here but resolve to nothing once this function
 * runs alone inside the document (see the file-level note).
 */
export function runSimCommand(w: SimWindow, cmd: SimCommand): void {
  function nextRun(): number {
    w.__simRunSeq = (w.__simRunSeq ?? 0) + 1;
    return w.__simRunSeq;
  }
  function clearAutoOut(): void {
    if (w.__simAutoOut) clearTimeout(w.__simAutoOut);
    w.__simAutoOut = null;
  }
  /**
   * Park `tl` at the end of the motion that HAS an end, callbacks suppressed.
   *
   * NOT `progress(1)`, for the reason `holdBaselineMs` below already guards against on the other
   * side: one `repeat: -1` child makes GSAP report the whole timeline's duration as its
   * "forever" sentinel, ~1e10 seconds. Seeking to the end of THAT is seeking to an arbitrary
   * phase of whatever is still looping. preview/settleGraphic.ts carries the full account with
   * the numbers; this is the editor's own copy of the same recipe, and the two must agree.
   */
  function settleToFiniteEnd(tl: SimTimeline): SimTimeline {
    if (typeof tl.getChildren !== 'function') {
      tl.progress(1, true);
      return tl;
    }
    let end = 0;
    for (const child of tl.getChildren(false)) {
      const total = child.totalDuration();
      if (Number.isFinite(total) && total < 1e9) end = Math.max(end, child.startTime() + total);
    }
    (tl.time as (value: number, suppressEvents?: boolean) => void)(end, true);
    return tl;
  }

  /** A graphic with an entrance/loop reported as ~1e10s (GSAP's "forever") would otherwise
   *  schedule the auto-out at ~1e13ms — past setTimeout's 32-bit argument, wrapping to an
   *  arbitrary time. Mirrors render/runtimeScript.ts's CONTINUOUS_S threshold. */
  function holdBaselineMs(tl: SimTimeline): number {
    const CONTINUOUS_S = 1e7;
    const seconds = tl.duration();
    return seconds >= CONTINUOUS_S ? 0 : seconds * 1000;
  }
  function scheduleAutoOut(inDurationMs: number): void {
    clearAutoOut();
    const out = w.SPXGCTemplateDefinition?.out ?? '';
    if (!/^\d+$/.test(out)) return; // 'manual' (until Stop) or 'none' (stays) — no timer
    w.__simAutoOut = setTimeout(() => runSimCommand(w, { action: 'sim-stop' }), inDurationMs + Number(out));
  }
  /** Read a `state:<groupId>:<stateId>` scrub phase back into its two ids — a mirror of
   *  blocks/timelineLens.ts's `parseStatePhase`, which this function cannot import. */
  function parseBranchPhase(phase: string): { groupId: string; stateId: string } | null {
    if (!phase.startsWith('state:')) return null;
    const [, groupId, ...rest] = phase.split(':');
    const stateId = rest.join(':');
    return groupId && stateId ? { groupId, stateId } : null;
  }

  if (cmd.action === 'sim-play') {
    w.__simStep = 1; // a fresh play restarts the Continue chain
    clearAutoOut();
    if (typeof w.buildInTimeline === 'function') {
      killAllTimelines(w);
      resetGraphicInline(w); // wipe any inline props a prior exit left, so the entrance is clean
      w.update?.(cmd.data ?? '{}');
      const tl = w.buildInTimeline();
      w.__activeTl = { phase: 'in', tl, runId: nextRun() };
      scheduleAutoOut(holdBaselineMs(tl));
    } else {
      w.update?.(cmd.data ?? '{}');
      w.play?.(); // no builder contract (blank/imported) — the template's own play()
    }
    return;
  }

  if (cmd.action === 'sim-next') {
    clearAutoOut(); // the operator is driving the reveal chain — don't auto-leave under them
    if (typeof w.revealNextStep === 'function') {
      const tw = w.revealNextStep();
      if (tw) {
        w.__simStep = (w.__simStep ?? 1) + 1;
        w.__activeTl = { phase: `step-${w.__simStep}`, tl: tw, runId: nextRun() };
      }
    } else {
      w.next?.(); // no builder contract — the template's own next()
    }
    return;
  }

  if (cmd.action === 'sim-stop') {
    clearAutoOut();
    if (typeof w.buildOutTimeline === 'function') {
      killAllTimelines(w);
      w.__activeTl = { phase: 'out', tl: w.buildOutTimeline(), runId: nextRun() };
    } else {
      w.stop?.();
    }
    return;
  }

  if (cmd.action === 'sim-settle') {
    if (typeof w.buildInTimeline !== 'function') return; // blank/imported: stays blank
    if (w.__activeTl || w.__scrubTl || w.__simSettled) return; // running, paused, or already settled
    w.__simSettled = true;
    resetGraphicInline(w); // a same-document settle after an exit must not inherit its leftovers
    // Jump, then write the data - and END on the data, which is where this deliberately
    // DIVERGES from preview/settleGraphic.ts's jump/update/jump.
    //
    // The two orders serve two runtimes that want opposite things, and both faults are real:
    //
    //   - CREDITS want the jump last. `rebuildCredits` assigns `track.innerHTML`, so an
    //     `update()` after the jump throws away the inline props the jump wrote on the ROWS
    //     (settleGraphic.ts's note has the two symptoms that cost).
    //   - AN INFOGRAPHIC wants the data last. `igMotion` opens its count-up with
    //     `tl.set(el, { textContent: '0' + suffix })` and writes the figure from an `onUpdate`.
    //     A `set` APPLIES under suppressed callbacks and an `onUpdate` does not, so any jump
    //     leaves the readout reading 0 and only a following `update()` restores the figure.
    //     Measured: `e2e/wave2.spec.ts` reads `0%` where the stat says `87%`.
    //
    // Ending on the data here keeps the editor canvas honest about the figure, and the finite
    // end below still takes a `credits-loop` reel from 0% of its viewport to 51%.
    //
    // THIS DIVERGENCE IS MEANT TO BE TEMPORARY. The fix that removes it is one line per readout
    // in the emitted runtime, not a reordering of either recipe: end the count-up timeline with
    // `tl.set(el, { textContent: stat.text })`. A `set` renders under suppression - the same
    // property that causes the bug - so under normal playback it writes what `onComplete`
    // already wrote and changes nothing, and under a jump it wins. Once that lands, delete this
    // note and take settleGraphic.ts's jump/update/jump verbatim, so the canvas and the
    // thumbnails are one recipe again. The audit it belongs to is "does this readout depend on
    // a callback firing" - a growing bar and a drawing ring have the same shape as a counter.
    w.update?.(cmd.data ?? '{}');
    const tl = w.buildInTimeline();
    tl.pause();
    settleToFiniteEnd(tl); // park at the end of the FINITE motion; callbacks stay suppressed
    w.update?.(cmd.data ?? '{}'); // re-render truthful static state (suppressed callbacks skip it)
    return;
  }

  if (cmd.action === 'scrub') {
    if (typeof w.buildInTimeline !== 'function') return;
    clearAutoOut(); // parking on a scrubbed moment must not auto-leave under the user
    const phase = cmd.phase ?? '';
    if (!w.__scrubTl || w.__scrubTl.phase !== phase) {
      killAllTimelines(w);
      w.update?.(cmd.data ?? '{}');
      const branch = parseBranchPhase(phase);
      if (branch) {
        const group = w.noacgMachine?.groups.find((g) => g.id === branch.groupId);
        if (!group || typeof w.noacgEnterTimeline !== 'function' || typeof w.noacgSnap !== 'function') return;
        w.noacgSnap({ [branch.groupId]: cmd.from ?? branch.stateId }, { timers: false });
        const tl = w.noacgEnterTimeline(group, branch.stateId);
        if (!tl) return;
        w.__scrubTl = { phase, tl, runId: nextRun() };
      } else if (phase === 'in') {
        w.__scrubTl = { phase: 'in', tl: w.buildInTimeline(), runId: nextRun() };
      } else if (phase.startsWith('step-')) {
        if (typeof w.revealNextStep !== 'function') return;
        const n = parseInt(phase.slice(5), 10); // 2-based
        settleToFiniteEnd(w.buildInTimeline());
        for (let k = 2; k < n; k++) { const t = w.revealNextStep(); if (t) settleToFiniteEnd(t); }
        const tw = w.revealNextStep();
        if (!tw) return;
        w.__scrubTl = { phase, tl: tw, runId: nextRun() };
      } else {
        if (typeof w.buildOutTimeline !== 'function') return;
        settleToFiniteEnd(w.buildInTimeline()); // settled on-air state, callbacks suppressed
        while (typeof w.revealNextStep === 'function') { const t = w.revealNextStep(); if (!t) break; settleToFiniteEnd(t); }
        w.__scrubTl = { phase: 'out', tl: w.buildOutTimeline(), runId: nextRun() };
      }
    }
    const scrubTl = w.__scrubTl;
    if (!scrubTl) return;
    scrubTl.tl.pause(Math.min(cmd.time ?? 0, scrubTl.tl.duration()));
    return;
  }

  if (cmd.action === 'snap') {
    clearAutoOut();
    killAllTimelines(w); // snap owns the wipe-and-compose; drop the simulator's timeline handles
    w.noacgSnap?.(cmd.assignments ?? null, { timers: cmd.timers ?? false });
  }
}
