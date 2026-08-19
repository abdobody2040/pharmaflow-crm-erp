import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { getUserById } from "../db";
import { verifyAccessToken } from "../security/localJwt";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    const authorization = opts.req.headers.authorization;
    const bearer = typeof authorization === "string" && authorization.startsWith("Bearer ")
      ? authorization.slice(7)
      : null;
    if (bearer) {
      try {
        const claims = await verifyAccessToken(bearer);
        const candidate = await getUserById(Number(claims.sub));
        if (
          candidate &&
          candidate.status === "active" &&
          candidate.tenantId === claims.tenantId &&
          candidate.role === claims.role
        ) {
          user = candidate;
        }
      } catch {
        user = null;
      }
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
