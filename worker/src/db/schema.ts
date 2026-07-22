import { pgTable, text, integer, timestamp, pgEnum, jsonb } from "drizzle-orm/pg-core";

// The API owns the canonical schema and migrations. The worker only reads
// problems/test_cases and reads+updates submissions, so it declares just those
// tables (columns must stay in sync with api/src/db/schema.ts) — no foreign
// keys or relations needed.

export interface SubmissionCaseResult {
  ordinal: number;
  input: string;
  expected: string;
  got: string;
  passed: boolean;
  runtimeMs: number;
  error: string | null;
  stdout: string;
}

export const submissionStatusEnum = pgEnum("submission_status", [
  "queued",
  "processing",
  "completed",
  "failed",
]);

export const submissions = pgTable("submissions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

  userId: integer("user_id"),
  problemId: integer("problem_id"),
  roomId: integer("room_id"),

  languageId: integer("language_id").notNull(),
  sourceCode: text("source_code").notNull(),
  stdin: text("stdin"),
  expectedOutput: text("expected_output"),
  mode: text("mode").$type<"run" | "submit" | "custom">(),
  customInputs: jsonb("custom_inputs").$type<string[]>(),

  status: submissionStatusEnum("status").notNull().default("queued"),
  error: text("error"),

  judge0Token: text("judge0_token"),
  judge0StatusId: integer("judge0_status_id"),
  judge0StatusDescription: text("judge0_status_description"),
  stdout: text("stdout"),
  stderr: text("stderr"),
  compileOutput: text("compile_output"),
  message: text("message"),
  time: text("time"),
  memory: integer("memory"),

  results: jsonb("results").$type<SubmissionCaseResult[]>(),
  testsPassed: integer("tests_passed"),
  testsTotal: integer("tests_total"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  finishedAt: timestamp("finished_at"),
});

// Read-only for the worker: needed to build the test-case harness.
export const problems = pgTable("problems", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  slug: text("slug").notNull(),
  starterCode: jsonb("starter_code").$type<Record<string, string>>(),
});

export const testCases = pgTable("test_cases", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  problemId: integer("problem_id").notNull(),
  ordinal: integer("ordinal").notNull(),
  input: text("input").notNull(),
  expectedOutput: text("expected_output").notNull(),
});
