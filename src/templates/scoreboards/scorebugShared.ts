// The sports pack's FIELD CONTRACTS for the scoreboard category, in one place.
//
// A field contract belongs to the graphic TYPE, not to any one skin: the compiled `fN` ids are
// what the state machine's payloads, the control page and every export bind to, so four
// designs of one type must emit the same fields, in the same order, with the same types — or
// they are not the same graphic. The MARKUP is still each design's own, which is where a house
// strip and a frosted card are allowed to disagree, so this module holds the field shapes and
// the two fragments that carry machinery (the hidden colour holders, the clock element's
// attributes) and nothing else.
//
// Each builder takes the design's OWN sample values, because the SPX definition's default and
// the text painted in the markup have to be the same string: a board that shows "LAL 88" while
// its definition says "HOME 0" is lying to the operator before they have touched anything.
// (This is the `TypeDesign.samples` gate in docs/GRAPHIC_TYPES.md §5, on the emit side.)
//
// The field SHAPES here mirror what each type declares in `src/templates/types/`; the type is
// the source of truth and `e2e/graphic-types.spec.ts` compares the two on every run.

import type { SpxField } from '../../model/types';

/** Escape a value for an HTML attribute or text node in generated markup. */
function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── The compact scorebug ─────────────────────────────────────────────────────

/** One design's starting values for the scorebug contract. Anything absent falls through. */
export interface ScorebugSamples {
  teamA?: string;
  scoreA?: string;
  teamB?: string;
  scoreB?: string;
  period?: string;
  clock?: string;
  colourA?: string;
  colourB?: string;
}

/**
 * The COMPACT SCOREBUG contract — the strip that stays on air for the whole match.
 *
 * f0/f2 team names · f1/f3 scores · f4 period · f5 clock · f6/f7 club colours.
 *
 * The clock is a visible, EDITABLE field rather than a read-only readout on purpose: every
 * live clock drifts from the stadium's, and an operator who cannot type "43:12" into the one
 * that is on air stops trusting it (shared/matchClock.ts re-seeds the tick from what they
 * typed). The two colours are `color` fields — one of the few places the broadcast field
 * policy's reserved types are the honest answer, because a club colour IS a constrained choice
 * and a hex string in a plain text box is not.
 */
export function scorebugFields(s: ScorebugSamples = {}): SpxField[] {
  return [
    { field: 'f0', ftype: 'textfield', title: 'Team A', value: s.teamA ?? 'HOME' },
    { field: 'f1', ftype: 'textfield', title: 'Score A', value: s.scoreA ?? '0' },
    { field: 'f2', ftype: 'textfield', title: 'Team B', value: s.teamB ?? 'AWAY' },
    { field: 'f3', ftype: 'textfield', title: 'Score B', value: s.scoreB ?? '0' },
    { field: 'f4', ftype: 'textfield', title: 'Period', value: s.period ?? '1H' },
    { field: 'f5', ftype: 'textfield', title: 'Clock', value: s.clock ?? '0:00' },
    { field: 'f6', ftype: 'color', title: 'Team A colour', value: s.colourA ?? '#f6a623' },
    { field: 'f7', ftype: 'color', title: 'Team B colour', value: s.colourB ?? '#7dd3fc' },
  ];
}

// ── The full match board ─────────────────────────────────────────────────────

/** One design's starting values for the match-board contract. */
export interface MatchBoardSamples extends ScorebugSamples {
  periods?: string;
}

/**
 * The FULL MATCH BOARD contract — the board shown at kick-off, at the interval and at the end.
 *
 * The scorebug's eight fields, plus the period-by-period source and two crest slots. The
 * breakdown is ONE repeating field (`label | home | away` per line), never a column per period,
 * which is what lets a single board serve basketball's four quarters, ice hockey's three
 * periods and tennis's five sets: the sport is what the operator types, not what the template
 * is. The two crests are ordinary `filelist` image fields, so an empty one shows the design's
 * placeholder rather than a broken image (`setFieldValue` in shared/base.ts).
 */
