CREATE TABLE `geofenceEvents` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`repUserId` int NOT NULL,
	`shiftId` varchar(36) NOT NULL,
	`locationEventId` varchar(36) NOT NULL,
	`geofenceId` varchar(36),
	`eventType` enum('enter','exit','near','far','idle_started','idle_ended') NOT NULL,
	`distanceMeters` int,
	`observedAt` timestamp NOT NULL,
	`status` enum('recorded','voided','superseded') NOT NULL DEFAULT 'recorded',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int NOT NULL,
	CONSTRAINT `geofenceEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `geofences` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`territoryId` varchar(36),
	`accountId` varchar(36),
	`name` varchar(255) NOT NULL,
	`geofenceType` enum('territory','hcp_stop') NOT NULL,
	`latitude` decimal(10,7) NOT NULL,
	`longitude` decimal(10,7) NOT NULL,
	`radiusMeters` int NOT NULL,
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int NOT NULL,
	CONSTRAINT `geofences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `repGeofenceStates` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`repUserId` int NOT NULL,
	`geofenceId` varchar(36) NOT NULL,
	`lastLocationEventId` varchar(36),
	`isInside` int NOT NULL DEFAULT 0,
	`lastDistanceMeters` int NOT NULL,
	`lastObservedAt` timestamp NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `repGeofenceStates_id` PRIMARY KEY(`id`),
	CONSTRAINT `rep_geofence_states_tenant_rep_geofence_unique` UNIQUE(`tenantId`,`repUserId`,`geofenceId`)
);
--> statement-breakpoint
ALTER TABLE `geofenceEvents` ADD CONSTRAINT `geofenceEvents_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `geofenceEvents` ADD CONSTRAINT `geofenceEvents_repUserId_users_id_fk` FOREIGN KEY (`repUserId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `geofenceEvents` ADD CONSTRAINT `geofenceEvents_shiftId_repShifts_id_fk` FOREIGN KEY (`shiftId`) REFERENCES `repShifts`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `geofenceEvents` ADD CONSTRAINT `geofenceEvents_locationEventId_repLocationEvents_id_fk` FOREIGN KEY (`locationEventId`) REFERENCES `repLocationEvents`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `geofenceEvents` ADD CONSTRAINT `geofenceEvents_geofenceId_geofences_id_fk` FOREIGN KEY (`geofenceId`) REFERENCES `geofences`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `geofenceEvents` ADD CONSTRAINT `geofenceEvents_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `geofences` ADD CONSTRAINT `geofences_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `geofences` ADD CONSTRAINT `geofences_territoryId_territories_id_fk` FOREIGN KEY (`territoryId`) REFERENCES `territories`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `geofences` ADD CONSTRAINT `geofences_accountId_accounts_id_fk` FOREIGN KEY (`accountId`) REFERENCES `accounts`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `geofences` ADD CONSTRAINT `geofences_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `repGeofenceStates` ADD CONSTRAINT `repGeofenceStates_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `repGeofenceStates` ADD CONSTRAINT `repGeofenceStates_repUserId_users_id_fk` FOREIGN KEY (`repUserId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `repGeofenceStates` ADD CONSTRAINT `repGeofenceStates_geofenceId_geofences_id_fk` FOREIGN KEY (`geofenceId`) REFERENCES `geofences`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `repGeofenceStates` ADD CONSTRAINT `repGeofenceStates_lastLocationEventId_repLocationEvents_id_fk` FOREIGN KEY (`lastLocationEventId`) REFERENCES `repLocationEvents`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
CREATE INDEX `geofence_events_tenant_shift_time_idx` ON `geofenceEvents` (`tenantId`,`shiftId`,`observedAt`);--> statement-breakpoint
CREATE INDEX `geofence_events_tenant_rep_time_idx` ON `geofenceEvents` (`tenantId`,`repUserId`,`observedAt`);--> statement-breakpoint
CREATE INDEX `geofences_tenant_status_idx` ON `geofences` (`tenantId`,`status`);--> statement-breakpoint
CREATE INDEX `geofences_tenant_type_idx` ON `geofences` (`tenantId`,`geofenceType`);