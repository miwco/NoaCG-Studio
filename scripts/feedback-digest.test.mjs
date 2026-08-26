// What the digest must never get wrong, asserted rather than trusted.
//
// Three properties matter more than the rest, and each has a test below that fails loudly:
//   1. The JOB LOG cannot carry a person's words. This repository is public.
//   2. The read path is a GET, with the service key in headers and never in a URL.
//   3. The message that reaches SMTP is well-formed: dot-stuffed, CRLF, no line over the
//      protocol limit, and a Subject that survives a non-ASCII alphabet.
//
// No network, no secrets, no database. `fetchRows` takes an injected fetch and `sendMail` is not
// exercised here at all - a socket is not a unit test.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_RECIPIENT,
  DEFAULT_WINDOW_HOURS,
  FIXTURE_ROWS,
  ROW_LIMIT,
  buildMessage,
  dotStuff,
  encodeHeaderValue,
  fetchRows,
  logLine,
  main,
  readSecrets,
  renderDigest,
  sortForInbox,
  subjectFor,
  summarize,
  wrapLongLines,
} from './feedback-digest.mjs';

const WINDOW = {
  since: '2026-08-25T18:00:00.000Z',
  until: '2026-08-26T20:00:00.000Z',
  windowHours: 26,
};

function rowWith(overrides = {}) {
  return {
    id: 'row',
    created_at: '2026-08-26T10:00:00.000Z',
    kind: 'beta',
    sentiment: 'negative',
    reasons: [],
    message: '',
    area: null,
    tier: null,
    model: null,
    variant_id: null,
    intent_kind: null,
    status: 'new',
    ...overrides,
  };
}

// -- 1. nothing a person wrote may reach a public log ---------------------------------------

test('the log line carries counts and never the message', () => {
  const secret = 'THE-EXACT-WORDS-SOMEBODY-TYPED';
  const rows = [rowWith({ message: secret }), rowWith({ sentiment: 'positive' })];
  const line = logLine(summarize(rows));
  assert.ok(!line.includes(secret), 'the log line must not contain feedback text');
  assert.match(line, /2 row\(s\), 1 negative, 1 positive, 1 with a written note/);
});

test('the summary object has no field that could hold free text', () => {
  const summary = summarize([rowWith({ message: 'private' })]);
  assert.ok(!JSON.stringify(summary).includes('private'));
});

test('the subject counts and never quotes', () => {
  assert.equal(subjectFor(summarize([])), 'NoaCG feedback: nothing new');
  assert.equal(subjectFor(summarize([rowWith({ message: 'quotable' })])), 'NoaCG feedback: 1 note, 1 negative');
  assert.equal(
    subjectFor(summarize([rowWith(), rowWith({ sentiment: 'positive' })])),
    'NoaCG feedback: 2 notes, 1 negative',
  );
});

