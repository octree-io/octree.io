CREATE TYPE "public"."room_phase" AS ENUM('solving', 'review');--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "phase" "room_phase" DEFAULT 'solving' NOT NULL;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "used_problem_ids" integer[] DEFAULT '{}' NOT NULL;