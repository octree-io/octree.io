import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { rooms, problems } from "../db/schema.js";
import { env } from "../config.js";
import { resolveRoomId } from "../lib/roomSlug.js";
import type { ProblemPayload, RoundPayload, RealtimeServer } from "./types.js";

type RoomRow = typeof rooms.$inferSelect;
type ProblemRow = typeof problems.$inferSelect;

// One pending timeout per room. Guards against duplicate schedulers when
// several people join the same room.
const timers = new Map<string, NodeJS.Timeout>();

function problemPayload(p: ProblemRow): ProblemPayload {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    difficulty: p.difficulty,
    description: p.description,
  };
}

function roundLengthSeconds(room: RoomRow): number {
  return env.roundSeconds ?? room.durationMinutes * 60;
}

// Practice rooms are addressed either by a numeric id or a word slug
// (noise-tortoise-sun), both of which resolve to the numeric primary key. The
// standalone Chat channels ("general", "lobby:general", …) resolve to null, so
// we skip the DB work for them.
function toRoomId(roomId: string): number | null {
  return resolveRoomId(roomId);
}

async function loadRoom(roomId: string): Promise<RoomRow | null> {
  const id = toRoomId(roomId);
  if (id === null) return null;
  const room = await db.query.rooms.findFirst({ where: eq(rooms.id, id) });
  return room ?? null;
}

async function loadProblem(problemId: number): Promise<ProblemRow | null> {
  const p = await db.query.problems.findFirst({ where: eq(problems.id, problemId) });
  return p ?? null;
}

// Published problems in a stable order; used to rotate to the "next" one.
async function publishedProblems(): Promise<ProblemRow[]> {
  return db.query.problems.findMany({
    where: eq(problems.isPublished, true),
    orderBy: (p, { asc }) => [asc(p.createdAt)],
  });
}

/**
 * Ensure a round is running for a DB-backed room and (re)arm the switch timer.
 * Returns the current problem + round for the joining client, or null when the
 * roomId isn't a real practice room (e.g. a Chat channel).
 */
export async function startOrResume(
  io: RealtimeServer,
  roomId: string,
): Promise<{ problem: ProblemPayload | null; round: RoundPayload } | null> {
  const room = await loadRoom(roomId);
  if (!room) return null;

  const now = Date.now();
  const lenMs = roundLengthSeconds(room) * 1000;
  let endsAt = room.roundEndsAt?.getTime() ?? 0;
  const roundNumber = room.roundNumber;

  // No live round (never started, or the deadline lapsed while the room was
  // empty) → begin a fresh one from the room's current problem.
  if (!room.roundEndsAt || endsAt <= now || room.status !== "active") {
    endsAt = now + lenMs;
    await db
      .update(rooms)
      .set({
        status: "active",
        startedAt: room.startedAt ?? new Date(),
        roundEndsAt: new Date(endsAt),
      })
      .where(eq(rooms.id, room.id));
  }

  arm(io, roomId, endsAt - now);

  const problem = await loadProblem(room.problemId);
  return {
    problem: problem ? problemPayload(problem) : null,
    round: { number: roundNumber, endsAt: new Date(endsAt).toISOString() },
  };
}

function arm(io: RealtimeServer, roomId: string, delayMs: number): void {
  if (timers.has(roomId)) return; // already scheduled
  const timeout = setTimeout(() => {
    timers.delete(roomId);
    void rotate(io, roomId);
  }, Math.max(0, delayMs));
  timers.set(roomId, timeout);
}

// Advance the room to the next published problem, persist it, broadcast, and
// re-arm for the following round.
async function rotate(io: RealtimeServer, roomId: string): Promise<void> {
  const room = await loadRoom(roomId);
  if (!room) return;

  const all = await publishedProblems();
  if (all.length === 0) return;

  const idx = all.findIndex((p) => p.id === room.problemId);
  const next = all[(idx + 1) % all.length];

  const lenMs = roundLengthSeconds(room) * 1000;
  const endsAt = Date.now() + lenMs;
  const roundNumber = room.roundNumber + 1;

  await db
    .update(rooms)
    .set({
      problemId: next.id,
      roundNumber,
      roundEndsAt: new Date(endsAt),
    })
    .where(eq(rooms.id, room.id));

  io.to(roomId).emit("room:problem", {
    roomId,
    problem: problemPayload(next),
    round: { number: roundNumber, endsAt: new Date(endsAt).toISOString() },
  });

  arm(io, roomId, lenMs);
}

// Called when a room empties out — stop burning a timer on nobody.
export function stop(roomId: string): void {
  const t = timers.get(roomId);
  if (t) {
    clearTimeout(t);
    timers.delete(roomId);
  }
}