test('dry run renders the fixtures and reaches no network', async () => {
  const printed = [];
  const log = console.log;
  console.log = (...parts) => printed.push(parts.join(' '));
  try {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = () => {
      throw new Error('dry run must not fetch');
    };
    try {
      const code = await main(['--dry-run'], {});
      assert.equal(code, 0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  } finally {
    console.log = log;
  }
  const output = printed.join('\n');
  assert.match(output, /DRY RUN/);
  assert.ok(output.includes(FIXTURE_ROWS[0].message), 'the fixture body is what dry run shows');
});

// -- 2. configuration, and staying neutral without it ---------------------------------------

test('a missing secret is reported, not thrown', () => {
  const secrets = readSecrets({});
  assert.deepEqual(secrets.missing, [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'FEEDBACK_DIGEST_SMTP_USER',
    'FEEDBACK_DIGEST_SMTP_PASS',
  ]);
  assert.equal(secrets.to, DEFAULT_RECIPIENT);
  assert.equal(secrets.windowHours, DEFAULT_WINDOW_HOURS);
});

test('an unconfigured run exits neutral and sends nothing', async () => {
  const printed = [];
  const log = console.log;
  console.log = (...parts) => printed.push(parts.join(' '));
  try {
    const code = await main([], {});
    assert.equal(code, 0, 'a missing secret must never fail the workflow');
  } finally {
    console.log = log;
  }
  assert.match(printed.join('\n'), /::notice title=Feedback digest is inert::/);
});

test('a trailing slash on the project URL never doubles', () => {
  const secrets = readSecrets({ SUPABASE_URL: 'https://x.supabase.co/', NOACG_APP_URL: 'https://noacg.studio/' });
  assert.equal(secrets.url, 'https://x.supabase.co');
  assert.equal(secrets.appUrl, 'https://noacg.studio');
});

test('a nonsense window falls back to the default rather than reading everything', () => {
  assert.equal(readSecrets({ FEEDBACK_DIGEST_WINDOW_HOURS: 'nightly' }).windowHours, DEFAULT_WINDOW_HOURS);
  assert.equal(readSecrets({ FEEDBACK_DIGEST_WINDOW_HOURS: '-4' }).windowHours, DEFAULT_WINDOW_HOURS);
  assert.equal(readSecrets({ FEEDBACK_DIGEST_WINDOW_HOURS: '48' }).windowHours, 48);
});

// -- 3. the read is a read ------------------------------------------------------------------

test('fetchRows issues a GET with the key in headers and a bounded window', async () => {
  let seen = null;
  const rows = await fetchRows({
    url: 'https://x.supabase.co',
    key: 'service-key',
    since: WINDOW.since,
    fetchImpl: async (target, init) => {
      seen = { target, init };
      return { ok: true, json: async () => [rowWith()] };
    },
  });
  assert.equal(rows.length, 1);
  assert.equal(seen.init.method, 'GET');
  assert.equal(seen.init.headers.apikey, 'service-key');
  assert.equal(seen.init.headers.authorization, 'Bearer service-key');
  const url = new URL(seen.target);
  assert.equal(url.pathname, '/rest/v1/user_feedback');
  assert.equal(url.searchParams.get('created_at'), `gte.${WINDOW.since}`);
  assert.equal(url.searchParams.get('limit'), String(ROW_LIMIT));
  assert.ok(!seen.target.includes('service-key'), 'the key must never travel in the URL');
  assert.ok(!url.searchParams.get('select').includes('user_id'), 'the digest does not read who');
});

test('a failed read throws rather than reporting an empty day', async () => {
  await assert.rejects(
    fetchRows({
      url: 'https://x.supabase.co',
      key: 'k',
      since: WINDOW.since,
      fetchImpl: async () => ({ ok: false, status: 401, statusText: 'Unauthorized', text: async () => 'no' }),
    }),
    /Supabase read failed: 401/,
  );
});

// -- 4. what the digest says ----------------------------------------------------------------

test('negative comes before positive, newest first within each', () => {
  const rows = [
    rowWith({ id: 'p-old', sentiment: 'positive', created_at: '2026-08-26T01:00:00.000Z' }),
    rowWith({ id: 'n-old', created_at: '2026-08-26T02:00:00.000Z' }),
    rowWith({ id: 'p-new', sentiment: 'positive', created_at: '2026-08-26T09:00:00.000Z' }),
    rowWith({ id: 'n-new', created_at: '2026-08-26T08:00:00.000Z' }),
  ];
  assert.deepEqual(sortForInbox(rows).map((row) => row.id), ['n-new', 'n-old', 'p-new', 'p-old']);
});

test('an empty window renders a digest that says so', () => {
  const digest = renderDigest({ rows: [], ...WINDOW });
  assert.equal(digest.subject, 'NoaCG feedback: nothing new');
  assert.match(digest.text, /No feedback arrived in this window\./);
  assert.match(digest.text, /last 26 hours/);
});

test('a full page says there may be more rather than showing a truncated day as complete', () => {
  const rows = Array.from({ length: ROW_LIMIT }, (unused, index) =>
    rowWith({ id: `row-${index}` }),
  );
  assert.match(renderDigest({ rows, ...WINDOW }).text, /hit its 200-row limit/);
});

test('the digest carries the note, the context and the inbox link', () => {
  const digest = renderDigest({
    rows: [rowWith({ message: 'the export folder was named twice', area: 'export', reasons: ['export-problem'] })],
    ...WINDOW,
    appUrl: 'https://noacg.studio',
  });
  assert.match(digest.text, /the export folder was named twice/);
  assert.match(digest.text, /area export/);
  assert.match(digest.text, /reasons: export-problem/);
  assert.match(digest.text, /https:\/\/noacg\.studio\/admin/);
});

// -- 5. the message on the wire -------------------------------------------------------------

test('a line beginning with a dot is stuffed so it cannot end DATA', () => {
  assert.equal(dotStuff('.hidden\nplain'), '..hidden\r\nplain');
});

test('a non-ASCII subject is encoded rather than sent raw', () => {
  assert.equal(encodeHeaderValue('plain ascii'), 'plain ascii');
  const encoded = encodeHeaderValue('yhteenveto: ääni');
  assert.match(encoded, /^=\?UTF-8\?B\?/);
  assert.equal(
    Buffer.from(encoded.slice('=?UTF-8?B?'.length, -2), 'base64').toString('utf8'),
    'yhteenveto: ääni',
  );
});

test('no line survives longer than SMTP allows', () => {
  const paragraph = 'word '.repeat(600).trim();
  for (const line of wrapLongLines(paragraph).split('\n')) {
    assert.ok(Buffer.byteLength(line, 'utf8') <= 900, 'a wrapped line must fit the protocol limit');
  }
  assert.equal(wrapLongLines(paragraph).replace(/\n/g, ' '), paragraph);
});

test('an unbroken run of characters is cut hard rather than left over-long', () => {
  const wrapped = wrapLongLines('x'.repeat(2000));
  for (const line of wrapped.split('\n')) {
    assert.ok(line.length <= 900);
  }
  assert.equal(wrapped.replace(/\n/g, ''), 'x'.repeat(2000));
});

test('the built message is CRLF, headed, and separated from its body', () => {
  const raw = buildMessage({
    from: 'sender@example.com',
    to: DEFAULT_RECIPIENT,
    subject: 'NoaCG feedback: 1 note, 1 negative',
    text: 'a line\n.a stuffed line\n',
    date: 'Wed, 26 Aug 2026 20:00:00 +0000',
    messageId: 'abc@noacg.studio',
  });
  assert.ok(raw.startsWith('From: NoaCG feedback <sender@example.com>\r\n'));
  assert.match(raw, /\r\nTo: <contact\.noacg@gmail\.com>\r\n/);
  assert.match(raw, /\r\nContent-Type: text\/plain; charset=utf-8\r\n/);
  assert.match(raw, /\r\nAuto-Submitted: auto-generated\r\n\r\n/);
  assert.match(raw, /\r\n\.\.a stuffed line/);
  assert.ok(!/\n(?!\r)/.test(raw.replace(/\r\n/g, '')), 'no bare newline may remain');
});
