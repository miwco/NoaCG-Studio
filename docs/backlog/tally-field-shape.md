# A list-with-values field kind - rows an operator edits, not a textarea they retype

**Filed:** 2026-08-30. **Source:** the control-panel research round
(`docs/CONTROL_PANEL_RESEARCH.md` §6 row 3, §5).

## Why

Several of the graphics the push cares about carry the same shape: **a list where every row has a
label and a number.** A poll's options and their counts. A standings board's teams and points. A
results board's candidates and votes. A medal table.

Today that shape has exactly one operator surface: a `lines` textarea holding `"Label | count"` per
line, which the runtime splits. It is honest - it crosses every boundary as one `string`, it works
identically in every renderer, and it needs no new vocabulary - and it is the wrong instrument for
the job it is doing. An operator updating one count in a live vote retypes a block of pipe-delimited
text under time pressure, with no per-row stepper, no way to add a row without getting the
punctuation right, and no protection against dropping a line.

This is also the one row in the capability comparison where **both** competitors are ahead of us on
the operator's side: Singular exposes a `json` control node plus a `counter` node per value, and
MXMZ has an array variable type feeding a Repeater element. Neither has a good answer either -
Singular's is a JSON blob and MXMZ's is unpublished - but both beat retyping a pipe list.

And there is no standard to wait for. GDD's `gddType` vocabulary is ten scalar values; `array` is a
legal JSON-Schema `type` with **no array `gddType` and no specified GUI**. So the ecosystem has not
solved this, we cannot adopt an answer, and whatever we do here is ours - which argues for doing it
in the shared descriptor vocabulary where five surfaces already draw from one definition, rather
than per template.

## What it would take

- A field kind in the shared vocabulary (`control/controlModel.ts` `fieldDescriptors`) for
  "rows of label + value", with the serialized form staying the pipe-line string so nothing about
  the wire, the SPX contract or the OGraf `schema` changes. **The storage stays a string; only the
  editor changes.** That is what keeps this additive and keeps every existing template working.
- The widget in each surface that already draws fields: the in-app Control tab, `controlPanelHtml`
  (vanilla, no React), the hosted page, the production controller. Rows with a ± stepper on the
  number, add/remove/reorder, and a plain-text escape hatch so nothing becomes unreachable.
- The overflow warning and the per-type `maxLines` cap already exist and must keep applying.
- Optionally, on export: emit the OGraf `schema` property as `array`-of-`object` with the string
  form kept in `v_noacg` - but only once somebody has checked what a real third-party form does
  with an array, because a renderer that draws nothing is worse than one that draws a text box.
  `docs/backlog/ograf-form-oracle.md` is the instrument for exactly that check.

Two to three days across the surfaces; the shared-descriptor design is the load-bearing hour.

## Evidence

`docs/CONTROL_PANEL_RESEARCH.md` §4a (GDD has ten scalar `gddType`s and no array presentation),
§3 (Singular's node types, from their own docs endpoint), §6 row 3.
`src/templates/types/livePoll.ts` (`options` as `kind: 'lines'`, `"Label | count"`).
`docs/OGRAF_FIRST_REVIEW.md` §4 ("ours is honest but opaque; GDD arrays have no specified GUI
either - no standard answer to adopt yet").
