ALTER TABLE `events` MODIFY COLUMN `description` text NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `type` enum('enrollment','match','no_match','verification') NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `imageKey` text;--> statement-breakpoint
ALTER TABLE `events` DROP COLUMN `eventType`;--> statement-breakpoint
ALTER TABLE `events` DROP COLUMN `title`;--> statement-breakpoint
ALTER TABLE `events` DROP COLUMN `recognitionLogId`;