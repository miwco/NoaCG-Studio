// The canonical editable-field vocabulary shared across the product's two authoring worlds.
//
// NoaCG has one idea of "an editable field the operator changes without touching code" that
// shows up in two places today: an SPX template's DataFields (model/types.ts SpxField ->
// control/controlModel.ts operator controls) and an AI video project's editable inputs
// (model/videoTypes.ts VideoInput -> the Content panel). Both mapped an ftype/type onto a
// control independently, and the two lists were free to drift. This module is the single
// source of truth for the KINDS of control a field can get, so "the field types the product
// supports" is defined once and every surface references it - the groundwork for one shared
// Template Definition across Remotion, SPX, and operator controls.
//
// The kinds are the union across both worlds:
//   text    - a single line of copy (SPX textfield; a video text input)
//   lines   - a line-list editor (SPX textarea: ticker items, credits, a schedule) [SPX only]
//   number  - a numeric stepper (SPX number; a video number input)
//   color   - a colour swatch + hex (SPX color; a video color input)
//   select  - a fixed set of choices (SPX dropdown; a video select input)
//   toggle  - a boolean switch (SPX checkbox) [SPX only]
//   image   - a picker that references an image by name (SPX filelist; a video image input)
//
// A given world uses a subset: the video Template Definition exposes text/number/color/
// select/image; the SPX operator panel adds lines/toggle for its textarea/checkbox ftypes.
export type FieldKind = 'text' | 'lines' | 'number' | 'color' | 'select' | 'toggle' | 'image';

/** The subset of FieldKind the AI video Template Definition (VideoInput) exposes. */
export type VideoFieldKind = Extract<FieldKind, 'text' | 'number' | 'color' | 'select' | 'image'>;
