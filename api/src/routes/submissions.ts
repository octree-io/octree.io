import { Router } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import { submissions } from "../db/schema.js";
import { enqueueSubmission } from "../queue/submissions.js";
import { ApiError } from "../middleware/error.js";

export const submissionsRouter = Router();

const createSubmissionSchema = z.object({
  languageId: z.number().int().positive(),
  sourceCode: z.string().min(1).max(100_000),
  stdin: z.string().max(100_000).optional(),
  expectedOutput: z.string().max(100_000).optional(),
  userId: z.string().uuid().optional(),
  problemId: z.string().uuid().optional(),
  roomId: z.string().uuid().optional(),
});

// POST /submissions — persist, enqueue, and return immediately (202).
submissionsRouter.post("/", async (req, res, next) => {
  try {
    const data = createSubmissionSchema.parse(req.body);

    const [submission] = await db
      .insert(submissions)
      .values(data)
      .returning();

    try {
      await enqueueSubmission(submission.id);
    } catch (err) {
      // Couldn't reach Redis — don't leave the row stuck in "queued".
      await db
        .update(submissions)
        .set({
          status: "failed",
          error: "Failed to enqueue submission",
          updatedAt: new Date(),
        })
        .where(eq(submissions.id, submission.id));
      throw err;
    }

    res.status(202).json({ id: submission.id, status: submission.status });
  } catch (err) {
    next(err);
  }
});

// GET /submissions/:id — poll for status + result.
submissionsRouter.get("/:id", async (req, res, next) => {
  try {
    const submission = await db.query.submissions.findFirst({
      where: eq(submissions.id, req.params.id),
    });
    if (!submission) throw new ApiError(404, "Submission not found");
    res.json(submission);
  } catch (err) {
    next(err);
  }
});
