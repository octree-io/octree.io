ALTER TABLE "submissions" ADD COLUMN "mode" text;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "results" jsonb;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "tests_passed" integer;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "tests_total" integer;