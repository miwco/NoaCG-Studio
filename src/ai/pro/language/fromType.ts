// COMPILING A PHASE A DESIGN THROUGH THE GRAPHIC-TYPE REGISTRY (docs/NOACG_PRO_PLAN.md §15.9).
//
// Phase A's lower third is built straight on the category assembler, which is right for the type
// the calibration was taken on. Phase B's two new types are NOT: each of them already exists in
// `src/templates/types/`, declaring its field contract, its required parts, its machine and its
// control events - and a Pro graphic that re-describes any of that is a second description that
// can drift from the one bug01 and gt01 compile from.
//
// So a Phase A design for a registered type is handed to `variantsFromType` as that type's ONE
// design. Four things come back for free, and each of them is a check the composer would
// otherwise be trusted to do by hand:
//
//   * THE FIELD CONTRACT - `f0..fN` in the type's declared order, the logo compiled last, the
//     caller's lines written into the declared line fields (`withLineValues`);
//   * THE REQUIRED-PARTS GATE - `missingParts` throws when the composed design fails to emit a
//     part the type promised, which is a real measurement of the platform's own composition
//     rather than a claim about it;
//   * THE MACHINE - `attachMachine` compiles the type's declaration onto the assembled data, so
//     a Pro countdown carries the same pause/resume group and the same control-page buttons the
//     catalog's own timers do;
//   * THE CONTENT CHANNEL - `withContentValues` clamps a non-line value (a countdown's duration)
//     against the field's own declaration and DROPS an illegal one, which is what keeps a
//     generated graphic operable rather than merely valid.
//
// A type is a DECLARATION, not a second way to build a template (`templates/types/graphicType.ts`),
// and that is exactly why Pro may use it: the design still builds through the category's own
// assembler, and the type only says what the result has to be.

// The seam itself now lives beside `variantsFromType` (templates/types/graphicType.ts), because
// the bridge page needs the same function and may not import src/ai; this module keeps the
// Pro-side name and the reasoning above.
export { variantFromType } from '../../../templates/types/graphicType';
