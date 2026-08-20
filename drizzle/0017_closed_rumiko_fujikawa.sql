CREATE TABLE `coachingScorecards` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`rideAlongId` varchar(36),
	`repUserId` int NOT NULL,
	`preparationScore` int NOT NULL,
	`productKnowledgeScore` int NOT NULL,
	`callQualityScore` int NOT NULL,
	`complianceScore` int NOT NULL,
	`followUpScore` int NOT NULL,
	`summary` text NOT NULL,
	`actionPlan` text,
	`acknowledgementStatus` enum('pending','acknowledged') NOT NULL DEFAULT 'pending',
	`acknowledgedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int NOT NULL,
	CONSTRAINT `coachingScorecards_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rideAlongSessions` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`managerUserId` int NOT NULL,
	`repUserId` int NOT NULL,
	`scheduledFor` timestamp NOT NULL,
	`status` enum('planned','completed','cancelled') NOT NULL DEFAULT 'planned',
	`objective` text,
	`completionNote` text,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int NOT NULL,
	CONSTRAINT `rideAlongSessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `coachingScorecards` ADD CONSTRAINT `coachingScorecards_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `coachingScorecards` ADD CONSTRAINT `coachingScorecards_rideAlongId_rideAlongSessions_id_fk` FOREIGN KEY (`rideAlongId`) REFERENCES `rideAlongSessions`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `coachingScorecards` ADD CONSTRAINT `coachingScorecards_repUserId_users_id_fk` FOREIGN KEY (`repUserId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `coachingScorecards` ADD CONSTRAINT `coachingScorecards_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `rideAlongSessions` ADD CONSTRAINT `rideAlongSessions_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `rideAlongSessions` ADD CONSTRAINT `rideAlongSessions_managerUserId_users_id_fk` FOREIGN KEY (`managerUserId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `rideAlongSessions` ADD CONSTRAINT `rideAlongSessions_repUserId_users_id_fk` FOREIGN KEY (`repUserId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `rideAlongSessions` ADD CONSTRAINT `rideAlongSessions_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
CREATE INDEX `coaching_scorecards_tenant_rep_created_idx` ON `coachingScorecards` (`tenantId`,`repUserId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `coaching_scorecards_tenant_ride_along_idx` ON `coachingScorecards` (`tenantId`,`rideAlongId`);--> statement-breakpoint
CREATE INDEX `ride_alongs_tenant_rep_scheduled_idx` ON `rideAlongSessions` (`tenantId`,`repUserId`,`scheduledFor`);--> statement-breakpoint
CREATE INDEX `ride_alongs_tenant_manager_status_idx` ON `rideAlongSessions` (`tenantId`,`managerUserId`,`status`);