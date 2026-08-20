CREATE TABLE `accessReviewReports` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`scope` enum('tenant','regulated_workflows','privileged_access') NOT NULL,
	`reportPeriodStart` timestamp NOT NULL,
	`reportPeriodEnd` timestamp NOT NULL,
	`accessSnapshot` json NOT NULL,
	`findings` json NOT NULL,
	`status` enum('generated','reviewed','accepted') NOT NULL DEFAULT 'generated',
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int NOT NULL,
	`reviewedBy` int,
	CONSTRAINT `accessReviewReports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `regulatedRecordRevisions` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`recordType` enum('visit_log','sample_transaction','electronic_signature') NOT NULL,
	`originalRecordId` varchar(36) NOT NULL,
	`replacementRecordId` varchar(36) NOT NULL,
	`reasonForChange` varchar(500) NOT NULL,
	`revisionKind` enum('correction','void','supersession') NOT NULL,
	`effectiveAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int NOT NULL,
	CONSTRAINT `regulatedRecordRevisions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workflowChangeControls` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`workflowKey` varchar(128) NOT NULL,
	`changeTitle` varchar(255) NOT NULL,
	`rationale` text NOT NULL,
	`riskAssessment` text NOT NULL,
	`validationImpact` text NOT NULL,
	`beforeState` json NOT NULL,
	`proposedState` json NOT NULL,
	`status` enum('proposed','approved','implemented','rejected','retired') NOT NULL DEFAULT 'proposed',
	`approvedAt` timestamp,
	`implementedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int NOT NULL,
	`approvedBy` int,
	CONSTRAINT `workflowChangeControls_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `electronicSignatures` ADD `credentialVerifiedAt` timestamp;--> statement-breakpoint
ALTER TABLE `electronicSignatures` ADD `signingActionAt` timestamp;--> statement-breakpoint
ALTER TABLE `accessReviewReports` ADD CONSTRAINT `accessReviewReports_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `accessReviewReports` ADD CONSTRAINT `accessReviewReports_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `accessReviewReports` ADD CONSTRAINT `accessReviewReports_reviewedBy_users_id_fk` FOREIGN KEY (`reviewedBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `regulatedRecordRevisions` ADD CONSTRAINT `regulatedRecordRevisions_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `regulatedRecordRevisions` ADD CONSTRAINT `regulatedRecordRevisions_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `workflowChangeControls` ADD CONSTRAINT `workflowChangeControls_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `workflowChangeControls` ADD CONSTRAINT `workflowChangeControls_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `workflowChangeControls` ADD CONSTRAINT `workflowChangeControls_approvedBy_users_id_fk` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
CREATE INDEX `access_reviews_tenant_created_idx` ON `accessReviewReports` (`tenantId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `access_reviews_tenant_status_idx` ON `accessReviewReports` (`tenantId`,`status`);--> statement-breakpoint
CREATE INDEX `regulated_revisions_tenant_record_idx` ON `regulatedRecordRevisions` (`tenantId`,`recordType`,`originalRecordId`);--> statement-breakpoint
CREATE INDEX `regulated_revisions_tenant_created_idx` ON `regulatedRecordRevisions` (`tenantId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `workflow_changes_tenant_status_idx` ON `workflowChangeControls` (`tenantId`,`status`);--> statement-breakpoint
CREATE INDEX `workflow_changes_tenant_workflow_idx` ON `workflowChangeControls` (`tenantId`,`workflowKey`,`createdAt`);