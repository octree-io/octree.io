import { Router } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import { problems } from "../db/schema.js";
import { ApiError } from "../middleware/error.js";
import { humanizeTitle } from "../lib/humanizeTitle.js";
import { extractParamNames } from "../lib/paramNames.js";

export const problemsRouter = Router();

// Columns safe to expose to clients — never the reference `solution`.
const PUBLIC_COLUMNS = {
  id: true,
  slug: true,
  title: true,
  description: true,
  difficulty: true,
  tags: true,
  isPublished: true,
  createdAt: true,
  starterCode: true,
} as const;

// GET /problems
problemsRouter.get("/", async (_req, res, next) => {
  try {
    const rows = await db.query.problems.findMany({
      where: eq(problems.isPublished, true),
      columns: PUBLIC_COLUMNS,
      orderBy: (p, { asc }) => [asc(p.difficulty), asc(p.title)],
    });
    res.json(rows.map((p) => ({ ...p, title: humanizeTitle(p.title) })));
  } catch (err) {
    next(err);
  }
});

// GET /problems/:slug — problem name + description (no solution).
problemsRouter.get("/:slug", async (req, res, next) => {
  try {
    const problem = await db.query.problems.findFirst({
      where: eq(problems.slug, req.params.slug),
      columns: PUBLIC_COLUMNS,
    });
    if (!problem) throw new ApiError(404, "Problem not found");
    const sc = problem.starterCode;
    // Param names for building the custom-test-case input form. Best-effort —
    // an empty array just means that UI can't offer per-param fields.
    const paramNames =
      sc?.python3 && sc?.signature ? extractParamNames(sc.python3, sc.signature) : [];
    res.json({ ...problem, title: humanizeTitle(problem.title), paramNames });
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
