import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { env } from "../config.js";
import { identityForUser } from "./identity.js";
import { userFromCookieHeader } from "../auth/middleware.js";
import { addPresence, removePresence, listPresence } from "./presence.js";
import { LOBBY_ROOM, lobbySnapshot, broadcastLobbyPresence } from "./lobby.js";
import {
  loadRecentMessages,
  loadMessagesBefore,
  saveMessage,
  makeEphemeralMessage,
  isPersistentRoom,
  LOBBY_PREFIX,
  HISTORY_PAGE,
} from "./messages.js";
import { isChannelId } from "../lib/channels.js";
import * as roomTimer from "./roomTimer.js";
import { setIo } from "./broadcast.js";
import { listSolves } from "./roomSolves.js";
import { resolveRoomId } from "../lib/roomSlug.js";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
  RealtimeServer,
} from "./types.js";

const MAX_BODY = 4000;

// A lobby room id (`${LOBBY_PREFIX}${channelId}`) is only valid when its channel
// exists in the server-side source of truth. Non-lobby rooms (practice-room
// UUIDs) aren't channels and are left untouched here.
function isUnknownChannel(roomId: string): boolean {
  return isPersistentRoom(roomId) && !isChannelId(roomId.slice(LOBBY_PREFIX.length));
}

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
    cors: { origin: env.webOrigin, methods: ["GET", "POST"], credentials: true },
  });

  // Authenticate every socket from its session cookie at handshake time. Login
  // is required, so unauthenticated connections are rejected outright.
  io.use(async (socket, next) => {
    try {
      const user = await userFromCookieHeader(socket.handshake.headers.cookie);
      if (!user) return next(new Error("unauthorized"));
      socket.data.user = { id: user.id, username: user.username };
      next();
    } catch (err) {
      console.error("[realtime] handshake auth failed:", err);
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("room:join", async ({ roomId }) => {
      if (!roomId || typeof roomId !== "string") return;
      const authedUser = socket.data.user;
      if (!authedUser) return;

      // Reject joins to lobby channels that aren't in the server's channel list.
      if (isUnknownChannel(roomId)) {
        socket.emit("error:msg", { message: "Channel not found" });
        return;
      }

      // A socket only occupies one room at a time; leave any previous one. The
      // vacated room keeps its timer running so it can auto-close at the next
      // round boundary if it's now empty (see roomTimer.advance).
      const prev = socket.data.roomId;
      if (prev && prev !== roomId) {
        removePresence(prev, socket.id);
        socket.leave(prev);
        io.to(prev).emit("presence:update", { roomId: prev, participants: listPresence(prev) });
        broadcastLobbyPresence(io, prev);
      }

      // Identity comes from the authenticated user, never client-supplied
      // input — so nobody can spoof another person's name in a room.
      const identity = identityForUser(authedUser);
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

        // The room was already closed — bounce this socket back out.
        if (roundState?.closed) {
          removePresence(roomId, socket.id);
          socket.leave(roomId);
          socket.data.roomId = undefined;
          socket.emit("room:closed", { roomId });
          return;
        }

        // Current finish-order medals for the room's active problem (empty for
        // Chat channels and freshly rotated problems).
        const numericRoomId = resolveRoomId(roomId);
        const solves =
          numericRoomId !== null && roundState?.problem
            ? await listSolves(numericRoomId, roundState.problem.id)
            : [];

        socket.emit("room:state", {
          roomId,
          you: identity,
          youAreHost: roundState?.hostId === authedUser.id,
          participants: listPresence(roomId),
          messages,
          problem: roundState?.problem ?? null,
          round: roundState?.round ?? null,
          solves,
        });
      } catch (err) {
        console.error("[realtime] room:join failed:", err);
        socket.emit("error:msg", { message: "Failed to join room" });
      }

      io.to(roomId).emit("presence:update", { roomId, participants: listPresence(roomId) });
      broadcastLobbyPresence(io, roomId);
    });

    // Host-only: end the room and evict everyone in it.
    socket.on("room:close", async () => {
      const roomId = socket.data.roomId;
      const user = socket.data.user;
      if (!roomId || !user) return;
      try {
        const closed = await roomTimer.closeRoom(roomId, user.id);
        if (closed) io.to(roomId).emit("room:closed", { roomId });
      } catch (err) {
        console.error("[realtime] room:close failed:", err);
      }
    });

    // Lobby directory: watch live occupancy of every room without joining any.
    socket.on("lobby:join", () => {
      socket.join(LOBBY_ROOM);
      socket.emit("lobby:rooms", { rooms: lobbySnapshot() });
    });
    socket.on("lobby:leave", () => {
      socket.leave(LOBBY_ROOM);
    });

    // Scroll-back pagination: return the page of messages older than `before`.
    socket.on("chat:history", async ({ before, limit }, cb) => {
      if (typeof cb !== "function") return;
      const roomId = socket.data.roomId;
      // Only persistent Chat channels have history to page through.
      if (!roomId || !isPersistentRoom(roomId) || !Number.isInteger(before) || before <= 0) {
        return cb({ messages: [], hasMore: false });
      }
      try {
        const size = Number.isInteger(limit) ? Math.min(Math.max(limit!, 1), HISTORY_PAGE) : HISTORY_PAGE;
        cb(await loadMessagesBefore(roomId, before, size));
      } catch (err) {
        console.error("[realtime] chat:history failed:", err);
        cb({ messages: [], hasMore: false });
      }
    });

    socket.on("chat:send", async ({ body }) => {
      const { roomId, identity } = socket.data;
      if (!roomId || !identity) return;

      // Never accept a message bound for a channel that isn't in the source of
      // truth (defence-in-depth: join is already gated the same way).
      if (isUnknownChannel(roomId)) {
        socket.emit("error:msg", { message: "Channel not found" });
        return;
      }

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
      // Leave presence but keep the room's timer running — an empty room closes
      // itself at the next round boundary, which also survives brief drops (e.g.
      // a page refresh) without tearing the room down prematurely.
      removePresence(roomId, socket.id);
      io.to(roomId).emit("presence:update", { roomId, participants: listPresence(roomId) });
      broadcastLobbyPresence(io, roomId);
    });
  });

  setIo(io);
  return io;
}
