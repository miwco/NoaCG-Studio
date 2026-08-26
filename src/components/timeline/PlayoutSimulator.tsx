import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useTemplateStore } from '../../store/templateStore';
import { parseAnimData } from '../../blocks/animData';
import { canonicalPath, deriveMachine, machineControls } from '../../blocks/animMachine';
import { parseStatePhase } from '../../blocks/timelineLens';
import { eventLegality, formatMachineState, isEventLegal, machineStateNames } from '../../control/controlModel';
import { postPreviewCmd, PREVIEW_STATE_TYPE, type PreviewStateMessage } from '../../preview/previewProtocol';

interface Props {
  iframeRef: RefObject<HTMLIFrameElement | null>;
}

// The preview rebuilds on a ~350 ms debounce after an apply — replay after it settles.
const REPLAY_AFTER_REBUILD_MS = 550;

/**
 * Which state a branch is entered FROM, for the branch scrub's opening pose. Read off the
 * editor's own graph seam (animMachine `canonicalPath`), which the interpreter's
 * `noacgCanonicalPath` mirrors — so the pose the editor composes is the pose the runtime
 * would. `from` falls back to the group's initial when nothing reaches the state.
 */
function branchRoute(groupId: string, stateId: string): { from: string } {
  const data = parseAnimData(useTemplateStore.getState().template.js);
  const machine = data?.machine ?? (data ? deriveMachine(data) : null);
  const gi = machine?.groups.findIndex((g) => g.id === groupId) ?? -1;
  const group = gi >= 0 ? machine!.groups[gi] : null;
  if (!group) return { from: stateId };
  const route = canonicalPath(group, gi === 0, stateId);
  // route excludes the initial state, so its second-to-last entry is the predecessor.
  return { from: route && route.length > 1 ? route[route.length - 2] : group.initial };
}

/**
 * Simulate SPX playout on the live preview. The simulator OWNS the running timeline
 * (window.__activeTl) so the timeline strip can draw a live playhead; templates without the
 * builder contract (blank/imported) fall back to the plain play()/stop() globals.
 *
 * Design view: after every rebuild the graphic is shown SETTLED (entrance jumped to its end
 * with callbacks suppressed, so countdowns/loops stay idle) — the canvas is never blank, and
 * dragging / inline editing always has something visible to work on.
 *
 * The template rendered here can be AI-generated or imported code, so this iframe carries no
 * `allow-same-origin` (composeDocument's `simulate` option instead) — there is no reaching in via
 * `contentWindow`. The actual play/stop/next/settle/scrub/snap COMPOSITION (window.__activeTl,
 * window.__scrubTl, the house builder contract) now runs INSIDE the document
 * (preview/simulatorRuntime.ts's `runSimCommand`, since it drives live GSAP timeline objects that
 * cannot cross `postMessage`); this component only sends the command and, for a scrub into a
 * branch state, resolves `from` (the branch's canonical predecessor) — that's app-model logic
 * (`branchRoute`, off `blocks/animMachine.ts`) the document has no access to.
 */
