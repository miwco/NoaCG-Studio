import type { Page, FrameLocator } from '@playwright/test';

// The editor's live preview iframe carries no `allow-same-origin` (the template it renders can
// be AI-generated or imported code) — a page-JS reach into `contentWindow`/`contentDocument`
// (`page.evaluate(() => document.querySelector('iframe.preview-frame').contentWindow…)`) throws
// a SecurityError. Playwright's frame-scoped APIs (`frameLocator`, `locator.evaluate`) reach in
// via CDP instead — a separate channel the browser's cross-origin JS restriction does not gate —
// which is why e2e/wizard-preview.spec.ts's `page.frameLocator('.wz-side iframe')` already works
// unaffected by the same sandbox. Use these helpers instead of a raw `contentWindow`/
// `contentDocument` read anywhere a spec needs to reach into the preview.

export function previewFrame(page: Page): FrameLocator {
  return page.frameLocator('iframe.preview-frame');
}

/** Run `fn` inside the preview document's own window/global scope. */
export function frameEval<T>(page: Page, fn: () => T): Promise<T> {
  return previewFrame(page).locator('body').evaluate(fn);
}

export interface FrameMachineState {
  groups: Record<string, string>;
}

export type SimWin = Window & {
  play?: () => void;
  stop?: () => void;
  next?: () => void;
  update?: (data: string) => void;
  noacgDispatch?: (event: string, payload?: Record<string, string>) => unknown;
  noacgSnap?: (assignments: Record<string, string> | null, opts?: { timers?: boolean }) => unknown;
  noacgMachineState?: () => FrameMachineState;
};

export function framePlay(page: Page): Promise<void> {
  return frameEval(page, () => {
    (window as unknown as SimWin).play?.();
  });
}

export function frameStop(page: Page): Promise<void> {
  return frameEval(page, () => {
    (window as unknown as SimWin).stop?.();
  });
}

export function frameNext(page: Page): Promise<void> {
  return frameEval(page, () => {
    (window as unknown as SimWin).next?.();
  });
}

export function frameDispatch(page: Page, event: string, payload?: Record<string, string>): Promise<void> {
  return previewFrame(page)
    .locator('body')
    .evaluate(
      ({ event, payload }) => {
        (window as unknown as SimWin).noacgDispatch?.(event, payload);
      },
      { event, payload },
    );
}

export function frameSnap(page: Page, assignments: Record<string, string> | null, opts?: { timers?: boolean }): Promise<void> {
  return previewFrame(page)
    .locator('body')
    .evaluate(
      ({ assignments, opts }) => {
        (window as unknown as SimWin).noacgSnap?.(assignments, opts);
      },
      { assignments, opts },
    );
}

export function frameMachineState(page: Page): Promise<Record<string, string>> {
  return frameEval(page, () => (window as unknown as SimWin).noacgMachineState?.().groups ?? {});
}

/** Computed `opacity` of an element inside the preview document. */
export function frameOpacity(page: Page, selector: string): Promise<number> {
  return previewFrame(page)
    .locator(selector)
    .evaluate((el) => Number(getComputedStyle(el).opacity));
}

/** A computed style property of an element inside the preview document (e.g. `'transform'`). */
export function frameStyleProp(page: Page, selector: string, prop: string): Promise<string> {
  return previewFrame(page)
    .locator(selector)
    .evaluate((el, prop) => getComputedStyle(el).getPropertyValue(prop), prop);
}

export interface FrameDocRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * An element's bounding box in the preview document's OWN internal coordinate space (doc px —
 * unscaled, as `getBoundingClientRect()` reports it from inside the iframe). Deliberately NOT
 * `locator.boundingBox()` — that returns the element's box in the MAIN PAGE's viewport space
 * (scaled and positioned by the iframe's own on-page transform), a different coordinate system
 * entirely from the "doc px" the app's own logic (computePad, hit-testing, …) works in. Evaluating
 * `getBoundingClientRect()` FROM INSIDE the frame (like e2e/_canvas.ts's `elementPoint` already
 * does) is what gives the right space.
 */
export function frameRect(page: Page, selector: string): Promise<FrameDocRect> {
  return previewFrame(page)
    .locator(selector)
    .evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { left: r.left, top: r.top, width: r.width, height: r.height };
    });
}
