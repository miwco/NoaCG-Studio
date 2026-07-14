// The video project's editable inputs (its Template Definition) across an AI refinement.
// The Anthropic API is mocked at the network level, so the whole real provider path runs -
// motion plan, module emit, validation, apply - without a key or cost.
//
// The case that matters: a refinement re-emits the COMPLETE module and therefore re-declares
// its inputs. A model that forgets to repeat the array (schema-legal: `inputs` may be []) must
// NOT empty the user's Content panel and revert their text to the code default. Values the
// user typed are theirs; only an explicit content change may take them away.

import { test, expect, type Page, type Route } from '@playwright/test';

const HEADLINE_DEFAULT = 'Prime Time';

/** A valid composition (compiles, passes the static contract, renders every probed frame). */
function moduleTsx(exitFrames: number): string {
  return `import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';

export default function Composition({ fields = {} }: { fields?: Record<string, string | number> }) {
  const frame = useCurrentFrame();
  const headline = fields.headline ?? '${HEADLINE_DEFAULT}';
  const enter = interpolate(frame, [0, ${exitFrames}], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', background: '#0b0d10' }}>
      <div style={{ opacity: enter, color: '#f4f4f5', fontFamily: 'sans-serif', fontSize: 72 }}>
        {headline}
      </div>
    </AbsoluteFill>
  );
}
`;
}

/** The generation: a module that declares one editable headline. */
const MODULE_WITH_INPUTS = {
  summary: 'A headline that fades up.',
  tsx: moduleTsx(15),
  inputs: [{ key: 'headline', type: 'text', label: 'Headline', default: HEADLINE_DEFAULT }],
};

/** The refinement: the same module edited - and the inputs array dropped to []. */
const MODULE_NO_INPUTS = {
  summary: 'Snappier entrance.',
  tsx: moduleTsx(8),
  inputs: [],
};

const MOTION_PLAN = {
  concept: 'A headline fades up.',
  visualDirection: 'Dark stage, centred type.',
  typography: 'One bold sans headline.',
  background: 'Near-black.',
  easingApproach: 'Clamped interpolate.',
  assetUsage: 'none',
  phases: [{ name: 'Enter', startSec: 0, endSec: 0.5, description: 'The headline fades up.' }],
};

function toolResponse(name: string, input: unknown) {
  return {
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      content: [{ type: 'tool_use', id: 'tu_1', name, input }],
      stop_reason: 'tool_use',
    }),
  };
}

/** Answer every Claude call by the forced tool; the 2nd module emit is the refinement. */
async function mockClaude(page: Page): Promise<{ moduleEmits: () => number }> {
  let moduleEmits = 0;
  await page.route('https://api.anthropic.com/v1/messages', (route: Route) => {
    const body = route.request().postDataJSON() as { tools?: { name: string }[] };
    const tool = body.tools?.[0]?.name;
    if (tool === 'emit_motion_plan') return route.fulfill(toolResponse(tool, MOTION_PLAN));
    if (tool === 'detect_skills') return route.fulfill(toolResponse(tool, { skills: [] }));
    moduleEmits += 1;
    return route.fulfill(
      toolResponse('emit_remotion_module', moduleEmits === 1 ? MODULE_WITH_INPUTS : MODULE_NO_INPUTS),
    );
  });
  return { moduleEmits: () => moduleEmits };
}

function player(page: Page) {
  return page.frameLocator('.video-player-frame');
}

test.beforeEach(async ({ page }) => {
  // A fake key so the REAL Claude provider runs (the route below answers every request).
  await page.addInitScript(() =>
    localStorage.setItem('spx-gfx-ai', JSON.stringify({ apiKey: 'sk-ant-test', model: 'claude-sonnet-5' })),
  );
});

test('a refinement that re-emits no inputs keeps the ones the user is editing', async ({ page }) => {
  const { moduleEmits } = await mockClaude(page);

  await page.goto('/app');
  await page.getByRole('button', { name: 'Video or animation with AI' }).click();
  await page.getByRole('button', { name: 'Countdown', exact: true }).click();
  await page.getByTestId('video-create').click();
  await expect(page.getByTestId('video-shell')).toBeVisible();

  // The generation lands: its declared input shows up in the Content panel at its default.
  await expect(page.locator('.ai-msg.assistant').first()).toBeVisible({ timeout: 15_000 });
  await page.getByTestId('video-tab-content').click();
  const headline = page.getByTestId('video-input-headline');
  await expect(headline).toHaveValue(HEADLINE_DEFAULT);

  // The user makes it theirs - and the live preview follows through the set-props channel.
  await headline.fill('Cup Final Tonight');
  await expect(player(page).getByText('Cup Final Tonight')).toBeVisible({ timeout: 10_000 });

  // Now a refinement about MOTION, whose emit forgets to re-declare the inputs.
  await page.getByTestId('video-tab-chat').click();
  await page.getByTestId('video-chat-field').fill('make the entrance snappier');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.locator('.ai-msg.assistant').nth(1)).toBeVisible({ timeout: 15_000 });
  expect(moduleEmits()).toBe(2); // the refinement really did re-emit the module

  // The input survives, still carrying the user's value - not wiped, not reverted to the
  // code default. (Before the fix: the Content panel emptied and the preview said "Prime Time".)
  await page.getByTestId('video-tab-content').click();
  await expect(page.getByTestId('video-content-empty')).toHaveCount(0);
  await expect(page.getByTestId('video-input-headline')).toHaveValue('Cup Final Tonight');
  await expect(player(page).getByText('Cup Final Tonight')).toBeVisible({ timeout: 10_000 });
});
