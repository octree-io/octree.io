import { and, eq, lte, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { roomSolves } from "../db/schema.js";
import { encodeRoomSlug } from "../lib/roomSlug.js";
import { makeEphemeralMessage } from "./messages.js";
import { getIo } from "./broadcast.js";
import type { Identity } from "./types.js";

const MEDALS = ["🥇", "🥈", "🥉"];

function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

/**
 * Record a first-time passing "submit" for this room+problem+user. Returns
 * the solver's 1-based rank among everyone who's solved this room's current
 * problem, or null if they'd already solved it (a repeat submit shouldn't
 * re-announce).
 */
export async function recordSolve(
  roomId: number,
  problemId: number,
  userId: number,
): Promise<number | null> {
  const [inserted] = await db
    .insert(roomSolves)
    .values({ roomId, problemId, userId })
    .onConflictDoNothing({
      target: [roomSolves.roomId, roomSolves.problemId, roomSolves.userId],
    })
    .returning();
  if (!inserted) return null;

  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(roomSolves)
    .where(
      and(
        eq(roomSolves.roomId, roomId),
        eq(roomSolves.problemId, problemId),
        lte(roomSolves.id, inserted.id),
      ),
    );
  return row.count;
}

const SYSTEM_AUTHOR: Identity = { id: "system", name: "octree", color: "#8a8f98" };

// Post a system message into the room's (ephemeral) chat. No-op if the socket
// server hasn't started yet or the room id can't be turned back into the slug
// clients actually joined with.
function announce(roomId: number, body: string): void {
  const io = getIo();
  const slug = encodeRoomSlug(roomId);
  if (!io || !slug) return;

  const msg = makeEphemeralMessage(slug, SYSTEM_AUTHOR, body);
  io.to(slug).emit("chat:message", msg);
}

// Announce a passing submit, ranked by finish order.
export function announceSolve(roomId: number, solverName: string, rank: number): void {
  announce(
    roomId,
    rank <= MEDALS.length
      ? `${MEDALS[rank - 1]} ${solverName} solved it — ${ordinal(rank)} to finish!`
      : `✅ ${solverName} solved it (${ordinal(rank)} to finish)`,
  );
}

// Announce a failing submit (every failed submission is announced once).
export function announceFailedSubmit(
  roomId: number,
  solverName: string,
  testsPassed: number,
  testsTotal: number,
): void {
  announce(roomId, `❌ ${solverName} submitted — ${testsPassed}/${testsTotal} tests passed`);
}
