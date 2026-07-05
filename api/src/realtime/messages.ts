import { and, eq, lt } from "drizzle-orm";
import { db } from "../db/index.js";
import { chatMessages } from "../db/schema.js";
import type { ChatMessagePayload, HistoryResult, Identity } from "./types.js";

// Page size for both the initial load and each scroll-back page.
export const HISTORY_PAGE = 50;

type Row = typeof chatMessages.$inferSelect;

function toPayload(row: Row): ChatMessagePayload {
  return {
    id: row.id,
    roomId: row.roomId,
    authorId: row.authorId,
    authorName: row.authorName,
    authorColor: row.authorColor,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
  };
}

// Most recent `limit` messages for a room, returned oldest → newest.
export async function loadRecentMessages(
  roomId: string,
  limit = HISTORY_PAGE,
): Promise<ChatMessagePayload[]> {
  const rows = await db.query.chatMessages.findMany({
    where: eq(chatMessages.roomId, roomId),
    orderBy: (m, { desc }) => [desc(m.id)],
    limit,
  });
  return rows.reverse().map(toPayload);
}

// One page of messages older than `beforeId`, returned oldest → newest, plus a
// flag for whether even older messages remain (fetch limit+1 to detect it).
export async function loadMessagesBefore(
  roomId: string,
  beforeId: number,
  limit = HISTORY_PAGE,
): Promise<HistoryResult> {
  const rows = await db.query.chatMessages.findMany({
    where: and(eq(chatMessages.roomId, roomId), lt(chatMessages.id, beforeId)),
    orderBy: (m, { desc }) => [desc(m.id)],
    limit: limit + 1,
  });
  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit).reverse().map(toPayload);
  return { messages: page, hasMore };
}

// Only Chat lobby channels are durably logged. Their room ids carry this prefix
// (set by the web client); practice Rooms and everything else are ephemeral.
export const LOBBY_PREFIX = "lobby:";

export function isPersistentRoom(roomId: string): boolean {
  return roomId.startsWith(LOBBY_PREFIX);
}

// Ephemeral rooms broadcast chat without touching the DB. Ids count down from
// -1 so they never collide with the positive serial ids of persisted messages
// (which matters for React keys on the client).
let ephemeralSeq = 0;

export function makeEphemeralMessage(
  roomId: string,
  author: Identity,
  body: string,
): ChatMessagePayload {
  return {
    id: --ephemeralSeq,
    roomId,
    authorId: author.id,
    authorName: author.name,
    authorColor: author.color,
    body,
    createdAt: new Date().toISOString(),
  };
}

export async function saveMessage(
  roomId: string,
  author: Identity,
  body: string,
): Promise<ChatMessagePayload> {
  const [row] = await db
    .insert(chatMessages)
    .values({
      roomId,
      authorId: author.id,
      authorName: author.name,
      authorColor: author.color,
      body,
    })
    .returning();
  return toPayload(row);
}
