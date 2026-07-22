import { Queue } from "bullmq";
import { connection } from "./connection.js";

export const SUBMISSIONS_QUEUE = "submissions";

/** Payload carried on the queue — just the id; the worker loads the row. */
export interface SubmissionJobData {
  submissionId: number;
}

export const submissionsQueue = new Queue<SubmissionJobData>(
  SUBMISSIONS_QUEUE,
  {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
    },
  },
);

/** Enqueue a submission for execution. Keyed by submission id for idempotency. */
export async function enqueueSubmission(submissionId: number): Promise<void> {
  await submissionsQueue.add(
    "execute",
    { submissionId },
    // Keyed by submission id for idempotency. Prefixed because BullMQ rejects
    // job ids that are bare integers (numeric strings).
    { jobId: `submission-${submissionId}` },
  );
}
