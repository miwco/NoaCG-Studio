// The Phase 1 state-machine acceptance definitions (docs/noacg-master-goals.md §1.4,
// docs/STATE_MACHINE_SCHEMA.md) — HAND-WRITTEN templates, no editor UI involved. Each is
// plain data (markup + CSS + a version-2 NOACG_ANIM literal + fields); the spec builds the
// real template IN PAGE through the actual emitters (runtimeJs + emitAnimRegion), so every
// run proves emit → parse → interpret end-to-end, not a snapshot of one.

export interface MachineFieldDef {
  field: string;
  ftype: string;
  title: string;
  value: string;
}

export interface MachineDef {
  name: string;
  /** Body markup only — the spec wraps it and inserts the SPX definition block. */
  html: string;
  css: string;
  /** The version-2 NOACG_ANIM literal (steps + optional machine), as plain data. */
  data: unknown;
  fields: MachineFieldDef[];
  /** Design-owned runtime appended AFTER the scaffold (the clock-engine pattern). */
  extraJs?: string;
}

/** 1a. The SIMPLICITY GUARD, implicit half: a plain lower third with NO machine key at all.
 *  The derived one-group linear machine IS its machine — the schema adds zero required
 *  weight to the simple case. */
export const LOWER_THIRD_IMPLICIT: MachineDef = {
  name: 'Machine LT Implicit',
  html: `<div class="lt"><div class="lt-box"><span id="f0">Ada Lovelace</span> <span id="f1">Engineer</span></div></div>`,
  css: `.lt { position: absolute; left: 80px; bottom: 80px; opacity: 0; }
.lt-box { color: #fff; background: rgba(12,14,18,0.92); padding: 16px 24px; }`,
  data: {
    version: 2,
    root: '.lt',
    speed: 1,
    steps: [
      {
        name: 'In',
        duration: 0.5,
        ease: 'power2.out',
        layers: { '.lt': { opacity: [{ time: 0, value: 0 }, { time: 0.5, value: 1 }], y: [{ time: 0, value: 24 }, { time: 0.5, value: 0 }] } },
      },
      {
        name: 'Out',
        duration: 0.3,
        ease: 'power2.in',
        layers: { '.lt': { opacity: [{ time: 0, value: 1 }, { time: 0.3, value: 0 }] } },
      },
    ],
  },
  fields: [
    { field: 'f0', ftype: 'textfield', title: 'Name', value: 'Ada Lovelace' },
    { field: 'f1', ftype: 'textfield', title: 'Role', value: 'Engineer' },
  ],
};

/** 1b. The simplicity guard, explicit twin: the SAME steps under a hand-written machine —
 *  one group, three states (Off → On → Out) — with the authored next→Out arrow, so `next`
 *  alone drives it end-to-end (the goals doc's exact sentence). */
export const LOWER_THIRD_EXPLICIT: MachineDef = {
  ...LOWER_THIRD_IMPLICIT,
  name: 'Machine LT Explicit',
  data: {
    ...(LOWER_THIRD_IMPLICIT.data as object),
    machine: {
      groups: [
        {
          id: 'main',
          initial: 'off',
          defaultPath: ['on', 'out'],
          states: [{ id: 'off', name: 'Off' }, { id: 'on', name: 'On' }, { id: 'out', name: 'Out' }],
          transitions: [{ from: 'on', to: 'out', trigger: 'operator', event: 'next' }],
        },
      ],
    },
  },
};

/** 2. The MILLIONAIRE test: question + four answers, reveal, select any answer (a DATA value
 *  plus ONE Selected state — never four near-identical states), change freely, lock (select
 *  becomes structurally illegal), judge with different correct/incorrect treatments, and the
 *  default path still walks the whole flow with `next` alone. */
