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

export interface ClientToServerEvents {
  "room:join": (p: JoinPayload) => void;
  "chat:send": (p: SendPayload) => void;
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
  "error:msg": (p: { message: string }) => void;
}

export interface SocketData {
  identity?: Identity;
  roomId?: string;
}

export type RealtimeServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;
