import { eq, asc } from "drizzle-orm";
import { db } from "./db/index.js";
import { submissions, problems, testCases } from "./db/schema.js";
import { createSubmission, waitForResult } from "./clients/judge0.js";
import {
  buildProgram,
  gradeCases,
  langForId,
  HarnessError,
  type TestCaseInput,
} from "./harness/index.js";

// How many of a problem's test cases a "run" (as opposed to "submit") executes.
const RUN_SAMPLE_CASES = 3;

/**
 * Execute one queued submission end-to-end. Two shapes:
 *
 *  - Graded (problemId + mode set): build a single program that runs the user's
 *    solution against the problem's test cases, execute it on Judge0, and grade
 *    the structured output per case.
 *  - Raw (otherwise): run source+stdin and store stdout/stderr as-is.
 *
 * Throws on transient failures so BullMQ can retry. Deterministic failures
 * (e.g. an un-harnessable problem) are recorded as `failed` without throwing.
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

  if (submission.mode && submission.problemId) {
    await processGraded(submissionId, submission);
  } else {
    await processRaw(submissionId, submission);
  }
}

type SubmissionRow = NonNullable<
  Awaited<ReturnType<typeof db.query.submissions.findFirst>>
>;

/** Graded run: user solution vs. the problem's test cases. */
async function processGraded(
  submissionId: number,
  submission: SubmissionRow,
): Promise<void> {
  const lang = langForId(submission.languageId);
  if (!lang) {
    await recordFailure(submissionId, `Unsupported language id ${submission.languageId}`);
    return;
  }

  const problem = await db.query.problems.findFirst({
    where: eq(problems.id, submission.problemId!),
  });
  if (!problem || !problem.starterCode) {
    await recordFailure(submissionId, "Problem or starter code not found");
    return;
  }

  const allCases = await db
    .select({
      ordinal: testCases.ordinal,
      input: testCases.input,
      expectedOutput: testCases.expectedOutput,
    })
    .from(testCases)
    .where(eq(testCases.problemId, submission.problemId!))
    .orderBy(asc(testCases.ordinal));

  if (allCases.length === 0) {
    await recordFailure(submissionId, "This problem has no test cases");
    return;
  }

  const cases: TestCaseInput[] =
    submission.mode === "run" ? allCases.slice(0, RUN_SAMPLE_CASES) : allCases;

  // Build the runnable program. HarnessError here is a deterministic problem
  // (unsupported types, bad signature) — record it, don't retry.
  let built;
  try {
    built = buildProgram(submission.languageId, submission.sourceCode, problem.starterCode, cases);
  } catch (err) {
    if (err instanceof HarnessError) {
      await recordFailure(submissionId, err.message);
      return;
    }
    throw err;
  }

  const token = await createSubmission({
    languageId: submission.languageId,
    sourceCode: built.source,
  });

  await db
    .update(submissions)
    .set({ judge0Token: token, updatedAt: new Date() })
    .where(eq(submissions.id, submissionId));

  const result = await waitForResult(token);
  const stdout = result.stdout ?? "";
  const graded = gradeCases(cases, stdout, built.parseErrors);
  const passed = graded.filter((g) => g.passed).length;

  // A compile error (or crash before any case ran) leaves no structured output;
  // surface the compiler/runtime message so the UI can show it.
  const producedOutput = graded.some((g) => g.error === null || g.runtimeMs > 0 || g.got !== "");
  const buildError =
    !producedOutput && (result.compileOutput || result.stderr)
      ? (result.compileOutput || result.stderr || "").trim()
      : null;

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
      results: graded,
      testsPassed: passed,
      testsTotal: graded.length,
      error: buildError,
      finishedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(submissions.id, submissionId));
}

/** Raw run: execute source+stdin verbatim (backwards-compatible path). */
async function processRaw(
  submissionId: number,
  submission: SubmissionRow,
): Promise<void> {
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

/** Mark a submission failed for a deterministic reason (no retry). */
async function recordFailure(submissionId: number, error: string): Promise<void> {
  await db
    .update(submissions)
    .set({ status: "failed", error, finishedAt: new Date(), updatedAt: new Date() })
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
