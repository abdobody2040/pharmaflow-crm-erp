CREATE TABLE `tenantTerminology` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`termKey` varchar(120) NOT NULL,
	`englishTerm` varchar(255) NOT NULL,
	`arabicTerm` varchar(255) NOT NULL,
	`context` varchar(255),
	`status` enum('active','archived') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int NOT NULL,
	CONSTRAINT `tenantTerminology_id` PRIMARY KEY(`id`),
	CONSTRAINT `tenant_terminology_tenant_key_unique` UNIQUE(`tenantId`,`termKey`)
);
--> statement-breakpoint
ALTER TABLE `tenantTerminology` ADD CONSTRAINT `tenantTerminology_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `tenantTerminology` ADD CONSTRAINT `tenantTerminology_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
CREATE INDEX `tenant_terminology_tenant_status_idx` ON `tenantTerminology` (`tenantId`,`status`);