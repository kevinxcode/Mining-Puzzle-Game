/**
 * Text codes for sharing data offline through chat apps:
 * `<PREFIX><base64url(JSON)>.<fnv1a checksum>`. Tolerates line wrapping and
 * text around the code. Hermes has btoa/atob but no Buffer.
 */

function toBase64Url(text: string): string {
  const binary = unescape(encodeURIComponent(text));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(data: string): string {
  const b64 = data.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  return decodeURIComponent(escape(atob(padded)));
}

/** FNV-1a 32-bit — detects typos and truncation, not a security measure. */
export function checksum(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

export function encodeShareCode(prefix: string, payload: unknown): string {
  const body = toBase64Url(JSON.stringify(payload));
  return `${prefix}${body}.${checksum(body)}`;
}

export type ShareDecode = { ok: true; data: unknown } | { ok: false; reason: 'missing' | 'checksum' | 'unreadable' };

/** `prefix` must end with "." and contain only [A-Za-z0-9]. */
export function decodeShareCode(prefix: string, text: string): ShareDecode {
  const escaped = prefix.replace(/\./g, '\\.');
  const match = text.replace(/\s+/g, '').match(new RegExp(`${escaped}([A-Za-z0-9_-]+)\\.([0-9a-f]{8})`));
  if (!match) return { ok: false, reason: 'missing' };
  const [, body, sum] = match;
  if (checksum(body) !== sum) return { ok: false, reason: 'checksum' };
  try {
    return { ok: true, data: JSON.parse(fromBase64Url(body)) as unknown };
  } catch {
    return { ok: false, reason: 'unreadable' };
  }
}
