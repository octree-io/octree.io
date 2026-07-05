import type { Server } from "socket.io";

// Shared socket event contract. The web client mirrors these shapes.

export interface Identity {
  id: string; // anonymous, derived from the socket id
  name: string;
  color: string;
}

export interface ChatMessagePayload {
  id: number;
  roomId: string;
  authorId: string;
  authorName: string;
  authorColor: string;
  body: string;
  createdAt: string; // ISO
}

export interface ProblemPayload {
  id: number;
  slug: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  description: string;
}

export interface RoundPayload {
  number: number;
  endsAt: string | null; // ISO — when the current problem round ends
}

// Live occupancy of one practice room, as shown in the lobby's room cards.
export interface LobbyRoomPresence {
  roomId: number;
  participants: Identity[];
}

export interface RoomStatePayload {
  roomId: string;
  you: Identity;
  participants: Identity[];
  messages: ChatMessagePayload[];
  problem: ProblemPayload | null;
  round: RoundPayload | null;
}

// ── client → server ──
export interface JoinPayload {
  roomId: string;
  name?: string;
}
export interface SendPayload {
  body: string;
}

// Cursor-based backfill: fetch the page of messages immediately older than
// `before` (an existing message id) for the socket's current room.
export interface HistoryPayload {
  before: number;
  limit?: number;
}
export interface HistoryResult {
  messages: ChatMessagePayload[];
  hasMore: boolean;
}

export interface ClientToServerEvents {
  "room:join": (p: JoinPayload) => void;
  "chat:send": (p: SendPayload) => void;
  // Load older messages (scroll-back pagination). Replies via ack callback.
  "chat:history": (p: HistoryPayload, cb: (res: HistoryResult) => void) => void;
  // Subscribe/unsubscribe to live occupancy of all rooms (the lobby directory).
  "lobby:join": () => void;
  "lobby:leave": () => void;
}

export interface ServerToClientEvents {
  "room:state": (p: RoomStatePayload) => void;
  "chat:message": (p: ChatMessagePayload) => void;
  "presence:update": (p: { roomId: string; participants: Identity[] }) => void;
  "room:problem": (p: {
    roomId: string;
    problem: ProblemPayload;
    round: RoundPayload;
  }) => void;
  // Lobby: full occupancy snapshot on subscribe, then per-room deltas.
  "lobby:rooms": (p: { rooms: LobbyRoomPresence[] }) => void;
  "lobby:presence": (p: LobbyRoomPresence) => void;
  "error:msg": (p: { message: string }) => void;
}

export interface SocketData {
  identity?: Identity;
  roomId?: string;
  // The authenticated user behind this socket (set by the handshake middleware).
  user?: { id: number; username: string };
}

export type RealtimeServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;
