import type { Page } from '@playwright/test';

// Helpers for the KEY-OWNERSHIP contracts (src/components/spaceKey.ts).
//
// Two surfaces want Space and several want Delete / Ctrl+C / Escape / the arrows. Asserting one
// of them acted is never enough - the bug these were written for was an unintended SECOND
// handler firing alongside the intended one, which every existing spec happily passed through.
// So the probes here answer "did the graphic play?" rather than "did the pan arm?".

interface ProbeTl { __activeTl?: { __panProbe?: number } }

/** 'none' = nothing running, 'parked' = the stamped timeline survives, 'fresh' = play() ran. */
export function timelineState(page: Page): Promise<string> {
  return page.evaluate(() => {
    const w = (document.querySelector('iframe.preview-frame') as HTMLIFrameElement | null)
      ?.contentWindow as unknown as ProbeTl | null;
    if (!w?.__activeTl) return 'none';
    return w.__activeTl.__panProbe === 1 ? 'parked' : 'fresh';
  });
}

/** Mark the parked timeline (if any) so a later read can tell it from a fresh play(). */
export async function stampTimeline(page: Page): Promise<string> {
  await page.evaluate(() => {
    const w = (document.querySelector('iframe.preview-frame') as HTMLIFrameElement | null)
      ?.contentWindow as unknown as ProbeTl | null;
    if (w?.__activeTl) w.__activeTl.__panProbe = 1;
  });
  return timelineState(page);
}

/**
 * Real OS auto-repeat. `page.keyboard.down()` sends ONE keydown and never repeats, which is why
 * the first fix for the Space-pan bug looked green while the actual held-key gesture stayed
 * broken - only the first keydown was ever covered. Anything that guards a HELD key needs this.
 */
export async function holdKeyRepeats(page: Page, n: number, code = 'Space', key = ' '): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  for (let i = 0; i < n; i++) {
    await cdp.send('Input.dispatchKeyEvent', {
      type: 'keyDown', code, key, windowsVirtualKeyCode: key === ' ' ? 32 : 0, autoRepeat: true,
    });
  }
  await cdp.detach();
  await page.waitForTimeout(250);
}

/** How many times the graphic was told to play since the counter was installed. */
export async function countPlays(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    const w = window as unknown as { __plays: number };
    w.__plays = 0;
    // Every sendControl bumps a nonce, so one play per press means one subscriber call.
    useTemplateStore.subscribe((s: { controlCommand: { action?: string } | null }) => {
      if (s.controlCommand?.action === 'play') w.__plays++;
    });
  });
}

export function playCount(page: Page): Promise<number> {
  return page.evaluate(() => (window as unknown as { __plays: number }).__plays ?? 0);
}
