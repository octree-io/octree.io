// C++ (GCC) code generator.
//
// LeetCode-style C++ starters define `class Solution { public: <ret> <name>(...) };`.
// We build named local lvalues for each argument (so `vector<T>&` params bind),
// call `Solution().<name>(...)`, and serialize the result with Python-`str`
// semantics via overloaded `py_repr` / `py_str`.

import { HarnessError, type CType, type Signature } from "./types.js";
import type { PyValue } from "./pyliteral.js";

const PRELUDE = String.raw`
#include <bits/stdc++.h>
using namespace std;

struct ListNode {
    int val;
    ListNode *next;
    ListNode() : val(0), next(nullptr) {}
    ListNode(int x) : val(x), next(nullptr) {}
    ListNode(int x, ListNode *next) : val(x), next(next) {}
};
struct TreeNode {
    int val;
    TreeNode *left;
    TreeNode *right;
    TreeNode() : val(0), left(nullptr), right(nullptr) {}
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
    TreeNode(int x, TreeNode *l, TreeNode *r) : val(x), left(l), right(r) {}
};

static ListNode* __buildList(const vector<int>& a) {
    ListNode dummy; ListNode* p = &dummy;
    for (int x : a) { p->next = new ListNode(x); p = p->next; }
    return dummy.next;
}
// A nullable tree value (std::optional needs C++17, which this Judge0 GCC
// defaults below, so we roll our own sentinel).
struct __N { bool nul; int v; };
static TreeNode* __buildTree(const vector<__N>& a) {
    if (a.empty() || a[0].nul) return nullptr;
    TreeNode* root = new TreeNode(a[0].v);
    queue<TreeNode*> q; q.push(root); size_t i = 1;
    while (!q.empty() && i < a.size()) {
        TreeNode* node = q.front(); q.pop();
        if (i < a.size() && !a[i].nul) { node->left = new TreeNode(a[i].v); q.push(node->left); }
        i++;
        if (i < a.size() && !a[i].nul) { node->right = new TreeNode(a[i].v); q.push(node->right); }
        i++;
    }
    return root;
}
static vector<int> __listToVec(ListNode* n) {
    vector<int> out;
    while (n) { out.push_back(n->val); n = n->next; }
    return out;
}
static vector<__N> __treeToVec(TreeNode* root) {
    vector<__N> out;
    if (!root) return out;
    queue<TreeNode*> q; q.push(root);
    while (!q.empty()) {
        TreeNode* node = q.front(); q.pop();
        if (node) { out.push_back({false, node->val}); q.push(node->left); q.push(node->right); }
        else out.push_back({true, 0});
    }
    while (!out.empty() && out.back().nul) out.pop_back();
    return out;
}

static string __escape(const string& s, char quote) {
    string out;
    for (char c : s) {
        if (c == '\\' || c == quote) { out += '\\'; out += c; }
        else if (c == '\n') out += "\\n";
        else if (c == '\t') out += "\\t";
        else if (c == '\r') out += "\\r";
        else out += c;
    }
    return out;
}
static string __py_double(double d) {
    if (d == (long long)d && fabs(d) < 1e15) return to_string((long long)d) + ".0";
    ostringstream os; os << setprecision(12) << d; return os.str();
}

static string py_repr(bool b) { return b ? "True" : "False"; }
static string py_repr(int x) { return to_string(x); }
static string py_repr(long x) { return to_string(x); }
static string py_repr(long long x) { return to_string(x); }
static string py_repr(unsigned x) { return to_string(x); }
static string py_repr(unsigned long x) { return to_string(x); }
static string py_repr(unsigned long long x) { return to_string(x); }
static string py_repr(double x) { return __py_double(x); }
static string py_repr(char c) { return "'" + __escape(string(1, c), '\'') + "'"; }
static string py_repr(const string& s) { return "'" + __escape(s, '\'') + "'"; }
static string py_repr(const __N& o) { return o.nul ? "None" : to_string(o.v); }
template <class T> static string py_repr(const vector<T>& v) {
    string out = "[";
    for (size_t i = 0; i < v.size(); i++) { if (i) out += ", "; out += py_repr(v[i]); }
    return out + "]";
}

static string py_str(const string& s) { return s; }
static string py_str(char c) { return string(1, c); }
template <class T> static string py_str(const T& x) { return py_repr(x); }

static const string __B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
static string __b64(const string& in) {
    string out; int val = 0, bits = -6;
    for (unsigned char c : in) {
        val = (val << 8) + c; bits += 8;
        while (bits >= 0) { out += __B64[(val >> bits) & 0x3F]; bits -= 6; }
    }
    if (bits > -6) out += __B64[((val << 8) >> (bits + 8)) & 0x3F];
    while (out.size() % 4) out += '=';
    return out;
}
static void __emit(int idx, bool ok, const string& ms, const string& payload, const string& out) {
    cout << '\x1e' << idx << '\x1e' << (ok ? "OK" : "ERR") << '\x1e' << ms << '\x1e' << __b64(payload) << '\x1e' << __b64(out) << "\n";
}
`;

