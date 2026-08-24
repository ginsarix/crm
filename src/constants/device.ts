// Cookie the proxy mints to identify a browser/device across sessions and
// IPs — see src/proxy.ts. HttpOnly so client JS can't read or forge it.
export const DEVICE_UUID_COOKIE = 'device_uuid';

// Header the proxy forwards on every matched request (whether the value
// came from an existing cookie or one just minted) so downstream server
// code never needs to parse the raw Cookie header itself.
export const DEVICE_UUID_HEADER = 'x-device-uuid';

// ~2 years.
export const DEVICE_UUID_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365 * 2;
