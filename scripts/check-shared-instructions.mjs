// Guard the shared Claude Code / Codex instruction architecture against drift.
//
// Canonical content:
//   - project rules: AGENTS.md
//   - reusable procedures: .agent-workflows/<name>.md
//
// Tool adapters:
//   - Claude Code: .claude/commands/<name>.md or .claude/skills/<name>/SKILL.md
//   - Codex: .agents/skills/<name>/SKILL.md
//
// A short alias (see WORKFLOW_ALIASES) is just a second pair of adapters pointing at an
// existing workflow - never a second copy of the procedure.
//
// See docs/AGENT_WORKFLOWS.md. This runs first in `npm run build`.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MAX_WRAPPER_LINES = 25;
const DEFAULT_PROJECT_DOC_MAX_BYTES = 32 * 1024;
// Membership means DESTRUCTIVE, not merely important - it is what earns the
// disable-model-invocation requirement below. `handoff` briefly joined while it removed its own
// worktree; it no longer touches cleanup at all, so it left again rather than diluting what this
// set means.
const EXPLICIT_ONLY_WORKFLOWS = new Set(['safe-merge', 'cleanup-worktrees']);
// Short invocation aliases: <alias> => <canonical workflow>. An alias owns adapters in BOTH
// tools, exactly as thin as a normal adapter, pointing at the target's canonical workflow -
// so a shortcut can never grow a second copy of the procedure. Never alias a destructive
// (explicit-only) workflow: a one-keystroke command must not be able to land anything.
const WORKFLOW_ALIASES = new Map([
  ['n', 'next'],
  ['o', 'orchestrator'],
]);
const CLAUDE_ONLY_EXCEPTIONS = new Map([
  [
    'rescue',
    'Claude-specific adapter that delegates a long-running task from Claude Code to Codex.',
  ],
]);
const CRITICAL_WORKFLOW_MARKERS = new Map([
  [
    'next',
    [
      'Never invent work to have something to offer.',
      'git status --porcelain=v1 --branch',
      'node scripts/worktree-activity.mjs',
      'Never act on a collision.',
      'Verify before you list.',
      "Read, don't write.",
    ],
  ],
  [
    // The orchestrator assigns work to other sessions and must never start it, so the two
    // halves that keep it honest are pinned: it grounds the plan in measured repository state
    // rather than in a handoff's prose, and it says out loud what it would push back on. That
    // section exists because a day was once planned with four of six sessions serving goals the
    // roadmap had parked - flagging is the whole value, so it must not be quietly droppable.
    'orchestrator',
    [
      'node scripts/worktree-activity.mjs',
      'node scripts/merge-order.mjs',
      'What I would push back on',
      'Every pasted task gets a prompt.',
      // Quoted from the root AGENTS.md rather than paraphrased, so the two cannot drift apart
      // with a green build - the earlier lowercase paraphrase pinned only itself.
      'One browser-driving job per MACHINE, not per worktree',
      'Never act on a collision.',
      "Read, don't write.",
      'Create or update no files',
      // A wave is planned so that nothing waits to START - the queue already serializes landing,
      // and a start-order edge is the one that strands work overnight when its predecessor dies.
      // Both halves are pinned: the rule, and the ban on the line that used to encode the edge.
      'A wave is ORDER-FREE or it is not a wave',
      'There is no `WAIT` line, because a wave is order-free',
      // Landing is serialized, not permissioned. A wave the user has to merge by hand in the
      // morning is the exact cost this shape removes, so every prompt queues itself - and a
      // session that stops to ask a human is a session that does nothing all night.
      'QUEUE is mandatory on every prompt and is the last thing in it',
      'No prompt ever contains a step for the user.',
      // The two exceptions to NEVER ACTS are enumerated so neither can widen quietly, and
      // neither of them reaches landing.
      'Exactly two exceptions, both bounded',
      'Never merge, and never push.',
      'follow-on that was not planned is never launched',
      // A night wave that plans follow-ons and then goes to sleep has planned nothing: the loop
      // is the half that fires them. Entering it is automatic, and a quiet tick must stay quiet.
      'A night wave enters this automatically',
      'A tick with no landing is a no-op, not a report',
      // The loop can die silently, so nothing the wave NEEDS may depend on it - every starting
      // prompt queues itself, and a follow-on only ever carries work the night can afford to lose.
      'The loop is ADDITIVE, never load-bearing',
      // The report is read over coffee by the one person who can unblock the night's output, so
      // their steps come first and complete, and the prompt section never manufactures work.
      'Needs you, FIRST, and step-by-step.',
      'A finished session gets no prompt.',
      // Handoffs are working files, not records - git already keeps the history. Without the
      // consumed/spent/deferred pass the folder grows monotonically and every plan re-reads it.
      'Handoff files are CONSUMED, not archived - git is the archive.',
      // Literal obedience is the failure mode this pair guards: the why travels so a session can
      // beat the route, and spare capacity drains a declared backlog instead of invented work.
      'WHY is a TARGET, not a route.',
      'never invent work to fill a wave',
      // Paid-for on 2026-08-26: a build gate landing mid-wave turns every sibling's merge of
      // main into a moving target, and their reds read as their own fault.
      'A GATE LANDS ALONE.',
      // The self-feeding wave is bounded by the report, not by pre-approval - the loop can
      // extend a wave, never extend itself past the owner's checkpoint.
      'THE REPORT IS THE CHECKPOINT.',
      'Every wave improves this file',
      // Big prompts are the point: one branch, one gate, one landing instead of three.
      'A starting prompt is a MULTI-STEP ASSIGNMENT, and should be big.',
      // The whole workflow rests on this: it assigns work and does none of it, and it never
      // reaches into another worktree - not to merge, not to check, not to tidy. Printing a merge
      // order reads like an offer to merge, so the boundary is pinned in both directions.
      'THIS SESSION NEVER ACTS',
      'Every command this session produces is for the USER to run, and names WHERE to run it',
      'Section 3 is a report, not a pick.',
      // A file-list diff calls every one of these collisions disjoint, so the plan has to hand
      // out the scarce slots itself.
      'The plan ALLOCATES these up front',
    ],
  ],
  [
    'handoff',
    [
      'git rev-parse --short HEAD',
      'whether the working tree is clean',
      'last known verification command/result tied to that commit',
      'Do not run verification during handoff.',
      'Create or update no files',
      // A handoff exists so the NEXT session can judge the work, not obey a list. The why is
      // what makes that judgement possible, and it is the first thing to go when a handoff is
      // written in a hurry - so it is pinned. The other two are the fields a later session
      // cannot reconstruct once the branch is merged and the chat is archived.
      'Every item carries its WHY',
      'The files this branch touched',
      "Constraints: point, don't reprint.",
      // The archive verdict is a TEST, not an impression: archive-ready means committed, pushed
      // and contained in `main`, and containment that cannot be established reads as not safe.
      // Both ancestor checks are pinned because dropping either one turns the verdict back into
      // a feeling - a green feature branch would pass on "it all worked".
      'This is a TEST, not an impression.',
      'git merge-base --is-ancestor HEAD main',
      'git merge-base --is-ancestor HEAD origin/main',
      // Handoff must stay read-only, and must stay OUT of worktree cleanup entirely - the owner
      // runs that sweep deliberately and does not want the option raised here. This marker
      // replaced two that pinned handoff's own cleanup report, removed 2026-08-08.
      "Read, don't write.",
      'Never remove a worktree, and never offer to.',
    ],
  ],
  [
    'safe-merge',
    [
      'git pull --ff-only origin main',
      'git merge --ff-only <branch>',
      'git push origin main',
      // The removal rule has exactly TWO carve-outs, both temporary worktrees this flow creates
      // itself: one for a source branch that has none, and one for `main` when the root cannot
      // host it (added 2026-08-04, after four runs improvised the second). Widening it further -
      // to any worktree this run did not create - or letting a `--force` past the refusal, still
      // has to edit this list to land, which is the whole point of pinning it here.
      'never remove a worktree you did not create in this run',
      'Remove ONLY the worktrees this run\n   created, and never the branch.',
      'Never delete a branch,',
      'Never use\n   `git merge --no-commit` as a preview',
    ],
  ],
  [
    'cleanup-worktrees',
    [
      'contained in both local `main` and `origin/main`',
      '`git branch -d`, never `-D`',
      'never `git worktree remove --force`',
      '--apply --acknowledge-risks',
      'non-empty unregistered folders are reported',
    ],
  ],
]);
const SKIP_DIR_NAMES = new Set([
  'node_modules',
  '.git',
  '.claude',
  '.agents',
  '.codex',
  'dist',
  'worktrees',
  'coverage',
  'playwright-report',
  'test-results',
  '.vercel',
  'video-bench-out',
  '.next',
  'build',
]);

