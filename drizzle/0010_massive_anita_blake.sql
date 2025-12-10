ALTER TABLE `settings` ADD `ttsProvider` varchar(50) DEFAULT 'browser';--> statement-breakpoint
ALTER TABLE `settings` ADD `ttsVoiceName` varchar(100);--> statement-breakpoint
ALTER TABLE `settings` ADD `ttsSpeakingRate` int DEFAULT 100;--> statement-breakpoint
ALTER TABLE `settings` ADD `ttsPitch` int DEFAULT 0;