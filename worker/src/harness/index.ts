// Harness entry point: turn a user's solution + a problem's test cases into a
// single self-contained program for the target language, then grade the
// program's structured stdout against the expected outputs.

import {
  HarnessError,
  parseCppSignature,
  parseJavaSignature,
  parsePythonSignature,
  type Signature,
} from "./types.js";
import { parseInputArgs, type PyValue } from "./pyliteral.js";
import { buildPython } from "./python.js";
import { buildJavaScript } from "./javascript.js";
import { buildCpp } from "./cpp.js";
import { buildJava } from "./java.js";
import { parseDriverOutput, type CaseResult } from "./protocol.js";

export { HarnessError };

// Judge0 language ids for the languages the editor offers.
export const LANGUAGE_IDS = {
  python: 71, // Python 3.8
  javascript: 63, // Node.js 12
  java: 62, // Java 13 (OpenJDK)
  cpp: 54, // C++ (GCC 9.2)
} as const;

export type HarnessLang = keyof typeof LANGUAGE_IDS;

const BY_ID: Record<number, HarnessLang> = Object.fromEntries(
  Object.entries(LANGUAGE_IDS).map(([lang, id]) => [id, lang as HarnessLang]),
) as Record<number, HarnessLang>;

export function langForId(languageId: number): HarnessLang | null {
  return BY_ID[languageId] ?? null;
}

// The starter_code JSON key that holds each language's source.
const STARTER_KEY: Record<HarnessLang, string> = {
  python: "python3",
  javascript: "javascript",
  java: "java",
  cpp: "cpp",
};

export interface TestCaseInput {
  ordinal: number;
  input: string;
  expectedOutput: string;
}

export interface GradedCase {
  index: number; // matches the test case's ordinal position (0-based here)
  ordinal: number;
  input: string;
  expected: string;
  got: string;
  passed: boolean;
  runtimeMs: number;
  error: string | null;
  // Whatever the solution itself printed while running this case (e.g. debug
  // print()/console.log/System.out/cout calls) — never contains the expected
  // answer, since that's only compared afterward here, not injected into the
  // generated program.
  stdout: string;
}

export interface BuildResult {
  languageId: number;
  source: string;
  cases: TestCaseInput[];
  // Case index -> parse error, for inputs that couldn't be rendered at all.
  parseErrors: Map<number, string>;
}

/**
 * Parse the target language's method signature. C++/Java carry precise static
 * types; Python annotations back both the Python and JavaScript builders.
 */
function signatureFor(
  lang: HarnessLang,
  starter: Record<string, string>,
  sigName: string,
): Signature {
  switch (lang) {
    case "cpp":
      return parseCppSignature(starter.cpp ?? "", sigName);
    case "java":
      return parseJavaSignature(starter.java ?? "", sigName);
    case "python":
    case "javascript":
      return parsePythonSignature(starter.python3 ?? "", sigName);
  }
}

/**
 * Build the runnable program for a submission. Throws {@link HarnessError} with
 * a user-facing message if the problem can't be harnessed for this language.
 */
export function buildProgram(
  languageId: number,
  userCode: string,
  starter: Record<string, string>,
  cases: TestCaseInput[],
): BuildResult {
  const lang = langForId(languageId);
  if (!lang) throw new HarnessError(`Unsupported language id ${languageId}`);

  const sigName = starter.signature;
  if (!sigName) throw new HarnessError("Problem has no signature name in starter_code");

  const sig = signatureFor(lang, starter, sigName);

  // Parse each case independently: a single malformed input (e.g. a corrupt DB
  // row) is isolated to its own case instead of failing the whole run.
  const parseErrors = new Map<number, string>();
  const values: (PyValue[] | null)[] = cases.map((c, idx) => {
    try {
      return parseInputArgs(c.input);
    } catch (e) {
      parseErrors.set(idx, e instanceof Error ? e.message : String(e));
      return null;
    }
  });

  const build =
    lang === "python"
      ? buildPython
      : lang === "javascript"
        ? buildJavaScript
        : lang === "cpp"
          ? buildCpp
          : buildJava;

  const source = build(userCode, sigName, sig, values);
  return { languageId, source, cases, parseErrors };
}

/** Normalize an output string for comparison (trim + collapse trailing ws). */
function normalize(s: string): string {
  return s.replace(/\r/g, "").trim();
}

/**
 * Grade the driver's stdout against expected outputs. Cases with no result line
 * (e.g. the program crashed partway) are reported as errored/not-run.
 */
export function gradeCases(
  cases: TestCaseInput[],
  stdout: string,
  parseErrors: Map<number, string> = new Map(),
): GradedCase[] {
  const byIndex: Map<number, CaseResult> = parseDriverOutput(stdout);
  return cases.map((c, idx) => {
    const parseErr = parseErrors.get(idx);
    if (parseErr) {
      return {
        index: idx,
        ordinal: c.ordinal,
        input: c.input,
        expected: c.expectedOutput,
        got: "",
        passed: false,
        runtimeMs: 0,
        error: `Could not parse test input: ${parseErr}`,
        stdout: "",
      };
    }
    const r = byIndex.get(idx);
    if (!r) {
      return {
        index: idx,
        ordinal: c.ordinal,
        input: c.input,
        expected: c.expectedOutput,
        got: "",
        passed: false,
        runtimeMs: 0,
        error: "No output (execution did not reach this case)",
        stdout: "",
      };
    }
    if (!r.ok) {
      return {
        index: idx,
        ordinal: c.ordinal,
        input: c.input,
        expected: c.expectedOutput,
        got: "",
        passed: false,
        runtimeMs: r.timeMs,
        error: r.output || "Runtime error",
        stdout: r.stdout,
      };
    }
    const passed = normalize(r.output) === normalize(c.expectedOutput);
    return {
      index: idx,
      ordinal: c.ordinal,
      input: c.input,
      expected: c.expectedOutput,
      got: r.output,
      passed,
      runtimeMs: r.timeMs,
      error: null,
      stdout: r.stdout,
    };
  });
}
