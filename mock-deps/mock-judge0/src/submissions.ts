import { randomUUID } from "node:crypto";
import { config, type Verdict } from "./config.js";
import { STATUS, type Status } from "./statuses.js";

// ─── wire shapes (snake_case, matching real Judge0) ─────────────────────────

export interface CreateBody {
  language_id?: number;
  source_code?: string;
  stdin?: string | null;
  expected_output?: string | null;
}

export interface SubmissionResult {
  token: string;
  status: Status;
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  message: string | null;
  time: string | null;
  memory: number | null;
}

// ─── base64 helpers ─────────────────────────────────────────────────────────

const decode = (v: string | null | undefined): string | null =>
  v == null ? null : Buffer.from(v, "base64").toString("utf-8");

const encode = (v: string | null): string | null =>
  v == null ? null : Buffer.from(v, "utf-8").toString("base64");

// ─── in-memory store ────────────────────────────────────────────────────────

interface StoredSubmission {
  token: string;
  languageId: number;
  expectedOutput: string | null; // decoded
  polls: number; // how many times the result has been fetched
  createdAt: number;
}

const store = new Map<string, StoredSubmission>();

/**
 * "Create" a submission. Nothing is executed — we just remember what was asked
 * so GET can return a deterministic dummy verdict. `base64` reflects the
 * request's base64_encoded flag (octree always sends base64).
 */
export function create(body: CreateBody, base64: boolean): string {
  const token = randomUUID();
  store.set(token, {
    token,
    languageId: body.language_id ?? 0,
    expectedOutput: base64 ? decode(body.expected_output) : (body.expected_output ?? null),
    polls: 0,
    createdAt: Date.now(),
  });
  return token;
}

export function has(token: string): boolean {
  return store.has(token);
}

/**
 * Current state of a submission. The first {@link config.processingPolls} reads
 * report a non-terminal "Processing" status; after that it resolves to a dummy
 * terminal verdict. `base64` controls whether the text fields come back encoded.
 */
export function get(token: string, base64: boolean): SubmissionResult | null {
  const rec = store.get(token);
  if (!rec) return null;

  const stillProcessing = rec.polls < config.processingPolls;
  rec.polls += 1;

  const result = stillProcessing
    ? processing()
    : terminal(config.verdict, rec.expectedOutput);

  return base64 ? encodeFields(result, token) : { ...result, token };
}

function processing(): Omit<SubmissionResult, "token"> {
  return {
    status: STATUS.PROCESSING,
    stdout: null,
    stderr: null,
    compile_output: null,
    message: null,
    time: null,
    memory: null,
  };
}

// Build a terminal (final) dummy result for the configured verdict. For "auto"
// we echo the expected output as stdout so equality checks pass.
function terminal(verdict: Verdict, expected: string | null): Omit<SubmissionResult, "token"> {
  const base = {
    status: STATUS.ACCEPTED as Status,
    stdout: null as string | null,
    stderr: null as string | null,
    compile_output: null as string | null,
    message: null as string | null,
    time: "0.012",
    memory: 3072,
  };

  switch (verdict) {
    case "wrong_answer":
      return { ...base, status: STATUS.WRONG_ANSWER, stdout: "mock: unexpected output\n" };
    case "tle":
      return { ...base, status: STATUS.TIME_LIMIT_EXCEEDED, stdout: null, time: "5.0" };
    case "compile_error":
      return {
        ...base,
        status: STATUS.COMPILATION_ERROR,
        time: null,
        memory: null,
        compile_output: "mock: simulated compilation error\n",
      };
    case "runtime_error":
      return {
        ...base,
        status: STATUS.RUNTIME_ERROR_SIGSEGV,
        stderr: "mock: simulated runtime error\n",
      };
    case "accepted":
    case "auto":
    default:
      return {
        ...base,
        // Echo expected output when we have it (so a checker sees a match),
        // otherwise a generic stdout line.
        stdout:
          expected != null
            ? expected.endsWith("\n")
              ? expected
              : `${expected}\n`
            : "mock stdout\n",
      };
  }
}

function encodeFields(r: Omit<SubmissionResult, "token">, token: string): SubmissionResult {
  return {
    token,
    status: r.status,
    stdout: encode(r.stdout),
    stderr: encode(r.stderr),
    compile_output: encode(r.compile_output),
    message: encode(r.message),
    time: r.time,
    memory: r.memory,
  };
}

/** Pick only the requested `fields` (Judge0 honours the query param). */
export function pickFields(
  result: SubmissionResult,
  fields: string | null,
): Partial<SubmissionResult> {
  if (!fields) return result;
  const wanted = new Set(fields.split(",").map((f) => f.trim()));
  const out: Partial<SubmissionResult> = {};
  for (const key of Object.keys(result) as (keyof SubmissionResult)[]) {
    if (wanted.has(key)) {
      out[key] = result[key] as never;
    }
  }
  return out;
}
