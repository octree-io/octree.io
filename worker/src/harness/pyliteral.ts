// Parses a test case's `input` — a Python-call-style string such as
// `nums = [3, 3], target = 6` or `s = "aa", p = "a*"` — into an ordered array
// of plain JS values. Each language builder then renders those values as its
// own native literals, so no language ever has to parse Python at runtime.

import { HarnessError } from "./types.js";

export type PyValue = number | string | boolean | null | PyValue[];

class Parser {
  private i = 0;
  constructor(private readonly s: string) {}

  private ws() {
    while (this.i < this.s.length && /\s/.test(this.s[this.i])) this.i++;
  }

  atEnd(): boolean {
    this.ws();
    return this.i >= this.s.length;
  }

  value(): PyValue {
    this.ws();
    const ch = this.s[this.i];
    if (ch === "[" || ch === "(") return this.list(ch === "[" ? "]" : ")");
    if (ch === '"' || ch === "'") return this.string(ch);
    if (this.s.startsWith("True", this.i)) return (this.i += 4), true;
    if (this.s.startsWith("False", this.i)) return (this.i += 5), false;
    if (this.s.startsWith("None", this.i)) return (this.i += 4), null;
    if (this.s.startsWith("null", this.i)) return (this.i += 4), null;
    if (/[-+\d.]/.test(ch)) return this.number();
    throw new HarnessError(`Cannot parse input near: "${this.s.slice(this.i)}"`);
  }

  private list(close: string): PyValue[] {
    this.i++; // consume opening bracket
    const out: PyValue[] = [];
    this.ws();
    if (this.s[this.i] === close) {
      this.i++;
      return out;
    }
    for (;;) {
      out.push(this.value());
      this.ws();
      const c = this.s[this.i];
      if (c === ",") {
        this.i++;
        this.ws();
        // allow trailing comma
        if (this.s[this.i] === close) {
          this.i++;
          return out;
        }
        continue;
      }
      if (c === close) {
        this.i++;
        return out;
      }
      throw new HarnessError(`Expected ',' or '${close}' in list near "${this.s.slice(this.i)}"`);
    }
  }

  private string(quote: string): string {
    this.i++; // opening quote
    let out = "";
    while (this.i < this.s.length) {
      const ch = this.s[this.i++];
      if (ch === "\\") {
        const esc = this.s[this.i++];
        switch (esc) {
          case "n": out += "\n"; break;
          case "t": out += "\t"; break;
          case "r": out += "\r"; break;
          case "\\": out += "\\"; break;
          case "'": out += "'"; break;
          case '"': out += '"'; break;
          case "0": out += "\0"; break;
          default: out += esc; break;
        }
      } else if (ch === quote) {
        return out;
      } else {
        out += ch;
      }
    }
    throw new HarnessError("Unterminated string in input");
  }

  private number(): number {
    const start = this.i;
    if (this.s[this.i] === "+" || this.s[this.i] === "-") this.i++;
    while (this.i < this.s.length && /[\d.eE+-]/.test(this.s[this.i])) this.i++;
    const tok = this.s.slice(start, this.i);
    const n = Number(tok);
    if (Number.isNaN(n)) throw new HarnessError(`Bad number: "${tok}"`);
    return n;
  }
}

/**
 * Parse the ordered argument values from a test-case input string.
 * `nums = [3, 3], target = 6` -> [[3, 3], 6].
 * Leading `name =` labels are stripped; bare comma-separated values also work.
 */
export function parseInputArgs(input: string): PyValue[] {
  // Split on top-level commas, then strip an optional `identifier =` label from
  // each segment before parsing the remainder as a Python literal.
  const segments = splitTopLevel(input);
  const values: PyValue[] = [];
  for (const seg of segments) {
    const stripped = seg.replace(/^\s*[A-Za-z_]\w*\s*=(?!=)\s*/, "");
    const p = new Parser(stripped);
    values.push(p.value());
  }
  return values;
}

function splitTopLevel(s: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let cur = "";
  let inStr: string | null = null;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      cur += ch;
      if (ch === "\\") {
        cur += s[++i] ?? "";
      } else if (ch === inStr) {
        inStr = null;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      inStr = ch;
      cur += ch;
      continue;
    }
    if (ch === "[" || ch === "(" || ch === "{") depth++;
    else if (ch === "]" || ch === ")" || ch === "}") depth--;
    if (ch === "," && depth === 0) {
      parts.push(cur);
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) parts.push(cur);
  return parts.map((p) => p.trim()).filter(Boolean);
}
