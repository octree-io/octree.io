// End-to-end: insert real submission rows and run them through the actual
// worker processor (buildProgram -> Judge0 -> grade -> DB), then read back.
//   tsx src/harness/_e2e.ts
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { submissions } from "../db/schema.js";
import { processSubmission } from "../processor.js";

async function scenario(
  label: string,
  row: { problemId: number; languageId: number; sourceCode: string; mode: "run" | "submit" },
) {
  const [ins] = await db
    .insert(submissions)
    .values({ ...row, status: "queued" })
    .returning({ id: submissions.id });
  await processSubmission(ins.id);
  const s = await db.query.submissions.findFirst({ where: eq(submissions.id, ins.id) });
  const passed = s?.testsPassed ?? 0;
  const total = s?.testsTotal ?? 0;
  console.log(`\n### ${label}`);
  console.log(`   status=${s?.status} judge0=${s?.judge0StatusDescription} tests=${passed}/${total}`);
  if (s?.error) console.log(`   error: ${s.error.split("\n")[0]}`);
  for (const r of (s?.results ?? []).slice(0, 4) as any[])
    console.log(`   #${r.ordinal} ${r.passed ? "PASS" : "FAIL"} in=${r.input} exp=${JSON.stringify(r.expected)} got=${JSON.stringify(r.got)}${r.error ? " err=" + r.error.split("\n").slice(-1)[0] : ""} ${r.runtimeMs}ms`);
}

async function main() {
  // two-sum, signature = treasureHuntPair
  await scenario("Python correct (submit)", {
    problemId: 1, languageId: 71, mode: "submit",
    sourceCode: `class Solution:
    def treasureHuntPair(self, nums, target):
        seen = {}
        for i, x in enumerate(nums):
            if target - x in seen: return [seen[target - x], i]
            seen[x] = i
        return []`,
  });

  await scenario("JavaScript correct (run)", {
    problemId: 1, languageId: 63, mode: "run",
    sourceCode: `var treasureHuntPair = function(nums, target) {
  const m = {};
  for (let i = 0; i < nums.length; i++) {
    if (m[target - nums[i]] !== undefined) return [m[target - nums[i]], i];
    m[nums[i]] = i;
  }
  return [];
};`,
  });

  await scenario("Python wrong answer (submit)", {
    problemId: 1, languageId: 71, mode: "submit",
    sourceCode: `class Solution:
    def treasureHuntPair(self, nums, target):
        return []`,
  });

  await scenario("C++ compile error (run)", {
    problemId: 1, languageId: 54, mode: "run",
    sourceCode: `class Solution {
public:
    vector<int> treasureHuntPair(vector<int>& nums, int target) {
        this is not valid c++
    }
};`,
  });

  await scenario("Java runtime error (run)", {
    problemId: 1, languageId: 62, mode: "run",
    sourceCode: `class Solution {
    public int[] treasureHuntPair(int[] nums, int target) {
        int[] x = new int[1];
        return new int[]{ x[5], nums[0] };
    }
}`,
  });

  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
