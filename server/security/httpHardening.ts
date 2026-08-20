import type { NextFunction, Request, Response } from "express";

type Bucket = { count: number; resetAt: number };

export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  const development = process.env.NODE_ENV === "development";
  const script = development ? "'self' 'unsafe-inline' 'unsafe-eval'" : "'self'";
  res.setHeader("Content-Security-Policy", `default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; script-src ${script}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; form-action 'self'`);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "geolocation=(self), camera=(), microphone=(self), payment=()");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  if (!development) res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  if (req.path.startsWith("/api/")) res.setHeader("Cache-Control", "no-store");
  next();
}

export function createRateLimit({ windowMs, max, namespace }: { windowMs: number; max: number; namespace: string }) {
  const buckets = new Map<string, Bucket>();
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now(); const key = `${namespace}:${req.ip}`; const existing = buckets.get(key);
    const bucket = !existing || existing.resetAt <= now ? { count: 0, resetAt: now + windowMs } : existing;
    bucket.count += 1; buckets.set(key, bucket);
    res.setHeader("RateLimit-Limit", String(max));
    res.setHeader("RateLimit-Remaining", String(Math.max(0, max - bucket.count)));
    res.setHeader("RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));
    if (bucket.count > max) { res.setHeader("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000))); return res.status(429).json({ error: "Too many requests. Retry later." }); }
    if (buckets.size > 10000) Array.from(buckets.entries()).forEach(([candidate, value]) => { if (value.resetAt <= now) buckets.delete(candidate); });
    next();
  };
}
