#!/usr/bin/env node
// THE RELAY - a durable inbox for a report that reached the wrong session.
//
//   node scripts/relay.mjs write --branch claude/k-thing --from review "the numbers are 2x too high"
//   node scripts/relay.mjs read  --branch claude/k-thing     # prints it, marks it read
//   node scripts/relay.mjs pending --branch claude/k-thing   # exit 0 if unread mail waits, 1 if not
//   node scripts/relay.mjs list                              # every branch with unread mail
//
// WHY. A wave session never receives its own subagents' completion notifications - they route to
// the orchestrator (launch.md). The contract's only named channel to hand one back was
// SendMessage, which is disabled here, so on 2026-09-04 nine stray reports had nowhere to go: row
// K queued a proposal WITHOUT its own review legs (which had found its numbers double-counted), and
// row J landed WITHOUT its Codex review of a guard-gap risk. A prose rule with no working channel
// is the failure the core's own "a recurring failure becomes a mechanism" clause names.
//
// THE MECHANISM. The orchestrator (or any session holding a stray report) `write`s it to
// `<git-common-dir>/noacg-jobs/relay/<branch>.md`, beside the job store and under its lifetime.
// The QUEUE step `read`s it, which marks it read. And `jobs.mjs add-merge` refuses to queue a
// branch whose relay still holds UNREAD mail (the pin is what "I am finished" means, so finishing
// with an unread review is exactly the thing to stop). Reading is the acknowledgement; there is no
// way to queue past unread mail except to read it, which is the whole point.
//
// Append-only within a branch's file: each block is one report, and reading flips every UNREAD
// marker to a read stamp rather than deleting anything, so the record of what was relayed survives.

import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { jobsDir, ensureJobsDir } from './jobs-store.mjs';

export const RELAY_DIR = 'relay';
export const UNREAD = 'UNREAD';

/** A branch name is a path with slashes; the relay file flattens them so it is one file. */
export function relayFileName(branch) {
  return `${String(branch).replace(/[\\/]/g, '-')}.md`;
}

export function relayDir(dir) {
  return path.join(dir, RELAY_DIR);
}

export function relayPath(dir, branch) {
  return path.join(relayDir(dir), relayFileName(branch));
}

/** Append one report block, marked UNREAD, to the branch's relay file. */
export function writeRelay(dir, { branch, from = 'a session', text, now = Date.now() }) {
  if (!branch) throw new Error('write needs --branch <name>');
  if (!text || !String(text).trim()) throw new Error('write needs a message (as an argument or on stdin)');
  const folder = relayDir(dir);
  if (!existsSync(folder)) mkdirSync(folder, { recursive: true });
  const stamp = new Date(now).toISOString();
  const block = `## relay ${stamp} from ${from} - ${UNREAD}\n\n${String(text).trim()}\n\n`;
  appendFileSync(relayPath(dir, branch), block, 'utf8');
  return { branch, from, at: stamp };
}

/** The branch's relay text, or null when it has none. */
export function readRelayText(dir, branch) {
  const file = relayPath(dir, branch);
  return existsSync(file) ? readFileSync(file, 'utf8') : null;
}

/** Does the branch have any UNREAD block? Pure over the file text. */
export function hasUnread(text) {
  return typeof text === 'string' && new RegExp(`^## relay .* - ${UNREAD}\\s*$`, 'm').test(text);
}

/** Flip every UNREAD marker to a read stamp, returning the new text (or null if nothing changed). */
export function markRead(text, now = Date.now()) {
  if (!hasUnread(text)) return null;
  const stamp = new Date(now).toISOString();
  return text.replace(new RegExp(`(^## relay .*) - ${UNREAD}(\\s*)$`, 'gm'), `$1 - read ${stamp}$2`);
}

function argValue(argv, name) {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : undefined;
}

async function readStdin() {
  if (process.stdin.isTTY) return '';
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;
  return raw;
}

export async function main(argv = process.argv.slice(2), { now = Date.now() } = {}) {
  const dir = jobsDir();
  if (!dir) {
    process.stderr.write('relay: not inside a git repository.\n');
    return 2;
  }
  const command = argv[0];
  const branch = argValue(argv, '--branch');

  if (command === 'write') {
    ensureJobsDir(dir);
    // The message is the first non-flag argument after the subcommand, or stdin.
    const inline = argv.slice(1).find((token, index) => !token.startsWith('--')
      && argv[index] !== '--branch' && argv[index] !== '--from');
    const text = inline ?? (await readStdin());
    try {
      const record = writeRelay(dir, { branch, from: argValue(argv, '--from') ?? 'a session', text, now });
      process.stdout.write(`relayed to ${record.branch} (from ${record.from}) - the branch's QUEUE step will read it\n`);
      return 0;
    } catch (error) {
      process.stderr.write(`relay: ${error.message}\n`);
      return 2;
    }
  }

  if (command === 'read') {
    if (!branch) { process.stderr.write('relay read needs --branch <name>\n'); return 2; }
    const text = readRelayText(dir, branch);
    if (text === null) { process.stdout.write(`no relay for ${branch}\n`); return 0; }
    process.stdout.write(text.endsWith('\n') ? text : `${text}\n`);
    const updated = markRead(text, now);
    if (updated) writeFileSync(relayPath(dir, branch), updated, 'utf8');
    return 0;
  }

  if (command === 'pending') {
    if (!branch) { process.stderr.write('relay pending needs --branch <name>\n'); return 2; }
    return hasUnread(readRelayText(dir, branch) ?? '') ? 0 : 1;
  }

  if (command === 'list') {
    const folder = relayDir(dir);
    const waiting = existsSync(folder)
      ? readdirSync(folder).filter((file) => file.endsWith('.md') && hasUnread(readFileSync(path.join(folder, file), 'utf8')))
      : [];
    if (waiting.length === 0) process.stdout.write('no unread relays\n');
    else for (const file of waiting) process.stdout.write(`unread: ${file.replace(/\.md$/, '')}\n`);
    return 0;
  }

  process.stdout.write('Usage: node scripts/relay.mjs write --branch <b> [--from <who>] "<message>" | read --branch <b> | pending --branch <b> | list\n');
  return command ? 2 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then((code) => process.exit(code));
}
