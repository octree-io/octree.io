// Wire protocol between the generated driver (running on Judge0) and the worker.
//
// The driver prints exactly one line per test case:
//   <RS><index><RS>OK<RS><ms><RS><base64(output)><RS><base64(capturedStdout)>
//   <RS><index><RS>ERR<RS>0<RS><base64(message)><RS><base64(capturedStdout)>
// where RS is the ASCII record separator. base64 keeps arbitrary output
// (newlines, unicode) on a single parseable line. `capturedStdout` is whatever
// the user's own code printed during that case (each language's driver
// redirects stdout per-case so it can be shown back to the user, e.g. in an
// expandable test-case row) — it never contains the expected/hidden answer,
// since that's only compared afterward in the worker, not injected into the
// generated program.

export const RS = "\x1e";

export interface CaseResult {
  index: number;
  ok: boolean;
  timeMs: number;
  output: string; // decoded return-value payload (ok) or error message (err)
  stdout: string; // decoded stdout the solution itself printed during this case
}

/** Parse the driver's stdout into a map of case index -> result. */
export function parseDriverOutput(stdout: string): Map<number, CaseResult> {
  const results = new Map<number, CaseResult>();
  for (const line of stdout.split("\n")) {
    if (!line.startsWith(RS)) continue;
    const parts = line.split(RS);
    // parts[0] is "" (leading RS). Expect: "", index, status, ms, payload, stdout
    if (parts.length < 5) continue;
    const index = Number(parts[1]);
    if (!Number.isInteger(index)) continue;
    const ok = parts[2] === "OK";
    const timeMs = Number(parts[3]) || 0;
    const b64decode = (s: string | undefined) => {
      if (!s) return "";
      try {
        return Buffer.from(s, "base64").toString("utf-8");
      } catch {
        return "";
      }
    };
    const output = b64decode(parts[4]);
    const caseStdout = b64decode(parts[5]);
    results.set(index, { index, ok, timeMs, output, stdout: caseStdout });
  }
  return results;
}
