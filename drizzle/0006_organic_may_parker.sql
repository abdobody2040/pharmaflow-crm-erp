CREATE TABLE `repLocationConsents` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`repUserId` int NOT NULL,
	`policyVersion` varchar(64) NOT NULL,
	`retentionDays` int NOT NULL,
	`status` enum('consented','revoked') NOT NULL,
	`consentedAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int NOT NULL,
	CONSTRAINT `repLocationConsents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `repLocationEvents` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`shiftId` varchar(36) NOT NULL,
	`repUserId` int NOT NULL,
	`latitude` decimal(10,7) NOT NULL,
	`longitude` decimal(10,7) NOT NULL,
	`accuracyMeters` int,
	`cadenceSeconds` int NOT NULL,
	`nearPlannedStop` int NOT NULL DEFAULT 0,
	`capturedAt` timestamp NOT NULL,
	`status` enum('recorded','voided','superseded') NOT NULL DEFAULT 'recorded',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int NOT NULL,
	CONSTRAINT `repLocationEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `repShifts` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`repUserId` int NOT NULL,
	`consentId` varchar(36) NOT NULL,
	`startedAt` timestamp NOT NULL,
	`endedAt` timestamp,
	`status` enum('active','ended') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int NOT NULL,
	CONSTRAINT `repShifts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `repSyncOperations` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`repUserId` int NOT NULL,
	`clientMutationId` varchar(96) NOT NULL,
	`operationType` enum('visit','sample','location') NOT NULL,
	`operationPayload` json NOT NULL,
	`status` enum('applied','rejected') NOT NULL,
	`appliedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int NOT NULL,
	CONSTRAINT `repSyncOperations_id` PRIMARY KEY(`id`),
	CONSTRAINT `rep_sync_operations_tenant_mutation_unique` UNIQUE(`tenantId`,`repUserId`,`clientMutationId`)
);
--> statement-breakpoint
ALTER TABLE `repLocationConsents` ADD CONSTRAINT `repLocationConsents_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `repLocationConsents` ADD CONSTRAINT `repLocationConsents_repUserId_users_id_fk` FOREIGN KEY (`repUserId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `repLocationConsents` ADD CONSTRAINT `repLocationConsents_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `repLocationEvents` ADD CONSTRAINT `repLocationEvents_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `repLocationEvents` ADD CONSTRAINT `repLocationEvents_shiftId_repShifts_id_fk` FOREIGN KEY (`shiftId`) REFERENCES `repShifts`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `repLocationEvents` ADD CONSTRAINT `repLocationEvents_repUserId_users_id_fk` FOREIGN KEY (`repUserId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `repLocationEvents` ADD CONSTRAINT `repLocationEvents_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `repShifts` ADD CONSTRAINT `repShifts_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `repShifts` ADD CONSTRAINT `repShifts_repUserId_users_id_fk` FOREIGN KEY (`repUserId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `repShifts` ADD CONSTRAINT `repShifts_consentId_repLocationConsents_id_fk` FOREIGN KEY (`consentId`) REFERENCES `repLocationConsents`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `repShifts` ADD CONSTRAINT `repShifts_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `repSyncOperations` ADD CONSTRAINT `repSyncOperations_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `repSyncOperations` ADD CONSTRAINT `repSyncOperations_repUserId_users_id_fk` FOREIGN KEY (`repUserId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `repSyncOperations` ADD CONSTRAINT `repSyncOperations_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
CREATE INDEX `rep_location_consents_tenant_rep_idx` ON `repLocationConsents` (`tenantId`,`repUserId`,`consentedAt`);--> statement-breakpoint
CREATE INDEX `rep_location_events_tenant_shift_captured_idx` ON `repLocationEvents` (`tenantId`,`shiftId`,`capturedAt`);--> statement-breakpoint
CREATE INDEX `rep_shifts_tenant_rep_status_idx` ON `repShifts` (`tenantId`,`repUserId`,`status`);--> statement-breakpoint
CREATE INDEX `rep_sync_operations_tenant_rep_idx` ON `repSyncOperations` (`tenantId`,`repUserId`,`appliedAt`);