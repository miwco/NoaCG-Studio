// Put a fresh eval bearer token into this checkout's .env.bench.local, replacing any previous
// one.
//
// scripts/ai-bench-preflight.mjs answers its "is there an eval identity?" question from the
// ENV FILE, not from process.env, so a token exported only in the shell leaves the free
// preflight failing for a reason that is not true. The token is short-lived (about an hour) and
// .env.bench.local is gitignored - the plain .env.bench beside it is COMMITTED and must never
// hold a secret.
//
//   node scripts/lite-eval-stamp.mjs              mint for the default account and stamp it
//   node scripts/lite-eval-stamp.mjs [email]      mint for another account
//   node scripts/lite-eval-stamp.mjs <token-file> stamp a token already on disk
//   node scripts/lite-eval-stamp.mjs -            stamp a token piped on stdin
//
// The default path never puts the token on a command line or on disk of its own.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { benchEnvPath } from './lite-eval-paths.mjs';
import { defaultEvalEmail, mintToken } from './lite-eval-token.mjs';

const KEY = 'NOACG_LITE_EVAL_BEARER_TOKEN';
const arg = process.argv[2];

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

let token = '';
let origin = '';
if (arg === '-') {
  token = (await readStdin()).trim();
  origin = 'stdin';
} else if (arg && !arg.includes('@')) {
  if (!existsSync(arg)) { console.error(`${arg} does not exist.`); process.exit(1); }
  token = readFileSync(arg, 'utf8').trim();
  origin = arg;
} else {
  const email = (arg ?? defaultEvalEmail()).trim();
  try {
    const minted = await mintToken(email);
    token = minted.token;
    origin = `a freshly minted session for ${minted.email}`;
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

if (!token) { console.error('No token to stamp.'); process.exit(1); }

const target = benchEnvPath();
if (!existsSync(target)) {
  // Composing the bench configuration first is the intended order, but a token file with
  // nothing else in it is still a usable state - the round runner only reads this key.
  console.warn(`${target} does not exist yet - creating it with the token alone.`);
  console.warn('Run `node scripts/bench-env.mjs --profile=lite` to write the rest of the configuration.');
}
const kept = existsSync(target)
  ? readFileSync(target, 'utf8')
      .replace(/^\uFEFF/, '')
      .split(/\r?\n/)
      .filter((line) => !line.startsWith(`${KEY}=`))
  : [];
// A trailing blank line from the previous write would otherwise push the key down the file on
// every stamp; dropping the tail keeps the file stable across repeated runs.
while (kept.length && kept[kept.length - 1].trim() === '') kept.pop();

writeFileSync(target, `${[...kept, `${KEY}=${token}`, ''].join('\n')}`, 'utf8');
console.log(`stamped a ${token.length}-character token from ${origin} into ${target}`);
