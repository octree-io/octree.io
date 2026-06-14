import { Router } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import { problems } from "../db/schema.js";
import { ApiError } from "../middleware/error.js";

export const problemsRouter = Router();

// GET /problems
problemsRouter.get("/", async (_req, res, next) => {
  try {
    const rows = await db.query.problems.findMany({
      where: eq(problems.isPublished, true),
      orderBy: (p, { asc }) => [asc(p.difficulty), asc(p.title)],
    });
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /problems/:slug
problemsRouter.get("/:slug", async (req, res, next) => {
  try {
    const problem = await db.query.problems.findFirst({
      where: eq(problems.slug, req.params.slug),
    });
    if (!problem) throw new ApiError(404, "Problem not found");
    res.json(problem);
  } catch (err) {
    next(err);
  }
});

// POST /problems  (admin — no auth middleware yet)
const createProblemSchema = z.object({
  slug: z.string().min(1).max(100),
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  difficulty: z.enum(["easy", "medium", "hard"]),
  tags: z.array(z.string()).default([]),
  isPublished: z.boolean().default(false),
});

problemsRouter.post("/", async (req, res, next) => {
  try {
    const data = createProblemSchema.parse(req.body);
    const [problem] = await db.insert(problems).values(data).returning();
    res.status(201).json(problem);
  } catch (err) {
    next(err);
  }
});
