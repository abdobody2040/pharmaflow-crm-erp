CREATE TABLE `accounts` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`accountType` enum('hcp','pharmacy','hospital','distributor','organization') NOT NULL,
	`name` varchar(255) NOT NULL,
	`externalReference` varchar(128),
	`specialty` varchar(160),
	`tier` enum('a','b','c','unclassified') NOT NULL DEFAULT 'unclassified',
	`territoryId` varchar(36),
	`email` varchar(320),
	`phone` varchar(64),
	`address` text,
	`latitude` decimal(10,7),
	`longitude` decimal(10,7),
	`status` enum('active','inactive','archived') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int NOT NULL,
	CONSTRAINT `accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`accountId` varchar(36) NOT NULL,
	`firstName` varchar(128) NOT NULL,
	`lastName` varchar(128) NOT NULL,
	`title` varchar(160),
	`email` varchar(320),
	`phone` varchar(64),
	`preferredChannel` enum('email','phone','in_person','whatsapp','other') NOT NULL DEFAULT 'email',
	`status` enum('active','inactive','archived') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int NOT NULL,
	CONSTRAINT `contacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cyclePlans` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`startDate` date NOT NULL,
	`endDate` date NOT NULL,
	`status` enum('draft','active','closed','archived') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int NOT NULL,
	CONSTRAINT `cyclePlans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `opportunities` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`accountId` varchar(36),
	`name` varchar(255) NOT NULL,
	`stage` enum('qualification','discovery','proposal','negotiation','won','lost') NOT NULL DEFAULT 'qualification',
	`value` decimal(14,2) NOT NULL DEFAULT '0.00',
	`probability` int NOT NULL DEFAULT 10,
	`expectedCloseDate` date,
	`ownerUserId` int NOT NULL,
	`status` enum('open','won','lost','archived') NOT NULL DEFAULT 'open',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int NOT NULL,
	CONSTRAINT `opportunities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `plannedVisits` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`cyclePlanId` varchar(36) NOT NULL,
	`accountId` varchar(36) NOT NULL,
	`repUserId` int NOT NULL,
	`plannedStartAt` timestamp NOT NULL,
	`plannedEndAt` timestamp,
	`priority` enum('critical','high','normal','low') NOT NULL DEFAULT 'normal',
	`objective` text,
	`status` enum('planned','completed','skipped','rescheduled') NOT NULL DEFAULT 'planned',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int NOT NULL,
	CONSTRAINT `plannedVisits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `territories` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`name` varchar(180) NOT NULL,
	`code` varchar(64) NOT NULL,
	`region` varchar(120),
	`managerUserId` int,
	`boundaryGeoJson` json,
	`status` enum('active','inactive','archived') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int NOT NULL,
	CONSTRAINT `territories_id` PRIMARY KEY(`id`),
	CONSTRAINT `territories_tenant_code_unique` UNIQUE(`tenantId`,`code`)
);
--> statement-breakpoint
ALTER TABLE `visitLogs` ADD `accountId` varchar(36);--> statement-breakpoint
ALTER TABLE `visitLogs` ADD `cyclePlanId` varchar(36);--> statement-breakpoint
ALTER TABLE `visitLogs` ADD `plannedVisitId` varchar(36);--> statement-breakpoint
ALTER TABLE `visitLogs` ADD `samplesGiven` json;--> statement-breakpoint
ALTER TABLE `visitLogs` ADD `eSignatureId` varchar(36);--> statement-breakpoint
ALTER TABLE `accounts` ADD CONSTRAINT `accounts_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `accounts` ADD CONSTRAINT `accounts_territoryId_territories_id_fk` FOREIGN KEY (`territoryId`) REFERENCES `territories`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `accounts` ADD CONSTRAINT `accounts_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `contacts` ADD CONSTRAINT `contacts_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `contacts` ADD CONSTRAINT `contacts_accountId_accounts_id_fk` FOREIGN KEY (`accountId`) REFERENCES `accounts`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `contacts` ADD CONSTRAINT `contacts_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `cyclePlans` ADD CONSTRAINT `cyclePlans_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `cyclePlans` ADD CONSTRAINT `cyclePlans_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `opportunities` ADD CONSTRAINT `opportunities_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `opportunities` ADD CONSTRAINT `opportunities_accountId_accounts_id_fk` FOREIGN KEY (`accountId`) REFERENCES `accounts`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `opportunities` ADD CONSTRAINT `opportunities_ownerUserId_users_id_fk` FOREIGN KEY (`ownerUserId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `opportunities` ADD CONSTRAINT `opportunities_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `plannedVisits` ADD CONSTRAINT `plannedVisits_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `plannedVisits` ADD CONSTRAINT `plannedVisits_cyclePlanId_cyclePlans_id_fk` FOREIGN KEY (`cyclePlanId`) REFERENCES `cyclePlans`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `plannedVisits` ADD CONSTRAINT `plannedVisits_accountId_accounts_id_fk` FOREIGN KEY (`accountId`) REFERENCES `accounts`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `plannedVisits` ADD CONSTRAINT `plannedVisits_repUserId_users_id_fk` FOREIGN KEY (`repUserId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `plannedVisits` ADD CONSTRAINT `plannedVisits_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `territories` ADD CONSTRAINT `territories_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `territories` ADD CONSTRAINT `territories_managerUserId_users_id_fk` FOREIGN KEY (`managerUserId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `territories` ADD CONSTRAINT `territories_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
CREATE INDEX `accounts_tenant_status_idx` ON `accounts` (`tenantId`,`status`);--> statement-breakpoint
CREATE INDEX `accounts_tenant_type_idx` ON `accounts` (`tenantId`,`accountType`);--> statement-breakpoint
CREATE INDEX `accounts_tenant_territory_idx` ON `accounts` (`tenantId`,`territoryId`);--> statement-breakpoint
CREATE INDEX `contacts_tenant_account_idx` ON `contacts` (`tenantId`,`accountId`);--> statement-breakpoint
CREATE INDEX `contacts_tenant_status_idx` ON `contacts` (`tenantId`,`status`);--> statement-breakpoint
CREATE INDEX `cycle_plans_tenant_status_idx` ON `cyclePlans` (`tenantId`,`status`);--> statement-breakpoint
CREATE INDEX `cycle_plans_tenant_date_idx` ON `cyclePlans` (`tenantId`,`startDate`,`endDate`);--> statement-breakpoint
CREATE INDEX `opportunities_tenant_stage_idx` ON `opportunities` (`tenantId`,`stage`);--> statement-breakpoint
CREATE INDEX `opportunities_tenant_owner_idx` ON `opportunities` (`tenantId`,`ownerUserId`);--> statement-breakpoint
CREATE INDEX `planned_visits_tenant_rep_date_idx` ON `plannedVisits` (`tenantId`,`repUserId`,`plannedStartAt`);--> statement-breakpoint
CREATE INDEX `planned_visits_tenant_cycle_idx` ON `plannedVisits` (`tenantId`,`cyclePlanId`);--> statement-breakpoint
CREATE INDEX `territories_tenant_status_idx` ON `territories` (`tenantId`,`status`);--> statement-breakpoint
ALTER TABLE `visitLogs` ADD CONSTRAINT `visitLogs_accountId_accounts_id_fk` FOREIGN KEY (`accountId`) REFERENCES `accounts`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `visitLogs` ADD CONSTRAINT `visitLogs_cyclePlanId_cyclePlans_id_fk` FOREIGN KEY (`cyclePlanId`) REFERENCES `cyclePlans`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `visitLogs` ADD CONSTRAINT `visitLogs_plannedVisitId_plannedVisits_id_fk` FOREIGN KEY (`plannedVisitId`) REFERENCES `plannedVisits`(`id`) ON DELETE restrict ON UPDATE restrict;