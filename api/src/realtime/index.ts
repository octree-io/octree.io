import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { env } from "../config.js";
import { makeIdentity } from "./identity.js";
import { addPresence, removePresence, listPresence, countPresence } from "./presence.js";
import { LOBBY_ROOM, lobbySnapshot, broadcastLobbyPresence } from "./lobby.js";
import {
  loadRecentMessages,
  saveMessage,
  makeEphemeralMessage,
  isPersistentRoom,
} from "./messages.js";
import * as roomTimer from "./roomTimer.js";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
  RealtimeServer,
} from "./types.js";

const MAX_BODY = 2000;

// Attach a Socket.IO server to the existing HTTP server. Anonymous clients join
// a room (a practice-room UUID or a Chat channel slug), chat is broadcast +dur-
// ably logged, and practice rooms rotate their problem on a server timer.
export function createRealtime(httpServer: HttpServer): RealtimeServer {
  const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    Record<string, never>,
    SocketData
  >(httpServer, {
    cors: { origin: env.corsOrigin, methods: ["GET", "POST"] },
  });

  io.on("connection", (socket) => {
    socket.on("room:join", async ({ roomId, name }) => {
      if (!roomId || typeof roomId !== "string") return;

      // A socket only occupies one room at a time; leave any previous one.
      const prev = socket.data.roomId;
      if (prev && prev !== roomId) {
        removePresence(prev, socket.id);
        socket.leave(prev);
        io.to(prev).emit("presence:update", { roomId: prev, participants: listPresence(prev) });
        broadcastLobbyPresence(io, prev);
        if (countPresence(prev) === 0) roomTimer.stop(prev);
      }

      const identity = makeIdentity(socket.id, name);
      socket.data.identity = identity;
      socket.data.roomId = roomId;
      socket.join(roomId);
      addPresence(roomId, socket.id, identity);

      try {
        const [messages, roundState] = await Promise.all([
          // Only Chat lobby channels keep chat history; practice Rooms don't.
          isPersistentRoom(roomId) ? loadRecentMessages(roomId) : Promise.resolve([]),
          roomTimer.startOrResume(io, roomId),
        ]);

        socket.emit("room:state", {
          roomId,
          you: identity,
          participants: listPresence(roomId),
          messages,
          problem: roundState?.problem ?? null,
          round: roundState?.round ?? null,
        });
      } catch (err) {
        console.error("[realtime] room:join failed:", err);
        socket.emit("error:msg", { message: "Failed to join room" });
      }

      io.to(roomId).emit("presence:update", { roomId, participants: listPresence(roomId) });
      broadcastLobbyPresence(io, roomId);
    });

    // Lobby directory: watch live occupancy of every room without joining any.
    socket.on("lobby:join", () => {
      socket.join(LOBBY_ROOM);
      socket.emit("lobby:rooms", { rooms: lobbySnapshot() });
    });
    socket.on("lobby:leave", () => {
      socket.leave(LOBBY_ROOM);
    });

    socket.on("chat:send", async ({ body }) => {
      const { roomId, identity } = socket.data;
      if (!roomId || !identity) return;

      const text = (body ?? "").trim();
      if (!text) return;

      try {
        const trimmed = text.slice(0, MAX_BODY);
        // Only the Chat lobby persists; every other room just broadcasts.
        const msg = isPersistentRoom(roomId)
          ? await saveMessage(roomId, identity, trimmed)
          : makeEphemeralMessage(roomId, identity, trimmed);
        io.to(roomId).emit("chat:message", msg);
      } catch (err) {
        console.error("[realtime] chat:send failed:", err);
        socket.emit("error:msg", { message: "Message failed to send" });
      }
    });

    socket.on("disconnect", () => {
      const roomId = socket.data.roomId;
      if (!roomId) return;
      removePresence(roomId, socket.id);
      io.to(roomId).emit("presence:update", { roomId, participants: listPresence(roomId) });
      broadcastLobbyPresence(io, roomId);
      if (countPresence(roomId) === 0) roomTimer.stop(roomId);
    });
  });

  return io;
}
