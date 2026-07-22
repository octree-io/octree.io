// Canonical type system shared by every language's code generator.
//
// A problem's method signature is parsed into a list of `CType` params plus a
// return `CType`. Each language builder maps these to its own literal syntax
// and (de)serialization, so the messy per-language parsing lives here once.

export type CType =
  | { k: "int" }
  | { k: "long" }
  | { k: "double" }
  | { k: "bool" }
  | { k: "string" }
  | { k: "char" }
  | { k: "void" }
  | { k: "list"; of: CType }
  | { k: "listnode" }
  | { k: "treenode" };

export interface Signature {
  params: CType[];
  ret: CType;
}

export const T = {
  int: { k: "int" } as CType,
  long: { k: "long" } as CType,
  double: { k: "double" } as CType,
  bool: { k: "bool" } as CType,
  string: { k: "string" } as CType,
  char: { k: "char" } as CType,
  void: { k: "void" } as CType,
  listnode: { k: "listnode" } as CType,
  treenode: { k: "treenode" } as CType,
  list: (of: CType): CType => ({ k: "list", of }),
};

export class HarnessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HarnessError";
  }
}

// ─── Signature extraction helpers ────────────────────────────────────────────

/** Return the substring inside the outermost parentheses of a `sig(...)` call. */
function paramsInside(src: string, name: string): string | null {
  const start = src.indexOf(name);
  if (start === -1) return null;
  const open = src.indexOf("(", start);
  if (open === -1) return null;
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    const ch = src[i];
    if (ch === "(") depth++;
    else if (ch === ")") {
      depth--;
      if (depth === 0) return src.slice(open + 1, i);
    }
  }
  return null;
}

/** Split a parameter list on top-level commas (ignores commas inside <> [] ()). */
export function splitParams(src: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of src) {
    if (ch === "<" || ch === "[" || ch === "(") depth++;
    else if (ch === ">" || ch === "]" || ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(cur);
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) parts.push(cur);
  return parts.map((p) => p.trim()).filter(Boolean);
}

// ─── C++ ─────────────────────────────────────────────────────────────────────

function cppType(raw: string): CType {
  let t = raw.replace(/\bconst\b/g, "").replace(/&/g, "").trim();
  // vector<...>
  const vec = /^(?:std::)?vector\s*<(.+)>$/.exec(t);
  if (vec) return T.list(cppType(vec[1]));
  if (/ListNode\s*\*/.test(t)) return T.listnode;
  if (/TreeNode\s*\*/.test(t)) return T.treenode;
  t = t.replace(/\*/g, "").trim();
  if (t === "int") return T.int;
  if (/^(long long|long|int64_t|size_t)$/.test(t)) return T.long;
  if (/^(uint32_t|unsigned|unsigned int|uint64_t)$/.test(t)) return T.long;
  if (t === "double" || t === "float") return T.double;
  if (t === "bool") return T.bool;
  if (t === "char") return T.char;
  if (t === "string" || t === "std::string") return T.string;
  if (t === "void") return T.void;
  throw new HarnessError(`Unsupported C++ type: "${raw}"`);
}

export function parseCppSignature(starter: string, name: string): Signature {
  const paramsSrc = paramsInside(starter, name);
  if (paramsSrc === null)
    throw new HarnessError(`Could not find method "${name}" in C++ starter`);
  // Return type: the token(s) between the previous line boundary/`public:` and
  // the method name. Grab everything up to `name(`.
  const before = starter.slice(0, starter.indexOf(name + "("));
  const retMatch = /([\w:<>,\s*&]+?)\s*$/.exec(before.trimEnd());
  const retRaw = (retMatch ? retMatch[1] : "void").trim().split(/\s+/).slice(-1);
  // The above only keeps the last token; instead re-extract the full type by
  // taking the tail of `before` after the last `{`, `;`, or newline.
  const tail = before.split(/[{};\n]/).pop() ?? "";
  const retType = tail.trim() || "void";
  const params = splitParams(paramsSrc).map((p) => {
    // strip the parameter name (last identifier)
    const cleaned = p.replace(/\b[A-Za-z_]\w*\s*$/, "").trim() || p;
    return cppType(cleaned);
  });
  return { params, ret: cppType(retType) };
}

