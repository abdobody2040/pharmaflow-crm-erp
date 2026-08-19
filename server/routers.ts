import { systemRouter } from "./_core/systemRouter";
import { router } from "./_core/trpc";
import { authRouter } from "./routers/auth";
import { complianceRouter } from "./routers/compliance";
import { directoryRouter } from "./routers/directory";
import { platformRouter } from "./routers/platform";
import { crmRouter } from "./routers/crm";
import { repRouter } from "./routers/rep";
import { trackingRouter } from "./routers/tracking";
import { routingRouter } from "./routers/routing";
import { hrRouter } from "./routers/hr";
import { marketingRouter } from "./routers/marketing";
import { aiRouter } from "./routers/ai";
import { analyticsRouter } from "./routers/analytics";
import { biRouter } from "./routers/bi";

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  platform: platformRouter,
  directory: directoryRouter,
  compliance: complianceRouter,
  crm: crmRouter,
  rep: repRouter,
  tracking: trackingRouter,
  routing: routingRouter,
  hr: hrRouter,
  marketing: marketingRouter,
  ai: aiRouter,
  analytics: analyticsRouter,
  bi: biRouter,
});

export type AppRouter = typeof appRouter;
