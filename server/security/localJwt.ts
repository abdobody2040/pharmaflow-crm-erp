import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";

const scrypt = promisify(scryptCallback);
const TOKEN_AUDIENCE = "pharmaflow-web";
const TOKEN_ISSUER = "pharmaflow-self-hosted";

type LocalTokenClaims = {
  sub: string;
  tenantId: string | null;
  role: User["role"];
};

function signingKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters for self-hosted authentication.");
  }
  return new TextEncoder().encode(secret);
}

export async function issueAccessToken(user: User): Promise<string> {
  return new SignJWT({ tenantId: user.tenantId, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.id))
    .setIssuer(TOKEN_ISSUER)
    .setAudience(TOKEN_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(signingKey());
}

export async function verifyAccessToken(token: string): Promise<LocalTokenClaims> {
  const { payload } = await jwtVerify(token, signingKey(), { issuer: TOKEN_ISSUER, audience: TOKEN_AUDIENCE });
  const role = payload.role;
  const tenantId = payload.tenantId;
  if (!payload.sub || typeof role !== "string" || (tenantId !== null && typeof tenantId !== "string")) {
    throw new Error("Malformed self-hosted access token.");
  }
  return { sub: payload.sub, tenantId: tenantId as string | null, role: role as User["role"] };
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("base64url");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${derived.toString("base64url")}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [algorithm, salt, expected] = storedHash.split("$");
  if (algorithm !== "scrypt" || !salt || !expected) return false;
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  const expectedBuffer = Buffer.from(expected, "base64url");
  return expectedBuffer.length === derived.length && timingSafeEqual(expectedBuffer, derived);
}

export function recordHash(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}
