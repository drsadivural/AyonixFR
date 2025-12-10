ALTER TABLE `users` DROP INDEX `users_email_unique`;--> statement-breakpoint
ALTER TABLE `events` MODIFY COLUMN `description` text;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `email` varchar(320);--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `openId` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `loginMethod` varchar(64);--> statement-breakpoint
ALTER TABLE `events` ADD `eventType` enum('enrollment','match','no_match','system') NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `title` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `recognitionLogId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `profileCompleted` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `events` DROP COLUMN `type`;--> statement-breakpoint
ALTER TABLE `events` DROP COLUMN `imageKey`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `password`;