export function matchBoardFields(s: MatchBoardSamples = {}): SpxField[] {
  return [
    { field: 'f0', ftype: 'textfield', title: 'Team A', value: s.teamA ?? 'HOME' },
    { field: 'f1', ftype: 'textfield', title: 'Score A', value: s.scoreA ?? '0' },
    { field: 'f2', ftype: 'textfield', title: 'Team B', value: s.teamB ?? 'AWAY' },
    { field: 'f3', ftype: 'textfield', title: 'Score B', value: s.scoreB ?? '0' },
    { field: 'f4', ftype: 'textfield', title: 'Period', value: s.period ?? '1H' },
    { field: 'f5', ftype: 'textfield', title: 'Clock', value: s.clock ?? '0:00' },
    { field: 'f6', ftype: 'textarea', title: 'Period breakdown', value: s.periods ?? 'Q1 | 0 | 0' },
    { field: 'f7', ftype: 'color', title: 'Team A colour', value: s.colourA ?? '#f6a623' },
    { field: 'f8', ftype: 'color', title: 'Team B colour', value: s.colourB ?? '#7dd3fc' },
    { field: 'f9', ftype: 'filelist', title: 'Team A logo', value: '', assetfolder: './images/', extension: 'png' },
    { field: 'f10', ftype: 'filelist', title: 'Team B logo', value: '', assetfolder: './images/', extension: 'png' },
  ];
}

// ── The match status card ────────────────────────────────────────────────────

/** One design's starting values for the match-status contract. */
export interface MatchStatusSamples extends ScorebugSamples {
  status?: string;
  note?: string;
}

/**
 * The MATCH STATUS contract — the card that says where the match stands, and the final score.
 *
 * Teams and scores, plus a status LINE the operator writes ("HALF TIME", "FULL TIME",
 * "ABANDONED — WATERLOGGED") and a note under it. The status text is DATA; whether the board
 * looks live, at the interval or finished is a STATE, and the two are deliberately separate:
 * typing "FULL TIME" into a live board must not make it final, and a board the operator has
 * taken final must look final whatever the text says.
 */
export function matchStatusFields(s: MatchStatusSamples = {}): SpxField[] {
  return [
    { field: 'f0', ftype: 'textfield', title: 'Team A', value: s.teamA ?? 'HOME' },
    { field: 'f1', ftype: 'textfield', title: 'Score A', value: s.scoreA ?? '0' },
    { field: 'f2', ftype: 'textfield', title: 'Team B', value: s.teamB ?? 'AWAY' },
    { field: 'f3', ftype: 'textfield', title: 'Score B', value: s.scoreB ?? '0' },
    { field: 'f4', ftype: 'textfield', title: 'Status', value: s.status ?? 'HALF TIME' },
    { field: 'f5', ftype: 'textfield', title: 'Note', value: s.note ?? 'Matchday 24' },
    { field: 'f6', ftype: 'color', title: 'Team A colour', value: s.colourA ?? '#f6a623' },
    { field: 'f7', ftype: 'color', title: 'Team B colour', value: s.colourB ?? '#7dd3fc' },
  ];
}

// ── The match event card ─────────────────────────────────────────────────────

/** One design's starting values for the match-event contract. */
export interface MatchEventSamples {
  event?: string;
  minute?: string;
  team?: string;
  detail?: string;
  player?: string;
  colour?: string;
}

/**
 * The MATCH EVENT contract — the transient card: a goal, a substitution, a card, a penalty.
 *
 * One KIND word ("SUBSTITUTION", "YELLOW CARD", "2 MIN"), the minute it happened, the team, and
 * two people or two facts (off and on for a substitution, player and offence for a card). Two
 * lines rather than one because every event this graphic serves has exactly two halves, and a
 * card that can only carry one of them sends the operator back to the lower thirds.
 */
export function matchEventFields(s: MatchEventSamples = {}): SpxField[] {
  return [
    { field: 'f0', ftype: 'textfield', title: 'Event', value: s.event ?? 'SUBSTITUTION' },
    { field: 'f1', ftype: 'textfield', title: 'Minute', value: s.minute ?? "67'" },
    { field: 'f2', ftype: 'textfield', title: 'Team', value: s.team ?? 'HOME' },
    { field: 'f3', ftype: 'textfield', title: 'Out / detail', value: s.detail ?? 'M. ØDEGAARD' },
    { field: 'f4', ftype: 'textfield', title: 'In / player', value: s.player ?? 'K. HAVERTZ' },
    { field: 'f5', ftype: 'color', title: 'Team colour', value: s.colour ?? '#f6a623' },
  ];
}

// ── Shared markup fragments (the parts that carry machinery) ─────────────────

