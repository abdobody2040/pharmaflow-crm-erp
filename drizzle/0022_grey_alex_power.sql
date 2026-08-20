CREATE INDEX `accounts_tenant_updated_idx` ON `accounts` (`tenantId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `contacts_tenant_updated_idx` ON `contacts` (`tenantId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `contacts_tenant_account_updated_idx` ON `contacts` (`tenantId`,`accountId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `opportunities_tenant_updated_idx` ON `opportunities` (`tenantId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `opportunities_tenant_account_updated_idx` ON `opportunities` (`tenantId`,`accountId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `planned_visits_tenant_account_date_idx` ON `plannedVisits` (`tenantId`,`accountId`,`plannedStartAt`);--> statement-breakpoint
CREATE INDEX `territories_tenant_updated_idx` ON `territories` (`tenantId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `users_tenant_created_idx` ON `users` (`tenantId`,`createdAt`);