export const MILLIONAIRE: MachineDef = {
  name: 'Machine Millionaire',
  html: `<div class="qz">
  <div class="qz-q" id="f0">Which planet is second from the sun?</div>
  <div class="qz-rows">
    <div class="qz-row qz-row-a"><span id="f1">Mars</span></div>
    <div class="qz-row qz-row-b"><span id="f2">Venus</span></div>
    <div class="qz-row qz-row-c"><span id="f3">Pluto</span></div>
    <div class="qz-row qz-row-d"><span id="f4">Titan</span></div>
  </div>
  <div id="f5" style="display:none"></div>
  <div id="f6" style="display:none">B</div>
</div>`,
  css: `.qz { position: absolute; left: 120px; top: 120px; width: 640px; color: #fff; opacity: 0; }
.qz-q { font-size: 28px; margin-bottom: 16px; }
.qz-row { background: rgba(12,14,18,0.92); border: 2px solid transparent; padding: 10px 16px; margin: 6px 0; }
.qz-row.qz-sel { border-color: #e8c547; }
.qz-row.qz-correct { background: #1d5c2f; }
.qz-row.qz-wrong { background: #6b1d1d; }
.qz.qz-locked .qz-row:not(.qz-sel) { opacity: 0.55; }`,
  data: {
    version: 2,
    root: '.qz',
    speed: 1,
    steps: [
      {
        name: 'Question',
        duration: 0.4,
        ease: 'power2.out',
        layers: { '.qz': { opacity: [{ time: 0, value: 0 }, { time: 0.4, value: 1 }] }, '.qz-q': { y: [{ time: 0, value: 24 }, { time: 0.4, value: 0 }] } },
      },
      {
        name: 'Answers',
        duration: 0.4,
        ease: 'power2.out',
        reveals: ['.qz-rows'],
        layers: { '.qz-rows': { opacity: [{ time: 0, value: 0 }, { time: 0.4, value: 1 }] } },
      },
      { name: 'Locked', duration: 0.2, ease: 'power2.out', calls: [{ time: 0, call: 'applyLock' }], layers: {} },
      { name: 'Reveal', duration: 0.3, ease: 'power2.out', calls: [{ time: 0, call: 'judgeAnswers' }], layers: {} },
      { name: 'Out', duration: 0.3, ease: 'power2.in', layers: { '.qz': { opacity: [{ time: 0, value: 1 }, { time: 0.3, value: 0 }] } } },
    ],
    machine: {
      groups: [
        {
          id: 'flow',
          initial: 'off',
          defaultPath: ['question', 'answers', 'locked', 'reveal', 'out'],
          states: [
            { id: 'off', name: 'Off' },
            { id: 'question', name: 'Question' },
            { id: 'answers', name: 'Answers up' },
            {
              id: 'selected',
              name: 'Selected',
              timeline: { name: 'Select', duration: 0.25, ease: 'power2.out', calls: [{ time: 0, call: 'applySelection' }], layers: {} },
            },
            { id: 'locked', name: 'Locked' },
            { id: 'reveal', name: 'Judged' },
            { id: 'out', name: 'Out' },
          ],
          transitions: [
            { from: 'question', to: 'answers', trigger: 'operator', event: 'reveal' },
            { from: 'answers', to: 'locked', trigger: 'operator', event: 'lock' },
            { from: 'answers', to: 'selected', trigger: 'operator', event: 'select' },
            { from: 'selected', to: 'selected', trigger: 'operator', event: 'select' },
            { from: 'selected', to: 'locked', trigger: 'operator', event: 'lock' },
            { from: 'selected', to: 'locked', trigger: 'operator', event: 'next' },
            { from: 'locked', to: 'reveal', trigger: 'operator', event: 'judge' },
            { from: 'reveal', to: 'out', trigger: 'operator', event: 'next' },
          ],
        },
      ],
    },
  },
  fields: [
    { field: 'f0', ftype: 'textfield', title: 'Question', value: 'Which planet is second from the sun?' },
    { field: 'f1', ftype: 'textfield', title: 'Answer A', value: 'Mars' },
    { field: 'f2', ftype: 'textfield', title: 'Answer B', value: 'Venus' },
    { field: 'f3', ftype: 'textfield', title: 'Answer C', value: 'Pluto' },
    { field: 'f4', ftype: 'textfield', title: 'Answer D', value: 'Titan' },
    { field: 'f5', ftype: 'textfield', title: 'Selected answer', value: '' },
    { field: 'f6', ftype: 'textfield', title: 'Correct answer', value: 'B' },
  ],
  extraJs: `// Design-owned quiz runtime (outside the marked region, like every clock engine).
function qzRowFor(letter) {
  return document.querySelector('.qz-row-' + String(letter || '').trim().toLowerCase());
}
function applySelection() {
  var rows = document.querySelectorAll('.qz-row');
  for (var i = 0; i < rows.length; i++) rows[i].classList.remove('qz-sel');
  var row = qzRowFor(document.getElementById('f5').textContent);
  if (row) row.classList.add('qz-sel');
}
function applyLock() { document.querySelector('.qz').classList.add('qz-locked'); }
function judgeAnswers() {
  var pick = String(document.getElementById('f5').textContent || '').trim().toLowerCase();
  var right = String(document.getElementById('f6').textContent || '').trim().toLowerCase();
  var rightRow = qzRowFor(right);
  if (rightRow) rightRow.classList.add('qz-correct');
  if (pick && pick !== right) {
    var pickRow = qzRowFor(pick);
    if (pickRow) pickRow.classList.add('qz-wrong');
  }
}`,
};

/** 3. The SCOREBUG test: scores/clock values are pure DATA (update() only — no transitions);
 *  the flag and the clock live in small PARALLEL groups; near-simultaneous events resolve
 *  through the one serial queue. */
