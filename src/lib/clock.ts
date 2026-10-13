// Clock offset between this device and the database server.
//
// Events are timed by events.started_at and ends_at, server timestamps, so a device whose own clock
// drifts would open or close an event early or late. Measuring the offset once removes that: the TV
// and every phone then agree on when an event starts and ends, whatever their clocks say.

/**
 * Offset to add to a local timestamp to get server time, using the round-trip midpoint as the
 * best estimate of when the server read its clock. Assumes a roughly symmetric round trip.
 */
export function measureOffset(serverMs: number, sentAt: number, receivedAt: number): number {
  return serverMs - (sentAt + receivedAt) / 2
}

/** Current server time as this device best understands it. */
export function serverTime(offset: number, localNow: number = Date.now()): number {
  return localNow + offset
}

/**
 * A wild offset means a broken measurement (a suspended tab mid-flight, a proxy holding the
 * request) rather than a genuinely wrong clock. Ignore those and stay on the local clock.
 */
export const MAX_PLAUSIBLE_OFFSET_MS = 60 * 60 * 1000

export function usableOffset(offset: number): number {
  return Number.isFinite(offset) && Math.abs(offset) < MAX_PLAUSIBLE_OFFSET_MS ? offset : 0
}
