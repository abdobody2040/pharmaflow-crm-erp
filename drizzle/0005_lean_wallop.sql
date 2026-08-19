CREATE TABLE `visitSampleLinks` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`visitLogId` varchar(36) NOT NULL,
	`sampleTransactionId` varchar(36) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int NOT NULL,
	CONSTRAINT `visitSampleLinks_id` PRIMARY KEY(`id`),
	CONSTRAINT `visit_sample_links_tenant_unique` UNIQUE(`tenantId`,`visitLogId`,`sampleTransactionId`)
);
--> statement-breakpoint
ALTER TABLE `visitSampleLinks` ADD CONSTRAINT `visitSampleLinks_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `visitSampleLinks` ADD CONSTRAINT `visitSampleLinks_visitLogId_visitLogs_id_fk` FOREIGN KEY (`visitLogId`) REFERENCES `visitLogs`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `visitSampleLinks` ADD CONSTRAINT `visitSampleLinks_sampleTransactionId_sampleTransactions_id_fk` FOREIGN KEY (`sampleTransactionId`) REFERENCES `sampleTransactions`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `visitSampleLinks` ADD CONSTRAINT `visitSampleLinks_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
CREATE INDEX `visit_sample_links_tenant_visit_idx` ON `visitSampleLinks` (`tenantId`,`visitLogId`);