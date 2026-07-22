// Ad-hoc validation: build+run a few real problems across all 4 languages on
// the live Judge0 and grade the reference solutions. Not part of the app.
//   tsx src/harness/_validate.ts [problemId ...]
import postgres from "postgres";
import { buildProgram, gradeCases, LANGUAGE_IDS, type TestCaseInput } from "./index.js";

const DB = process.env.DATABASE_URL ?? "postgresql://postgres@localhost:5432/octree";

// Hand-written correct solutions, so Java/C++/JS harnesses get truly graded
// (we only have Python reference solutions in the DB). Keyed by problem id.
const FIXTURES: Record<number, Partial<Record<string, string>>> = {
  1: {
    javascript: `var treasureHuntPair = function(nums, target) {
  const m = {};
  for (let i = 0; i < nums.length; i++) {
    if (m[target - nums[i]] !== undefined) return [m[target - nums[i]], i];
    m[nums[i]] = i;
  }
  return [];
};`,
    java: `class Solution {
  public int[] treasureHuntPair(int[] nums, int target) {
    Map<Integer,Integer> m = new HashMap<>();
    for (int i = 0; i < nums.length; i++) {
      if (m.containsKey(target - nums[i])) return new int[]{m.get(target - nums[i]), i};
      m.put(nums[i], i);
    }
    return new int[]{};
  }
}`,
    cpp: `class Solution {
public:
  vector<int> treasureHuntPair(vector<int>& nums, int target) {
    unordered_map<int,int> m;
    for (int i = 0; i < (int)nums.size(); i++) {
      if (m.count(target - nums[i])) return {m[target - nums[i]], i};
      m[nums[i]] = i;
    }
    return {};
  }
};`,
  },
  183: {
    javascript: `var secretMessageChecker = function(s) {
  const t = s.toLowerCase().replace(/[^a-z0-9]/g, '');
  let i = 0, j = t.length - 1;
  while (i < j) { if (t[i] !== t[j]) return false; i++; j--; }
  return true;
};`,
    java: `class Solution {
  public boolean secretMessageChecker(String s) {
    StringBuilder b = new StringBuilder();
    for (char c : s.toLowerCase().toCharArray()) if (Character.isLetterOrDigit(c)) b.append(c);
    int i = 0, j = b.length() - 1;
    while (i < j) { if (b.charAt(i) != b.charAt(j)) return false; i++; j--; }
    return true;
  }
}`,
    cpp: `class Solution {
public:
  bool secretMessageChecker(string s) {
    string t;
    for (char c : s) if (isalnum((unsigned char)c)) t += tolower(c);
    int i = 0, j = (int)t.size() - 1;
    while (i < j) { if (t[i] != t[j]) return false; i++; j--; }
    return true;
  }
};`,
  },
  47: {
    javascript: `var deepestDungeonLevel = function(root) {
  if (!root) return 0;
  return 1 + Math.max(deepestDungeonLevel(root.left), deepestDungeonLevel(root.right));
};`,
    java: `class Solution {
  public int deepestDungeonLevel(TreeNode root) {
    if (root == null) return 0;
    return 1 + Math.max(deepestDungeonLevel(root.left), deepestDungeonLevel(root.right));
  }
}`,
    cpp: `class Solution {
public:
  int deepestDungeonLevel(TreeNode* root) {
    if (!root) return 0;
    return 1 + max(deepestDungeonLevel(root->left), deepestDungeonLevel(root->right));
  }
};`,
  },
  476: {
    javascript: `var islandCableNetwork = function(points) {
  const n = points.length;
  if (n <= 1) return 0;
  const dist = new Array(n).fill(Infinity);
  const used = new Array(n).fill(false);
  dist[0] = 0; let total = 0;
  for (let it = 0; it < n; it++) {
    let u = -1;
    for (let v = 0; v < n; v++) if (!used[v] && (u === -1 || dist[v] < dist[u])) u = v;
    used[u] = true; total += dist[u];
    for (let v = 0; v < n; v++) if (!used[v]) {
      const d = Math.abs(points[u][0]-points[v][0]) + Math.abs(points[u][1]-points[v][1]);
      if (d < dist[v]) dist[v] = d;
    }
  }
  return total;
};`,
    java: `class Solution {
  public int islandCableNetwork(int[][] points) {
    int n = points.length;
    if (n <= 1) return 0;
    long[] dist = new long[n];
    boolean[] used = new boolean[n];
    Arrays.fill(dist, Long.MAX_VALUE);
    dist[0] = 0; long total = 0;
    for (int it = 0; it < n; it++) {
      int u = -1;
      for (int v = 0; v < n; v++) if (!used[v] && (u == -1 || dist[v] < dist[u])) u = v;
      used[u] = true; total += dist[u];
      for (int v = 0; v < n; v++) if (!used[v]) {
        long d = Math.abs(points[u][0]-points[v][0]) + Math.abs(points[u][1]-points[v][1]);
        if (d < dist[v]) dist[v] = d;
      }
    }
    return (int) total;
  }
}`,
    cpp: `class Solution {
public:
  int islandCableNetwork(vector<vector<int>>& points) {
    int n = points.size();
    if (n <= 1) return 0;
    vector<long long> dist(n, LLONG_MAX);
    vector<bool> used(n, false);
    dist[0] = 0; long long total = 0;
    for (int it = 0; it < n; it++) {
      int u = -1;
      for (int v = 0; v < n; v++) if (!used[v] && (u == -1 || dist[v] < dist[u])) u = v;
      used[u] = true; total += dist[u];
      for (int v = 0; v < n; v++) if (!used[v]) {
        long long d = abs(points[u][0]-points[v][0]) + abs(points[u][1]-points[v][1]);
        if (d < dist[v]) dist[v] = d;
      }
    }
    return (int) total;
  }
};`,
  },
};

