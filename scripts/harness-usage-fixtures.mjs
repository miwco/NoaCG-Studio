// Fixture transcript LINES for the harness usage meter's parsers.
//
// These are hand-written copies of the real shapes on disk, trimmed to the fields the meter reads
// and edited to hold the cases a real transcript only produces occasionally: a half-written last
// line, an assistant record with no usage, a Codex session that never got a rate_limits payload,
// and Claude Code's duplicate records for one request. Fixtures rather than real transcripts,
// because a transcript is somebody's actual session and this repository is public.

/**
 * A Codex rollout: two turns, cumulative counter advancing, a rate_limits snapshot on each
 * token_count, one malformed line and one token_count with a null `info` (the rate-limit-only
 * heartbeat Codex emits when nothing was spent).
 */
export const CODEX_ROLLOUT = [
  '{"timestamp":"2026-08-30T10:00:00.000Z","type":"session_meta","payload":{"session_id":"01a04e5d-d6db-73c0-8c39-441a50539c50","cwd":"C:\\\\claude\\\\NoaCG-Studio","originator":"Claude Code"}}',
  '{"timestamp":"2026-08-30T10:00:05.000Z","type":"event_msg","payload":{"type":"task_started"}}',
  '{"timestamp":"2026-08-30T10:01:00.000Z","type":"event_msg","payload":{"type":"token_count","info":{"total_token_usage":{"input_tokens":1000,"cached_input_tokens":400,"cache_write_input_tokens":0,"output_tokens":50,"reasoning_output_tokens":10,"total_tokens":1050},"last_token_usage":{"input_tokens":1000,"cached_input_tokens":400,"cache_write_input_tokens":0,"output_tokens":50,"reasoning_output_tokens":10,"total_tokens":1050}},"rate_limits":{"primary":{"used_percent":7.0,"window_minutes":300,"resets_at":1788038142},"secondary":{"used_percent":39.0,"window_minutes":10080,"resets_at":1788458450},"plan_type":"plus"}}}',
  '{"timestamp":"2026-08-30T11:00:00.000Z","type":"event_msg","payload":{"type":"token_count","info":null,"rate_limits":{"primary":{"used_percent":8.0,"window_minutes":300,"resets_at":1788038142},"secondary":{"used_percent":39.0,"window_minutes":10080,"resets_at":1788458450},"plan_type":"plus"}}}',
  '{"timestamp":"2026-08-30T12:00:00.000Z","type":"event_msg","payload":{"type":"token_count","info":{"total_token_usage":{"input_tokens":3000,"cached_input_tokens":1400,"cache_write_input_tokens":0,"output_tokens":120,"reasoning_output_tokens":30,"total_tokens":3120},"last_token_usage":{"input_tokens":2000,"cached_input_tokens":1000,"cache_write_input_tokens":0,"output_tokens":70,"reasoning_output_tokens":20,"total_tokens":2070}},"rate_limits":{"primary":{"used_percent":11.0,"window_minutes":300,"resets_at":1788040000},"secondary":{"used_percent":40.0,"window_minutes":10080,"resets_at":1788458450},"plan_type":"plus"}}}',
  '{"timestamp":"2026-08-30T12:00:01.000Z","type":"event_msg","payload":{"type":"token_c',
].join('\n');

/** A Codex session that never reached the model: no token_count at all, so no rate_limits either. */
export const CODEX_ROLLOUT_NO_RATE_LIMITS = [
  '{"timestamp":"2026-08-30T09:00:00.000Z","type":"session_meta","payload":{"session_id":"01a04e00-0000-7000-8000-000000000001","cwd":"C:\\\\claude\\\\NoaCG-Studio"}}',
  '{"timestamp":"2026-08-30T09:00:01.000Z","type":"event_msg","payload":{"type":"task_started"}}',
  '{"timestamp":"2026-08-30T09:00:02.000Z","type":"event_msg","payload":{"type":"error","message":"broker handshake failed"}}',
].join('\n');

/**
 * A Claude Code transcript. The FIRST request appears three times, byte-identical - which is what
 * the real files do and what makes an undeduped sum roughly double. There is also an assistant
 * record with no `usage`, a user record, a sidechain (subagent) record, a blank line and a
 * truncated final line.
 */
