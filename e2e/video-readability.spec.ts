// Text clipping as a GENERATION gate, not just a bench observation.
//
// The failure this pins shipped twice before it was detectable: a hero headline cropped by
// its own card - "BROADCAST KITCHEN" painting as "BROADCAST KITCH" - passed compile, the
// static contract, and the runtime probe, because nothing throws when glyphs are cut. The
// player host now measures the glyph extent at the hold frames (player-host/src/textChecks.ts)
// and the validator turns a persistent crop into a repair round.
//
// The Anthropic API is mocked at the network level, so the real provider path runs: motion
// plan, module emit, validation, repair, apply - on emits we choose.

import { test, expect } from '@playwright/test';
import { createVideoProject, mockClaude, player, useFakeAiKey, type EmittedModule } from './_video';

/** `boxWidth` decides the verdict: 420 crops the headline, 1600 gives it room. */
function moduleFor(summary: string, boxWidth: number): EmittedModule {
  return {
    summary,
    tsx: `import { AbsoluteFill } from 'remotion';

export default function Composition({ fields = {} }: { fields?: Record<string, string | number> }) {
  const headline = fields.headline ?? 'BROADCAST KITCHEN';
  return (
    <AbsoluteFill style={{ background: '#101318', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: ${boxWidth}, overflow: 'hidden' }}>
        <div style={{ color: '#fff', fontSize: 96, fontWeight: 800, whiteSpace: 'nowrap' }}>
          {headline}
        </div>
      </div>
    </AbsoluteFill>
  );
}
`,
    inputs: [{ key: 'headline', type: 'text', label: 'Headline', default: 'BROADCAST KITCHEN' }],
  };
}

test.beforeEach(async ({ page }) => {
  await useFakeAiKey(page);
});

// Both cases hang on the LIVE probe, so the emits are delayed: an instant answer would beat
// the preview to the screen and validation would fall back to the static checks (see mockClaude).
const AS_SLOW_AS_REAL = { delayMs: 800 };

test('a cropped headline is sent back for repair, and the fixed version applies', async ({ page }) => {
  const { emits } = await mockClaude(
    page,
    [moduleFor('Headline in a tight card.', 420), moduleFor('Headline given room.', 1600)],
    AS_SLOW_AS_REAL,
  );
  await createVideoProject(page);

  // Two emits: the generation plus exactly one repair round - the crop was caught and the
  // second, fitting composition passed.
  await expect.poll(() => emits(), { timeout: 20_000 }).toBe(2);
  await expect(page.locator('.ai-msg.assistant').last()).toContainText('Headline given room.');
  await expect(page.locator('.ai-msg.assistant').last()).not.toContainText('failed validation');
  await expect(player(page).getByText('BROADCAST KITCHEN')).toBeVisible({ timeout: 10_000 });
});

test('a crop that survives both repair rounds ships with a warning instead of being thrown away', async ({ page }) => {
  // The model never fixes it (mockClaude repeats its last module), so the finding outlives
  // the repair budget. A readability finding is not a broken composition: the user waited
  // for this, so it applies and the crop is surfaced as a warning - the SPX harness's rule
  // for its editability findings.
  const { emits } = await mockClaude(page, [moduleFor('Headline in a tight card.', 420)], AS_SLOW_AS_REAL);
  await createVideoProject(page);

  await expect.poll(() => emits(), { timeout: 40_000 }).toBe(3); // generation + 2 repair rounds
  const reply = page.locator('.ai-msg.assistant').last();
  await expect(reply).toContainText('Headline in a tight card.');
  await expect(reply).not.toContainText('failed validation');
  await expect(player(page).getByText('BROADCAST KITCHEN')).toBeVisible({ timeout: 10_000 });
});