function pythonWithAlias(solution: string, sigName: string): string {
  // Reference solutions define their own method name (e.g. `solve`); alias it to
  // the disguised signature name the harness calls.
  const m = /def\s+(\w+)\s*\(\s*self\b/.exec(solution);
  if (!m || m[1] === sigName) return solution;
  return `${solution}\nSolution.${sigName} = Solution.${m[1]}\n`;
}
const JUDGE0 = (process.env.JUDGE0_URL ?? "http://localhost:2358").replace(/\/+$/, "");

const b64 = (s: string) => Buffer.from(s, "utf-8").toString("base64");
const unb64 = (s: string | null) => (s ? Buffer.from(s, "base64").toString("utf-8") : "");

async function runOnJudge0(languageId: number, source: string) {
  const res = await fetch(`${JUDGE0}/submissions?base64_encoded=true&wait=true`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ language_id: languageId, source_code: b64(source) }),
  });
  if (!res.ok) throw new Error(`Judge0 ${res.status}: ${await res.text()}`);
  const d = (await res.json()) as any;
  return {
    status: d.status?.description,
    stdout: unb64(d.stdout),
    stderr: unb64(d.stderr),
    compile: unb64(d.compile_output),
  };
}

async function main() {
  const sql = postgres(DB);
  const ids = process.argv.slice(2).map(Number);
  const idFilter = ids.length ? ids : [1, 183, 47, 476, 53];
  const probs = await sql`
    select id, slug, solution, starter_code from problems
    where id = any(${idFilter}) order by id`;

  for (const p of probs) {
    const starter = p.starter_code as Record<string, string>;
    const rows = await sql`
      select ordinal, input, expected_output from test_cases
      where problem_id = ${p.id} order by ordinal limit 6`;
    const cases: TestCaseInput[] = rows.map((r: any) => ({
      ordinal: r.ordinal,
      input: r.input,
      expectedOutput: r.expected_output,
    }));

    console.log(`\n${"=".repeat(72)}\n[${p.id}] ${p.slug}  (sig=${starter.signature})`);

    for (const [lang, languageId] of Object.entries(LANGUAGE_IDS)) {
      // Use the reference solution for Python; for other langs we don't have a
      // reference impl, so only Python actually grades — others just check the
      // harness compiles/runs (they'll "fail" grading with empty solutions).
      const userCode =
        lang === "python"
          ? pythonWithAlias(p.solution as string, starter.signature)
          : FIXTURES[p.id]?.[lang] ?? (starter[lang] as string);
      try {
        const { source } = buildProgram(languageId, userCode, starter, cases);
        const out = await runOnJudge0(languageId, source);
        const graded = gradeCases(cases, out.stdout);
        const passed = graded.filter((g) => g.passed).length;
        const tag = out.compile || (!out.stdout && out.stderr) ? "BUILD/RUNERR" : "";
        console.log(
          `  ${lang.padEnd(11)} ${out.status?.padEnd(20)} ${passed}/${graded.length} passed ${tag}`,
        );
        if (tag) {
          console.log("    compile:", (out.compile || out.stderr).split("\n").slice(0, 6).join("\n    "));
        } else if (lang === "python" && passed < graded.length) {
          for (const g of graded.filter((x) => !x.passed).slice(0, 3))
            console.log(`    #${g.ordinal} in=${g.input} exp=${JSON.stringify(g.expected)} got=${JSON.stringify(g.got)} err=${g.error ?? ""}`);
        }
      } catch (e) {
        console.log(`  ${lang.padEnd(11)} HARNESS ERROR: ${e instanceof Error ? e.message : e}`);
      }
    }
  }
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
