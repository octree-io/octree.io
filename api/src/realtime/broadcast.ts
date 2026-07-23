import type { RealtimeServer } from "./types.js";

// REST routes (e.g. submissions) need to emit into a room's chat outside the
// socket handshake — this is the bridge to the single `io` instance created
// in realtime/index.ts.
let ioRef: RealtimeServer | null = null;

export function setIo(io: RealtimeServer): void {
  ioRef = io;
}

export function getIo(): RealtimeServer | null {
  return ioRef;
}
