import {
  pgTable,
  text,
  integer,
  timestamp,
  boolean,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enums ───────────────────────────────────────────────────────────────────

export const difficultyEnum = pgEnum("difficulty", ["easy", "medium", "hard"]);
export const roomStatusEnum = pgEnum("room_status", [
  "waiting",
  "active",
  "finished",
]);
// Within an active round a room alternates between solving the problem and a
// fixed review window where solutions are revealed.
export const roomPhaseEnum = pgEnum("room_phase", ["solving", "review"]);
export const submissionStatusEnum = pgEnum("submission_status", [
  "queued", // accepted by the API, waiting for a worker
  "processing", // a worker is executing it on Judge0
  "completed", // Judge0 returned a terminal result
  "failed", // the pipeline itself errored (Judge0 unreachable, timed out, etc.)
]);

// ─── Users ───────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  // Nullable: OAuth-only accounts (e.g. Google) never set a password.
  passwordHash: text("password_hash"),
  googleId: text("google_id").unique(),
  avatarUrl: text("avatar_url"),
  emailVerified: boolean("email_verified").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Sessions ────────────────────────────────────────────────────────────────

// Server-side sessions. The cookie holds an opaque random token; only its
// SHA-256 hash is stored here, so a DB leak yields no usable session tokens.
export const sessions = pgTable(
  "sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    expiresAt: timestamp("expires_at").notNull(),
  },
  (t) => ({
    userIdx: index("sessions_user_idx").on(t.userId),
  }),
);

// ─── Problems ────────────────────────────────────────────────────────────────

export const problems = pgTable("problems", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
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
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  // Human-facing room identity, set by the host at creation time.
  name: text("name").notNull().default("Practice room"),
  description: text("description").notNull().default(""),
  difficulty: difficultyEnum("difficulty").notNull().default("easy"),
  // The current problem for the room. Nullable: a room is defined by its
  // difficulty and a matching problem is assigned when one is available, so a
  // room can exist before any problem of that difficulty is published.
  problemId: integer("problem_id").references(() => problems.id),
  hostId: integer("host_id")
    .notNull()
    .references(() => users.id),
  status: roomStatusEnum("status").notNull().default("waiting"),
  durationMinutes: integer("duration_minutes").notNull().default(45),
  maxPlayers: integer("max_players").notNull().default(4),
  startedAt: timestamp("started_at"),
  finishedAt: timestamp("finished_at"),
  // Realtime round bookkeeping — the socket server rotates the room's problem
  // every round and records when the current phase ends so late joiners can
  // sync their countdown. `phase` says whether players are solving or reviewing;
  // `usedProblemIds` tracks which problems this room has already served so it
  // doesn't repeat one until the pool is exhausted (then it resets).
  roundNumber: integer("round_number").notNull().default(1),
  phase: roomPhaseEnum("phase").notNull().default("solving"),
  roundEndsAt: timestamp("round_ends_at"),
  usedProblemIds: integer("used_problem_ids").array().notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Room participants ────────────────────────────────────────────────────────

export const roomParticipants = pgTable("room_participants", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  roomId: integer("room_id")
    .notNull()
    .references(() => rooms.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
  submittedAt: timestamp("submitted_at"),
});

// ─── Chat messages ────────────────────────────────────────────────────────────

// Real-time chat is intentionally decoupled from the `rooms` table: `roomId` is
// a free-form key so the same table backs both practice rooms (a rooms.id) and
// the standalone Chat channels (a slug like "general"). Authors are stored
// denormalised (name + colour) because participants are anonymous for now and
// have no `users` row.
export const chatMessages = pgTable(
  "chat_messages",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    roomId: text("room_id").notNull(),
    authorId: text("author_id").notNull(), // anonymous, socket-derived id
    authorName: text("author_name").notNull(),
    authorColor: text("author_color").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    roomCreatedIdx: index("chat_messages_room_created_idx").on(t.roomId, t.createdAt),
  }),
);

// ─── Submissions ──────────────────────────────────────────────────────────────

export const submissions = pgTable("submissions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

  // Ownership / context. All optional so the executor can also run ad-hoc code
  // that isn't tied to a stored problem or an authenticated user.
  userId: integer("user_id").references(() => users.id),
  problemId: integer("problem_id").references(() => problems.id),
  roomId: integer("room_id").references(() => rooms.id, { onDelete: "cascade" }),

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
  sessions: many(sessions),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const submissionsRelations = relations(submissions, ({ one }) => ({
  user: one(users, { fields: [submissions.userId], references: [users.id] }),
  problem: one(problems, {
    fields: [submissions.problemId],
    references: [problems.id],
  }),
  room: one(rooms, { fields: [submissions.roomId], references: [rooms.id] }),
}));
