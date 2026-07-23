// Sweep every problem's Python reference solution through the harness on Judge0
// to measure coverage. tsx src/harness/_sweep.ts
import postgres from "postgres";
import { buildProgram, gradeCases, LANGUAGE_IDS, HarnessError, type TestCaseInput } from "./index.js";

const DB = process.env.DATABASE_URL ?? "postgresql://postgres@localhost:5432/octree";
const JUDGE0 = (process.env.JUDGE0_URL ?? "http://localhost:2358").replace(/\/+$/, "");
const b64 = (s: string) => Buffer.from(s, "utf-8").toString("base64");
const unb64 = (s: string | null) => (s ? Buffer.from(s, "base64").toString("utf-8") : "");

function alias(solution: string, sig: string): string {
  // Reference solutions may embed their own `class TreeNode`/`ListNode` (whose
  // __init__ we must skip); the real method lives after `class Solution`.
  const clsIdx = solution.indexOf("class Solution");
  const scope = clsIdx >= 0 ? solution.slice(clsIdx) : solution;
  const m = /def\s+(?!__init__)(\w+)\s*\(\s*self\b/.exec(scope);
  if (!m || m[1] === sig) return solution;
  return `${solution}\nSolution.${sig} = Solution.${m[1]}\n`;
}

async function run(source: string) {
  const res = await fetch(`${JUDGE0}/submissions?base64_encoded=true&wait=true`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ language_id: LANGUAGE_IDS.python, source_code: b64(source) }),
  });
  const d = (await res.json()) as any;
  return { stdout: unb64(d.stdout), stderr: unb64(d.stderr) };
}

async function main() {
  const sql = postgres(DB);
  const probs = await sql`
    select id, slug, solution, starter_code from problems
    where solution is not null and exists (select 1 from test_cases t where t.problem_id = problems.id)
    order by id`;

  const buckets = { perfect: 0, partial: 0, harness: 0, zero: 0 };
  const problems: string[] = [];
  for (const p of probs) {
    const starter = p.starter_code as Record<string, string>;
    const rows = await sql`select ordinal, input, expected_output from test_cases where problem_id=${p.id} order by ordinal limit 8`;
    const cases: TestCaseInput[] = rows.map((r: any) => ({ ordinal: r.ordinal, input: r.input, expectedOutput: r.expected_output }));
    try {
      const { source, parseErrors } = buildProgram(LANGUAGE_IDS.python, alias(p.solution as string, starter.signature), starter, cases);
      const out = await run(source);
      const graded = gradeCases(cases, out.stdout, parseErrors);
      const passed = graded.filter((g) => g.passed).length;
      if (passed === graded.length) buckets.perfect++;
      else if (passed === 0) { buckets.zero++; problems.push(`[${p.id}] ${p.slug} 0/${graded.length} :: ${graded[0]?.error?.split("\n").slice(-2)[0] ?? `exp=${graded[0]?.expected} got=${graded[0]?.got}`}`); }
      else { buckets.partial++; problems.push(`[${p.id}] ${p.slug} ${passed}/${graded.length}`); }
    } catch (e) {
      buckets.harness++;
      problems.push(`[${p.id}] ${p.slug} HARNESS: ${e instanceof HarnessError ? e.message : e}`);
    }
  }
  console.log("\n=== SUMMARY ===", JSON.stringify(buckets), "of", probs.length);
  console.log("\n=== NON-PERFECT ===");
  for (const s of problems) console.log(s);
  await sql.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
