from typing import Optional
from collections import deque

class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def list_node(values: list) -> Optional[ListNode]:
    if not values: return None
    head = ListNode(values[0])
    p = head
    for val in values[1:]:
        node = ListNode(val)
        p.next = node
        p = node
    return head

def linked_list_to_list(head: Optional[ListNode]) -> list:
    result = []
    current = head
    while current:
        result.append(current.val)
        current = current.next
    return result

def is_same_list(p1: Optional[ListNode], p2: Optional[ListNode]):
    if p1 is None and p2 is None: return True
    if not p1 or not p2: return False
    return p1.val == p2.val and is_same_list(p1.next, p2.next)

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def tree_node(values):
    if not values: return None

    root = TreeNode(values[0])
    i = 1
    queue = deque()
    queue.append(root)

    while queue:
        node = queue.popleft()
        if i < len(values) and values[i] is not None:
            node.left = TreeNode(values[i])
            queue.append(node.left)
        i += 1
        if i < len(values) and values[i] is not None:
            node.right = TreeNode(values[i])
            queue.append(node.right)
        i += 1
    return root

def tree_node_to_list(root):
    if not root: return []

    result = []
    queue = deque()
    queue.append(root)

    while queue:
        node = queue.popleft()
        if node:
            result.append(node.val)
            queue.append(node.left)
            queue.append(node.right)
        else:
            result.append(None)
    
    while result and result[-1] is None:
        result.pop()
    
    return result

def is_same_tree(p, q):
    if not p and not q:
        return True
    
    elif not p or not q:
        return False
    
    elif p.val != q.val:
        return False
    
    return is_same_tree(p.left, q.left) and is_same_tree(p.right, q.right)

# === HARNESS PRELUDE END — do not remove this marker ===
# Everything above this marker is injected into each Judge0 submission so the
# reference solution can build/inspect ListNode / TreeNode inputs and outputs.
# Everything below runs locally on your machine (DB + Judge0 orchestration).

import os
import re
import sys
import ast
import json
import base64
import argparse
import subprocess
import urllib.request
import urllib.error
from pathlib import Path

try:
    import psycopg2
    import psycopg2.extras
except ImportError:
    raise SystemExit(
        "psycopg2 is required: pip install psycopg2-binary"
    )

# ─── Config ──────────────────────────────────────────────────────────────────

SCRIPT_DIR = Path(__file__).resolve().parent
API_DIR = SCRIPT_DIR.parent  # api/


def load_env_file(path: Path) -> None:
    """Minimal .env loader so we don't depend on python-dotenv."""
    if not path.exists():
        return
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


load_env_file(API_DIR / ".env")
load_env_file(API_DIR / ".env.local")

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    raise SystemExit("DATABASE_URL not set (checked env, api/.env, api/.env.local)")

JUDGE0_URL = os.environ.get("JUDGE0_URL", "http://94.130.34.33:2358").rstrip("/")
JUDGE0_AUTH_TOKEN = os.environ.get("JUDGE0_AUTH_TOKEN")
PYTHON_LANGUAGE_ID = int(os.environ.get("JUDGE0_PYTHON_ID", "71"))  # Python 3.8

# Judge0 status ids we treat as "the reference solution ran cleanly".
JUDGE0_ACCEPTED = 3


# ─── Prelude (read back from this very file) ─────────────────────────────────

PRELUDE_MARKER = "# === HARNESS PRELUDE END"


def load_prelude() -> str:
    """Return everything in this file above the prelude marker."""
    text = Path(__file__).read_text()
    idx = text.index(PRELUDE_MARKER)
    return text[:idx]


PRELUDE = load_prelude()


# ─── Parsing problem metadata ────────────────────────────────────────────────

def extract_method_name(solution: str) -> str | None:
    """Grab the first `def <name>(self, ...)` inside the solution's class."""
    m = re.search(r"def\s+(\w+)\s*\(\s*self\b", solution)
    return m.group(1) if m else None


def extract_signature(starter_python3: str, sig_name: str | None = None):
    """Parse the starter python3 `def` line into (param_types, return_type).

    Returns a list of type-tags for each non-self param ('tree' | 'list' |
    'raw') and a single return tag. Type info comes from the *starter* (which
    keeps annotations); it aligns positionally with the solution's params even
    when names/method differ.

    `sig_name` (from starter_code.signature) pins us to the real method so we
    don't accidentally match a commented-out helper like TreeNode.__init__.
    """
    # Drop comment lines so a commented-out `def __init__(...)` in the starter
    # boilerplate can't be mistaken for the method signature.
    cleaned = "\n".join(
        line for line in starter_python3.splitlines()
        if not line.lstrip().startswith("#")
    )

    name_pat = re.escape(sig_name) if sig_name else r"\w+"
    m = re.search(
        rf"def\s+{name_pat}\s*\(\s*self\s*,?\s*(.*?)\)\s*(?:->\s*(.*?))?\s*:",
        cleaned,
        re.DOTALL,
    )
    if not m:
        return None, "raw"

    params_src = m.group(1).strip()
    return_src = (m.group(2) or "").strip()

    def tag_for(annotation: str) -> str:
        if "TreeNode" in annotation:
            return "tree"
        if "ListNode" in annotation:
            return "list"
        return "raw"

    param_tags = []
    if params_src:
        for param in split_top_level(params_src):
            _, _, annotation = param.partition(":")
            param_tags.append(tag_for(annotation))

    return param_tags, tag_for(return_src)


