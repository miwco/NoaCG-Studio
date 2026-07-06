// A UUID generator that ALWAYS returns a valid RFC-4122 v4 string — including in non-secure
// contexts where crypto.randomUUID is undefined (plain-HTTP LAN hosts, embedded engines like
// CasparCG's CEF, older browsers). Record ids must be real UUIDs because the cloud `documents.id`
// column is a uuid PK (Era 5.2); a non-UUID id would be rejected by Postgres and poison sync.

export function uuid(): string {
  const c = typeof crypto !== 'undefined' ? crypto : undefined;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();

  // Fallback: build a v4 UUID from 16 random bytes (getRandomValues is available even in
  // non-secure contexts; Math.random is the last resort so an id is always produced).
  const b = new Uint8Array(16);
  if (c && typeof c.getRandomValues === 'function') c.getRandomValues(b);
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  b[6] = (b[6] & 0x0f) | 0x40; // version 4
  b[8] = (b[8] & 0x3f) | 0x80; // variant 10xx
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0'));
  return `${h[0]}${h[1]}${h[2]}${h[3]}-${h[4]}${h[5]}-${h[6]}${h[7]}-${h[8]}${h[9]}-${h[10]}${h[11]}${h[12]}${h[13]}${h[14]}${h[15]}`;
}
