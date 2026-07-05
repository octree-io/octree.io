import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { ApiError } from "../middleware/error.js";

export const usersRouter = Router();

const SAFE_COLUMNS = {
  id: true,
  username: true,
  avatarUrl: true,
  createdAt: true,
} as const;

// GET /users/:id — public profile (no email; that's private to /auth/me).
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

// Account creation now lives in POST /api/auth/register.
