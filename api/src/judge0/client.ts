import { env } from "../config.js";

// ─── Judge0 status ids ─────────────────────────────────────────────────────────
// https://ce.judge0.com — 1: In Queue, 2: Processing are non-terminal; everything
// else (Accepted, Wrong Answer, errors, …) is terminal.
export const JUDGE0_IN_QUEUE = 1;
export const JUDGE0_PROCESSING = 2;

export interface Judge0Status {
  id: number;
  description: string;
}

/** A decoded Judge0 submission result (base64 fields already decoded). */
export interface Judge0Result {
  token: string;
  status: Judge0Status;
  stdout: string | null;
  stderr: string | null;
  compileOutput: string | null;
  message: string | null;
  time: string | null;
  memory: number | null;
}

export interface CreateSubmissionInput {
  languageId: number;
  sourceCode: string;
  stdin?: string | null;
  expectedOutput?: string | null;
}

export class Judge0Error extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly body?: string,
  ) {
    super(message);
    this.name = "Judge0Error";
  }
}

const encode = (value: string): string =>
  Buffer.from(value, "utf-8").toString("base64");

const decode = (value: string | null | undefined): string | null =>
  value ? Buffer.from(value, "base64").toString("utf-8") : null;

function authHeaders(): Record<string, string> {
  return env.judge0.authToken
    ? { "X-Auth-Token": env.judge0.authToken }
    : {};
}

/**
 * Create a submission on Judge0 without blocking for the result (`wait=false`),
 * so the worker owns the polling loop. Returns the submission token.
 */
export async function createSubmission(
  input: CreateSubmissionInput,
): Promise<string> {
  const url = `${env.judge0.url}/submissions?base64_encoded=true&wait=false`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({
      language_id: input.languageId,
      source_code: encode(input.sourceCode),
      stdin: input.stdin != null ? encode(input.stdin) : undefined,
      expected_output:
        input.expectedOutput != null ? encode(input.expectedOutput) : undefined,
    }),
  });

  if (!res.ok) {
    throw new Judge0Error(
      `Judge0 create submission failed (${res.status})`,
      res.status,
      await res.text().catch(() => undefined),
    );
  }

  const data = (await res.json()) as { token?: string };
  if (!data.token) {
    throw new Judge0Error("Judge0 did not return a submission token");
  }
  return data.token;
}

const RESULT_FIELDS = [
  "token",
  "status",
  "stdout",
  "stderr",
  "compile_output",
  "message",
  "time",
  "memory",
].join(",");

/** Fetch a single submission's current state and decode its base64 fields. */
export async function getSubmission(token: string): Promise<Judge0Result> {
  const url = `${env.judge0.url}/submissions/${token}?base64_encoded=true&fields=${RESULT_FIELDS}`;

  const res = await fetch(url, { headers: authHeaders() });

  if (!res.ok) {
    throw new Judge0Error(
      `Judge0 get submission failed (${res.status})`,
      res.status,
      await res.text().catch(() => undefined),
    );
  }

  const data = (await res.json()) as {
    token: string;
    status: Judge0Status;
    stdout: string | null;
    stderr: string | null;
    compile_output: string | null;
    message: string | null;
    time: string | null;
    memory: number | null;
  };

  return {
    token: data.token,
    status: data.status,
    stdout: decode(data.stdout),
    stderr: decode(data.stderr),
    compileOutput: decode(data.compile_output),
    message: decode(data.message),
    time: data.time,
    memory: data.memory,
  };
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Poll Judge0 until the submission reaches a terminal status or we run out of
 * attempts. Throws {@link Judge0Error} on timeout so the job is retried/failed.
 */
export async function waitForResult(
  token: string,
  {
    intervalMs = env.worker.pollIntervalMs,
    maxAttempts = env.worker.maxPollAttempts,
  }: { intervalMs?: number; maxAttempts?: number } = {},
): Promise<Judge0Result> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await getSubmission(token);
    if (
      result.status.id !== JUDGE0_IN_QUEUE &&
      result.status.id !== JUDGE0_PROCESSING
    ) {
      return result;
    }
    await sleep(intervalMs);
  }

  throw new Judge0Error(
    `Judge0 result timed out after ${maxAttempts} attempts (token ${token})`,
  );
}