const failures = [];

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/');
}

function absolute(relative) {
  return path.join(ROOT, ...relative.split('/'));
}

function text(file) {
  return readFileSync(file, 'utf8');
}

function lineCount(file) {
  return text(file).split('\n').length;
}

/**
 * What one instruction file COSTS a Codex session, measured LF-normalised.
 *
 * The number that matters is the size of the file as committed, which is what a fresh checkout
 * hands the agent. A Windows working copy checks these out with CRLF (`core.autocrlf`), so
 * measuring the bytes on disk adds one per line - 1,468 of them across the largest chain here.
 * That was enough to report the chain 759 bytes OVER a budget it was actually 709 bytes under,
 * so the check failed on every Windows machine while CI, which checks out LF, stayed green. A
 * gate that says different things on different machines teaches people to ignore it.
 */
function chainBytes(file) {
  return Buffer.byteLength(text(file).replace(/\r\n/g, '\n'), 'utf8');
}

function checkThinWrapper(file, mustContain, label) {
  if (!existsSync(file)) {
    failures.push(`${label}: missing ${rel(file)}`);
    return;
  }
  const content = text(file);
  if (!content.includes(mustContain)) {
    failures.push(`${label}: ${rel(file)} must reference "${mustContain}"`);
  }
  const lines = lineCount(file);
  if (lines > MAX_WRAPPER_LINES) {
    failures.push(
      `${label}: ${rel(file)} is ${lines} lines; canonical instructions belong in ${mustContain}`,
    );
  }
}

