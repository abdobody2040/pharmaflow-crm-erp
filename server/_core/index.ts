import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { dailyAnomalyMonitor } from "../scheduled/anomalyMonitor";
import { serveStatic, setupVite } from "./vite";
import { createRateLimit, securityHeaders } from "../security/httpHardening";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  app.set("trust proxy", process.env.TRUST_PROXY === "false" ? false : 1);
  app.disable("x-powered-by");
  app.use(securityHeaders);
  app.use(express.json({ limit: "1mb", strict: true }));
  app.use(express.urlencoded({ limit: "1mb", extended: false }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  app.post("/api/scheduled/anomaly-monitor", dailyAnomalyMonitor);
  // tRPC API
  app.use(
    "/api/trpc",
    createRateLimit({ windowMs: 60_000, max: 300, namespace: "trpc" }),
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