export default function PlayoutSimulator({ iframeRef }: Props) {
  const sampleData = useTemplateStore((s) => s.sampleData);
  const replayNonce = useTemplateStore((s) => s.replayNonce);
  const controlCommand = useTemplateStore((s) => s.controlCommand);
  const scrubCommand = useTemplateStore((s) => s.scrubCommand);
  const templateJs = useTemplateStore((s) => s.template.js);
  const sendEvent = useTemplateStore((s) => s.sendEvent);

  // The EVENT STRIP: one button per authored operator event plus a current-state chip — only
  // when the template carries an EXPLICIT machine, so ordinary templates see zero change.
  // Buttons wear the machine's declared control labels (Phase 5) when it carries any.
  const machineEvents = useMemo(() => {
    const data = parseAnimData(templateJs);
    return data?.machine ? machineControls(data.machine) : null;
  }, [templateJs]);
  // Which states each event fires from — the structural guard, mirrored as greying exactly
  // the way a generated control page mirrors it. Without this the strip took every press and
  // silently dropped the illegal ones, so "Select answer" after "Lock it in" looked broken
  // rather than impossible.
  const eventLegal = useMemo(() => eventLegality(templateJs), [templateJs]);
  // The chip's WORDS. Held in a ref as well, because the poll's listener is subscribed once
  // (its deps are deliberately `[machineEvents]`) and would otherwise keep naming states from
  // whichever template was open when it subscribed.
  const stateNames = useMemo(() => machineStateNames(templateJs), [templateJs]);
  const stateNamesRef = useRef(stateNames);
  useEffect(() => {
    stateNamesRef.current = stateNames;
  }, [stateNames]);
  const [machineState, setMachineState] = useState('');
  // The machine's raw pointers go to the STORE, not to local state: the simulator owns the
  // iframe and is the only thing that can poll it, but the Control panel shows the same event
  // buttons and has to grey them by the same rule.
  const machineGroups = useTemplateStore((s) => s.machineGroups);
  const setMachineGroups = useTemplateStore((s) => s.setMachineGroups);

  const win = (): Window | null => iframeRef.current?.contentWindow ?? null;

  const latestData = () => JSON.stringify(useTemplateStore.getState().sampleData);

  const sendUpdate = () => postPreviewCmd(win(), { cmd: 'update', data: JSON.stringify(sampleData) });

  /** Run the entrance (Play): data in, then the in-timeline — simulator-owned. */
  const playIn = () => postPreviewCmd(win(), { cmd: 'sim-play', data: latestData() });

  /** Advance a Continue step (Next) — own the reveal tween so the playhead follows it. */
  const playNext = () => postPreviewCmd(win(), { cmd: 'sim-next' });

  /** Run the exit (Stop) — simulator-owned. */
  const playOut = () => postPreviewCmd(win(), { cmd: 'sim-stop' });

  /** Design view: show the settled on-air state without animating or firing callbacks. */
  const settle = () => postPreviewCmd(win(), { cmd: 'sim-settle', data: latestData() });

  // Settle after every iframe (re)load — the canvas always shows the graphic at rest.
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const onLoad = () => settle();
    iframe.addEventListener('load', onLoad);
    settle(); // the current document may already be loaded
    return () => iframe.removeEventListener('load', onLoad);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iframeRef]);

  // Auto-replay: the Motion panel bumps replayNonce after an apply so the change is
  // immediately visible. Wait out the debounced preview rebuild, then play the new code.
  const playRef = useRef(playIn);
  playRef.current = playIn;
  useEffect(() => {
    if (replayNonce === 0) return;
    const handle = setTimeout(() => playRef.current(), REPLAY_AFTER_REBUILD_MS);
    return () => clearTimeout(handle);
  }, [replayNonce]);

  // Live control: the Control panel drives the preview immediately (the template hasn't
  // changed, so no rebuild wait). Routed through the same simulator-owned paths.
  useEffect(() => {
    if (!controlCommand) return;
    const w = win();
    if (!w) return;
    if (controlCommand.action === 'update') postPreviewCmd(w, { cmd: 'update', data: latestData() });
    else if (controlCommand.action === 'play') playIn();
    else if (controlCommand.action === 'stop') playOut();
    else if (controlCommand.action === 'next') playNext();
    else if (controlCommand.action === 'event') {
      postPreviewCmd(w, { cmd: 'dispatch', event: controlCommand.event ?? '', payload: controlCommand.payload });
    } else if (controlCommand.action === 'snap') {
      // The preview PARKS the snapped state ({timers: false}): a design view must never
      // auto-advance under the user. Recovery-style snaps (timers armed) are the runtime's
      // default for exports and tests.
      postPreviewCmd(w, { cmd: 'snap', assignments: controlCommand.snap ?? null, timers: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlCommand?.nonce]);

  // The state chip and the buttons' legality both track the machine's pointers (ONE cheap
  // request/reply round trip — the machine has no subscription surface inside the sandboxed
  // iframe, and 500 ms is plenty for a readout).
  useEffect(() => {
    if (!machineEvents) return;
    const onMessage = (ev: MessageEvent) => {
      if (ev.source !== iframeRef.current?.contentWindow) return;
      const msg = ev.data as PreviewStateMessage | undefined;
      if (!msg || msg.type !== PREVIEW_STATE_TYPE || !msg.state) return;
      // Worn as WORDS, through the one formatter every operator surface uses: the runtime
      // reports ids, and "sealed" is the author's vocabulary rather than the operator's.
      setMachineState(formatMachineState(stateNamesRef.current, msg.state) ?? '');
      setMachineGroups(msg.state.groups ?? null);
    };
    window.addEventListener('message', onMessage);
    const tick = () => postPreviewCmd(win(), { cmd: 'state' });
    tick();
    const handle = setInterval(tick, 500);
    return () => {
      window.removeEventListener('message', onMessage);
      clearInterval(handle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [machineEvents]);

  // Timeline scrub: pause the phase's timeline at the requested time. The composition (which
  // timeline a phase means, and the pause itself) runs inside the document (runSimCommand) since
  // it drives live GSAP timeline objects; this effect only resolves `from` for a branch phase —
  // app-model logic (blocks/animMachine.ts canonicalPath) the document has no access to.
  useEffect(() => {
    if (!scrubCommand) return;
    const branch = parseStatePhase(scrubCommand.phase);
    const from = branch ? branchRoute(branch.groupId, branch.stateId).from : undefined;
    postPreviewCmd(win(), { cmd: 'scrub', phase: scrubCommand.phase, time: scrubCommand.time, data: latestData(), from });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrubCommand?.nonce]);

  return (
    <div className="simulator">
      <button className="primary" onClick={playIn} title="Update data + play in">
        ▶ Play
      </button>
      <button onClick={playOut} title="Animate out">
        ■ Stop
      </button>
      <button onClick={sendUpdate} title="Send current sample data to update()">
        ⟳ Update
      </button>
      <button onClick={playNext} title="Advance multi-step templates">
        » Next
      </button>
      {machineEvents && machineEvents.length > 0 && (
        <div className="simulator-events" data-testid="sim-events">
          {machineEvents.map((e) => {
            const legal = isEventLegal(eventLegal, e.event, machineGroups && { groups: machineGroups });
            return (
              <button
                key={e.event}
                onClick={() => sendEvent(e.event)}
                disabled={!legal}
                title={
                  legal
                    ? `Dispatch the "${e.event}" event`
                    : `"${e.event}" has no arrow out of the current state, so the graphic would drop it`
                }
                data-testid={`sim-event-${e.event}`}
              >
                ⚡ {e.label}
              </button>
            );
          })}
          <span className="simulator-state mono" title="The machine's current state" data-testid="sim-state-chip">
            {machineState}
          </span>
        </div>
      )}
    </div>
  );
}
