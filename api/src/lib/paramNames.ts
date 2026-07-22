// Extract just the parameter *names* (not types) from a problem's Python
// starter signature, e.g. `def treasureHuntPair(self, nums: List[int], target: int) -> List[int]:`
// -> ["nums", "target"]. Used to label custom-test-case input fields; the
// actual value parsing/typing for execution happens in the worker harness,
// which is language-agnostic (it parses Python-literal-style text regardless
// of which language the submission runs in).
export function extractParamNames(python3Starter: string, sigName: string): string[] {
  const re = new RegExp(
    `def\\s+${sigName}\\s*\\(\\s*self\\s*,?\\s*([\\s\\S]*?)\\)\\s*(?:->\\s*[\\s\\S]*?)?\\s*:`,
  );
  const m = re.exec(python3Starter);
  if (!m) return [];
  const paramsSrc = m[1].trim();
  if (!paramsSrc) return [];

  const parts: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of paramsSrc) {
    if (ch === "[" || ch === "(" || ch === "<") depth++;
    else if (ch === "]" || ch === ")" || ch === ">") depth--;
    if (ch === "," && depth === 0) {
      parts.push(cur);
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) parts.push(cur);

  return parts.map((p) => p.split(":")[0].trim()).filter(Boolean);
}
