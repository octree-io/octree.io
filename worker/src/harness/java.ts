// Java code generator.
//
// LeetCode-style Java starters define a non-public `class Solution` with the
// method. Judge0's Java entrypoint must be a `public class Main`, so we append
// one that builds typed arguments, calls `new Solution().<name>(...)`, and
// serializes via a reflective `pyRepr` that mirrors Python's `str`.
//
// List-typed params are emitted as Java arrays (`int[]`, `int[][]`, `String[]`,
// `char[][]`, …), which is what these problems' Java signatures use.

import { HarnessError, type CType, type Signature } from "./types.js";
import type { PyValue } from "./pyliteral.js";

const PRELUDE = String.raw`
import java.util.*;
import java.io.*;

class ListNode {
    int val; ListNode next;
    ListNode() {}
    ListNode(int x) { val = x; }
    ListNode(int x, ListNode next) { val = x; this.next = next; }
}
class TreeNode {
    int val; TreeNode left, right;
    TreeNode() {}
    TreeNode(int x) { val = x; }
    TreeNode(int x, TreeNode left, TreeNode right) { val = x; this.left = left; this.right = right; }
}
`;

const HELPERS = String.raw`
    static ListNode __buildList(Integer[] a) {
        ListNode dummy = new ListNode(); ListNode p = dummy;
        for (Integer x : a) { p.next = new ListNode(x); p = p.next; }
        return dummy.next;
    }
    static TreeNode __buildTree(Integer[] a) {
        if (a.length == 0 || a[0] == null) return null;
        TreeNode root = new TreeNode(a[0]);
        Queue<TreeNode> q = new LinkedList<>(); q.add(root); int i = 1;
        while (!q.isEmpty() && i < a.length) {
            TreeNode node = q.poll();
            if (i < a.length && a[i] != null) { node.left = new TreeNode(a[i]); q.add(node.left); }
            i++;
            if (i < a.length && a[i] != null) { node.right = new TreeNode(a[i]); q.add(node.right); }
            i++;
        }
        return root;
    }
    static int[] __listToArr(ListNode n) {
        ArrayList<Integer> l = new ArrayList<>();
        while (n != null) { l.add(n.val); n = n.next; }
        int[] a = new int[l.size()];
        for (int i = 0; i < a.length; i++) a[i] = l.get(i);
        return a;
    }
    static Integer[] __treeToArr(TreeNode root) {
        ArrayList<Integer> out = new ArrayList<>();
        if (root == null) return new Integer[0];
        Queue<TreeNode> q = new LinkedList<>(); q.add(root);
        while (!q.isEmpty()) {
            TreeNode node = q.poll();
            if (node != null) { out.add(node.val); q.add(node.left); q.add(node.right); }
            else out.add(null);
        }
        while (!out.isEmpty() && out.get(out.size() - 1) == null) out.remove(out.size() - 1);
        return out.toArray(new Integer[0]);
    }

    static String __escape(String s, char quote) {
        StringBuilder b = new StringBuilder();
        for (char c : s.toCharArray()) {
            if (c == '\\' || c == quote) { b.append('\\').append(c); }
            else if (c == '\n') b.append("\\n");
            else if (c == '\t') b.append("\\t");
            else if (c == '\r') b.append("\\r");
            else b.append(c);
        }
        return b.toString();
    }
    static String __pyDouble(double d) {
        if (d == Math.floor(d) && !Double.isInfinite(d) && Math.abs(d) < 1e15)
            return (long) d + ".0";
        return Double.toString(d);
    }
    static String __pyRepr(Object o) {
        if (o == null) return "None";
        if (o instanceof Boolean) return ((Boolean) o) ? "True" : "False";
        if (o instanceof Character) return "'" + __escape(o.toString(), '\'') + "'";
        if (o instanceof String) return "'" + __escape((String) o, '\'') + "'";
        if (o instanceof Double || o instanceof Float) return __pyDouble(((Number) o).doubleValue());
        if (o instanceof Number) return o.toString();
        if (o instanceof int[]) return __join(Arrays.stream((int[]) o).boxed().toArray());
        if (o instanceof long[]) return __join(Arrays.stream((long[]) o).boxed().toArray());
        if (o instanceof double[]) return __join(Arrays.stream((double[]) o).boxed().toArray());
        if (o instanceof boolean[]) { boolean[] x = (boolean[]) o; Object[] b = new Object[x.length]; for (int i = 0; i < x.length; i++) b[i] = x[i]; return __join(b); }
        if (o instanceof char[]) { char[] x = (char[]) o; Object[] b = new Object[x.length]; for (int i = 0; i < x.length; i++) b[i] = x[i]; return __join(b); }
        if (o instanceof Object[]) return __join((Object[]) o);
        if (o instanceof List) return __join(((List<?>) o).toArray());
        return o.toString();
    }
    static String __join(Object[] arr) {
        StringBuilder b = new StringBuilder("[");
        for (int i = 0; i < arr.length; i++) { if (i > 0) b.append(", "); b.append(__pyRepr(arr[i])); }
        return b.append("]").toString();
    }
    static String __pyStr(Object o) {
        if (o instanceof String) return (String) o;
        if (o instanceof Character) return o.toString();
        return __pyRepr(o);
    }
    static final PrintStream __REAL_OUT = System.out;
    static void __emit(int idx, boolean ok, String ms, String payload, String out) {
        String b = Base64.getEncoder().encodeToString(payload.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        String o = Base64.getEncoder().encodeToString(out.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        char RS = (char) 30;
        __REAL_OUT.println(RS + Integer.toString(idx) + RS + (ok ? "OK" : "ERR") + RS + ms + RS + b + RS + o);
    }
`;

