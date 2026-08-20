CREATE TABLE `accountAffiliations` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`sourceAccountId` varchar(36) NOT NULL,
	`targetAccountId` varchar(36) NOT NULL,
	`relationshipType` enum('employs','affiliated_with','member_of','refers_to','influences','parent_of','other') NOT NULL,
	`startDate` date,
	`endDate` date,
	`notes` text,
	`status` enum('active','ended','archived') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int NOT NULL,
	CONSTRAINT `accountAffiliations_id` PRIMARY KEY(`id`),
	CONSTRAINT `account_affiliations_tenant_source_target_type_unique` UNIQUE(`tenantId`,`sourceAccountId`,`targetAccountId`,`relationshipType`)
);
--> statement-breakpoint
ALTER TABLE `accountAffiliations` ADD CONSTRAINT `accountAffiliations_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `accountAffiliations` ADD CONSTRAINT `accountAffiliations_sourceAccountId_accounts_id_fk` FOREIGN KEY (`sourceAccountId`) REFERENCES `accounts`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `accountAffiliations` ADD CONSTRAINT `accountAffiliations_targetAccountId_accounts_id_fk` FOREIGN KEY (`targetAccountId`) REFERENCES `accounts`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `accountAffiliations` ADD CONSTRAINT `accountAffiliations_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
CREATE INDEX `account_affiliations_tenant_source_status_idx` ON `accountAffiliations` (`tenantId`,`sourceAccountId`,`status`);--> statement-breakpoint
CREATE INDEX `account_affiliations_tenant_target_status_idx` ON `accountAffiliations` (`tenantId`,`targetAccountId`,`status`);