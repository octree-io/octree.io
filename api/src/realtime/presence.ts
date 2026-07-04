import type { Identity } from "./types.js";

// In-memory presence. Presence is transient by nature, so it lives in process
// memory (keyed roomId → socketId → identity) rather than the database — only
// the durable chat log is persisted.
const rooms = new Map<string, Map<string, Identity>>();

export function addPresence(roomId: string, socketId: string, identity: Identity): void {
  let room = rooms.get(roomId);
  if (!room) {
    room = new Map();
    rooms.set(roomId, room);
  }
  room.set(socketId, identity);
}

export function removePresence(roomId: string, socketId: string): void {
  const room = rooms.get(roomId);
  if (!room) return;
  room.delete(socketId);
  if (room.size === 0) rooms.delete(roomId);
}

export function listPresence(roomId: string): Identity[] {
  const room = rooms.get(roomId);
  if (!room) return [];
  // De-dupe by identity name so the same person opening two tabs shows once,
  // while keeping insertion order.
  return [...room.values()];
}

export function countPresence(roomId: string): number {
  return rooms.get(roomId)?.size ?? 0;
}
