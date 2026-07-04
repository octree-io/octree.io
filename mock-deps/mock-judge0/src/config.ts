// Load a local .env if present (Node >= 20.6). Best-effort — the mock has sane
// defaults and needs no configuration to run.
try {
  process.loadEnvFile?.();
} catch {
  /* no .env file — fine */
}

export type Verdict =
  | "auto"
  | "accepted"
  | "wrong_answer"
  | "tle"
  | "compile_error"
  | "runtime_error";

const VERDICTS: readonly Verdict[] = [
  "auto",
  "accepted",
  "wrong_answer",
  "tle",
  "compile_error",
  "runtime_error",
];

function parseVerdict(raw: string | undefined): Verdict {
  const v = (raw ?? "auto").toLowerCase();
  return (VERDICTS as readonly string[]).includes(v) ? (v as Verdict) : "auto";
}

export const config = {
  port: parseInt(process.env.PORT ?? "2358", 10),
  // Non-terminal polls before a result resolves, so the worker's polling loop
  // is actually exercised.
  processingPolls: Math.max(0, parseInt(process.env.MOCK_PROCESSING_POLLS ?? "1", 10)),
  verdict: parseVerdict(process.env.MOCK_VERDICT),
  authToken: process.env.JUDGE0_AUTH_TOKEN || null,
} as const;