function baseScalarName(t: CType): string {
  switch (t.k) {
    case "int": return "int";
    case "long": return "long";
    case "double": return "double";
    case "bool": return "boolean";
    case "char": return "char";
    case "string": return "String";
    default: throw new HarnessError(`Not a Java scalar: ${t.k}`);
  }
}

function javaTypeName(t: CType): string {
  if (t.k === "list") {
    // descend to the scalar base, counting dimensions
    let dims = 0;
    let cur: CType = t;
    while (cur.k === "list") { dims++; cur = cur.of; }
    return baseScalarName(cur) + "[]".repeat(dims);
  }
  switch (t.k) {
    case "listnode": return "ListNode";
    case "treenode": return "TreeNode";
    case "void": return "void";
    default: return baseScalarName(t);
  }
}

function escapeJava(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\t/g, "\\t").replace(/\r/g, "\\r");
}

function scalarLiteral(t: CType, v: PyValue): string {
  switch (t.k) {
    case "int": return String(v);
    case "long": return `${v}L`;
    case "double": return Number.isInteger(v as number) ? `${v}.0` : String(v);
    case "bool": return v ? "true" : "false";
    case "char": return `'${String(v).replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
    case "string": return `"${escapeJava(String(v))}"`;
    default: throw new HarnessError(`Not a Java scalar: ${t.k}`);
  }
}

/** Nested `{...}` initializer (no leading `new`). */
function javaBraces(t: CType, v: PyValue): string {
  if (t.k === "list") {
    const arr = (v ?? []) as PyValue[];
    return `{${arr.map((e) => javaBraces(t.of, e)).join(", ")}}`;
  }
  return scalarLiteral(t, v);
}

function javaLiteral(t: CType, v: PyValue): string {
  if (t.k === "list") return `new ${javaTypeName(t)}${javaBraces(t, v)}`;
  if (t.k === "listnode") {
    const arr = (v ?? []) as PyValue[];
    return `__buildList(new Integer[]{${arr.map(String).join(", ")}})`;
  }
  if (t.k === "treenode") {
    const arr = (v ?? []) as PyValue[];
    return `__buildTree(new Integer[]{${arr.map((e) => (e === null ? "null" : String(e))).join(", ")}})`;
  }
  return scalarLiteral(t, v);
}

export function buildJava(
  userCode: string,
  sigName: string,
  sig: Signature,
  cases: (PyValue[] | null)[],
): string {
  const blocks = cases
    .map((values, idx) => {
      if (values === null) return "";
      const decls = sig.params
        .map((t, i) => `            ${javaTypeName(t)} a${i} = ${javaLiteral(t, values[i])};`)
        .join("\n");
      const callArgs = sig.params.map((_, i) => `a${i}`).join(", ");
      let body: string;
      if (sig.ret.k === "void") {
        body = `                sol.${sigName}(${callArgs});
                double __ms = (System.nanoTime() - __t0) / 1e6;
                System.setOut(__REAL_OUT);
                __emit(${idx}, true, __pyDouble(__ms), "None", __cap.toString("UTF-8"));`;
      } else if (sig.ret.k === "listnode") {
        body = `                ListNode __r = sol.${sigName}(${callArgs});
                double __ms = (System.nanoTime() - __t0) / 1e6;
                String __serialized = __pyStr(__listToArr(__r));
                System.setOut(__REAL_OUT);
                __emit(${idx}, true, __pyDouble(__ms), __serialized, __cap.toString("UTF-8"));`;
      } else if (sig.ret.k === "treenode") {
        body = `                TreeNode __r = sol.${sigName}(${callArgs});
                double __ms = (System.nanoTime() - __t0) / 1e6;
                String __serialized = __pyStr(__treeToArr(__r));
                System.setOut(__REAL_OUT);
                __emit(${idx}, true, __pyDouble(__ms), __serialized, __cap.toString("UTF-8"));`;
      } else {
        body = `                Object __r = sol.${sigName}(${callArgs});
                double __ms = (System.nanoTime() - __t0) / 1e6;
                String __serialized = __pyStr(__r);
                System.setOut(__REAL_OUT);
                __emit(${idx}, true, __pyDouble(__ms), __serialized, __cap.toString("UTF-8"));`;
      }
      return `        {
${decls}
            ByteArrayOutputStream __cap = new ByteArrayOutputStream();
            try {
                System.setOut(new PrintStream(__cap, true, "UTF-8"));
                Solution sol = new Solution();
                long __t0 = System.nanoTime();
${body}
            } catch (Throwable __e) {
                String __msg = __e.toString();
                System.setOut(__REAL_OUT);
                String __out;
                try { __out = __cap.toString("UTF-8"); } catch (Exception __ex) { __out = ""; }
                __emit(${idx}, false, "0", __msg, __out);
            }
        }`;
    })
    .join("\n");

  return `${PRELUDE}\n// ─── user code ───\n${userCode}\n// ─── driver ───\npublic class Main {\n${HELPERS}\n    public static void main(String[] args) {\n${blocks}\n    }\n}\n`;
}
