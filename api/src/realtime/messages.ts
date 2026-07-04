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
