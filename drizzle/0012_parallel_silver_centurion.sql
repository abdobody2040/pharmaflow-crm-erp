CREATE TABLE `analyticsQueries` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`question` text NOT NULL,
	`semanticPlan` json,
	`resultSummary` json,
	`chartSpec` json,
	`status` enum('completed','rejected','failed') NOT NULL,
	`rejectionReason` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int NOT NULL,
	CONSTRAINT `analyticsQueries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `anomalyAlertReviews` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`alertId` varchar(36) NOT NULL,
	`action` enum('acknowledged','resolved','dismissed','reopened') NOT NULL,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int NOT NULL,
	CONSTRAINT `anomalyAlertReviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `anomalyAlerts` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`monitorConfigId` varchar(36),
	`anomalyType` enum('sample_distribution','expense_outlier','territory_exception') NOT NULL,
	`severity` enum('low','medium','high','critical') NOT NULL,
	`subjectType` varchar(64) NOT NULL,
	`subjectId` varchar(36) NOT NULL,
	`dedupeKey` varchar(255) NOT NULL,
	`evidence` json NOT NULL,
	`detectedAt` timestamp NOT NULL,
	`status` enum('open','acknowledged','resolved','dismissed') NOT NULL DEFAULT 'open',
	`lastReviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int NOT NULL,
	CONSTRAINT `anomalyAlerts_id` PRIMARY KEY(`id`),
	CONSTRAINT `anomaly_alerts_tenant_dedupe_unique` UNIQUE(`tenantId`,`dedupeKey`)
);
--> statement-breakpoint
CREATE TABLE `anomalyMonitorConfigs` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`enabled` int NOT NULL DEFAULT 1,
	`cronExpression` varchar(64) NOT NULL DEFAULT '0 0 2 * * *',
	`scheduleCronTaskUid` varchar(65),
	`sampleMultiplier` int NOT NULL DEFAULT 3,
	`expenseMultiplier` int NOT NULL DEFAULT 2,
	`territoryLookbackHours` int NOT NULL DEFAULT 24,
	`lastRunAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int NOT NULL,
	CONSTRAINT `anomalyMonitorConfigs_id` PRIMARY KEY(`id`),
	CONSTRAINT `anomaly_monitor_config_tenant_unique` UNIQUE(`tenantId`)
);
--> statement-breakpoint
ALTER TABLE `analyticsQueries` ADD CONSTRAINT `analyticsQueries_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `analyticsQueries` ADD CONSTRAINT `analyticsQueries_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `analyticsQueries` ADD CONSTRAINT `analyticsQueries_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `anomalyAlertReviews` ADD CONSTRAINT `anomalyAlertReviews_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `anomalyAlertReviews` ADD CONSTRAINT `anomalyAlertReviews_alertId_anomalyAlerts_id_fk` FOREIGN KEY (`alertId`) REFERENCES `anomalyAlerts`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `anomalyAlertReviews` ADD CONSTRAINT `anomalyAlertReviews_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `anomalyAlerts` ADD CONSTRAINT `anomalyAlerts_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `anomalyAlerts` ADD CONSTRAINT `anomalyAlerts_monitorConfigId_anomalyMonitorConfigs_id_fk` FOREIGN KEY (`monitorConfigId`) REFERENCES `anomalyMonitorConfigs`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `anomalyAlerts` ADD CONSTRAINT `anomalyAlerts_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `anomalyMonitorConfigs` ADD CONSTRAINT `anomalyMonitorConfigs_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `anomalyMonitorConfigs` ADD CONSTRAINT `anomalyMonitorConfigs_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
CREATE INDEX `analytics_queries_tenant_user_created_idx` ON `analyticsQueries` (`tenantId`,`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `analytics_queries_tenant_status_idx` ON `analyticsQueries` (`tenantId`,`status`);--> statement-breakpoint
CREATE INDEX `anomaly_alert_reviews_tenant_alert_created_idx` ON `anomalyAlertReviews` (`tenantId`,`alertId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `anomaly_alerts_tenant_status_detected_idx` ON `anomalyAlerts` (`tenantId`,`status`,`detectedAt`);--> statement-breakpoint
CREATE INDEX `anomaly_alerts_tenant_type_idx` ON `anomalyAlerts` (`tenantId`,`anomalyType`,`detectedAt`);--> statement-breakpoint
CREATE INDEX `anomaly_monitor_task_uid_idx` ON `anomalyMonitorConfigs` (`scheduleCronTaskUid`);