export const SCOREBUG: MachineDef = {
  name: 'Machine Scorebug',
  html: `<div class="sb">
  <span class="sb-score"><span id="f0">0</span>–<span id="f1">0</span></span>
  <span class="sb-flag">FLAG</span>
  <span class="sb-clock" id="clk">00:00</span>
</div>`,
  css: `.sb { position: absolute; left: 80px; top: 60px; color: #fff; background: rgba(12,14,18,0.92); padding: 10px 18px; opacity: 0; }
.sb-flag { background: #b09018; color: #111; padding: 2px 8px; margin: 0 10px; opacity: 0; }`,
  data: {
    version: 2,
    root: '.sb',
    speed: 1,
    steps: [
      { name: 'In', duration: 0.4, ease: 'power2.out', layers: { '.sb': { opacity: [{ time: 0, value: 0 }, { time: 0.4, value: 1 }] } } },
      { name: 'Out', duration: 0.3, ease: 'power2.in', layers: { '.sb': { opacity: [{ time: 0, value: 1 }, { time: 0.3, value: 0 }] } } },
    ],
    machine: {
      groups: [
        {
          id: 'board',
          initial: 'off',
          defaultPath: ['on', 'out'],
          states: [{ id: 'off' }, { id: 'on' }, { id: 'out' }],
          transitions: [],
        },
        {
          id: 'flag',
          initial: 'none',
          states: [
            {
              id: 'none',
              timeline: { name: 'FlagOff', duration: 0.2, ease: 'power2.in', layers: { '.sb-flag': { opacity: [{ time: 0, value: 1 }, { time: 0.2, value: 0 }] } } },
            },
            {
              id: 'shown',
              timeline: { name: 'FlagOn', duration: 0.25, ease: 'back.out(1.7)', layers: { '.sb-flag': { opacity: [{ time: 0, value: 0 }, { time: 0.25, value: 1 }], scale: [{ time: 0, value: 0.6 }, { time: 0.25, value: 1 }] } } },
            },
          ],
          transitions: [
            { from: 'none', to: 'shown', trigger: 'operator', event: 'flag' },
            { from: 'shown', to: 'none', trigger: 'operator', event: 'clearFlag' },
          ],
        },
        {
          id: 'clock',
          initial: 'stopped',
          states: [
            { id: 'stopped', timeline: { name: 'ClockStop', duration: 0.1, ease: 'none', calls: [{ time: 0, call: 'stopClock' }], layers: {} } },
            { id: 'running', timeline: { name: 'ClockRun', duration: 0.1, ease: 'none', calls: [{ time: 0, call: 'startClock' }], layers: {} } },
          ],
          transitions: [
            { from: 'stopped', to: 'running', trigger: 'operator', event: 'clockStart' },
            { from: 'running', to: 'stopped', trigger: 'operator', event: 'clockStop' },
          ],
        },
      ],
    },
  },
  fields: [
    { field: 'f0', ftype: 'textfield', title: 'Home score', value: '0' },
    { field: 'f1', ftype: 'textfield', title: 'Away score', value: '0' },
  ],
  extraJs: `// Design-owned clock stub — the test asserts the lifecycle flag, not wall time.
window.__clockRunning = false;
function startClock() { window.__clockRunning = true; }
function stopClock() { window.__clockRunning = false; }`,
};

/** 4. The TICKER test: items cycle by TIMER-triggered auto-advance with no operator input —
 *  a self-transition replays the Advance state each beat — and the operator can still
 *  pause/resume. The item index is DATA in the design runtime, not states. */
export const TICKER: MachineDef = {
  name: 'Machine Ticker',
  html: `<div class="tk"><span class="tk-item" id="f0">Item 0</span></div>`,
  css: `.tk { position: absolute; left: 0; bottom: 40px; right: 0; color: #fff; background: rgba(12,14,18,0.92); padding: 12px 24px; opacity: 0; }`,
  data: {
    version: 2,
    root: '.tk',
    speed: 1,
    steps: [
      { name: 'In', duration: 0.4, ease: 'power2.out', layers: { '.tk': { opacity: [{ time: 0, value: 0 }, { time: 0.4, value: 1 }] } } },
      { name: 'Out', duration: 0.3, ease: 'power2.in', layers: { '.tk': { opacity: [{ time: 0, value: 1 }, { time: 0.3, value: 0 }] } } },
    ],
    machine: {
      groups: [
        {
          id: 'cycle',
          initial: 'off',
          defaultPath: ['on', 'out'],
          states: [
            { id: 'off' },
            { id: 'on' },
            {
              id: 'advance',
              name: 'Advance',
              timeline: { name: 'Flip', duration: 0.3, ease: 'power2.out', calls: [{ time: 0, call: 'tickerAdvance' }], layers: { '.tk-item': { opacity: [{ time: 0, value: 0 }, { time: 0.3, value: 1 }] } } },
            },
            { id: 'paused', name: 'Paused' },
            { id: 'out' },
          ],
          transitions: [
            { from: 'on', to: 'advance', trigger: 'timer', after: 1 },
            { from: 'advance', to: 'advance', trigger: 'timer', after: 1 },
            { from: 'on', to: 'paused', trigger: 'operator', event: 'pause' },
            { from: 'advance', to: 'paused', trigger: 'operator', event: 'pause' },
            { from: 'paused', to: 'advance', trigger: 'operator', event: 'resume' },
          ],
        },
      ],
    },
  },
  fields: [{ field: 'f0', ftype: 'textfield', title: 'Item', value: 'Item 0' }],
  extraJs: `// Design-owned item cycler — the index is runtime data, never a state per item.
window.__tick = 0;
function tickerAdvance() {
  window.__tick++;
  var el = document.getElementById('f0');
  if (el) el.textContent = 'Item ' + window.__tick;
}`,
};
