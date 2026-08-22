// Configuration: where the deployment is, which browser to use, where the CLI keeps its files.
//
// Everything is an environment variable or a default - a CLI that a coding agent drives must be
// configurable without a prompt. NOACG_URL names the NoaCG deployment to drive (its /bridge page)
// and, later, to save into; it defaults to the hosted studio and takes a self-host or a local
// dev server just as well.

import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);

/** The deployment's origin, trailing slash stripped. */
export function noacgUrl(): string {
  const raw = process.env.NOACG_URL?.trim() || 'https://noacg.studio';
  return raw.replace(/\/+$/, '');
}

/** A Chromium executable to use instead of the system Chrome/Edge channel, when set. */
export function browserExecutable(): string | undefined {
  const raw = process.env.NOACG_BROWSER?.trim();
  return raw || undefined;
}

/**
 * The per-user config directory - where a later `noacg login` keeps its scoped key. Per OS
 * convention: %APPDATA%\noacg, ~/Library/Application Support/noacg, $XDG_CONFIG_HOME/noacg.
 */
export function configDir(): string {
  if (process.platform === 'win32') {
    return path.join(process.env.APPDATA || path.join(homedir(), 'AppData', 'Roaming'), 'noacg');
  }
  if (process.platform === 'darwin') {
    return path.join(homedir(), 'Library', 'Application Support', 'noacg');
  }
  return path.join(process.env.XDG_CONFIG_HOME || path.join(homedir(), '.config'), 'noacg');
}

/** The CLI's own version, read from its package.json (dist/ sits beside it). */
export function cliVersion(): string {
  try {
    const pkg = require('../package.json') as { version?: string };
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

/** The bridge protocol versions this CLI speaks (src/bridge/bridgeApi.ts BRIDGE_V). */
export const SUPPORTED_BRIDGE_V: readonly number[] = [1];
