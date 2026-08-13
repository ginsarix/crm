// How often the client heartbeat fires, and how many seconds of activity
// each accepted heartbeat credits server-side. Keep these in sync — the
// client relies on this value for its interval, the server for its credit.
export const HEARTBEAT_INTERVAL_SECONDS = 30;

// How long without mouse/keyboard/scroll input before a tab is considered idle
// and stops sending heartbeats.
export const IDLE_TIMEOUT_SECONDS = 60;
