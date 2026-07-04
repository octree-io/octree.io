import { resolveRoomId } from "../lib/roomSlug.js";
import { presenceEntries } from "./presence.js";
import type { Identity, LobbyRoomPresence, RealtimeServer } from "./types.js";

// Reserved socket.io room the lobby page subscribes to. It can't collide with a
// real practice room key: resolveRoomId("@lobby") is null.
export const LOBBY_ROOM = "@lobby";

/**
 * Live occupancy of every practice room, keyed by numeric room id. Presence is
 * tracked per socket-room key (a slug or numeric id); here we resolve each key
 * to its numeric room id and union the occupants, de-duped by display name so
 * the same person on two tabs counts once.
 */
function aggregate(): Map<number, Identity[]> {
  const byId = new Map<number, Identity[]>();
  for (const [key, people] of presenceEntries()) {
    const id = resolveRoomId(key);
    if (id === null) continue; // channels / ad-hoc rooms aren't listed in the lobby
    let list = byId.get(id);
    if (!list) {
      list = [];
      byId.set(id, list);
    }
    for (const p of people) {
      if (!list.some((q) => q.name === p.name)) list.push(p);
    }
  }
  return byId;
}

export function lobbySnapshot(): LobbyRoomPresence[] {
  return [...aggregate()].map(([roomId, participants]) => ({ roomId, participants }));
}

export function lobbyOccupants(id: number): Identity[] {
  return aggregate().get(id) ?? [];
}

/**
 * Push the current occupancy of the practice room addressed by `roomKey` (slug
 * or numeric) to everyone watching the lobby. No-op for non-practice rooms.
 */
export function broadcastLobbyPresence(io: RealtimeServer, roomKey: string): void {
  const id = resolveRoomId(roomKey);
  if (id === null) return;
  io.to(LOBBY_ROOM).emit("lobby:presence", { roomId: id, participants: lobbyOccupants(id) });
}
