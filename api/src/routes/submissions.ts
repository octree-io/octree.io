import { Router } from "express";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import { submissions, users } from "../db/schema.js";
import { enqueueSubmission } from "../queue/submissions.js";
import { ApiError } from "../middleware/error.js";
import { resolveRoomId } from "../lib/roomSlug.js";
import {
  recordSolve,
  announceSolve,
  announceFailedSubmit,
  broadcastSolves,
} from "../realtime/roomSolves.js";

type SubmissionRow = typeof submissions.$inferSelect;

// "submit" grades against the full hidden test suite, so its expected/actual
// output must never reach the client — otherwise anyone can read the answers
// straight out of the network tab. "run" only samples a few cases for
// debugging, so its full output is fine to show. Redact server-side (not just
// in the UI) since API responses are trivially inspectable.
//
// `stdout` (whatever the solution itself printed) is kept in both modes: it's
// never the expected/hidden answer — that value is only compared afterward in
// the worker, never injected into the generated program — so showing it back
// can't leak anything the user's own code didn't already choose to print.
function redactForClient(sub: SubmissionRow): SubmissionRow {
  if (sub.mode !== "submit" || !sub.results) return sub;
  return {
    ...sub,
    results: sub.results.map(({ ordinal, input, passed, runtimeMs, error, stdout }) => ({
      ordinal,
      input,
      passed,
      runtimeMs,
      error,
      stdout,
      expected: "",
      got: "",
    })),
  };
}

// Announce a completed "submit" into the room chat — a ranked medal on the
// first pass, or a failure line otherwise — exactly once per submission.
//
// The client polls the same submission repeatedly, so we atomically claim the
// announcement by flipping `announcedAt` (WHERE announcedAt IS NULL); only the
// poll that wins that update proceeds. Caller guarantees this is a completed
// "submit" with room/problem/user context and testsTotal > 0.
async function maybeAnnounce(sub: SubmissionRow): Promise<void> {
  const [claimed] = await db
    .update(submissions)
    .set({ announcedAt: new Date() })
    .where(and(eq(submissions.id, sub.id), isNull(submissions.announcedAt)))
    .returning({ id: submissions.id });
  if (!claimed) return;

  const solver = await db.query.users.findFirst({
    where: eq(users.id, sub.userId!),
    columns: { username: true },
  });
  const name = solver?.username ?? "someone";

  if (sub.testsPassed === sub.testsTotal) {
    // First pass for this user gets a rank; a repeat pass records nothing and
    // is announced silently (recordSolve returns null).
    const rank = await recordSolve(sub.roomId!, sub.problemId!, sub.userId!);
    if (rank !== null) {
      announceSolve(sub.roomId!, name, rank);
      // Refresh the roster's finish-order medals for everyone in the room.
      await broadcastSolves(sub.roomId!, sub.problemId!);
    }
  } else {
    announceFailedSubmit(sub.roomId!, name, sub.testsPassed ?? 0, sub.testsTotal!);
  }
}

export const submissionsRouter = Router();

const createSubmissionSchema = z
  .object({
    languageId: z.number().int().positive(),
    sourceCode: z.string().min(1).max(100_000),
    stdin: z.string().max(100_000).optional(),
    expectedOutput: z.string().max(100_000).optional(),
    // "run" grades against a sample of the problem's test cases, "submit"
    // against all of them, "custom" against user-supplied ad-hoc inputs (see
    // customInputs). All three require a problemId to know what to grade.
    mode: z.enum(["run", "submit", "custom"]).optional(),
    // "custom" mode only: one Python-literal-style input string per ad-hoc
    // test case, e.g. "nums = [3, 3], target = 6".
    customInputs: z.array(z.string().min(1).max(2_000)).min(1).max(20).optional(),
    userId: z.number().int().positive().optional(),
    problemId: z.number().int().positive().optional(),
    // Accepts either the numeric room id or its URL slug (noise-tortoise-sun)
    // — the client only knows the slug from the route, so it's resolved here.
    roomId: z.union([z.number().int().positive(), z.string().min(1)]).optional(),
  })
  .refine((d) => !d.mode || d.problemId, {
    message: "problemId is required when mode is set",
    path: ["problemId"],
  })
  .refine((d) => d.mode !== "custom" || (d.customInputs && d.customInputs.length > 0), {
    message: "customInputs is required when mode is \"custom\"",
    path: ["customInputs"],
  });

// POST /submissions — persist, enqueue, and return immediately (202).
submissionsRouter.post("/", async (req, res, next) => {
  try {
    const data = createSubmissionSchema.parse(req.body);

    const roomId =
      typeof data.roomId === "string" ? resolveRoomId(data.roomId) : data.roomId ?? null;
    if (data.roomId !== undefined && roomId === null) {
      throw new ApiError(400, "Invalid roomId");
    }

    const [submission] = await db
      .insert(submissions)
      .values({ ...data, roomId })
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
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) throw new ApiError(400, "Invalid id");
    const submission = await db.query.submissions.findFirst({
      where: eq(submissions.id, id),
    });
    if (!submission) throw new ApiError(404, "Submission not found");

    if (
      submission.status === "completed" &&
      submission.mode === "submit" &&
      submission.roomId != null &&
      submission.problemId != null &&
      submission.userId != null &&
      submission.testsTotal !== null &&
      submission.testsTotal > 0
    ) {
      await maybeAnnounce(submission);
    }

    res.json(redactForClient(submission));
  } catch (err) {
    next(err);
  }
});
