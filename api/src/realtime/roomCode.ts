import { resolveRoomId } from "../lib/roomSlug.js";
import type { Identity, PeerCodePayload, RealtimeServer, RoomPhase } from "./types.js";

// Live per-room code sharing. Each participant's current editor buffer is kept
// in process memory (like presence) so the room can show everyone's tab. During
// the "solving" phase peers only ever receive a *redacted* copy — the real
// source never leaves the server — so inspect-element can't un-hide a solution.
// The "review" phase reveals the genuine code to everyone.

interface StoredCode {
  identity: Identity;
  lang: string;
  code: string;
}

// roomKey → identityId → latest buffer.
const rooms = new Map<string, Map<string, StoredCode>>();

// roomKey → current phase. Defaults to "solving" (the safe, redacted state) for
// any room we haven't been told about yet.
const phases = new Map<string, RoomPhase>();

// Reject absurd payloads so one client can't pin memory with a giant buffer.
const MAX_CODE = 50_000;

const SCRAMBLE = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/**
 * Produce a decoy with the same silhouette as `code` — identical line count and
 * leading indentation, but every non-whitespace character replaced by a random
 * one. Blurred on the client it reads as "someone's code"; un-blurred (via
 * dev tools) it reveals nothing real. This is what peers see while solving.
 */
export function redact(code: string): string {
  let out = "";
  for (const ch of code) {
    out += /\s/.test(ch) ? ch : SCRAMBLE[(Math.random() * SCRAMBLE.length) | 0];
  }
  return out;
}

// Only practice rooms (which resolve to a numeric id and carry a problem) share
// code; standalone Chat channels don't have editors.
function isCodeRoom(roomKey: string): boolean {
  return resolveRoomId(roomKey) !== null;
}

export function getPhase(roomKey: string): RoomPhase {
  return phases.get(roomKey) ?? "solving";
}

// Called by the round timer whenever a room's phase changes.
export function setPhase(roomKey: string, phase: RoomPhase): void {
  phases.set(roomKey, phase);
}

// Shape one stored buffer for the wire, redacting it unless we're revealing.
function toPayload(entry: StoredCode, reveal: boolean): PeerCodePayload {
  return {
    authorId: entry.identity.id,
    lang: entry.lang,
    code: reveal ? entry.code : redact(entry.code),
    redacted: !reveal,
  };
}

/**
 * Record a participant's latest buffer and return what their peers should see
 * right now (redacted while solving, real in review), or null if the room
 * doesn't share code or the payload is unusable.
 */
export function setCode(
  roomKey: string,
  identity: Identity,
  lang: string,
  code: string,
): PeerCodePayload | null {
  if (!isCodeRoom(roomKey) || typeof code !== "string" || typeof lang !== "string") return null;

  let room = rooms.get(roomKey);
  if (!room) {
    room = new Map();
    rooms.set(roomKey, room);
  }
  const entry: StoredCode = { identity, lang, code: code.slice(0, MAX_CODE) };
  room.set(identity.id, entry);
  return toPayload(entry, getPhase(roomKey) === "review");
}

/**
 * Everyone else's current buffers for a joining client — redacted or real by the
 * room's phase. `exceptId` is the joiner's own identity (they have their code
 * locally and never need a copy back).
 */
export function snapshot(roomKey: string, exceptId: string): PeerCodePayload[] {
  const room = rooms.get(roomKey);
  if (!room) return [];
  const reveal = getPhase(roomKey) === "review";
  const out: PeerCodePayload[] = [];
  for (const entry of room.values()) {
    if (entry.identity.id === exceptId) continue;
    out.push(toPayload(entry, reveal));
  }
  return out;
}

// Push every stored buffer to the whole room as real, un-redacted code. Called
// once when a round flips into its review window.
export function reveal(io: RealtimeServer, roomKey: string): void {
  const room = rooms.get(roomKey);
  if (!room) return;
  for (const entry of room.values()) {
    io.to(roomKey).emit("peer:code", { roomId: roomKey, ...toPayload(entry, true) });
  }
}

// Drop one participant's buffer (on disconnect). Their tab disappears with
// presence, so no explicit removal event is needed.
export function removeCode(roomKey: string, identityId: string): void {
  rooms.get(roomKey)?.delete(identityId);
}

// Forget a room entirely — on close, or when a new round resets every buffer
// back to starter code.
export function clearRoom(roomKey: string): void {
  rooms.delete(roomKey);
  phases.delete(roomKey);
}
