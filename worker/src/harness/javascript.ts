// JavaScript (Node.js) code generator.
//
// LeetCode-style JS starters define the solution as a top-level
// `var <name> = function(...) { ... }`, so we call `<name>(...args)` directly.
// JS is dynamically typed, so argument values are emitted as JSON literals;
// only ListNode / TreeNode params need construction helpers.

import type { CType, Signature } from "./types.js";
import type { PyValue } from "./pyliteral.js";

const PRELUDE = String.raw`
function ListNode(val, next) {
  this.val = val === undefined ? 0 : val;
  this.next = next === undefined ? null : next;
}
function TreeNode(val, left, right) {
  this.val = val === undefined ? 0 : val;
  this.left = left === undefined ? null : left;
  this.right = right === undefined ? null : right;
}
function __buildList(a) {
  if (!a || a.length === 0) return null;
  var head = new ListNode(a[0]);
  var p = head;
  for (var i = 1; i < a.length; i++) { p.next = new ListNode(a[i]); p = p.next; }
  return head;
}
function __buildTree(a) {
  if (!a || a.length === 0 || a[0] === null) return null;
  var root = new TreeNode(a[0]);
  var queue = [root], i = 1;
  while (queue.length && i < a.length) {
    var node = queue.shift();
    if (i < a.length && a[i] !== null) { node.left = new TreeNode(a[i]); queue.push(node.left); }
    i++;
    if (i < a.length && a[i] !== null) { node.right = new TreeNode(a[i]); queue.push(node.right); }
    i++;
  }
  return root;
}
function __listToArr(node) {
  var out = [];
  while (node) { out.push(node.val); node = node.next; }
  return out;
}
function __treeToArr(root) {
  if (!root) return [];
  var out = [], queue = [root];
  while (queue.length) {
    var node = queue.shift();
    if (node) { out.push(node.val); queue.push(node.left); queue.push(node.right); }
    else out.push(null);
  }
  while (out.length && out[out.length - 1] === null) out.pop();
  return out;
}
function __pyRepr(x) {
  if (x === null || x === undefined) return "None";
  if (x === true) return "True";
  if (x === false) return "False";
  if (typeof x === "string") return "'" + x.replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";
  if (Array.isArray(x)) return "[" + x.map(__pyRepr).join(", ") + "]";
  return String(x);
}
function __pyStr(x) {
  if (typeof x === "string") return x;
  return __pyRepr(x);
}
var __RS = "\x1e";
function __b64(s) { return Buffer.from(String(s), "utf-8").toString("base64"); }
var __realWrite = process.stdout.write.bind(process.stdout);
function __emit(idx, ok, ms, payload, out) {
  __realWrite(__RS + idx + __RS + (ok ? "OK" : "ERR") + __RS + ms + __RS + __b64(payload) + __RS + __b64(out) + "\n");
}
`;

function argExpr(type: CType, value: PyValue): string {
  if (type.k === "listnode") return `__buildList(${JSON.stringify(value)})`;
  if (type.k === "treenode") return `__buildTree(${JSON.stringify(value)})`;
  // char/string/int/long/double/bool/list — plain JSON literal.
  return JSON.stringify(value);
}

function convertResult(ret: CType): string {
  if (ret.k === "listnode") return "__listToArr(__r)";
  if (ret.k === "treenode") return "__treeToArr(__r)";
  return "__r";
}

export function buildJavaScript(
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
      return `(function(){
  var __cap = "";
  process.stdout.write = function(chunk, enc, cb) {
    __cap += Buffer.isBuffer(chunk) ? chunk.toString("utf-8") : String(chunk);
    if (typeof enc === "function") enc(); else if (typeof cb === "function") cb();
    return true;
  };
  var __t0 = process.hrtime.bigint();
  try {
    var __r = ${sigName}(${args});
    var __out = ${conv};
    var __ms = (Number(process.hrtime.bigint() - __t0) / 1e6).toFixed(3);
    process.stdout.write = __realWrite;
    __emit(${idx}, true, __ms, __pyStr(__out), __cap);
  } catch (e) {
    process.stdout.write = __realWrite;
    __emit(${idx}, false, "0", (e && e.stack) ? e.stack : String(e), __cap);
  }
})();`;
    })
    .join("\n");

  return `${PRELUDE}\n// ─── user code ───\n${userCode}\n// ─── driver ───\n${blocks}\n`;
}