def split_top_level(s: str) -> list[str]:
    """Split a comma list ignoring commas nested in [] () {}."""
    parts, depth, current = [], 0, ""
    for ch in s:
        if ch in "[({":
            depth += 1
        elif ch in "])}":
            depth -= 1
        if ch == "," and depth == 0:
            parts.append(current)
            current = ""
        else:
            current += ch
    if current.strip():
        parts.append(current)
    return [p.strip() for p in parts if p.strip()]


# ─── Building the runnable source for one test case ──────────────────────────

DRIVER_TEMPLATE = '''

# ─── auto-generated driver ───────────────────────────────────────────────────
import ast as _ast

_RAW_INPUT = {raw_input!r}
_PARAM_TAGS = {param_tags!r}
_RETURN_TAG = {return_tag!r}
_METHOD = {method!r}


def _parse_input(raw):
    """`nums = [3, 3], target = 6` -> [ [3,3], 6 ] preserving order."""
    call = _ast.parse("_f(" + raw + ")", mode="eval").body
    values = [_ast.literal_eval(a) for a in call.args]
    values += [_ast.literal_eval(kw.value) for kw in call.keywords]
    return values


def _convert(value, tag):
    if tag == "tree":
        return tree_node(value)
    if tag == "list":
        return list_node(value)
    return value


def _normalize(result, tag):
    if tag == "tree":
        return tree_node_to_list(result)
    if tag == "list":
        return linked_list_to_list(result)
    return result


_values = _parse_input(_RAW_INPUT)
_tags = _PARAM_TAGS if _PARAM_TAGS and len(_PARAM_TAGS) == len(_values) else ["raw"] * len(_values)
_args = [_convert(v, t) for v, t in zip(_values, _tags)]
_result = getattr(Solution(), _METHOD)(*_args)
print(_normalize(_result, _RETURN_TAG))
'''


def build_source(solution: str, method: str, param_tags, return_tag, raw_input: str) -> str:
    header = "from typing import List, Optional, Dict, Tuple, Set\nimport math, heapq, bisect, itertools, functools, collections\n\n"
    driver = DRIVER_TEMPLATE.format(
        raw_input=raw_input,
        param_tags=param_tags,
        return_tag=return_tag,
        method=method,
    )
    return header + PRELUDE + "\n" + solution + "\n" + driver


# ─── Judge0 ──────────────────────────────────────────────────────────────────

def _b64(text: str) -> str:
    return base64.b64encode(text.encode("utf-8")).decode("ascii")


def _b64_decode(text) -> str:
    if not text:
        return ""
    return base64.b64decode(text).decode("utf-8", errors="replace")


def judge0_run(source: str):
    """Submit source with wait=true and return the decoded result dict."""
    url = f"{JUDGE0_URL}/submissions?base64_encoded=true&wait=true"
    payload = json.dumps({
        "language_id": PYTHON_LANGUAGE_ID,
        "source_code": _b64(source),
    }).encode("utf-8")

    headers = {"Content-Type": "application/json"}
    if JUDGE0_AUTH_TOKEN:
        headers["X-Auth-Token"] = JUDGE0_AUTH_TOKEN

    req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"Judge0 HTTP {e.code}: {e.read().decode('utf-8', 'replace')}")
    except urllib.error.URLError as e:
        raise RuntimeError(f"Judge0 unreachable: {e.reason}")

    return {
        "status_id": data.get("status", {}).get("id"),
        "status_desc": data.get("status", {}).get("description"),
        "stdout": _b64_decode(data.get("stdout")),
        "stderr": _b64_decode(data.get("stderr")),
        "compile_output": _b64_decode(data.get("compile_output")),
        "message": _b64_decode(data.get("message")),
    }


# ─── Local executor ──────────────────────────────────────────────────────────
# Runs the generated source in a child Python process. Much faster than the
# Judge0 round-trip and needs no network. Returns the same shape as judge0_run
# so the orchestration below is executor-agnostic. status_id == JUDGE0_ACCEPTED
# means "ran cleanly" (exit 0); anything else is treated as a broken solution.

LOCAL_TIMEOUT_SECONDS = int(os.environ.get("REGEN_LOCAL_TIMEOUT", "10"))


def local_run(source: str):
    """Execute source with the local Python interpreter; capture stdout/stderr.

    WARNING: this runs the reference solution from the DB with no sandbox. Only
    point it at a database whose `solution` values you trust.
    """
    try:
        proc = subprocess.run(
            [sys.executable, "-I", "-"],  # -I: isolated; code fed on stdin
            input=source,
            capture_output=True,
            text=True,
            timeout=LOCAL_TIMEOUT_SECONDS,
        )
    except subprocess.TimeoutExpired:
        return {
            "status_id": 5,  # mirror Judge0's "Time Limit Exceeded"
            "status_desc": "Time Limit Exceeded (local)",
            "stdout": "", "stderr": f"timed out after {LOCAL_TIMEOUT_SECONDS}s",
            "compile_output": "", "message": "",
        }

    ok = proc.returncode == 0
    return {
        "status_id": JUDGE0_ACCEPTED if ok else 11,  # 11 ~ Judge0 "Runtime Error"
        "status_desc": "Accepted" if ok else "Runtime Error (local)",
        "stdout": proc.stdout,
        "stderr": proc.stderr,
        "compile_output": "",
        "message": "",
    }


