import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "../../shared/const";
import { getSessionCookieOptions } from "../_core/cookies";
import { findLocalUser } from "../db";
import { issueAccessToken, verifyPassword } from "../security/localJwt";
import { publicProcedure, router } from "../_core/trpc";

const safeUser = (user: NonNullable<Awaited<ReturnType<typeof findLocalUser>>>) => ({
  id: user.id,
  tenantId: user.tenantId,
  name: user.name,
  email: user.email,
  role: user.role,
  department: user.department,
  territory: user.territory,
  status: user.status,
});

export const authRouter = router({
  me: publicProcedure.query(({ ctx }) => ctx.user ? {
    id: ctx.user.id, tenantId: ctx.user.tenantId, name: ctx.user.name, email: ctx.user.email,
    role: ctx.user.role, department: ctx.user.department, territory: ctx.user.territory, status: ctx.user.status,
  } : null),
  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true } as const;
  }),
  localLogin: publicProcedure.input(z.object({
    email: z.string().trim().email().max(320),
    password: z.string().min(1).max(128),
    tenantSlug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{3,96}$/).optional(),
  })).mutation(async ({ input }) => {
    const user = await findLocalUser(input.email, input.tenantSlug);
    if (!user || !user.passwordHash || user.status !== "active" || !(await verifyPassword(input.password, user.passwordHash))) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials or inactive account." });
    }
    return { token: await issueAccessToken(user), user: safeUser(user) };
  }),
});