// ─── Java ────────────────────────────────────────────────────────────────────

function javaType(raw: string): CType {
  let t = raw.trim();
  // arrays: int[], int[][], char[][], String[]
  const arr = /^(.*?)((?:\s*\[\s*\])+)$/.exec(t);
  if (arr) {
    const dims = (arr[2].match(/\[/g) || []).length;
    let inner = javaType(arr[1].trim());
    for (let i = 0; i < dims; i++) inner = T.list(inner);
    return inner;
  }
  const gen = /^List\s*<(.+)>$/.exec(t);
  if (gen) return T.list(javaType(gen[1].trim()));
  if (t === "Integer" || t === "int") return T.int;
  if (t === "Long" || t === "long") return T.long;
  if (t === "Double" || t === "double" || t === "Float" || t === "float")
    return T.double;
  if (t === "Boolean" || t === "boolean") return T.bool;
  if (t === "Character" || t === "char") return T.char;
  if (t === "String") return T.string;
  if (t === "ListNode") return T.listnode;
  if (t === "TreeNode") return T.treenode;
  if (t === "void") return T.void;
  throw new HarnessError(`Unsupported Java type: "${raw}"`);
}

export function parseJavaSignature(starter: string, name: string): Signature {
  const paramsSrc = paramsInside(starter, name);
  if (paramsSrc === null)
    throw new HarnessError(`Could not find method "${name}" in Java starter`);
  const before = starter.slice(0, starter.indexOf(name + "("));
  // e.g. "class Solution {\n    public int[] ", tail token is the return type.
  const tokens = before.trim().split(/\s+/);
  const retType = tokens[tokens.length - 1] || "void";
  const params = splitParams(paramsSrc).map((p) => {
    const cleaned = p.replace(/\b[A-Za-z_]\w*\s*$/, "").trim() || p;
    return javaType(cleaned);
  });
  return { params, ret: javaType(retType) };
}

// ─── Python 3 (used for Python + JavaScript targets) ─────────────────────────

function pyType(raw: string): CType {
  let t = raw.trim();
  const opt = /^Optional\s*\[(.+)\]$/.exec(t);
  if (opt) t = opt[1].trim();
  const lst = /^List\s*\[(.+)\]$/.exec(t);
  if (lst) return T.list(pyType(lst[1].trim()));
  if (t === "int") return T.int;
  if (t === "float") return T.double;
  if (t === "bool") return T.bool;
  if (t === "str") return T.string;
  if (t === "None" || t === "") return T.void;
  if (/ListNode/.test(t)) return T.listnode;
  if (/TreeNode/.test(t)) return T.treenode;
  throw new HarnessError(`Unsupported Python type: "${raw}"`);
}

export function parsePythonSignature(starter: string, name: string): Signature {
  // Match `def <name>(self, <params>) -> <ret>:`
  const re = new RegExp(
    `def\\s+${name}\\s*\\(\\s*self\\s*,?\\s*([\\s\\S]*?)\\)\\s*(?:->\\s*([\\s\\S]*?))?\\s*:`,
  );
  const m = re.exec(starter);
  if (!m) throw new HarnessError(`Could not find method "${name}" in Python starter`);
  const paramsSrc = m[1].trim();
  const retSrc = (m[2] || "None").trim();
  const params = paramsSrc
    ? splitParams(paramsSrc).map((p) => {
        const [, ann] = p.split(":");
        return ann ? pyType(ann.trim()) : T.int;
      })
    : [];
  return { params, ret: pyType(retSrc) };
}
