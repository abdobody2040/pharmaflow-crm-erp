CREATE TABLE `accountCommercialSignals` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`accountId` varchar(36) NOT NULL,
	`signalType` enum('sales','prescribing') NOT NULL,
	`value` decimal(16,2) NOT NULL,
	`observedAt` date NOT NULL,
	`source` varchar(160) NOT NULL,
	`status` enum('active','superseded') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int NOT NULL,
	CONSTRAINT `accountCommercialSignals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `aiCallAssistDrafts` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`invocationId` varchar(36),
	`repUserId` int NOT NULL,
	`accountId` varchar(36),
	`sourceNoteHash` varchar(128) NOT NULL,
	`structuredDraft` json NOT NULL,
	`confidence` int NOT NULL,
	`status` enum('generated','accepted','discarded') NOT NULL DEFAULT 'generated',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int NOT NULL,
	CONSTRAINT `aiCallAssistDrafts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `aiInvocationEvents` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`policyId` varchar(36),
	`actorUserId` int,
	`task` enum('call_assist','next_best_action') NOT NULL,
	`provider` enum('openai','anthropic','gemini','local','manus') NOT NULL,
	`model` varchar(160) NOT NULL,
	`inputHash` varchar(128) NOT NULL,
	`outputHash` varchar(128),
	`status` enum('completed','failed','blocked') NOT NULL,
	`latencyMs` int,
	`promptTokens` int,
	`completionTokens` int,
	`failureReason` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int NOT NULL,
	CONSTRAINT `aiInvocationEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `aiNextBestActions` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`invocationId` varchar(36),
	`repUserId` int NOT NULL,
	`accountId` varchar(36) NOT NULL,
	`rank` int NOT NULL,
	`score` int NOT NULL,
	`reasonComponents` json NOT NULL,
	`recommendation` varchar(500) NOT NULL,
	`status` enum('generated','dismissed','acted_on') NOT NULL DEFAULT 'generated',
	`generatedAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int NOT NULL,
	CONSTRAINT `aiNextBestActions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `aiTenantPolicies` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`dataSensitivity` enum('standard','sensitive') NOT NULL DEFAULT 'standard',
	`defaultProvider` enum('openai','anthropic','gemini','local','manus') NOT NULL DEFAULT 'manus',
	`defaultModel` varchar(160) NOT NULL DEFAULT 'gpt-5-mini',
	`localModel` varchar(160),
	`taskRoutes` json NOT NULL,
	`status` enum('active','disabled') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int NOT NULL,
	CONSTRAINT `aiTenantPolicies_id` PRIMARY KEY(`id`),
	CONSTRAINT `ai_tenant_policies_tenant_unique` UNIQUE(`tenantId`)
);
--> statement-breakpoint
ALTER TABLE `accountCommercialSignals` ADD CONSTRAINT `accountCommercialSignals_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `accountCommercialSignals` ADD CONSTRAINT `accountCommercialSignals_accountId_accounts_id_fk` FOREIGN KEY (`accountId`) REFERENCES `accounts`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `accountCommercialSignals` ADD CONSTRAINT `accountCommercialSignals_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `aiCallAssistDrafts` ADD CONSTRAINT `aiCallAssistDrafts_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `aiCallAssistDrafts` ADD CONSTRAINT `aiCallAssistDrafts_invocationId_aiInvocationEvents_id_fk` FOREIGN KEY (`invocationId`) REFERENCES `aiInvocationEvents`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `aiCallAssistDrafts` ADD CONSTRAINT `aiCallAssistDrafts_repUserId_users_id_fk` FOREIGN KEY (`repUserId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `aiCallAssistDrafts` ADD CONSTRAINT `aiCallAssistDrafts_accountId_accounts_id_fk` FOREIGN KEY (`accountId`) REFERENCES `accounts`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `aiCallAssistDrafts` ADD CONSTRAINT `aiCallAssistDrafts_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `aiInvocationEvents` ADD CONSTRAINT `aiInvocationEvents_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `aiInvocationEvents` ADD CONSTRAINT `aiInvocationEvents_policyId_aiTenantPolicies_id_fk` FOREIGN KEY (`policyId`) REFERENCES `aiTenantPolicies`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `aiInvocationEvents` ADD CONSTRAINT `aiInvocationEvents_actorUserId_users_id_fk` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `aiInvocationEvents` ADD CONSTRAINT `aiInvocationEvents_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `aiNextBestActions` ADD CONSTRAINT `aiNextBestActions_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `aiNextBestActions` ADD CONSTRAINT `aiNextBestActions_invocationId_aiInvocationEvents_id_fk` FOREIGN KEY (`invocationId`) REFERENCES `aiInvocationEvents`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `aiNextBestActions` ADD CONSTRAINT `aiNextBestActions_repUserId_users_id_fk` FOREIGN KEY (`repUserId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `aiNextBestActions` ADD CONSTRAINT `aiNextBestActions_accountId_accounts_id_fk` FOREIGN KEY (`accountId`) REFERENCES `accounts`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `aiNextBestActions` ADD CONSTRAINT `aiNextBestActions_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `aiTenantPolicies` ADD CONSTRAINT `aiTenantPolicies_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `aiTenantPolicies` ADD CONSTRAINT `aiTenantPolicies_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
CREATE INDEX `commercial_signals_tenant_account_type_date_idx` ON `accountCommercialSignals` (`tenantId`,`accountId`,`signalType`,`observedAt`);--> statement-breakpoint
CREATE INDEX `ai_call_drafts_tenant_rep_created_idx` ON `aiCallAssistDrafts` (`tenantId`,`repUserId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `ai_call_drafts_tenant_status_idx` ON `aiCallAssistDrafts` (`tenantId`,`status`);--> statement-breakpoint
CREATE INDEX `ai_invocations_tenant_task_created_idx` ON `aiInvocationEvents` (`tenantId`,`task`,`createdAt`);--> statement-breakpoint
CREATE INDEX `ai_invocations_tenant_status_idx` ON `aiInvocationEvents` (`tenantId`,`status`);--> statement-breakpoint
CREATE INDEX `next_best_actions_tenant_rep_rank_idx` ON `aiNextBestActions` (`tenantId`,`repUserId`,`generatedAt`,`rank`);--> statement-breakpoint
CREATE INDEX `next_best_actions_tenant_account_idx` ON `aiNextBestActions` (`tenantId`,`accountId`,`generatedAt`);--> statement-breakpoint
CREATE INDEX `ai_tenant_policies_sensitivity_idx` ON `aiTenantPolicies` (`dataSensitivity`,`status`);