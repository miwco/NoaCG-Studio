// `noacg caspar` (docs/CASPARCG_CONNECT.md), against a fake AMCP listener. No network, no
// browser, no CasparCG - so unlike smoke.test.mjs this one really runs in CI, which matters
// because the AMCP reader is the riskiest pure logic in the feature: its response shapes differ
// per command, and a reader that waits for a line that is never coming HANGS a live operator.
// Run `npm run build` first.

import assert from 'node:assert/strict';
import { request as httpRequest } from 'node:http';
import { createServer } from 'node:net';
import { test } from 'node:test';
import {
  amcpSend,
  createAgentServer,
  layerAddress,
  originAllowed,
  playCommand,
  stopCommand,
} from '../dist/commands/caspar.js';

/** A CasparCG that answers exactly one command, however the test asks it to. */
async function fakeCaspar(reply) {
  const seen = [];
  const server = createServer((socket) => {
    let buffer = '';
    socket.on('data', (chunk) => {
      buffer += chunk.toString('latin1');
      let i;
      while ((i = buffer.indexOf('\r\n')) >= 0) {
        const line = buffer.slice(0, i);
        buffer = buffer.slice(i + 2);
        seen.push(line);
        const answer = typeof reply === 'function' ? reply(line, socket) : reply;
        if (typeof answer === 'string') socket.write(answer, 'latin1');
      }
    });
    socket.on('error', () => {});
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { port: server.address().port, seen, close: () => new Promise((r) => server.close(r)) };
}

test('the command builders produce CasparCG addressing, and refuse what cannot go on the wire', () => {
  assert.equal(layerAddress(1, 20), '1-20');
  assert.equal(playCommand(2, 30, 'https://x/output?production=s'), 'PLAY 2-30 [HTML] "https://x/output?production=s"');
  assert.equal(stopCommand(1, 20), 'STOP 1-20');
  // A quote would end the argument early and a newline would end the COMMAND early - the second
  // is command injection into a live playout server, so neither is escaped, both are refused.
  assert.throws(() => playCommand(1, 20, 'https://x/"; STOP 1-20'), /quote or a newline/);
  assert.throws(() => playCommand(1, 20, 'https://x\r\nSTOP 1-20'), /quote or a newline/);
  assert.throws(() => layerAddress(0, 20), /Channel/);
  assert.throws(() => layerAddress(1, -1), /Layer/);
});

test('201 carries one data line - the server version', async () => {
  const caspar = await fakeCaspar('201 VERSION OK\r\n2.4.0 6ff2e3f STABLE\r\n');
  const reply = await amcpSend({ host: '127.0.0.1', port: caspar.port }, 'VERSION');
  assert.equal(reply.code, 201);
  assert.deepEqual(reply.lines, ['2.4.0 6ff2e3f STABLE']);
  assert.deepEqual(caspar.seen, ['VERSION']);
  await caspar.close();
});

test('200 carries several lines and ends on a blank one', async () => {
  const caspar = await fakeCaspar('200 INFO OK\r\n1 1080i5000 PLAYING\r\n2 720p5000 STOPPED\r\n\r\n');
  const reply = await amcpSend({ host: '127.0.0.1', port: caspar.port }, 'INFO');
  assert.equal(reply.code, 200);
  assert.deepEqual(reply.lines, ['1 1080i5000 PLAYING', '2 720p5000 STOPPED']);
  await caspar.close();
});

test('202 is a whole answer on its own, and does not wait for a line that never comes', async () => {
  const caspar = await fakeCaspar('202 PLAY OK\r\n');
  const started = Date.now();
  const reply = await amcpSend({ host: '127.0.0.1', port: caspar.port, timeoutMs: 3000 }, 'PLAY 1-20');
  assert.equal(reply.code, 202);
  assert.deepEqual(reply.lines, []);
  // The point of the test: it answered immediately rather than sitting out its timeout.
  assert.ok(Date.now() - started < 1500, `took ${Date.now() - started}ms`);
  await caspar.close();
});

test('a 4xx is reported as itself, so a refusal is never read as a success', async () => {
  const caspar = await fakeCaspar('404 PLAY ERROR\r\n');
  const reply = await amcpSend({ host: '127.0.0.1', port: caspar.port }, 'PLAY 9-9');
  assert.equal(reply.code, 404);
  assert.equal(reply.status, '404 PLAY ERROR');
  await caspar.close();
});

test('400 echoing the refused command is read, and a build that echoes nothing still answers', async () => {
  const withEcho = await fakeCaspar('400 ERROR\r\nNONSENSE\r\n');
  const a = await amcpSend({ host: '127.0.0.1', port: withEcho.port }, 'NONSENSE');
  assert.deepEqual(a.lines, ['NONSENSE']);
  await withEcho.close();

  // The same status with no echo must resolve on the grace timer rather than hang to timeout.
  const bare = await fakeCaspar('400 ERROR\r\n');
  const started = Date.now();
  const b = await amcpSend({ host: '127.0.0.1', port: bare.port, timeoutMs: 5000 }, 'NONSENSE');
  assert.equal(b.code, 400);
  assert.ok(Date.now() - started < 2000, `took ${Date.now() - started}ms`);
  await bare.close();
});

test('a server that closes without answering is an error, not an empty success', async () => {
  const caspar = await fakeCaspar((_line, socket) => {
    socket.end();
    return null;
  });
  await assert.rejects(
    amcpSend({ host: '127.0.0.1', port: caspar.port }, 'VERSION'),
    /closed the connection without answering/,
  );
  await caspar.close();
});

test('nothing listening is refused quickly, with the socket error intact', async () => {
  // Port 1 on loopback: nothing binds it, and the refusal is immediate.
  await assert.rejects(amcpSend({ host: '127.0.0.1', port: 1, timeoutMs: 3000 }, 'VERSION'), /ECONNREFUSED|EACCES/);
});

// ── The agent's own refusals ────────────────────────────────────────────────────────────────

const ORIGINS = ['https://noacg.studio'];

test('the origin allowlist takes the deployment and loopback, and nothing else', () => {
  assert.equal(originAllowed('https://noacg.studio', ORIGINS), true);
  assert.equal(originAllowed('https://noacg.studio/', ORIGINS), true);
  assert.equal(originAllowed('http://localhost:5184', ORIGINS), true);
  assert.equal(originAllowed('http://127.0.0.1:5184', ORIGINS), true);
  assert.equal(originAllowed(undefined, ORIGINS), true); // a terminal, which the token gates
  assert.equal(originAllowed('https://evil.example', ORIGINS), false);
  // The nastiest near-miss: a domain that merely STARTS with the allowed one.
  assert.equal(originAllowed('https://noacg.studio.evil.example', ORIGINS), false);
});

async function withAgent(fn) {
  const server = createAgentServer({ port: 0, token: 'secret-token', origins: ORIGINS }, () => {});
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await fn(base);
  } finally {
    await new Promise((r) => server.close(r));
  }
}

test('the agent answers presence without a token, and nothing else without one', async () => {
  await withAgent(async (base) => {
    const health = await fetch(`${base}/health`, { headers: { Origin: 'https://noacg.studio' } });
    assert.equal(health.status, 200);
    // It says the agent is here and NOTHING about the studio behind it.
    assert.deepEqual(await health.json(), { ok: true, agent: 'noacg-caspar', v: 1 });

    const noToken = await fetch(`${base}/status`, { method: 'POST', headers: { Origin: 'https://noacg.studio' } });
    assert.equal(noToken.status, 401);

    const wrongToken = await fetch(`${base}/status`, {
      method: 'POST',
      headers: { Origin: 'https://noacg.studio', Authorization: 'Bearer nope' },
    });
    assert.equal(wrongToken.status, 401);
  });
});

test('a foreign origin is refused with no CORS headers at all, so a guessed token still reads nothing', async () => {
  await withAgent(async (base) => {
    const res = await fetch(`${base}/status`, {
      method: 'POST',
      headers: { Origin: 'https://evil.example', Authorization: 'Bearer secret-token' },
    });
    assert.equal(res.status, 403);
    assert.equal(res.headers.get('access-control-allow-origin'), null);
  });
});

test('presence answers ANY origin, so "not running" is never said about an agent that is', async () => {
  // A cross-origin refusal is opaque to the page that made it, so an origin-refused /health
  // would read to the studio exactly like nothing listening - and send someone to start an
  // agent they already have running, just for another deployment. Presence is readable;
  // everything behind it still is not.
  await withAgent(async (base) => {
    const health = await fetch(`${base}/health`, { headers: { Origin: 'https://another-noacg.example' } });
    assert.equal(health.status, 200);
    assert.equal(health.headers.get('access-control-allow-origin'), 'https://another-noacg.example');
    // …and it still says nothing about the studio, the token or the playout server.
    assert.deepEqual(await health.json(), { ok: true, agent: 'noacg-caspar', v: 1 });
  });
});

test('a forged Host header is refused, so a name resolving to 127.0.0.1 cannot reach in', async () => {
  await withAgent(async (base) => {
    // `fetch` will not send a forged Host - it is a forbidden header name, so undici drops it
    // silently and the request arrives looking legitimate. The attack this defends against is
    // a page on evil.example whose DNS points at 127.0.0.1, and THAT request carries
    // `Host: evil.example`, so the test has to speak raw HTTP to reproduce it.
    const url = new URL(base);
    const status = await new Promise((resolve, reject) => {
      const req = httpRequest(
        {
          host: '127.0.0.1',
          port: Number(url.port),
          path: '/health',
          method: 'GET',
          headers: { Host: 'rebind.evil.example', Origin: 'https://noacg.studio' },
        },
        (res) => {
          res.resume();
          resolve(res.statusCode);
        },
      );
      req.on('error', reject);
      req.end();
    });
    assert.equal(status, 403);
  });
});

test('the agent forwards a play to AMCP as the one command that is the whole live link', async () => {
  const caspar = await fakeCaspar('202 PLAY OK\r\n');
  await withAgent(async (base) => {
    const res = await fetch(`${base}/play`, {
      method: 'POST',
      headers: {
        Origin: 'https://noacg.studio',
        Authorization: 'Bearer secret-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ host: '127.0.0.1', port: caspar.port, channel: 2, layer: 30, url: 'https://x/output?production=s' }),
    });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.ok, true);
    assert.deepEqual(caspar.seen, ['PLAY 2-30 [HTML] "https://x/output?production=s"']);
  });
  await caspar.close();
});

test('CasparCG being absent is a 502 with the socket error - the agent itself is fine', async () => {
  await withAgent(async (base) => {
    const res = await fetch(`${base}/status`, {
      method: 'POST',
      headers: {
        Origin: 'https://noacg.studio',
        Authorization: 'Bearer secret-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ host: '127.0.0.1', port: 1 }),
    });
    assert.equal(res.status, 502);
    const body = await res.json();
    assert.equal(body.ok, false);
    assert.match(body.error, /ECONNREFUSED|EACCES/);
  });
});
