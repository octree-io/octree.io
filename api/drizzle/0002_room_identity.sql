ALTER TABLE "rooms" ALTER COLUMN "problem_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "name" text DEFAULT 'Practice room' NOT NULL;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "description" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "difficulty" "difficulty" DEFAULT 'easy' NOT NULL;