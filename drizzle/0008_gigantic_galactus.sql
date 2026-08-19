CREATE TABLE `attendanceRecords` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`locationEventId` varchar(36),
	`geofenceId` varchar(36),
	`attendanceDate` date NOT NULL,
	`eventType` enum('check_in','check_out','outside_geofence','manual_review') NOT NULL,
	`latitude` decimal(10,7),
	`longitude` decimal(10,7),
	`distanceMeters` int,
	`status` enum('recorded','voided','superseded') NOT NULL DEFAULT 'recorded',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int NOT NULL,
	CONSTRAINT `attendanceRecords_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `expenseReports` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`employeeUserId` int NOT NULL,
	`category` enum('travel','lodging','meals','mileage','supplies','other') NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'USD',
	`expenseDate` date NOT NULL,
	`description` text,
	`receiptKey` varchar(512),
	`receiptUrl` varchar(768),
	`receiptMimeType` varchar(128),
	`status` enum('submitted','approved','rejected','reimbursed') NOT NULL DEFAULT 'submitted',
	`reviewerUserId` int,
	`reviewedAt` timestamp,
	`reviewNote` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int NOT NULL,
	CONSTRAINT `expenseReports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leaveRequests` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`employeeUserId` int NOT NULL,
	`leaveType` enum('annual','sick','personal','unpaid','other') NOT NULL,
	`startDate` date NOT NULL,
	`endDate` date NOT NULL,
	`reason` text,
	`status` enum('submitted','approved','rejected','cancelled') NOT NULL DEFAULT 'submitted',
	`reviewerUserId` int,
	`reviewedAt` timestamp,
	`reviewNote` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int NOT NULL,
	CONSTRAINT `leaveRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payrollExportRuns` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`periodStart` date NOT NULL,
	`periodEnd` date NOT NULL,
	`format` enum('csv','xlsx') NOT NULL,
	`rowCount` int NOT NULL DEFAULT 0,
	`status` enum('recorded','voided','superseded') NOT NULL DEFAULT 'recorded',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int NOT NULL,
	CONSTRAINT `payrollExportRuns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `attendanceRecords` ADD CONSTRAINT `attendanceRecords_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `attendanceRecords` ADD CONSTRAINT `attendanceRecords_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `attendanceRecords` ADD CONSTRAINT `attendanceRecords_locationEventId_repLocationEvents_id_fk` FOREIGN KEY (`locationEventId`) REFERENCES `repLocationEvents`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `attendanceRecords` ADD CONSTRAINT `attendanceRecords_geofenceId_geofences_id_fk` FOREIGN KEY (`geofenceId`) REFERENCES `geofences`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `attendanceRecords` ADD CONSTRAINT `attendanceRecords_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `expenseReports` ADD CONSTRAINT `expenseReports_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `expenseReports` ADD CONSTRAINT `expenseReports_employeeUserId_users_id_fk` FOREIGN KEY (`employeeUserId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `expenseReports` ADD CONSTRAINT `expenseReports_reviewerUserId_users_id_fk` FOREIGN KEY (`reviewerUserId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `expenseReports` ADD CONSTRAINT `expenseReports_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `leaveRequests` ADD CONSTRAINT `leaveRequests_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `leaveRequests` ADD CONSTRAINT `leaveRequests_employeeUserId_users_id_fk` FOREIGN KEY (`employeeUserId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `leaveRequests` ADD CONSTRAINT `leaveRequests_reviewerUserId_users_id_fk` FOREIGN KEY (`reviewerUserId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `leaveRequests` ADD CONSTRAINT `leaveRequests_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `payrollExportRuns` ADD CONSTRAINT `payrollExportRuns_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `payrollExportRuns` ADD CONSTRAINT `payrollExportRuns_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
CREATE INDEX `attendance_tenant_user_date_idx` ON `attendanceRecords` (`tenantId`,`userId`,`attendanceDate`);--> statement-breakpoint
CREATE INDEX `attendance_tenant_created_idx` ON `attendanceRecords` (`tenantId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `expense_reports_tenant_employee_idx` ON `expenseReports` (`tenantId`,`employeeUserId`,`expenseDate`);--> statement-breakpoint
CREATE INDEX `expense_reports_tenant_status_idx` ON `expenseReports` (`tenantId`,`status`);--> statement-breakpoint
CREATE INDEX `leave_requests_tenant_employee_idx` ON `leaveRequests` (`tenantId`,`employeeUserId`,`startDate`);--> statement-breakpoint
CREATE INDEX `leave_requests_tenant_status_idx` ON `leaveRequests` (`tenantId`,`status`);--> statement-breakpoint
CREATE INDEX `payroll_exports_tenant_created_idx` ON `payrollExportRuns` (`tenantId`,`createdAt`);