function findFilesNamed(dir, filename, found = []) {
  if (!existsSync(dir)) return found;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIR_NAMES.has(entry.name)) continue;
      findFilesNamed(path.join(dir, entry.name), filename, found);
    } else if (entry.name === filename) {
      found.push(path.join(dir, entry.name));
    }
  }
  return found;
}

function parseFrontmatter(file) {
  const lines = text(file).replace(/\r\n/g, '\n').split('\n');
  if (lines[0] !== '---') return null;
  const end = lines.indexOf('---', 1);
  if (end < 0) return null;

  const metadata = {};
  for (let index = 1; index < end; index += 1) {
    const match = lines[index].match(/^([A-Za-z0-9_-]+):(?:\s*(.*))?$/);
    if (!match) continue;
    const [, key, rawValue = ''] = match;
    if (rawValue === '>-' || rawValue === '>' || rawValue === '|' || rawValue === '|-') {
      const folded = [];
      while (index + 1 < end && /^\s+/.test(lines[index + 1])) {
        index += 1;
        folded.push(lines[index].trim());
      }
      metadata[key] = folded.join(rawValue.startsWith('>') ? ' ' : '\n').trim();
    } else {
      metadata[key] = rawValue.replace(/^(['"])(.*)\1$/, '$2').trim();
    }
  }
  return metadata;
}

function checkSkillMetadata(file, expectedName, label) {
  const metadata = parseFrontmatter(file);
  if (!metadata) {
    failures.push(`${label}: ${rel(file)} has invalid or missing YAML frontmatter`);
    return;
  }
  if (metadata.name !== expectedName) {
    failures.push(
      `${label}: ${rel(file)} name must be "${expectedName}", found "${metadata.name ?? ''}"`,
    );
  }
  if (!metadata.description) {
    failures.push(`${label}: ${rel(file)} needs a non-empty description`);
  }
}

function repoFiles() {
  const result = spawnSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard'],
    { cwd: ROOT, encoding: 'utf8' },
  );
  if (result.status !== 0) {
    failures.push(`could not enumerate repository files: ${result.stderr.trim()}`);
    return [];
  }
  return result.stdout
    .split(/\r?\n/)
    .filter(Boolean)
    .map((file) => file.replace(/\\/g, '/'))
    .filter((file) => existsSync(absolute(file)));
}

function directChildrenWithFile(dir, filename) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(path.join(dir, entry.name, filename)))
    .map((entry) => entry.name);
}

