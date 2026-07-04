import { pgTable, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";

// The API owns the canonical schema and migrations. The worker only reads and
// updates the `submissions` table, so it declares just that table (columns must
// stay in sync with api/src/db/schema.ts) — no foreign keys or relations needed.

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

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  finishedAt: timestamp("finished_at"),
});
