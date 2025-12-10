CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`operation` varchar(64) NOT NULL,
	`enrolleeId` int,
	`enrolleeName` varchar(255),
	`result` varchar(32),
	`confidence` decimal(5,4),
	`details` text,
	`ipAddress` varchar(45),
	`userAgent` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
