import { and, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { rooms, problems } from "../db/schema.js";
import { env } from "../config.js";
import { resolveRoomId } from "../lib/roomSlug.js";
import { countPresence } from "./presence.js";
import { humanizeTitle } from "../lib/humanizeTitle.js";
import type { ProblemPayload, RoundPayload, RoomPhase, RealtimeServer } from "./types.js";

type RoomRow = typeof rooms.$inferSelect;
type ProblemRow = typeof problems.$inferSelect;
type Difficulty = RoomRow["difficulty"];

// One pending timeout per room. Guards against duplicate schedulers when
// several people join the same room.
const timers = new Map<string, NodeJS.Timeout>();

// Solving time by difficulty, and a fixed review window after every round.
// ROUND_SECONDS, when set, overrides both so the cycle is fast to observe.
const SOLVE_SECONDS: Record<Difficulty, number> = {
  easy: 15 * 60,
  medium: 25 * 60,
  hard: 45 * 60,
};
const REVIEW_SECONDS = 10 * 60;

function solveSeconds(room: RoomRow): number {
  return env.roundSeconds ?? SOLVE_SECONDS[room.difficulty];
}
function reviewSeconds(): number {
  return env.roundSeconds ?? REVIEW_SECONDS;
}

function problemPayload(p: ProblemRow): ProblemPayload {
  return {
    id: p.id,
    slug: p.slug,
    title: humanizeTitle(p.title),
    difficulty: p.difficulty,
    description: p.description,
  };
}

function roundPayload(number: number, phase: RoomPhase, endsAt: number): RoundPayload {
  return { number, phase, endsAt: new Date(endsAt).toISOString() };
}

// Practice rooms are addressed either by a numeric id or a word slug
// (noise-tortoise-sun), both of which resolve to the numeric primary key. The
// standalone Chat channels ("general", "lobby:general", …) resolve to null.
function toRoomId(roomId: string): number | null {
  return resolveRoomId(roomId);
}

async function loadRoom(roomId: string): Promise<RoomRow | null> {
  const id = toRoomId(roomId);
  if (id === null) return null;
  return (await db.query.rooms.findFirst({ where: eq(rooms.id, id) })) ?? null;
}

async function loadProblem(problemId: number): Promise<ProblemRow | null> {
  return (await db.query.problems.findFirst({ where: eq(problems.id, problemId) })) ?? null;
}

// Published problems of the room's difficulty, in a stable order.
async function difficultyPool(difficulty: Difficulty): Promise<ProblemRow[]> {
  return db.query.problems.findMany({
    where: and(eq(problems.isPublished, true), eq(problems.difficulty, difficulty)),
    orderBy: (p, { asc }) => [asc(p.createdAt)],
  });
}

/**
 * Pick the next problem for a room: a random one that hasn't been served yet
 * this cycle. When every problem has been used, reset the cycle and start over
 * (avoiding an immediate repeat of the current problem when possible). Returns
 * the chosen problem and the updated "used" list, or null when the pool is empty.
 */
function chooseNext(
  pool: ProblemRow[],
  used: number[],
  currentId: number | null,
): { problem: ProblemRow; used: number[] } | null {
  if (pool.length === 0) return null;

  let remaining = pool.filter((p) => !used.includes(p.id));
  let baseUsed = used;
  if (remaining.length === 0) {
    // Exhausted every problem → reset the cycle and start over.
    baseUsed = [];
    remaining =
      pool.length > 1 && currentId !== null ? pool.filter((p) => p.id !== currentId) : pool;
  }

  const problem = remaining[Math.floor(Math.random() * remaining.length)];
  return { problem, used: [...baseUsed, problem.id] };
}

function withId(used: number[], id: number | null | undefined): number[] {
  if (id == null || used.includes(id)) return used;
  return [...used, id];
}

/**
 * Ensure a round is running for a DB-backed room and (re)arm its phase timer.
 * Returns the current problem + round for the joining client, or null when the
 * roomId isn't a real practice room (e.g. a Chat channel).
 */
export async function startOrResume(
  io: RealtimeServer,
  roomKey: string,
): Promise<{
  problem: ProblemPayload | null;
  round: RoundPayload | null;
  hostId: number | null;
  closed: boolean;
} | null> {
  const room = await loadRoom(roomKey);
  if (!room) return null;

  // A closed room stays closed — never resurrect a finished session on join.
  if (room.status === "finished") {
    return { problem: null, round: null, hostId: room.hostId, closed: true };
  }

  const now = Date.now();
  const endsAt = room.roundEndsAt?.getTime() ?? 0;

  // A live phase is already in flight → just resume it for the joiner.
  if (room.status === "active" && room.roundEndsAt && endsAt > now) {
    arm(io, roomKey, endsAt - now);
    const problem = room.problemId !== null ? await loadProblem(room.problemId) : null;
    return {
      problem: problem ? problemPayload(problem) : null,
      round: roundPayload(room.roundNumber, room.phase, endsAt),
      hostId: room.hostId,
      closed: false,
    };
  }

  // Otherwise (never started, or the deadline lapsed while the room sat empty)
  // begin a fresh solving phase on the room's current problem — don't burn a new
  // problem just because nobody was here; the timer rotates problems, not joins.
  let problem = room.problemId !== null ? await loadProblem(room.problemId) : null;
  let used = room.usedProblemIds;
  if (!problem) {
    const chosen = chooseNext(await difficultyPool(room.difficulty), room.usedProblemIds, null);
    problem = chosen?.problem ?? null;
    used = chosen?.used ?? room.usedProblemIds;
  } else {
    used = withId(room.usedProblemIds, problem.id);
  }

  const phaseEndsAt = now + solveSeconds(room) * 1000;
  await db
    .update(rooms)
    .set({
      status: "active",
      phase: "solving",
      problemId: problem?.id ?? null,
      usedProblemIds: used,
      startedAt: room.startedAt ?? new Date(),
      roundEndsAt: new Date(phaseEndsAt),
    })
    .where(eq(rooms.id, room.id));

  arm(io, roomKey, phaseEndsAt - now);
  return {
    problem: problem ? problemPayload(problem) : null,
    round: roundPayload(room.roundNumber, "solving", phaseEndsAt),
    hostId: room.hostId,
    closed: false,
  };
}

function arm(io: RealtimeServer, roomKey: string, delayMs: number): void {
  if (timers.has(roomKey)) return; // already scheduled
  const timeout = setTimeout(() => {
    timers.delete(roomKey);
    void advance(io, roomKey);
  }, Math.max(0, delayMs));
  timers.set(roomKey, timeout);
}

/**
 * Fired when the current phase's timer elapses. Solving → a 10-minute review
 * window on the same problem; review → the next round on a fresh problem.
 */
async function advance(io: RealtimeServer, roomKey: string): Promise<void> {
  const room = await loadRoom(roomKey);
  if (!room) return;

  // The room emptied out during the phase — close it at the boundary rather
  // than rotating to a new problem nobody is there to solve.
  if (countPresence(roomKey) === 0) {
    await finishRoom(room.id);
    stop(roomKey);
    return;
  }

  if (room.phase === "solving") {
    // Move into the review window; keep the same problem, reveal solutions.
    const endsAt = Date.now() + reviewSeconds() * 1000;
    await db
      .update(rooms)
      .set({ phase: "review", roundEndsAt: new Date(endsAt) })
      .where(eq(rooms.id, room.id));

    const problem = room.problemId !== null ? await loadProblem(room.problemId) : null;
    io.to(roomKey).emit("room:problem", {
      roomId: roomKey,
      problem: problem ? problemPayload(problem) : null,
      round: roundPayload(room.roundNumber, "review", endsAt),
    });
    arm(io, roomKey, endsAt - Date.now());
    return;
  }

  // Review finished → next round on a new problem.
  const chosen = chooseNext(await difficultyPool(room.difficulty), room.usedProblemIds, room.problemId);
  const roundNumber = room.roundNumber + 1;
  const endsAt = Date.now() + solveSeconds(room) * 1000;

  await db
    .update(rooms)
    .set({
      phase: "solving",
      problemId: chosen?.problem.id ?? room.problemId,
      usedProblemIds: chosen?.used ?? room.usedProblemIds,
      roundNumber,
      roundEndsAt: new Date(endsAt),
    })
    .where(eq(rooms.id, room.id));

  io.to(roomKey).emit("room:problem", {
    roomId: roomKey,
    problem: chosen ? problemPayload(chosen.problem) : null,
    round: roundPayload(roundNumber, "solving", endsAt),
  });
  arm(io, roomKey, endsAt - Date.now());
}

// Cancel a room's pending phase timer, if any.
export function stop(roomKey: string): void {
  const t = timers.get(roomKey);
  if (t) {
    clearTimeout(t);
    timers.delete(roomKey);
  }
}

async function finishRoom(id: number): Promise<void> {
  await db
    .update(rooms)
    .set({ status: "finished", finishedAt: new Date() })
    .where(eq(rooms.id, id));
}

/**
 * Host-initiated close. Verifies the requester actually hosts the room, marks
 * it finished, and cancels its timer. Returns whether the room was closed.
 */
export async function closeRoom(roomKey: string, userId: number): Promise<boolean> {
  const room = await loadRoom(roomKey);
  if (!room || room.hostId !== userId) return false;
  await finishRoom(room.id);
  stop(roomKey);
  return true;
}
