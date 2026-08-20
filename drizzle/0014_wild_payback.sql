CREATE TABLE `fieldEventAttendees` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`eventId` varchar(36) NOT NULL,
	`accountId` varchar(36),
	`contactId` varchar(36),
	`attendanceStatus` enum('invited','registered','attended','no_show','cancelled') NOT NULL DEFAULT 'invited',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int NOT NULL,
	CONSTRAINT `fieldEventAttendees_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fieldEvents` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`eventType` enum('medical_conference','webinar','product_launch','training','other') NOT NULL,
	`startsAt` timestamp NOT NULL,
	`endsAt` timestamp NOT NULL,
	`locationOrUrl` varchar(768),
	`description` text,
	`status` enum('draft','published','completed','cancelled') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int NOT NULL,
	CONSTRAINT `fieldEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fleetMaintenanceRecords` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`vehicleId` varchar(36) NOT NULL,
	`maintenanceType` varchar(160) NOT NULL,
	`dueDate` date,
	`dueOdometerKm` int,
	`completedAt` timestamp,
	`cost` decimal(14,2),
	`notes` text,
	`status` enum('scheduled','completed','overdue','cancelled') NOT NULL DEFAULT 'scheduled',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int NOT NULL,
	CONSTRAINT `fleetMaintenanceRecords_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fleetVehicles` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`registrationNumber` varchar(64) NOT NULL,
	`makeModel` varchar(255) NOT NULL,
	`assignedUserId` int,
	`odometerKm` int NOT NULL DEFAULT 0,
	`status` enum('active','maintenance','inactive','archived') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int NOT NULL,
	CONSTRAINT `fleetVehicles_id` PRIMARY KEY(`id`),
	CONSTRAINT `fleet_vehicles_tenant_registration_unique` UNIQUE(`tenantId`,`registrationNumber`)
);
--> statement-breakpoint
CREATE TABLE `fuelLogs` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`vehicleId` varchar(36) NOT NULL,
	`filledAt` timestamp NOT NULL,
	`odometerKm` int NOT NULL,
	`liters` decimal(10,2) NOT NULL,
	`totalCost` decimal(14,2) NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'USD',
	`stationName` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int NOT NULL,
	CONSTRAINT `fuelLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `procurementRequests` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`productName` varchar(255) NOT NULL,
	`sku` varchar(128),
	`requestedQuantity` int NOT NULL,
	`neededBy` date,
	`rationale` text,
	`status` enum('submitted','approved','rejected','ordered','received','cancelled') NOT NULL DEFAULT 'submitted',
	`reviewerUserId` int,
	`reviewedAt` timestamp,
	`reviewNote` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int NOT NULL,
	CONSTRAINT `procurementRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchaseOrders` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`requestId` varchar(36) NOT NULL,
	`supplierName` varchar(255) NOT NULL,
	`orderedQuantity` int NOT NULL,
	`unitCost` decimal(14,2) NOT NULL DEFAULT '0.00',
	`currency` varchar(3) NOT NULL DEFAULT 'USD',
	`expectedDeliveryDate` date,
	`status` enum('issued','partially_received','received','cancelled') NOT NULL DEFAULT 'issued',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int NOT NULL,
	CONSTRAINT `purchaseOrders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `territoryForecasts` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`territoryId` varchar(36),
	`productName` varchar(255) NOT NULL,
	`periodStart` date NOT NULL,
	`periodEnd` date NOT NULL,
	`historicalActual` decimal(16,2) NOT NULL DEFAULT '0.00',
	`forecastValue` decimal(16,2) NOT NULL,
	`method` enum('manual','moving_average') NOT NULL DEFAULT 'manual',
	`confidencePct` int NOT NULL DEFAULT 50,
	`status` enum('draft','published','superseded') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int NOT NULL,
	CONSTRAINT `territoryForecasts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `visitCoachingNotes` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`visitLogId` varchar(36) NOT NULL,
	`repUserId` int NOT NULL,
	`coachingNote` text NOT NULL,
	`complianceFlag` int NOT NULL DEFAULT 0,
	`acknowledgementStatus` enum('pending','acknowledged') NOT NULL DEFAULT 'pending',
	`acknowledgedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int NOT NULL,
	CONSTRAINT `visitCoachingNotes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `fieldEventAttendees` ADD CONSTRAINT `fieldEventAttendees_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `fieldEventAttendees` ADD CONSTRAINT `fieldEventAttendees_eventId_fieldEvents_id_fk` FOREIGN KEY (`eventId`) REFERENCES `fieldEvents`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `fieldEventAttendees` ADD CONSTRAINT `fieldEventAttendees_accountId_accounts_id_fk` FOREIGN KEY (`accountId`) REFERENCES `accounts`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `fieldEventAttendees` ADD CONSTRAINT `fieldEventAttendees_contactId_contacts_id_fk` FOREIGN KEY (`contactId`) REFERENCES `contacts`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `fieldEventAttendees` ADD CONSTRAINT `fieldEventAttendees_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `fieldEvents` ADD CONSTRAINT `fieldEvents_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `fieldEvents` ADD CONSTRAINT `fieldEvents_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `fleetMaintenanceRecords` ADD CONSTRAINT `fleetMaintenanceRecords_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `fleetMaintenanceRecords` ADD CONSTRAINT `fleetMaintenanceRecords_vehicleId_fleetVehicles_id_fk` FOREIGN KEY (`vehicleId`) REFERENCES `fleetVehicles`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `fleetMaintenanceRecords` ADD CONSTRAINT `fleetMaintenanceRecords_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `fleetVehicles` ADD CONSTRAINT `fleetVehicles_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `fleetVehicles` ADD CONSTRAINT `fleetVehicles_assignedUserId_users_id_fk` FOREIGN KEY (`assignedUserId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `fleetVehicles` ADD CONSTRAINT `fleetVehicles_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `fuelLogs` ADD CONSTRAINT `fuelLogs_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `fuelLogs` ADD CONSTRAINT `fuelLogs_vehicleId_fleetVehicles_id_fk` FOREIGN KEY (`vehicleId`) REFERENCES `fleetVehicles`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `fuelLogs` ADD CONSTRAINT `fuelLogs_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `procurementRequests` ADD CONSTRAINT `procurementRequests_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `procurementRequests` ADD CONSTRAINT `procurementRequests_reviewerUserId_users_id_fk` FOREIGN KEY (`reviewerUserId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `procurementRequests` ADD CONSTRAINT `procurementRequests_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `purchaseOrders` ADD CONSTRAINT `purchaseOrders_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `purchaseOrders` ADD CONSTRAINT `purchaseOrders_requestId_procurementRequests_id_fk` FOREIGN KEY (`requestId`) REFERENCES `procurementRequests`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `purchaseOrders` ADD CONSTRAINT `purchaseOrders_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `territoryForecasts` ADD CONSTRAINT `territoryForecasts_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `territoryForecasts` ADD CONSTRAINT `territoryForecasts_territoryId_territories_id_fk` FOREIGN KEY (`territoryId`) REFERENCES `territories`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `territoryForecasts` ADD CONSTRAINT `territoryForecasts_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `visitCoachingNotes` ADD CONSTRAINT `visitCoachingNotes_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `visitCoachingNotes` ADD CONSTRAINT `visitCoachingNotes_visitLogId_visitLogs_id_fk` FOREIGN KEY (`visitLogId`) REFERENCES `visitLogs`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `visitCoachingNotes` ADD CONSTRAINT `visitCoachingNotes_repUserId_users_id_fk` FOREIGN KEY (`repUserId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `visitCoachingNotes` ADD CONSTRAINT `visitCoachingNotes_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
CREATE INDEX `field_event_attendees_tenant_event_idx` ON `fieldEventAttendees` (`tenantId`,`eventId`);--> statement-breakpoint
CREATE INDEX `field_event_attendees_tenant_account_idx` ON `fieldEventAttendees` (`tenantId`,`accountId`);--> statement-breakpoint
CREATE INDEX `field_events_tenant_start_idx` ON `fieldEvents` (`tenantId`,`startsAt`);--> statement-breakpoint
CREATE INDEX `field_events_tenant_status_idx` ON `fieldEvents` (`tenantId`,`status`);--> statement-breakpoint
CREATE INDEX `fleet_maintenance_tenant_vehicle_due_idx` ON `fleetMaintenanceRecords` (`tenantId`,`vehicleId`,`dueDate`);--> statement-breakpoint
CREATE INDEX `fleet_maintenance_tenant_status_idx` ON `fleetMaintenanceRecords` (`tenantId`,`status`);--> statement-breakpoint
CREATE INDEX `fleet_vehicles_tenant_status_idx` ON `fleetVehicles` (`tenantId`,`status`);--> statement-breakpoint
CREATE INDEX `fuel_logs_tenant_vehicle_filled_idx` ON `fuelLogs` (`tenantId`,`vehicleId`,`filledAt`);--> statement-breakpoint
CREATE INDEX `procurement_requests_tenant_status_idx` ON `procurementRequests` (`tenantId`,`status`);--> statement-breakpoint
CREATE INDEX `procurement_requests_tenant_created_idx` ON `procurementRequests` (`tenantId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `purchase_orders_tenant_request_idx` ON `purchaseOrders` (`tenantId`,`requestId`);--> statement-breakpoint
CREATE INDEX `purchase_orders_tenant_status_idx` ON `purchaseOrders` (`tenantId`,`status`);--> statement-breakpoint
CREATE INDEX `territory_forecasts_tenant_period_idx` ON `territoryForecasts` (`tenantId`,`periodStart`,`periodEnd`);--> statement-breakpoint
CREATE INDEX `territory_forecasts_tenant_territory_product_idx` ON `territoryForecasts` (`tenantId`,`territoryId`,`productName`);--> statement-breakpoint
CREATE INDEX `visit_coaching_tenant_visit_idx` ON `visitCoachingNotes` (`tenantId`,`visitLogId`);--> statement-breakpoint
CREATE INDEX `visit_coaching_tenant_rep_created_idx` ON `visitCoachingNotes` (`tenantId`,`repUserId`,`createdAt`);