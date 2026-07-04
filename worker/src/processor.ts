import { eq } from "drizzle-orm";
import { db } from "./db/index.js";
import { submissions } from "./db/schema.js";
import { createSubmission, waitForResult } from "./clients/judge0.js";

/**
 * Execute one queued submission end-to-end:
 *   1. mark it `processing`
 *   2. push the source to Judge0 and persist the token
 *   3. poll Judge0 for the terminal result
 *   4. persist the decoded result and mark it `completed`
 *
 * Throws on any failure so BullMQ can retry. On the final attempt the worker's
 * `failed` handler flips the row to `failed` (see index.ts).
 */
export async function processSubmission(submissionId: number): Promise<void> {
  const submission = await db.query.submissions.findFirst({
    where: eq(submissions.id, submissionId),
  });

  if (!submission) {
    // Nothing to retry — the row is gone. Swallow so the job completes.
    console.warn(`[worker] submission ${submissionId} not found; skipping`);
    return;
  }

  await db
    .update(submissions)
    .set({ status: "processing", error: null, updatedAt: new Date() })
    .where(eq(submissions.id, submissionId));

  const token = await createSubmission({
    languageId: submission.languageId,
    sourceCode: submission.sourceCode,
    stdin: submission.stdin,
    expectedOutput: submission.expectedOutput,
  });

  await db
    .update(submissions)
    .set({ judge0Token: token, updatedAt: new Date() })
    .where(eq(submissions.id, submissionId));

  const result = await waitForResult(token);

  await db
    .update(submissions)
    .set({
      status: "completed",
      judge0StatusId: result.status.id,
      judge0StatusDescription: result.status.description,
      stdout: result.stdout,
      stderr: result.stderr,
      compileOutput: result.compileOutput,
      message: result.message,
      time: result.time,
      memory: result.memory,
      finishedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(submissions.id, submissionId));
}

/** Mark a submission as failed after retries are exhausted. */
export async function markSubmissionFailed(
  submissionId: number,
  error: string,
): Promise<void> {
  await db
    .update(submissions)
    .set({
      status: "failed",
      error,
      finishedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(submissions.id, submissionId));
}
