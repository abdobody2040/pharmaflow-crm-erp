CREATE TABLE `inventoryReorderLevels` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`siteId` varchar(36) NOT NULL,
	`productName` varchar(255) NOT NULL,
	`minimumQuantity` decimal(12,2) NOT NULL,
	`reorderQuantity` decimal(12,2) NOT NULL,
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int NOT NULL,
	CONSTRAINT `inventoryReorderLevels_id` PRIMARY KEY(`id`),
	CONSTRAINT `inventory_reorder_tenant_site_product_unique` UNIQUE(`tenantId`,`siteId`,`productName`)
);
--> statement-breakpoint
CREATE TABLE `inventorySites` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`code` varchar(64) NOT NULL,
	`siteType` enum('warehouse','office','vehicle','field_stock','other') NOT NULL DEFAULT 'warehouse',
	`address` text,
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int NOT NULL,
	CONSTRAINT `inventorySites_id` PRIMARY KEY(`id`),
	CONSTRAINT `inventory_sites_tenant_code_unique` UNIQUE(`tenantId`,`code`)
);
--> statement-breakpoint
CREATE TABLE `inventoryStockLedger` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`siteId` varchar(36) NOT NULL,
	`productName` varchar(255) NOT NULL,
	`lotNumber` varchar(128),
	`expiryDate` date,
	`transactionType` enum('receipt','issue','transfer_in','transfer_out','return','adjustment') NOT NULL,
	`quantityDelta` decimal(12,2) NOT NULL,
	`referenceType` varchar(128),
	`referenceId` varchar(36),
	`reason` text NOT NULL,
	`occurredAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int NOT NULL,
	CONSTRAINT `inventoryStockLedger_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `inventoryReorderLevels` ADD CONSTRAINT `inventoryReorderLevels_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `inventoryReorderLevels` ADD CONSTRAINT `inventoryReorderLevels_siteId_inventorySites_id_fk` FOREIGN KEY (`siteId`) REFERENCES `inventorySites`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `inventoryReorderLevels` ADD CONSTRAINT `inventoryReorderLevels_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `inventorySites` ADD CONSTRAINT `inventorySites_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `inventorySites` ADD CONSTRAINT `inventorySites_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `inventoryStockLedger` ADD CONSTRAINT `inventoryStockLedger_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `inventoryStockLedger` ADD CONSTRAINT `inventoryStockLedger_siteId_inventorySites_id_fk` FOREIGN KEY (`siteId`) REFERENCES `inventorySites`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `inventoryStockLedger` ADD CONSTRAINT `inventoryStockLedger_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
CREATE INDEX `inventory_reorder_tenant_status_idx` ON `inventoryReorderLevels` (`tenantId`,`status`);--> statement-breakpoint
CREATE INDEX `inventory_sites_tenant_status_idx` ON `inventorySites` (`tenantId`,`status`);--> statement-breakpoint
CREATE INDEX `inventory_ledger_tenant_site_product_occurred_idx` ON `inventoryStockLedger` (`tenantId`,`siteId`,`productName`,`occurredAt`);--> statement-breakpoint
CREATE INDEX `inventory_ledger_tenant_lot_expiry_idx` ON `inventoryStockLedger` (`tenantId`,`lotNumber`,`expiryDate`);