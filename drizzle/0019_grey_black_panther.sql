CREATE TABLE `documentRecords` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`documentNumber` varchar(64) NOT NULL,
	`previousVersionId` varchar(36),
	`title` varchar(255) NOT NULL,
	`version` int NOT NULL,
	`fileKey` varchar(1024) NOT NULL,
	`fileName` varchar(512) NOT NULL,
	`mimeType` varchar(255) NOT NULL,
	`classification` enum('general','quality','hr','commercial','compliance') NOT NULL DEFAULT 'general',
	`status` enum('draft','active','superseded','archived') NOT NULL DEFAULT 'draft',
	`retentionDate` date NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`activatedAt` timestamp,
	`createdBy` int NOT NULL,
	CONSTRAINT `documentRecords_id` PRIMARY KEY(`id`),
	CONSTRAINT `documents_tenant_number_version_unique` UNIQUE(`tenantId`,`documentNumber`,`version`)
);
--> statement-breakpoint
ALTER TABLE `documentRecords` ADD CONSTRAINT `documentRecords_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `documentRecords` ADD CONSTRAINT `documentRecords_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
CREATE INDEX `documents_tenant_status_retention_idx` ON `documentRecords` (`tenantId`,`status`,`retentionDate`);--> statement-breakpoint
CREATE INDEX `documents_tenant_previous_version_idx` ON `documentRecords` (`tenantId`,`previousVersionId`);