export type RecoveryLinkKind = 'token' | 'error' | 'none';

export interface RecoveryLink {
  kind: RecoveryLinkKind;
  /** The provider's own words when kind is 'error' (already URL-decoded), else null. */
  message: string | null;
}

/** Is this page load the recovery ROUTE? `<app-url>?recovery=1`. */
export function isRecoveryRequestUrl(params: URLSearchParams): boolean {
  return params.get('recovery') === '1';
}

function readArrivingRecoveryLink(): RecoveryLink {
  if (typeof window === 'undefined') return { kind: 'none', message: null };

  // Supabase currently sends implicit-flow values in the fragment. Read the query as well so a
  // provider-side flow change cannot silently turn a valid or expired link into an unknown one.
  const sources = [
    new URLSearchParams(window.location.hash.replace(/^#/, '')),
    new URLSearchParams(window.location.search),
  ];

  if (sources.some((params) => params.has('error') || params.has('error_code'))) {
    const firstValue = (name: string): string | null => {
      for (const params of sources) {
        const value = params.get(name);
        if (value !== null) return value;
      }
      return null;
    };
    return {
      kind: 'error',
      message: firstValue('error_description') ?? firstValue('error_code') ?? firstValue('error'),
    };
  }

  if (sources.some((params) => params.has('access_token') && params.get('type') === 'recovery')) {
    return { kind: 'token', message: null };
  }

  return { kind: 'none', message: null };
}

// Capture the arriving URL before Supabase constructs its client and removes the auth fragment.
// Every reader gets this same object, even after the browser URL has been cleaned up.
const ARRIVING_RECOVERY_LINK = readArrivingRecoveryLink();

/** What the URL carried when this document loaded. Same answer every call. */
export function arrivingRecoveryLink(): RecoveryLink {
  return ARRIVING_RECOVERY_LINK;
}
