import { systemRouter } from "./_core/systemRouter";
import { router } from "./_core/trpc";
import { authRouter } from "./routers/auth";
import { complianceRouter } from "./routers/compliance";
import { directoryRouter } from "./routers/directory";
import { platformRouter } from "./routers/platform";
import { crmRouter } from "./routers/crm";

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  platform: platformRouter,
  directory: directoryRouter,
  compliance: complianceRouter,
  crm: crmRouter,
});

export type AppRouter = typeof appRouter;
