ALTER TABLE `auditEvents` MODIFY COLUMN `actorUserId` int;--> statement-breakpoint
ALTER TABLE `electronicSignatures` MODIFY COLUMN `signerUserId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `electronicSignatures` MODIFY COLUMN `createdBy` int NOT NULL;--> statement-breakpoint
ALTER TABLE `roles` MODIFY COLUMN `createdBy` int NOT NULL;--> statement-breakpoint
ALTER TABLE `sampleTransactions` MODIFY COLUMN `fromUserId` int;--> statement-breakpoint
ALTER TABLE `sampleTransactions` MODIFY COLUMN `toUserId` int;--> statement-breakpoint
ALTER TABLE `sampleTransactions` MODIFY COLUMN `createdBy` int NOT NULL;--> statement-breakpoint
ALTER TABLE `tenants` MODIFY COLUMN `createdBy` int;--> statement-breakpoint
ALTER TABLE `userRoleAssignments` MODIFY COLUMN `userId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `userRoleAssignments` MODIFY COLUMN `createdBy` int NOT NULL;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `id` int AUTO_INCREMENT NOT NULL;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `createdBy` int;--> statement-breakpoint
ALTER TABLE `visitLogs` MODIFY COLUMN `repUserId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `visitLogs` MODIFY COLUMN `createdBy` int NOT NULL;