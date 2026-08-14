/**
 * Normalizes a session/request IP address to a non-empty sentinel value.
 *
 * better-auth's `Session.ipAddress` is set via `getIp(headers, options) || ""`
 * — it is never `null`, it's an empty string when the IP can't be resolved
 * (e.g. no trusted proxies configured and `x-forwarded-for` has more than one
 * hop, or the header is absent). A plain `?? 'unknown'` fallback does NOT
 * catch `""`, so callers must use this helper instead.
 */
export function normalizeIp(ip: string | null | undefined): string {
  return ip?.trim() || 'unknown';
}