/**
 * Clip a scorebug's team name to ONE line, with an ellipsis, at a given width.
 *
 * A compact scorebug is a fixed strip that stays on air for the whole match, so a long club
 * name has to be trimmed rather than wrapped: "Borussia Mönchengladbach" wrapping to three
 * lines grows the bug from 71px tall to 127px in the middle of play, which moves everything
 * the director framed around it.
 *
 * THE GOTCHA THIS EXISTS FOR — worth reading before hand-writing the rule again. The
 * assembler's own `.scoreboard-mask > span` rule sets `text-wrap: balance`, which in modern
 * engines resolves to `text-wrap-mode: wrap`. `white-space: nowrap` is a SHORTHAND that
 * expands to `text-wrap-mode: nowrap`, so the assembler's rule — one specificity step higher
 * (0,1,1 against a plain class's 0,1,0) — silently wins and the name wraps anyway. It looks
 * exactly like the nowrap was never written. Winning it back needs both the higher specificity
 * (`.scoreboard-mask > .name`) and the modern longhand alongside the shorthand.
 */
export function clipOneLineCss(selector: string, maxWidthPx: number): string {
  return `/* One line, clipped with an ellipsis: a fixed strip must not change height mid-match.
   The child selector and the text-wrap longhand are both load-bearing — the assembler's
   \`.scoreboard-mask > span { text-wrap: balance }\` outranks a plain white-space: nowrap. */
.scoreboard-mask > ${selector} {
  max-width: calc(${maxWidthPx}px * var(--scale));  /* the width a long club name is trimmed to */
  overflow: hidden;                /* everything past that width is cut… */
  text-overflow: ellipsis;         /* …and the cut is marked, so a trimmed name reads as trimmed */
  white-space: nowrap;             /* one line (the shorthand, for older engines) */
  text-wrap: nowrap;               /* one line (the longhand that actually beats \`balance\`) */
}`;
}

/**
 * Wrap a team name to at most two lines. The club/amateur board is a growing stack rather than
 * a fixed strip, so wrapping is right there — but unbounded wrapping is not, and a three-line
 * club name would push the footer off the safe area.
 */
export function clampTwoLinesCss(selector: string): string {
  return `/* At most two lines: a stack may grow for a long club name, but not without limit. */
.scoreboard-mask > ${selector} {
  display: -webkit-box;            /* the only cross-engine way to clamp a line count */
  -webkit-box-orient: vertical;    /* stack the lines… */
  -webkit-line-clamp: 2;           /* …and cut after the second, with an ellipsis */
  line-clamp: 2;                   /* the standard property, for engines that have it */
  overflow: hidden;                /* required for the clamp to take effect */
}`;
}

/** The two hidden club-colour holders the board runtimes lift onto the root. */
export function colourHoldersHtml(aId: string, bId: string, aValue: string, bValue: string): string {
  return `      <!-- Club colours — hidden holders; the runtime lifts them onto the root as --team-a / --team-b. -->
      <div id="${aId}" class="scoreboard-colour-a" style="display: none">${esc(aValue)}</div>
      <div id="${bId}" class="scoreboard-colour-b" style="display: none">${esc(bValue)}</div>`;
}

/** A single hidden club-colour holder (the match-event card wears one team's colour). */
export function colourHolderHtml(id: string, value: string): string {
  return `      <!-- Team colour — a hidden holder; the runtime lifts it onto the root as --team-a. -->
      <div id="${id}" class="scoreboard-colour-a" style="display: none">${esc(value)}</div>`;
}

/** The hidden period-breakdown source the match board's runtime renders from. */
export function periodSourceHtml(id: string, value: string): string {
  return `      <!-- Period breakdown source — one "label | home | away" per line; JS renders it above. -->
      <div id="${id}" class="scoreboard-periods-src" style="display: none">${esc(value)}</div>`;
}

/**
 * The match clock element. `data-count` is the DESIGN's decision (football counts up, hockey
 * and basketball count down) and `data-start` is what `resetMatchClock` returns to — never
 * zero-by-assumption, because a period that runs from 12:00 resets to 12:00.
 */
export function clockSpanHtml(id: string, direction: 'up' | 'down', start: string, extraClass = ''): string {
  const cls = extraClass === '' ? 'scoreboard-clock' : `scoreboard-clock ${extraClass}`;
  return `<span id="${id}" class="${cls}" data-count="${direction}" data-start="${esc(start)}">${esc(start)}</span>`;
}