function cppTypeName(t: CType): string {
  switch (t.k) {
    case "int": return "int";
    case "long": return "long long";
    case "double": return "double";
    case "bool": return "bool";
    case "char": return "char";
    case "string": return "string";
    case "list": return `vector<${cppTypeName(t.of)}>`;
    case "listnode": return "ListNode*";
    case "treenode": return "TreeNode*";
    case "void": return "void";
  }
}

function escapeCpp(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\t/g, "\\t").replace(/\r/g, "\\r");
}

function cppLiteral(t: CType, v: PyValue): string {
  switch (t.k) {
    case "int":
    case "long":
      return String(v);
    case "double":
      return Number.isInteger(v as number) ? `${v}.0` : String(v);
    case "bool":
      return v ? "true" : "false";
    case "char":
      return `'${String(v).replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
    case "string":
      return `"${escapeCpp(String(v))}"`;
    case "list": {
      const arr = (v ?? []) as PyValue[];
      const elems = arr.map((e) => cppLiteral(t.of, e)).join(", ");
      return `${cppTypeName(t)}{${elems}}`;
    }
    case "listnode": {
      const arr = (v ?? []) as PyValue[];
      return `__buildList(vector<int>{${arr.map(String).join(", ")}})`;
    }
    case "treenode": {
      const arr = (v ?? []) as PyValue[];
      const elems = arr
        .map((e) => (e === null ? "__N{true, 0}" : `__N{false, ${e}}`))
        .join(", ");
      return `__buildTree(vector<__N>{${elems}})`;
    }
    case "void":
      throw new HarnessError("void cannot appear as a parameter");
  }
}

function convertExpr(ret: CType): string {
  if (ret.k === "listnode") return "__listToVec(__r)";
  if (ret.k === "treenode") return "__treeToVec(__r)";
  return "__r";
}

export function buildCpp(
  userCode: string,
  sigName: string,
  sig: Signature,
  cases: (PyValue[] | null)[],
): string {
  const blocks = cases
    .map((values, idx) => {
      if (values === null) return "";
      const decls = sig.params
        .map((t, i) => `        ${cppTypeName(t)} a${i} = ${cppLiteral(t, values[i])};`)
        .join("\n");
      const callArgs = sig.params.map((_, i) => `a${i}`).join(", ");
      const body =
        sig.ret.k === "void"
          ? `            __sol.${sigName}(${callArgs});
            auto __t1 = chrono::high_resolution_clock::now();
            double __ms = chrono::duration<double, milli>(__t1 - __t0).count();
            cout.rdbuf(__oldbuf);
            __emit(${idx}, true, __py_double(__ms), "None", __cap.str());`
          : `            auto __r = __sol.${sigName}(${callArgs});
            auto __t1 = chrono::high_resolution_clock::now();
            double __ms = chrono::duration<double, milli>(__t1 - __t0).count();
            string __serialized = py_str(${convertExpr(sig.ret)});
            cout.rdbuf(__oldbuf);
            __emit(${idx}, true, __py_double(__ms), __serialized, __cap.str());`;
      return `    {
${decls}
        ostringstream __cap;
        streambuf* __oldbuf = cout.rdbuf(__cap.rdbuf());
        try {
            Solution __sol;
            auto __t0 = chrono::high_resolution_clock::now();
${body}
        } catch (const exception& __e) {
            string __msg = __e.what();
            cout.rdbuf(__oldbuf);
            __emit(${idx}, false, "0", __msg, __cap.str());
        } catch (...) {
            cout.rdbuf(__oldbuf);
            __emit(${idx}, false, "0", "unknown runtime error", __cap.str());
        }
    }`;
    })
    .join("\n");

  return `${PRELUDE}\n// ─── user code ───\n${userCode}\n// ─── driver ───\nint main() {\n${blocks}\n    return 0;\n}\n`;
}
