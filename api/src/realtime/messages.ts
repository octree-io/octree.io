import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { chatMessages } from "../db/schema.js";
import type { ChatMessagePayload, Identity } from "./types.js";

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
  limit = 50,
): Promise<ChatMessagePayload[]> {
  const rows = await db.query.chatMessages.findMany({
    where: eq(chatMessages.roomId, roomId),
    orderBy: (m, { desc }) => [desc(m.createdAt)],
    limit,
  });
  return rows.reverse().map(toPayload);
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
