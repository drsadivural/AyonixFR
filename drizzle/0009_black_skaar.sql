ALTER TABLE `recognition_logs` ADD `voiceComment` text;--> statement-breakpoint
ALTER TABLE `recognition_logs` ADD `facialExpression` varchar(50);--> statement-breakpoint
ALTER TABLE `recognition_logs` ADD `matchCount` int DEFAULT 0;