export const CLAUDE_TRANSCRIPT = [
  '{"type":"user","timestamp":"2026-08-30T10:00:00.000Z","sessionId":"s1","cwd":"C:\\\\claude\\\\NoaCG-Studio","gitBranch":"claude/s-harness-usage","message":{"role":"user","content":"go"}}',
  '{"type":"assistant","requestId":"req_A","timestamp":"2026-08-30T10:00:10.000Z","sessionId":"s1","cwd":"C:\\\\claude\\\\NoaCG-Studio","gitBranch":"claude/s-harness-usage","isSidechain":false,"message":{"id":"msg_A","model":"claude-opus-5","usage":{"input_tokens":2,"cache_creation_input_tokens":100,"cache_read_input_tokens":900,"output_tokens":30}}}',
  '{"type":"assistant","requestId":"req_A","timestamp":"2026-08-30T10:00:10.000Z","sessionId":"s1","cwd":"C:\\\\claude\\\\NoaCG-Studio","gitBranch":"claude/s-harness-usage","isSidechain":false,"message":{"id":"msg_A","model":"claude-opus-5","usage":{"input_tokens":2,"cache_creation_input_tokens":100,"cache_read_input_tokens":900,"output_tokens":30}}}',
  '{"type":"assistant","requestId":"req_A","timestamp":"2026-08-30T10:00:10.000Z","sessionId":"s1","cwd":"C:\\\\claude\\\\NoaCG-Studio","gitBranch":"claude/s-harness-usage","isSidechain":false,"message":{"id":"msg_A","model":"claude-opus-5","usage":{"input_tokens":2,"cache_creation_input_tokens":100,"cache_read_input_tokens":900,"output_tokens":30}}}',
  '',
  '{"type":"assistant","requestId":"req_B","timestamp":"2026-08-30T10:05:00.000Z","sessionId":"s1","cwd":"C:\\\\claude\\\\NoaCG-Studio","gitBranch":"claude/s-harness-usage","message":{"id":"msg_B","model":"claude-opus-5","content":"no usage on this one"}}',
  '{"type":"assistant","requestId":"req_C","timestamp":"2026-08-30T11:00:00.000Z","sessionId":"s1","cwd":"C:\\\\claude\\\\NoaCG-Studio","gitBranch":"claude/s-harness-usage","isSidechain":true,"message":{"id":"msg_C","model":"claude-fable-5","usage":{"input_tokens":5,"cache_creation_input_tokens":10,"cache_read_input_tokens":40,"output_tokens":7}}}',
  '{"type":"assistant","requestId":"req_D","timestamp":"2026-08-30T13:00:00.000Z","sessionId":"s1","cwd":"C:\\\\claude\\\\NoaCG-Studio","gitBranch":"claude/s-harness-usage","message":{"id":"msg_D","model":"claude-opus-5","usage":{"input_tokens":1,"cache_creation_input_tokens":2,"cache_read_input_tokens":3,"output_tokens":4}}}',
  '{"type":"assistant","requestId":"req_E","timestamp":"2026-08-30T13:05:00.000Z","sessionId":"s1","message":{"id":"msg_E","usage":{"input_tokens":1,',
].join('\n');

/** The same request as CLAUDE_TRANSCRIPT's req_A, copied forward into a resumed session's file. */
export const CLAUDE_TRANSCRIPT_RESUMED = [
  '{"type":"assistant","requestId":"req_A","timestamp":"2026-08-30T10:00:10.000Z","sessionId":"s2","cwd":"C:\\\\claude\\\\other","gitBranch":"main","message":{"id":"msg_A","model":"claude-opus-5","usage":{"input_tokens":2,"cache_creation_input_tokens":100,"cache_read_input_tokens":900,"output_tokens":30}}}',
  '{"type":"assistant","requestId":"req_F","timestamp":"2026-08-30T14:00:00.000Z","sessionId":"s2","cwd":"C:\\\\claude\\\\other","gitBranch":"main","message":{"id":"msg_F","model":"claude-haiku-4-5-20251001","usage":{"input_tokens":9,"cache_creation_input_tokens":0,"cache_read_input_tokens":1,"output_tokens":2}}}',
].join('\n');

/**
 * An Antigravity ledger, as `scripts/agy-run.mjs` writes it. Unlike the two transcripts above,
 * this is a file THIS REPO wrote - so the cases it has to hold are the ones its own writer can
 * produce: a call that FAILED (every tool call auto-denied, empty response, ~18 K input tokens
 * spent anyway - dropping it would flatter the harness), a call that pinned no model (its tokens
 * are real and its attribution is not), a line from a FUTURE ledger version, a line with no
 * `usage` object at all, and a half-written last line from a call still in flight.
 *
 * The two successful pro-high numbers are the real measurements from the 2026-08-30 trial, which
 * is also where the shape of the trap comes from: cache reads are ~7x everything else combined.
 */
export const AGY_LEDGER = [
  '{"v":1,"at":"2026-08-30T10:00:00.000Z","harness":"antigravity","model":"gemini-3.1-pro-high","label":"trivial","ok":true,"durationSeconds":2.2,"turns":1,"usage":{"input":17800,"output":31,"thinking":29,"cacheRead":0}}',
  '{"v":1,"at":"2026-08-30T10:30:00.000Z","harness":"antigravity","model":"gemini-3.1-pro-high","label":"comprehension","ok":true,"durationSeconds":99,"turns":1,"usage":{"input":160000,"output":10600,"thinking":7100,"cacheRead":1150000}}',
  '{"v":1,"at":"2026-08-30T11:00:00.000Z","harness":"antigravity","model":"gemini-3.1-flash","label":"denied","ok":false,"failure":"agy returned an EMPTY response.","durationSeconds":3,"turns":1,"usage":{"input":18000,"output":0,"thinking":0,"cacheRead":0}}',
  '{"v":1,"at":"2026-08-30T11:30:00.000Z","harness":"antigravity","model":null,"ok":true,"durationSeconds":5,"turns":1,"usage":{"input":900,"output":10,"thinking":0,"cacheRead":0}}',
  '{"v":1,"at":"2026-08-30T12:00:00.000Z","harness":"antigravity","model":"gemini-3.1-flash","ok":true,"durationSeconds":1}',
  '{"v":99,"at":"2026-08-30T12:30:00.000Z","harness":"antigravity","model":"gemini-9","ok":true,"durationSeconds":1,"usage":{"input":999999,"output":1,"thinking":1,"cacheRead":1}}',
  '{"v":1,"at":"2026-08-30T13:00:00.000Z","harness":"antigravity","model":"gemini-3.1-pro-high","ok":true,"usage":{"input":5',
].join('\n');
