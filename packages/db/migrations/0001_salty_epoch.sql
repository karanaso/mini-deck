ALTER TABLE "decks" ADD COLUMN "join_code" text;--> statement-breakpoint
ALTER TABLE "decks" ADD COLUMN "edit_pin_hash" text;--> statement-breakpoint
ALTER TABLE "decks" ADD COLUMN "view_pin_hash" text;--> statement-breakpoint
ALTER TABLE "decks" ADD COLUMN "pin_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "decks" ADD CONSTRAINT "decks_join_code_unique" UNIQUE("join_code");