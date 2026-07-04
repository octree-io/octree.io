import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import { rooms, roomParticipants } from "../db/schema.js";
import { ApiError } from "../middleware/error.js";
import { encodeRoomSlug, resolveRoomId } from "../lib/roomSlug.js";

export const roomsRouter = Router();

// Resolve an :id route param to the numeric room id. Accepts a word slug
// (noise-tortoise-sun) or a bare number; throws a clean 400 otherwise.
function parseId(raw: string): number {
  const id = resolveRoomId(raw);
  if (id === null) throw new ApiError(400, "Invalid id");
  return id;
}

// Attach the URL-friendly slug to a room row without altering stored data.
function withSlug<T extends { id: number }>(room: T): T & { slug: string | null } {
  return { ...room, slug: encodeRoomSlug(room.id) };
}

// GET /rooms  — list open + active rooms
roomsRouter.get("/", async (_req, res, next) => {
  try {
    const rows = await db.query.rooms.findMany({
      where: (r, { inArray }) => inArray(r.status, ["waiting", "active"]),
      with: {
        problem: { columns: { id: true, title: true, difficulty: true, slug: true } },
        participants: { with: { user: { columns: { id: true, username: true } } } },
      },
      orderBy: (r, { desc }) => [desc(r.createdAt)],
    });
    res.json(rows.map(withSlug));
  } catch (err) {
    next(err);
  }
});

// GET /rooms/:id
roomsRouter.get("/:id", async (req, res, next) => {
  try {
    const room = await db.query.rooms.findFirst({
      where: eq(rooms.id, parseId(req.params.id)),
      with: {
        problem: true,
        host: { columns: { id: true, username: true } },
        participants: { with: { user: { columns: { id: true, username: true } } } },
      },
    });
    if (!room) throw new ApiError(404, "Room not found");
    res.json(withSlug(room));
  } catch (err) {
    next(err);
  }
});

// POST /rooms
const createRoomSchema = z.object({
  problemId: z.number().int().positive(),
  hostId: z.number().int().positive(),
  durationMinutes: z.number().int().min(15).max(90).default(45),
  maxPlayers: z.number().int().min(1).max(8).default(4),
});

roomsRouter.post("/", async (req, res, next) => {
  try {
    const data = createRoomSchema.parse(req.body);
    const [room] = await db.insert(rooms).values(data).returning();
    res.status(201).json(withSlug(room));
  } catch (err) {
    next(err);
  }
});

// POST /rooms/:id/join
const joinRoomSchema = z.object({ userId: z.number().int().positive() });

roomsRouter.post("/:id/join", async (req, res, next) => {
  try {
    const { userId } = joinRoomSchema.parse(req.body);
    const roomId = parseId(req.params.id);

    const room = await db.query.rooms.findFirst({
      where: eq(rooms.id, roomId),
      with: { participants: true },
    });

    if (!room) throw new ApiError(404, "Room not found");
    if (room.status === "finished") throw new ApiError(409, "Room has already finished");
    if (room.participants.length >= room.maxPlayers) throw new ApiError(409, "Room is full");

    const already = room.participants.some((p) => p.userId === userId);
    if (already) throw new ApiError(409, "Already in this room");

    const [participant] = await db
      .insert(roomParticipants)
      .values({ roomId, userId })
      .returning();

    res.status(201).json(participant);
  } catch (err) {
    next(err);
  }
});

// POST /rooms/:id/start
roomsRouter.post("/:id/start", async (req, res, next) => {
  try {
    const [updated] = await db
      .update(rooms)
      .set({ status: "active", startedAt: new Date() })
      .where(and(eq(rooms.id, parseId(req.params.id)), eq(rooms.status, "waiting")))
      .returning();

    if (!updated) throw new ApiError(409, "Room cannot be started");
    res.json(withSlug(updated));
  } catch (err) {
    next(err);
  }
});

// POST /rooms/:id/finish
roomsRouter.post("/:id/finish", async (req, res, next) => {
  try {
    const [updated] = await db
      .update(rooms)
      .set({ status: "finished", finishedAt: new Date() })
      .where(and(eq(rooms.id, parseId(req.params.id)), eq(rooms.status, "active")))
      .returning();

    if (!updated) throw new ApiError(409, "Room cannot be finished");
    res.json(withSlug(updated));
  } catch (err) {
    next(err);
  }
});

// POST /rooms/:id/submit  — mark participant as submitted
const submitSchema = z.object({ userId: z.number().int().positive() });

roomsRouter.post("/:id/submit", async (req, res, next) => {
  try {
    const { userId } = submitSchema.parse(req.body);

    const [updated] = await db
      .update(roomParticipants)
      .set({ submittedAt: new Date() })
      .where(
        and(
          eq(roomParticipants.roomId, parseId(req.params.id)),
          eq(roomParticipants.userId, userId),
        ),
      )
      .returning();

    if (!updated) throw new ApiError(404, "Participant not found in room");
    res.json(updated);
  } catch (err) {
    next(err);
  }
});
