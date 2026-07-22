// Python 3 code generator.
//
// LeetCode-style Python starters define `class Solution: def <name>(self, ...)`,
// so we call `Solution().<name>(*args)`. Python's own `str()` reproduces the
// exact text the expected outputs were generated with, so serialization is just
// `str(convert(result))`.

import type { CType, Signature } from "./types.js";
import type { PyValue } from "./pyliteral.js";

// ListNode / TreeNode helpers + builders, mirroring api/scripts/regen_test_cases.py
const PRELUDE = String.raw`
import base64, time, sys, traceback, io, contextlib
from typing import List, Optional, Dict, Tuple, Set, Deque
import math, heapq, bisect, itertools, functools, collections, re, random, string
from collections import deque, defaultdict, Counter, OrderedDict

class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def __list_node(values):
    if not values: return None
    head = ListNode(values[0])
    p = head
    for val in values[1:]:
        node = ListNode(val); p.next = node; p = node
    return head

def __linked_list_to_list(head):
    result = []
    while head:
        result.append(head.val); head = head.next
    return result

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def __tree_node(values):
    if not values: return None
    root = TreeNode(values[0]); i = 1; queue = deque([root])
    while queue:
        node = queue.popleft()
        if i < len(values) and values[i] is not None:
            node.left = TreeNode(values[i]); queue.append(node.left)
        i += 1
        if i < len(values) and values[i] is not None:
            node.right = TreeNode(values[i]); queue.append(node.right)
        i += 1
    return root

def __tree_node_to_list(root):
    if not root: return []
    result = []; queue = deque([root])
    while queue:
        node = queue.popleft()
        if node:
            result.append(node.val); queue.append(node.left); queue.append(node.right)
        else:
            result.append(None)
    while result and result[-1] is None:
        result.pop()
    return result

def __emit(idx, ok, ms, payload, out):
    b = base64.b64encode(str(payload).encode("utf-8")).decode("ascii")
    o = base64.b64encode(str(out).encode("utf-8")).decode("ascii")
    sys.stdout.write("\x1e%d\x1e%s\x1e%s\x1e%s\x1e%s\n" % (idx, "OK" if ok else "ERR", ms, b, o))
`;

function pyRepr(value: PyValue): string {
  if (value === null) return "None";
  if (value === true) return "True";
  if (value === false) return "False";
  if (typeof value === "number") return String(value);
  if (typeof value === "string")
    return "'" + value.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n") + "'";
  if (Array.isArray(value)) return "[" + value.map(pyRepr).join(", ") + "]";
  return String(value);
}

function argExpr(type: CType, value: PyValue): string {
  if (type.k === "listnode") return `__list_node(${pyRepr(value)})`;
  if (type.k === "treenode") return `__tree_node(${pyRepr(value)})`;
  return pyRepr(value);
}

function convertResult(ret: CType): string {
  if (ret.k === "listnode") return "__linked_list_to_list(__r)";
  if (ret.k === "treenode") return "__tree_node_to_list(__r)";
  return "__r";
}

export function buildPython(
  userCode: string,
  sigName: string,
  sig: Signature,
  cases: (PyValue[] | null)[],
): string {
  const conv = convertResult(sig.ret);
  const blocks = cases
    .map((values, idx) => {
      if (values === null) return "";
      const args = sig.params.map((t, i) => argExpr(t, values[i])).join(", ");
      return [
        `__buf${idx} = io.StringIO()`,
        `try:`,
        `    __t0 = time.perf_counter()`,
        `    with contextlib.redirect_stdout(__buf${idx}):`,
        `        __r = Solution().${sigName}(${args})`,
        `    __out = ${conv}`,
        `    __ms = "%.3f" % ((time.perf_counter() - __t0) * 1000)`,
        `    __emit(${idx}, True, __ms, str(__out), __buf${idx}.getvalue())`,
        `except Exception:`,
        `    __emit(${idx}, False, "0", traceback.format_exc(), __buf${idx}.getvalue())`,
      ].join("\n");
    })
    .join("\n");

  return `${PRELUDE}\n# ─── user code ───\n${userCode}\n\n# ─── driver ───\n${blocks}\n`;
}
