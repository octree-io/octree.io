import {
  pgTable,
  text,
  integer,
  timestamp,
  boolean,
  pgEnum,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enums ───────────────────────────────────────────────────────────────────

export const difficultyEnum = pgEnum("difficulty", ["easy", "medium", "hard"]);
export const roomStatusEnum = pgEnum("room_status", [
  "waiting",
  "active",
  "finished",
]);
export const submissionStatusEnum = pgEnum("submission_status", [
  "queued", // accepted by the API, waiting for a worker
  "processing", // a worker is executing it on Judge0
  "completed", // Judge0 returned a terminal result
  "failed", // the pipeline itself errored (Judge0 unreachable, timed out, etc.)
]);

// ─── Users ───────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Problems ────────────────────────────────────────────────────────────────

export const problems = pgTable("problems", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  difficulty: difficultyEnum("difficulty").notNull(),
  tags: text("tags").array().notNull().default([]),
  isPublished: boolean("is_published").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Rooms ───────────────────────────────────────────────────────────────────

export const rooms = pgTable("rooms", {
  id: uuid("id").primaryKey().defaultRandom(),
  problemId: uuid("problem_id")
    .notNull()
    .references(() => problems.id),
  hostId: uuid("host_id")
    .notNull()
    .references(() => users.id),
  status: roomStatusEnum("status").notNull().default("waiting"),
  durationMinutes: integer("duration_minutes").notNull().default(45),
  maxPlayers: integer("max_players").notNull().default(4),
  startedAt: timestamp("started_at"),
  finishedAt: timestamp("finished_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Room participants ────────────────────────────────────────────────────────

export const roomParticipants = pgTable("room_participants", {
  id: uuid("id").primaryKey().defaultRandom(),
  roomId: uuid("room_id")
    .notNull()
    .references(() => rooms.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
  submittedAt: timestamp("submitted_at"),
});

// ─── Submissions ──────────────────────────────────────────────────────────────

export const submissions = pgTable("submissions", {
  id: uuid("id").primaryKey().defaultRandom(),

  // Ownership / context. All optional so the executor can also run ad-hoc code
  // that isn't tied to a stored problem or an authenticated user.
  userId: uuid("user_id").references(() => users.id),
  problemId: uuid("problem_id").references(() => problems.id),
  roomId: uuid("room_id").references(() => rooms.id, { onDelete: "cascade" }),

  // What to run.
  languageId: integer("language_id").notNull(), // Judge0 language id
  sourceCode: text("source_code").notNull(),
  stdin: text("stdin"),
  expectedOutput: text("expected_output"),

  // Pipeline state.
  status: submissionStatusEnum("status").notNull().default("queued"),
  error: text("error"), // populated when status = "failed"

  // Judge0 bookkeeping / results.
  judge0Token: text("judge0_token"),
  judge0StatusId: integer("judge0_status_id"),
  judge0StatusDescription: text("judge0_status_description"),
  stdout: text("stdout"),
  stderr: text("stderr"),
  compileOutput: text("compile_output"),
  message: text("message"),
  time: text("time"), // seconds, as returned by Judge0
  memory: integer("memory"), // kilobytes

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  finishedAt: timestamp("finished_at"),
});

// ─── Relations ───────────────────────────────────────────────────────────────

export const roomsRelations = relations(rooms, ({ one, many }) => ({
  problem: one(problems, { fields: [rooms.problemId], references: [problems.id] }),
  host: one(users, { fields: [rooms.hostId], references: [users.id] }),
  participants: many(roomParticipants),
}));

export const roomParticipantsRelations = relations(roomParticipants, ({ one }) => ({
  room: one(rooms, { fields: [roomParticipants.roomId], references: [rooms.id] }),
  user: one(users, { fields: [roomParticipants.userId], references: [users.id] }),
}));

export const problemsRelations = relations(problems, ({ many }) => ({
  rooms: many(rooms),
  submissions: many(submissions),
}));

export const usersRelations = relations(users, ({ many }) => ({
  hostedRooms: many(rooms),
  participations: many(roomParticipants),
  submissions: many(submissions),
}));

export const submissionsRelations = relations(submissions, ({ one }) => ({
  user: one(users, { fields: [submissions.userId], references: [users.id] }),
  problem: one(problems, {
    fields: [submissions.problemId],
    references: [problems.id],
  }),
  room: one(rooms, { fields: [submissions.roomId], references: [rooms.id] }),
}));
