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

// One solver's finish order for the room's current problem. `id` matches the
// roster identity id (`u${userId}`) so the client can badge names directly.
// Resets each round when a new problem starts.
export interface SolveRank {
  id: string;
  rank: number; // 1-based order in which they solved the current problem
}

export type RoomPhase = "solving" | "review";

// One participant's shared editor buffer. While the round is being solved,
// `code` is a redacted decoy (same shape, scrambled characters) and `redacted`
// is true — the real source is withheld server-side. In review it's the genuine
// code with `redacted` false. `authorId` matches a roster identity id.
export interface PeerCodePayload {
  authorId: string;
  lang: string;
  code: string;
  redacted: boolean;
}

export interface RoundPayload {
  number: number;
  phase: RoomPhase; // solving the problem, or reviewing solutions
  endsAt: string | null; // ISO — when the current phase ends
}

// Live occupancy of one practice room, as shown in the lobby's room cards.
export interface LobbyRoomPresence {
  roomId: number;
  participants: Identity[];
}

export interface RoomStatePayload {
  roomId: string;
  you: Identity;
  youAreHost: boolean;
  participants: Identity[];
  messages: ChatMessagePayload[];
  problem: ProblemPayload | null;
  round: RoundPayload | null;
  solves: SolveRank[];
  // Everyone else's current editor buffers (redacted while solving).
  peers: PeerCodePayload[];
}

// ── client → server ──
export interface JoinPayload {
  roomId: string;
  name?: string;
}
export interface SendPayload {
  body: string;
}
// The socket's current editor buffer, pushed as the user types (throttled).
export interface CodeUpdatePayload {
  lang: string;
  code: string;
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
  // Share the socket's current editor buffer with the rest of the room.
  "code:update": (p: CodeUpdatePayload) => void;
  // Host-only: end the current room and evict everyone.
  "room:close": () => void;
  // Leave the current room (e.g. navigating back to the lobby) without
  // disconnecting the socket, so presence and shared code are cleaned up.
  "room:leave": () => void;
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
  // Updated finish-order badges for the room's current problem.
  "room:solves": (p: { roomId: string; solves: SolveRank[] }) => void;
  // A peer's editor buffer changed (redacted while solving, real in review).
  "peer:code": (p: { roomId: string } & PeerCodePayload) => void;
  "room:problem": (p: {
    roomId: string;
    problem: ProblemPayload | null;
    round: RoundPayload;
  }) => void;
  // Lobby: full occupancy snapshot on subscribe, then per-room deltas.
  "lobby:rooms": (p: { rooms: LobbyRoomPresence[] }) => void;
  "lobby:presence": (p: LobbyRoomPresence) => void;
  // The room was closed (by its host, or auto-closed when it emptied out).
  "room:closed": (p: { roomId: string }) => void;
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
