CREATE TABLE `auditEvents` (
  `id` varchar(36) NOT NULL,
  `tenantId` varchar(36) NOT NULL,
  `actorUserId` int,
  `entityType` varchar(96) NOT NULL,
  `entityId` varchar(36) NOT NULL,
  `eventType` varchar(96) NOT NULL,
  `operation` enum('create','status_change','access','provision') NOT NULL,
  `oldValue` json,
  `newValue` json,
  `reason` varchar(500),
  `previousHash` varchar(128),
  `eventHash` varchar(128) NOT NULL,
  `status` enum('recorded','voided','superseded') NOT NULL DEFAULT 'recorded',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `auditEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `electronicSignatures` (
  `id` varchar(36) NOT NULL,
  `tenantId` varchar(36) NOT NULL,
  `subjectType` varchar(96) NOT NULL,
  `subjectId` varchar(36) NOT NULL,
  `signerUserId` int NOT NULL,
  `meaning` enum('authorship','approval','review','attestation') NOT NULL,
  `intentStatement` varchar(500) NOT NULL,
  `signatureTokenHash` varchar(128) NOT NULL,
  `signedAt` timestamp NOT NULL DEFAULT (now()),
  `status` enum('recorded','voided','superseded') NOT NULL DEFAULT 'recorded',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `createdBy` int NOT NULL,
  CONSTRAINT `electronicSignatures_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `roles` (
  `id` varchar(36) NOT NULL,
  `tenantId` varchar(36) NOT NULL,
  `code` enum('super_admin','admin','manager','rep','hr','exec') NOT NULL,
  `label` varchar(96) NOT NULL,
  `permissions` json NOT NULL,
  `status` enum('active','archived') NOT NULL DEFAULT 'active',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `createdBy` int NOT NULL,
  CONSTRAINT `roles_id` PRIMARY KEY(`id`),
  CONSTRAINT `roles_tenant_code_unique` UNIQUE(`tenantId`,`code`)
);
--> statement-breakpoint
CREATE TABLE `sampleTransactions` (
  `id` varchar(36) NOT NULL,
  `tenantId` varchar(36) NOT NULL,
  `transactionType` enum('allocation','handoff','return','adjustment') NOT NULL,
  `productName` varchar(255) NOT NULL,
  `lotNumber` varchar(128) NOT NULL,
  `expiryDate` date NOT NULL,
  `quantity` varchar(16) NOT NULL,
  `fromUserId` int,
  `toUserId` int,
  `visitLogId` varchar(36),
  `occurredAt` timestamp NOT NULL,
  `compensatesId` varchar(36),
  `status` enum('recorded','voided','superseded') NOT NULL DEFAULT 'recorded',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `createdBy` int NOT NULL,
  CONSTRAINT `sampleTransactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tenants` (
  `id` varchar(36) NOT NULL,
  `slug` varchar(96) NOT NULL,
  `legalName` varchar(255) NOT NULL,
  `displayName` varchar(255) NOT NULL,
  `planTier` enum('starter','growth','enterprise','regulated') NOT NULL DEFAULT 'starter',
  `billingStatus` enum('trial','current','past_due','cancelled') NOT NULL DEFAULT 'trial',
  `status` enum('active','suspended','pending') NOT NULL DEFAULT 'pending',
  `region` varchar(96) DEFAULT 'global',
  `dataRetentionDays` varchar(10) NOT NULL DEFAULT '2555',
  `statusReason` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `createdBy` int,
  `suspendedAt` timestamp,
  CONSTRAINT `tenants_id` PRIMARY KEY(`id`),
  CONSTRAINT `tenants_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `userRoleAssignments` (
  `id` varchar(36) NOT NULL,
  `tenantId` varchar(36) NOT NULL,
  `userId` int NOT NULL,
  `roleId` varchar(36) NOT NULL,
  `status` enum('active','revoked') NOT NULL DEFAULT 'active',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `createdBy` int NOT NULL,
  `reason` varchar(500),
  CONSTRAINT `userRoleAssignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `visitLogs` (
  `id` varchar(36) NOT NULL,
  `tenantId` varchar(36) NOT NULL,
  `repUserId` int NOT NULL,
  `accountName` varchar(255) NOT NULL,
  `objective` text NOT NULL,
  `productsDiscussed` json NOT NULL,
  `nextSteps` text,
  `occurredAt` timestamp NOT NULL,
  `supersedesId` varchar(36),
  `status` enum('recorded','voided','superseded') NOT NULL DEFAULT 'recorded',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `createdBy` int NOT NULL,
  CONSTRAINT `visitLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
UPDATE `users` SET `email` = CONCAT(`openId`, '@identity.pharmaflow.local') WHERE `email` IS NULL;
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','super_admin','manager','rep','hr','exec') NOT NULL DEFAULT 'rep';
--> statement-breakpoint
UPDATE `users` SET `role` = CASE `role` WHEN 'admin' THEN 'super_admin' ELSE 'rep' END;
--> statement-breakpoint
ALTER TABLE `users` DROP INDEX `users_openId_unique`;
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `openId` varchar(128) NOT NULL;
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `name` varchar(255);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `email` varchar(320) NOT NULL;
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `loginMethod` varchar(64) NOT NULL DEFAULT 'local_jwt';
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('super_admin','admin','manager','rep','hr','exec') NOT NULL DEFAULT 'rep';
--> statement-breakpoint
ALTER TABLE `users` ADD `tenantId` varchar(36);
--> statement-breakpoint
ALTER TABLE `users` ADD `passwordHash` varchar(255);
--> statement-breakpoint
ALTER TABLE `users` ADD `department` varchar(160);
--> statement-breakpoint
ALTER TABLE `users` ADD `territory` varchar(160);
--> statement-breakpoint
ALTER TABLE `users` ADD `hireDate` date;
--> statement-breakpoint
ALTER TABLE `users` ADD `status` enum('active','suspended','invited','archived') DEFAULT 'invited' NOT NULL;
--> statement-breakpoint
ALTER TABLE `users` ADD `createdBy` int;
--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_open_id_unique` UNIQUE(`openId`);
--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_tenant_email_unique` UNIQUE(`tenantId`,`email`);
--> statement-breakpoint
ALTER TABLE `auditEvents` ADD CONSTRAINT `auditEvents_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE restrict ON UPDATE restrict;
--> statement-breakpoint
ALTER TABLE `auditEvents` ADD CONSTRAINT `auditEvents_actorUserId_users_id_fk` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;
--> statement-breakpoint
ALTER TABLE `electronicSignatures` ADD CONSTRAINT `electronicSignatures_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE restrict ON UPDATE restrict;
--> statement-breakpoint
ALTER TABLE `electronicSignatures` ADD CONSTRAINT `electronicSignatures_signerUserId_users_id_fk` FOREIGN KEY (`signerUserId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;
--> statement-breakpoint
ALTER TABLE `electronicSignatures` ADD CONSTRAINT `electronicSignatures_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;
--> statement-breakpoint
ALTER TABLE `roles` ADD CONSTRAINT `roles_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE restrict ON UPDATE restrict;
--> statement-breakpoint
ALTER TABLE `sampleTransactions` ADD CONSTRAINT `sampleTransactions_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE restrict ON UPDATE restrict;
--> statement-breakpoint
ALTER TABLE `sampleTransactions` ADD CONSTRAINT `sampleTransactions_fromUserId_users_id_fk` FOREIGN KEY (`fromUserId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;
--> statement-breakpoint
ALTER TABLE `sampleTransactions` ADD CONSTRAINT `sampleTransactions_toUserId_users_id_fk` FOREIGN KEY (`toUserId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;
--> statement-breakpoint
ALTER TABLE `sampleTransactions` ADD CONSTRAINT `sampleTransactions_visitLogId_visitLogs_id_fk` FOREIGN KEY (`visitLogId`) REFERENCES `visitLogs`(`id`) ON DELETE restrict ON UPDATE restrict;
--> statement-breakpoint
ALTER TABLE `sampleTransactions` ADD CONSTRAINT `sampleTransactions_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;
--> statement-breakpoint
ALTER TABLE `userRoleAssignments` ADD CONSTRAINT `userRoleAssignments_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE restrict ON UPDATE restrict;
--> statement-breakpoint
ALTER TABLE `userRoleAssignments` ADD CONSTRAINT `userRoleAssignments_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;
--> statement-breakpoint
ALTER TABLE `userRoleAssignments` ADD CONSTRAINT `userRoleAssignments_roleId_roles_id_fk` FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON DELETE restrict ON UPDATE restrict;
--> statement-breakpoint
ALTER TABLE `visitLogs` ADD CONSTRAINT `visitLogs_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE restrict ON UPDATE restrict;
--> statement-breakpoint
ALTER TABLE `visitLogs` ADD CONSTRAINT `visitLogs_repUserId_users_id_fk` FOREIGN KEY (`repUserId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;
--> statement-breakpoint
ALTER TABLE `visitLogs` ADD CONSTRAINT `visitLogs_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;
--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE restrict ON UPDATE restrict;
--> statement-breakpoint
CREATE INDEX `audit_events_tenant_created_idx` ON `auditEvents` (`tenantId`,`createdAt`);
--> statement-breakpoint
CREATE INDEX `audit_events_entity_idx` ON `auditEvents` (`tenantId`,`entityType`,`entityId`);
--> statement-breakpoint
CREATE INDEX `electronic_signatures_tenant_subject_idx` ON `electronicSignatures` (`tenantId`,`subjectType`,`subjectId`);
--> statement-breakpoint
CREATE INDEX `electronic_signatures_tenant_signed_idx` ON `electronicSignatures` (`tenantId`,`signedAt`);
--> statement-breakpoint
CREATE INDEX `roles_tenant_status_idx` ON `roles` (`tenantId`,`status`);
--> statement-breakpoint
CREATE INDEX `sample_transactions_tenant_occurred_idx` ON `sampleTransactions` (`tenantId`,`occurredAt`);
--> statement-breakpoint
CREATE INDEX `sample_transactions_tenant_lot_idx` ON `sampleTransactions` (`tenantId`,`lotNumber`);
--> statement-breakpoint
CREATE INDEX `tenants_status_idx` ON `tenants` (`status`);
--> statement-breakpoint
CREATE INDEX `user_role_assignments_tenant_user_idx` ON `userRoleAssignments` (`tenantId`,`userId`);
--> statement-breakpoint
CREATE INDEX `user_role_assignments_tenant_role_idx` ON `userRoleAssignments` (`tenantId`,`roleId`);
--> statement-breakpoint
CREATE INDEX `visit_logs_tenant_occurred_idx` ON `visitLogs` (`tenantId`,`occurredAt`);
--> statement-breakpoint
CREATE INDEX `visit_logs_tenant_rep_idx` ON `visitLogs` (`tenantId`,`repUserId`);
--> statement-breakpoint
CREATE INDEX `users_tenant_status_idx` ON `users` (`tenantId`,`status`);
--> statement-breakpoint
CREATE INDEX `users_tenant_role_idx` ON `users` (`tenantId`,`role`);
--> statement-breakpoint
CREATE TRIGGER `audit_events_insert_only_no_update` BEFORE UPDATE ON `auditEvents` FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'auditEvents is append-only';
--> statement-breakpoint
CREATE TRIGGER `audit_events_insert_only_no_delete` BEFORE DELETE ON `auditEvents` FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'auditEvents is append-only';
--> statement-breakpoint
CREATE TRIGGER `visit_logs_insert_only_no_update` BEFORE UPDATE ON `visitLogs` FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'visitLogs is append-only';
--> statement-breakpoint
CREATE TRIGGER `visit_logs_insert_only_no_delete` BEFORE DELETE ON `visitLogs` FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'visitLogs is append-only';
--> statement-breakpoint
CREATE TRIGGER `sample_transactions_insert_only_no_update` BEFORE UPDATE ON `sampleTransactions` FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'sampleTransactions is append-only';
--> statement-breakpoint
CREATE TRIGGER `sample_transactions_insert_only_no_delete` BEFORE DELETE ON `sampleTransactions` FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'sampleTransactions is append-only';
--> statement-breakpoint
CREATE TRIGGER `electronic_signatures_insert_only_no_update` BEFORE UPDATE ON `electronicSignatures` FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'electronicSignatures is append-only';
--> statement-breakpoint
CREATE TRIGGER `electronic_signatures_insert_only_no_delete` BEFORE DELETE ON `electronicSignatures` FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'electronicSignatures is append-only';
