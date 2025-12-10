CREATE TABLE `enrollees` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`surname` varchar(255) NOT NULL,
	`email` varchar(320),
	`phone` varchar(50),
	`address` text,
	`instagram` varchar(255),
	`faceImageUrl` text NOT NULL,
	`faceImageKey` text NOT NULL,
	`thumbnailUrl` text NOT NULL,
	`faceEmbedding` json NOT NULL,
	`enrollmentMethod` varchar(50) NOT NULL,
	`enrolledBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `enrollees_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventType` enum('enrollment','match','no_match','system') NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`enrolleeId` int,
	`recognitionLogId` int,
	`imageUrl` text,
	`cameraSource` varchar(255),
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recognition_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`enrolleeId` int,
	`matchConfidence` int,
	`snapshotUrl` text NOT NULL,
	`snapshotKey` text NOT NULL,
	`cameraSource` varchar(255) NOT NULL,
	`detectedFaces` int NOT NULL DEFAULT 0,
	`matched` boolean NOT NULL DEFAULT false,
	`verifiedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `recognition_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`llmProvider` varchar(50) DEFAULT 'openai',
	`llmApiKey` text,
	`llmModel` varchar(100),
	`llmTemperature` int DEFAULT 70,
	`llmMaxTokens` int DEFAULT 2000,
	`llmSystemPrompt` text,
	`voiceLanguage` varchar(10) DEFAULT 'en',
	`voiceEngine` varchar(50) DEFAULT 'whisper',
	`voiceApiKey` text,
	`voiceInputSensitivity` int DEFAULT 50,
	`voiceOutputSpeed` int DEFAULT 100,
	`voiceOutputStyle` varchar(50) DEFAULT 'conversational',
	`matchThreshold` int DEFAULT 75,
	`minFaceSize` int DEFAULT 80,
	`faceTrackingSmoothing` int DEFAULT 50,
	`multiFaceMatch` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `settings_userId_unique` UNIQUE(`userId`)
);
