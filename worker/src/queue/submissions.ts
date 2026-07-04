// Queue contract shared with the API producer (api/src/queue/submissions.ts).
// Keep the name and payload shape in sync on both sides.

export const SUBMISSIONS_QUEUE = "submissions";

/** Payload carried on the queue — just the id; the worker loads the row. */
export interface SubmissionJobData {
  submissionId: number;
}
