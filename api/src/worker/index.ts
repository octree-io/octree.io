import { Worker } from "bullmq";
import { env } from "../config.js";
import { connection } from "../queue/connection.js";
import {
  SUBMISSIONS_QUEUE,
  type SubmissionJobData,
} from "../queue/submissions.js";
import { markSubmissionFailed, processSubmission } from "./processor.js";

const worker = new Worker<SubmissionJobData>(
  SUBMISSIONS_QUEUE,
  async (job) => {
    await processSubmission(job.data.submissionId);
  },
  {
    connection,
    concurrency: env.worker.concurrency,
  },
);

worker.on("completed", (job) => {
  console.log(`[worker] submission ${job.data.submissionId} completed`);
});

worker.on("failed", async (job, err) => {
  if (!job) {
    console.error("[worker] job failed:", err.message);
    return;
  }

  const attemptsMade = job.attemptsMade;
  const maxAttempts = job.opts.attempts ?? 1;
  console.error(
    `[worker] submission ${job.data.submissionId} failed ` +
      `(attempt ${attemptsMade}/${maxAttempts}): ${err.message}`,
  );

  // Only flip the DB row once retries are exhausted.
  if (attemptsMade >= maxAttempts) {
    await markSubmissionFailed(job.data.submissionId, err.message).catch((e) =>
      console.error("[worker] failed to mark submission failed:", e),
    );
  }
});

worker.on("error", (err) => {
  console.error("[worker] error:", err.message);
});

console.log(
  `[worker] listening on "${SUBMISSIONS_QUEUE}" ` +
    `(concurrency ${env.worker.concurrency}, judge0 ${env.judge0.url})`,
);

async function shutdown(signal: string): Promise<void> {
  console.log(`[worker] received ${signal}, shutting down…`);
  await worker.close();
  await connection.quit();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