# ─── Orchestration ───────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Regenerate test_cases.expected_output by running each "
        "problem's reference solution on Judge0."
    )
    parser.add_argument(
        "--apply", action="store_true",
        help="Write results to the DB. Without this flag it's a dry run.",
    )
    parser.add_argument(
        "--problem", type=int, action="append", dest="problem_ids",
        help="Only process this problem id (repeatable). Default: all with test cases.",
    )
    parser.add_argument(
        "--limit-cases", type=int, default=None,
        help="Cap the number of test cases processed per problem (for quick checks).",
    )
    parser.add_argument(
        "--published-only", action="store_true",
        help="Only process problems where is_published is true.",
    )
    parser.add_argument(
        "--executor", choices=["local", "judge0"], default="local",
        help="Where to run solutions. 'local' (default) is fast and needs no "
        "network but runs untrusted DB code unsandboxed; 'judge0' uses the "
        "remote sandbox.",
    )
    args = parser.parse_args()

    run_source = local_run if args.executor == "local" else judge0_run

    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    # Only problems that actually have test cases.
    filters = ""
    params: list = []
    if args.problem_ids:
        filters += " AND p.id = ANY(%s)"
        params.append(args.problem_ids)
    if args.published_only:
        filters += " AND p.is_published = true"

    cur.execute(
        f"""
        SELECT p.id, p.slug, p.solution, p.starter_code
        FROM problems p
        WHERE p.solution IS NOT NULL
          AND EXISTS (SELECT 1 FROM test_cases t WHERE t.problem_id = p.id)
          {filters}
        ORDER BY p.id
        """,
        params,
    )
    problems = cur.fetchall()

    print(f"{'APPLY' if args.apply else 'DRY RUN'} — {len(problems)} problem(s) "
          f"with test cases (executor={args.executor})\n")

    update_cur = conn.cursor()
    broken_problems: list[str] = []
    total_updated = 0

    for prob in problems:
        pid, slug = prob["id"], prob["slug"]
        solution = prob["solution"]
        starter = prob["starter_code"] or {}
        starter_py = starter.get("python3", "")

        method = extract_method_name(solution)
        if not method:
            print(f"[{pid}] {slug}: SKIP — no method found in solution")
            broken_problems.append(f"{pid} {slug} (no method)")
            continue

        param_tags, return_tag = extract_signature(starter_py, starter.get("signature"))

        cur.execute(
            "SELECT id, ordinal, input, expected_output FROM test_cases "
            "WHERE problem_id = %s ORDER BY ordinal",
            (pid,),
        )
        cases = cur.fetchall()
        if args.limit_cases:
            cases = cases[: args.limit_cases]

        print(f"[{pid}] {slug} — method={method} tags={param_tags}->{return_tag} "
              f"({len(cases)} cases)")

        prob_failed = False
        for case in cases:
            raw_input = case["input"]
            source = build_source(solution, method, param_tags, return_tag, raw_input)
            try:
                result = run_source(source)
            except RuntimeError as e:
                print(f"    #{case['ordinal']}: ERROR running solution: {e}")
                prob_failed = True
                break

            if result["status_id"] != JUDGE0_ACCEPTED:
                # Reference solution errored — do NOT overwrite a good output.
                detail = (result["stderr"] or result["compile_output"]
                          or result["message"] or "").strip().splitlines()
                tail = detail[-1] if detail else ""
                print(f"    #{case['ordinal']}: {result['status_desc']} — {tail}")
                prob_failed = True
                continue

            new_output = result["stdout"].strip()
            old_output = (case["expected_output"] or "").strip()
            changed = new_output != old_output
            mark = "~" if changed else " "
            print(f"    #{case['ordinal']} {mark} input={raw_input!r} "
                  f"old={old_output!r} new={new_output!r}")

            if args.apply and changed:
                update_cur.execute(
                    "UPDATE test_cases SET expected_output = %s WHERE id = %s",
                    (new_output, case["id"]),
                )
                total_updated += 1

        if prob_failed:
            broken_problems.append(f"{pid} {slug}")

    if args.apply:
        conn.commit()
        print(f"\nCommitted. {total_updated} test case(s) updated.")
    else:
        conn.rollback()
        print(f"\nDry run — nothing written. {total_updated} would-be updates skipped "
              f"(re-run with --apply).")

    if broken_problems:
        print("\nProblems whose reference solution failed (fix the `solution` "
              "column, then re-run):")
        for b in broken_problems:
            print(f"  - {b}")

    cur.close()
    update_cur.close()
    conn.close()


if __name__ == "__main__":
    main()
