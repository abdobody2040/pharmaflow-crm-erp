CREATE TABLE `approvedContent` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`contentType` enum('pdf','image','video','html','link') NOT NULL,
	`body` text,
	`assetKey` varchar(512),
	`assetUrl` varchar(768),
	`assetMimeType` varchar(128),
	`version` varchar(64) NOT NULL DEFAULT '1.0',
	`status` enum('draft','approved','rejected','retired') NOT NULL DEFAULT 'draft',
	`approvalNote` text,
	`approvedBy` int,
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int NOT NULL,
	CONSTRAINT `approvedContent_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audienceSegments` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`accountTypes` json NOT NULL,
	`specialties` json NOT NULL,
	`tiers` json NOT NULL,
	`territoryIds` json NOT NULL,
	`status` enum('draft','active','archived') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int NOT NULL,
	CONSTRAINT `audienceSegments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `campaignDeliveries` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`campaignId` varchar(36) NOT NULL,
	`accountId` varchar(36) NOT NULL,
	`contactId` varchar(36),
	`channel` enum('email','sms','whatsapp') NOT NULL,
	`recipient` varchar(320) NOT NULL,
	`providerMessageId` varchar(255),
	`status` enum('queued','sent','delivered','failed','skipped','cancelled') NOT NULL DEFAULT 'queued',
	`failureReason` text,
	`payloadSnapshot` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int NOT NULL,
	CONSTRAINT `campaignDeliveries_id` PRIMARY KEY(`id`),
	CONSTRAINT `campaign_deliveries_campaign_contact_channel_unique` UNIQUE(`campaignId`,`contactId`,`channel`)
);
--> statement-breakpoint
CREATE TABLE `contentUsageEvents` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`contentId` varchar(36) NOT NULL,
	`accountId` varchar(36) NOT NULL,
	`repUserId` int NOT NULL,
	`campaignId` varchar(36),
	`plannedVisitId` varchar(36),
	`eventType` enum('presented','opened','completed') NOT NULL,
	`occurredAt` timestamp NOT NULL,
	`durationSeconds` int,
	`status` enum('recorded','voided','superseded') NOT NULL DEFAULT 'recorded',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int NOT NULL,
	CONSTRAINT `contentUsageEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `marketingCampaigns` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`segmentId` varchar(36),
	`contentId` varchar(36),
	`name` varchar(255) NOT NULL,
	`channel` enum('email','sms','whatsapp') NOT NULL,
	`subject` varchar(255),
	`messageBody` text NOT NULL,
	`whatsappTemplateName` varchar(255),
	`scheduledAt` timestamp,
	`status` enum('draft','approved','queued','sending','completed','paused','cancelled') NOT NULL DEFAULT 'draft',
	`approvedBy` int,
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int NOT NULL,
	CONSTRAINT `marketingCampaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `approvedContent` ADD CONSTRAINT `approvedContent_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `approvedContent` ADD CONSTRAINT `approvedContent_approvedBy_users_id_fk` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `approvedContent` ADD CONSTRAINT `approvedContent_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `audienceSegments` ADD CONSTRAINT `audienceSegments_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `audienceSegments` ADD CONSTRAINT `audienceSegments_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `campaignDeliveries` ADD CONSTRAINT `campaignDeliveries_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `campaignDeliveries` ADD CONSTRAINT `campaignDeliveries_campaignId_marketingCampaigns_id_fk` FOREIGN KEY (`campaignId`) REFERENCES `marketingCampaigns`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `campaignDeliveries` ADD CONSTRAINT `campaignDeliveries_accountId_accounts_id_fk` FOREIGN KEY (`accountId`) REFERENCES `accounts`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `campaignDeliveries` ADD CONSTRAINT `campaignDeliveries_contactId_contacts_id_fk` FOREIGN KEY (`contactId`) REFERENCES `contacts`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `campaignDeliveries` ADD CONSTRAINT `campaignDeliveries_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `contentUsageEvents` ADD CONSTRAINT `contentUsageEvents_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `contentUsageEvents` ADD CONSTRAINT `contentUsageEvents_contentId_approvedContent_id_fk` FOREIGN KEY (`contentId`) REFERENCES `approvedContent`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `contentUsageEvents` ADD CONSTRAINT `contentUsageEvents_accountId_accounts_id_fk` FOREIGN KEY (`accountId`) REFERENCES `accounts`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `contentUsageEvents` ADD CONSTRAINT `contentUsageEvents_repUserId_users_id_fk` FOREIGN KEY (`repUserId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `contentUsageEvents` ADD CONSTRAINT `contentUsageEvents_campaignId_marketingCampaigns_id_fk` FOREIGN KEY (`campaignId`) REFERENCES `marketingCampaigns`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `contentUsageEvents` ADD CONSTRAINT `contentUsageEvents_plannedVisitId_plannedVisits_id_fk` FOREIGN KEY (`plannedVisitId`) REFERENCES `plannedVisits`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `contentUsageEvents` ADD CONSTRAINT `contentUsageEvents_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `marketingCampaigns` ADD CONSTRAINT `marketingCampaigns_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `marketingCampaigns` ADD CONSTRAINT `marketingCampaigns_segmentId_audienceSegments_id_fk` FOREIGN KEY (`segmentId`) REFERENCES `audienceSegments`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `marketingCampaigns` ADD CONSTRAINT `marketingCampaigns_contentId_approvedContent_id_fk` FOREIGN KEY (`contentId`) REFERENCES `approvedContent`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `marketingCampaigns` ADD CONSTRAINT `marketingCampaigns_approvedBy_users_id_fk` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `marketingCampaigns` ADD CONSTRAINT `marketingCampaigns_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
CREATE INDEX `approved_content_tenant_status_idx` ON `approvedContent` (`tenantId`,`status`);--> statement-breakpoint
CREATE INDEX `approved_content_tenant_type_idx` ON `approvedContent` (`tenantId`,`contentType`);--> statement-breakpoint
CREATE INDEX `audience_segments_tenant_status_idx` ON `audienceSegments` (`tenantId`,`status`);--> statement-breakpoint
CREATE INDEX `campaign_deliveries_tenant_campaign_idx` ON `campaignDeliveries` (`tenantId`,`campaignId`);--> statement-breakpoint
CREATE INDEX `campaign_deliveries_tenant_status_idx` ON `campaignDeliveries` (`tenantId`,`status`);--> statement-breakpoint
CREATE INDEX `content_usage_tenant_content_time_idx` ON `contentUsageEvents` (`tenantId`,`contentId`,`occurredAt`);--> statement-breakpoint
CREATE INDEX `content_usage_tenant_account_time_idx` ON `contentUsageEvents` (`tenantId`,`accountId`,`occurredAt`);--> statement-breakpoint
CREATE INDEX `content_usage_tenant_rep_time_idx` ON `contentUsageEvents` (`tenantId`,`repUserId`,`occurredAt`);--> statement-breakpoint
CREATE INDEX `marketing_campaigns_tenant_status_idx` ON `marketingCampaigns` (`tenantId`,`status`);--> statement-breakpoint
CREATE INDEX `marketing_campaigns_tenant_schedule_idx` ON `marketingCampaigns` (`tenantId`,`scheduledAt`);