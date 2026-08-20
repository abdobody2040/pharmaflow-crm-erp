CREATE TABLE `integrationApiKeys` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`label` varchar(160) NOT NULL,
	`apiVersion` enum('v1') NOT NULL DEFAULT 'v1',
	`keyPrefix` varchar(32) NOT NULL,
	`keyHash` varchar(128) NOT NULL,
	`scopes` json NOT NULL,
	`status` enum('active','revoked','expired') NOT NULL DEFAULT 'active',
	`expiresAt` timestamp,
	`lastUsedAt` timestamp,
	`revokedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int NOT NULL,
	CONSTRAINT `integrationApiKeys_id` PRIMARY KEY(`id`),
	CONSTRAINT `integration_api_keys_tenant_prefix_unique` UNIQUE(`tenantId`,`keyPrefix`)
);
--> statement-breakpoint
CREATE TABLE `webhookDeliveryLogs` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`endpointId` varchar(36) NOT NULL,
	`eventType` varchar(128) NOT NULL,
	`payloadHash` varchar(128) NOT NULL,
	`deliveryStatus` enum('delivered','failed','blocked') NOT NULL,
	`httpStatus` int,
	`responseSummary` varchar(500),
	`attemptedAt` timestamp NOT NULL,
	`durationMs` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int NOT NULL,
	CONSTRAINT `webhookDeliveryLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `webhookEndpoints` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`name` varchar(160) NOT NULL,
	`endpointUrl` varchar(2048) NOT NULL,
	`payloadVersion` enum('v1') NOT NULL DEFAULT 'v1',
	`eventTypes` json NOT NULL,
	`status` enum('active','paused','revoked') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int NOT NULL,
	CONSTRAINT `webhookEndpoints_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `integrationApiKeys` ADD CONSTRAINT `integrationApiKeys_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `integrationApiKeys` ADD CONSTRAINT `integrationApiKeys_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `webhookDeliveryLogs` ADD CONSTRAINT `webhookDeliveryLogs_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `webhookDeliveryLogs` ADD CONSTRAINT `webhookDeliveryLogs_endpointId_webhookEndpoints_id_fk` FOREIGN KEY (`endpointId`) REFERENCES `webhookEndpoints`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `webhookDeliveryLogs` ADD CONSTRAINT `webhookDeliveryLogs_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `webhookEndpoints` ADD CONSTRAINT `webhookEndpoints_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `webhookEndpoints` ADD CONSTRAINT `webhookEndpoints_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
CREATE INDEX `integration_api_keys_tenant_status_idx` ON `integrationApiKeys` (`tenantId`,`status`);--> statement-breakpoint
CREATE INDEX `integration_api_keys_tenant_label_version_idx` ON `integrationApiKeys` (`tenantId`,`label`,`apiVersion`);--> statement-breakpoint
CREATE INDEX `webhook_delivery_tenant_endpoint_attempt_idx` ON `webhookDeliveryLogs` (`tenantId`,`endpointId`,`attemptedAt`);--> statement-breakpoint
CREATE INDEX `webhook_delivery_tenant_event_attempt_idx` ON `webhookDeliveryLogs` (`tenantId`,`eventType`,`attemptedAt`);--> statement-breakpoint
CREATE INDEX `webhook_endpoints_tenant_status_idx` ON `webhookEndpoints` (`tenantId`,`status`);--> statement-breakpoint
CREATE INDEX `webhook_endpoints_tenant_version_idx` ON `webhookEndpoints` (`tenantId`,`payloadVersion`);