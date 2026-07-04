import { Router } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { ApiError } from "../middleware/error.js";

export const usersRouter = Router();

const SAFE_COLUMNS = {
  id: true,
  username: true,
  email: true,
  createdAt: true,
} as const;

// GET /users/:id
usersRouter.get("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) throw new ApiError(400, "Invalid id");
    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
      columns: SAFE_COLUMNS,
    });
    if (!user) throw new ApiError(404, "User not found");
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// POST /users  (stub — replace with real auth later)
const createUserSchema = z.object({
  username: z.string().min(2).max(32).regex(/^[a-z0-9_]+$/),
  email: z.string().email(),
  passwordHash: z.string().min(1),
});

usersRouter.post("/", async (req, res, next) => {
  try {
    const data = createUserSchema.parse(req.body);

    const existing = await db.query.users.findFirst({
      where: eq(users.email, data.email),
      columns: { id: true },
    });
    if (existing) throw new ApiError(409, "Email already in use");

    const [user] = await db
      .insert(users)
      .values(data)
      .returning({ id: users.id, username: users.username, email: users.email, createdAt: users.createdAt });

    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});