function configuredInstructionLimit() {
  const config = path.join(ROOT, '.codex', 'config.toml');
  if (!existsSync(config)) return DEFAULT_PROJECT_DOC_MAX_BYTES;
  const match = text(config).match(/^\s*project_doc_max_bytes\s*=\s*(\d+)\s*$/m);
  if (!match) {
    failures.push(
      '.codex/config.toml must declare numeric project_doc_max_bytes for the checked instruction budget',
    );
    return DEFAULT_PROJECT_DOC_MAX_BYTES;
  }
  return Number(match[1]);
}

function isDirectoryAncestor(ancestor, candidate) {
  const relative = path.relative(ancestor, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

// Reporting these on a GREEN run is the point: a chain three hundred bytes under the budget is
// indistinguishable from a comfortable one unless the number is printed, and the ratchet in
// .codex/config.toml only ever moves DOWN - so "lower the limit until it fails" is not an
// available way to discover headroom.
const CHAIN_REPORT_COUNT = 3;
const CHAIN_TIGHT_FRACTION = 0.8;
const chainUsage = [];

function checkInstructionChains(agentsFiles) {
  const limit = configuredInstructionLimit();
  for (const leaf of agentsFiles) {
    const leafDir = path.dirname(leaf);
    const chain = agentsFiles.filter((candidate) =>
      isDirectoryAncestor(path.dirname(candidate), leafDir),
    );
    const bytes =
      chain.reduce((sum, file) => sum + chainBytes(file), 0) + Math.max(0, chain.length - 1) * 2;
    chainUsage.push({ leaf: rel(leaf), bytes, limit, headroom: limit - bytes });
    if (bytes > limit) {
      failures.push(
        `Codex instruction chain ending at ${rel(leaf)} is ${bytes} bytes, over ` +
          `project_doc_max_bytes=${limit}`,
      );
    }
  }
}

function reportChainHeadroom() {
  if (chainUsage.length === 0) return;
  const ranked = [...chainUsage].sort((a, b) => a.headroom - b.headroom);
  const tight = ranked.filter((chain) => chain.bytes > chain.limit * CHAIN_TIGHT_FRACTION);
  const shown = ranked.slice(0, Math.max(CHAIN_REPORT_COUNT, tight.length));
  console.log(
    `Tightest instruction chain(s) against project_doc_max_bytes=${shown[0].limit} ` +
      `(${chainUsage.length} chain(s) checked):`,
  );
  for (const chain of shown) {
    const percent = ((chain.bytes / chain.limit) * 100).toFixed(1);
    const flag = chain.bytes > chain.limit * CHAIN_TIGHT_FRACTION ? '  <-- near the limit' : '';
    console.log(
      `  - ${chain.leaf}: ${chain.bytes} bytes used, ${chain.headroom} free (${percent}%)${flag}`,
    );
  }
}

function checkWorkflowScriptReferences(workflowFile) {
  const references = [...text(workflowFile).matchAll(/`(scripts\/[A-Za-z0-9._/-]+)/g)].map(
    (match) => match[1],
  );
  for (const reference of new Set(references)) {
    if (!existsSync(absolute(reference))) {
      failures.push(`${rel(workflowFile)} references missing ${reference}`);
    }
  }
}

function checkCriticalWorkflowContract(name, workflowFile) {
  const content = text(workflowFile);
  const normalizedContent = content.replace(/\s+/g, ' ');
  for (const marker of CRITICAL_WORKFLOW_MARKERS.get(name) ?? []) {
    const normalizedMarker = marker.replace(/\s+/g, ' ');
    if (!normalizedContent.includes(normalizedMarker)) {
      failures.push(
        `${rel(workflowFile)} is missing critical contract marker "${normalizedMarker}"`,
      );
    }
  }
  if (/C:\\Users\\[^\\]+\\\.claude\\/i.test(content)) {
    failures.push(
      `${rel(workflowFile)} references tool-private memory under a user-specific home directory`,
    );
  }
}

const files = repoFiles();
const fileSet = new Set(files);

function checkRepositoryFile(file, label) {
  const relative = rel(file);
  if (!fileSet.has(relative)) {
    failures.push(`${label}: ${relative} is ignored or absent from the repository file set`);
  }
}

// 1. Every repository AGENTS.md has a thin sibling CLAUDE.md importing it.
const agentsFiles = findFilesNamed(ROOT, 'AGENTS.md').filter(
  (file) => rel(file) === 'AGENTS.md' || !rel(file).startsWith('.'),
);
for (const agentsFile of agentsFiles) {
  const claudeFile = path.join(path.dirname(agentsFile), 'CLAUDE.md');
  checkRepositoryFile(agentsFile, 'authoritative project instructions');
  checkRepositoryFile(claudeFile, 'Claude import');
  checkThinWrapper(claudeFile, '@AGENTS.md', 'AGENTS.md/CLAUDE.md pair');
}
checkInstructionChains(agentsFiles);
checkRepositoryFile(absolute('.codex/config.toml'), 'Codex project configuration');

// 2. Every canonical workflow has one thin Claude adapter and one valid Codex skill.
const workflowsDir = path.join(ROOT, '.agent-workflows');
const workflowNames = existsSync(workflowsDir)
  ? readdirSync(workflowsDir)
      .filter((file) => file.endsWith('.md'))
      .map((file) => file.slice(0, -3))
      .sort()
  : [];

for (const name of workflowNames) {
  const canonical = `.agent-workflows/${name}.md`;
  const canonicalFile = absolute(canonical);
  const claudeCommand = absolute(`.claude/commands/${name}.md`);
  const claudeSkill = absolute(`.claude/skills/${name}/SKILL.md`);
  const codexSkill = absolute(`.agents/skills/${name}/SKILL.md`);
  const hasClaudeCommand = existsSync(claudeCommand);
  const hasClaudeSkill = existsSync(claudeSkill);

  checkRepositoryFile(canonicalFile, 'canonical workflow');
  if (!hasClaudeCommand && !hasClaudeSkill) {
    failures.push(`${canonical}: missing Claude command or skill adapter`);
  }
  if (hasClaudeCommand) {
    checkRepositoryFile(claudeCommand, 'Claude command adapter');
    checkThinWrapper(claudeCommand, canonical, 'Claude command adapter');
    const metadata = parseFrontmatter(claudeCommand);
    if (!metadata?.description) {
      failures.push(`Claude command adapter: ${rel(claudeCommand)} needs a description`);
    }
  }
  if (hasClaudeSkill) {
    checkRepositoryFile(claudeSkill, 'Claude skill adapter');
    checkThinWrapper(claudeSkill, canonical, 'Claude skill adapter');
    checkSkillMetadata(claudeSkill, name, 'Claude skill adapter');
  }

  checkRepositoryFile(codexSkill, 'Codex skill adapter');
  checkThinWrapper(codexSkill, canonical, 'Codex skill adapter');
  if (existsSync(codexSkill)) checkSkillMetadata(codexSkill, name, 'Codex skill adapter');
  checkWorkflowScriptReferences(canonicalFile);
  checkCriticalWorkflowContract(name, canonicalFile);

  if (EXPLICIT_ONLY_WORKFLOWS.has(name)) {
    const claudeAdapter = hasClaudeCommand ? claudeCommand : claudeSkill;
    const claudeMetadata = parseFrontmatter(claudeAdapter);
    if (claudeMetadata?.['disable-model-invocation'] !== 'true') {
      failures.push(
        `${rel(claudeAdapter)} must set disable-model-invocation: true for destructive workflow ${name}`,
      );
    }
    const openAiMetadata = absolute(`.agents/skills/${name}/agents/openai.yaml`);
    checkRepositoryFile(openAiMetadata, 'Codex explicit-invocation metadata');
    if (
      !existsSync(openAiMetadata) ||
      !/^\s*allow_implicit_invocation:\s*false\s*$/m.test(text(openAiMetadata))
    ) {
      failures.push(
        `${rel(openAiMetadata)} must set policy.allow_implicit_invocation to false`,
      );
    }
  }
}

// 2b. Every alias resolves to a real workflow and has one thin adapter per tool.
for (const [alias, target] of WORKFLOW_ALIASES) {
  const canonical = `.agent-workflows/${target}.md`;
  if (!workflowNames.includes(target)) {
    failures.push(`alias ${alias}: no canonical workflow ${canonical} to alias`);
    continue;
  }
  if (workflowNames.includes(alias)) {
    failures.push(`alias ${alias}: shadows the canonical workflow .agent-workflows/${alias}.md`);
  }
  if (EXPLICIT_ONLY_WORKFLOWS.has(target)) {
    failures.push(`alias ${alias}: ${target} is destructive and must stay explicit-only, not aliased`);
  }

  const claudeCommand = absolute(`.claude/commands/${alias}.md`);
  checkRepositoryFile(claudeCommand, `alias ${alias}: Claude command adapter`);
  checkThinWrapper(claudeCommand, canonical, `alias ${alias}: Claude command adapter`);
  if (existsSync(claudeCommand) && !parseFrontmatter(claudeCommand)?.description) {
    failures.push(`alias ${alias}: ${rel(claudeCommand)} needs a description`);
  }

  const codexSkill = absolute(`.agents/skills/${alias}/SKILL.md`);
  checkRepositoryFile(codexSkill, `alias ${alias}: Codex skill adapter`);
  checkThinWrapper(codexSkill, canonical, `alias ${alias}: Codex skill adapter`);
  if (existsSync(codexSkill)) checkSkillMetadata(codexSkill, alias, `alias ${alias}: Codex skill adapter`);
}

// 3. Reverse mapping: no repository-owned adapter silently escapes the canonical workflow.
const claudeCommands = files
  .filter((file) => /^\.claude\/commands\/[^/]+\.md$/.test(file))
  .map((file) => path.basename(file, '.md'));
const claudeSkills = files
  .filter((file) => /^\.claude\/skills\/[^/]+\/SKILL\.md$/.test(file))
  .map((file) => file.split('/')[2]);
const codexSkills = directChildrenWithFile(path.join(ROOT, '.agents', 'skills'), 'SKILL.md');

for (const name of new Set([...claudeCommands, ...claudeSkills])) {
  if (workflowNames.includes(name)) continue;
  if (WORKFLOW_ALIASES.has(name)) continue;
  if (CLAUDE_ONLY_EXCEPTIONS.has(name)) continue;
  failures.push(
    `Claude adapter ${name} has no .agent-workflows/${name}.md and is not an explicit exception`,
  );
}
for (const [name, reason] of CLAUDE_ONLY_EXCEPTIONS) {
  if (![...claudeCommands, ...claudeSkills].includes(name)) {
    failures.push(`documented Claude-only exception ${name} is missing (${reason})`);
  }
}
for (const name of codexSkills) {
  if (WORKFLOW_ALIASES.has(name)) continue;
  if (!workflowNames.includes(name)) {
    failures.push(
      `.agents/skills/${name}/SKILL.md has no matching .agent-workflows/${name}.md`,
    );
  }
}

// 4. Legacy repository Codex skills must not return and create duplicate registrations.
if (files.some((file) => file.startsWith('.codex/skills/'))) {
  failures.push('legacy .codex/skills files found; repository skills belong in .agents/skills');
}

// Ensure the architecture document itself remains committed/discoverable.
if (!fileSet.has('docs/AGENT_WORKFLOWS.md')) {
  failures.push('missing docs/AGENT_WORKFLOWS.md');
}

if (failures.length > 0) {
  console.error(`\nShared-instructions check failed (${failures.length}):\n`);
  for (const failure of failures) console.error(`  - ${failure}`);
  console.error('\nSee docs/AGENT_WORKFLOWS.md for the shared-instruction contract.\n');
  process.exit(1);
}

console.log(
  `Shared instructions OK: ${agentsFiles.length} AGENTS.md/CLAUDE.md pair(s), ` +
    `${workflowNames.length} Claude/Codex workflow pair(s), ${WORKFLOW_ALIASES.size} alias(es), ` +
    `${CLAUDE_ONLY_EXCEPTIONS.size} documented tool-specific exception(s).`,
);
reportChainHeadroom();
