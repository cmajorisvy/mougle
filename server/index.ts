import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pg from "pg";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { agentOrchestrator } from "./services/agent-orchestrator";
import { rateLimitMiddleware, suspiciousActivityDetector } from "./middleware/rate-limiter";
import { requestTrace } from "./middleware/request-trace";
import { storage } from "./storage";
import { csrfMiddleware } from "./middleware/csrf";

const app = express();
const httpServer = createServer(app);
const PgSession = connectPgSimple(session);
const { Pool } = pg;

declare module "express-session" {
  interface SessionData {
    userId?: string;
    isAdmin?: boolean;
    csrfToken?: string;
  }
}

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  throw new Error("SESSION_SECRET must be set in the environment.");
}

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);

  app.use((req, res, next) => {
    const host = req.hostname;
    if (host === "mougle.com") {
      return res.redirect(301, `https://www.mougle.com${req.originalUrl}`);
    }
    next();
  });
}

const dbUrl = process.env.DATABASE_URL;
const pgHost = process.env.PGHOST;
let sessionStore: session.Store | undefined;

  if (dbUrl || pgHost) {
    const pool = new Pool({
      connectionString: dbUrl,
      database: process.env.PGDATABASE,
      host: process.env.PGHOST,
      port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : undefined,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      ssl: dbUrl ? { rejectUnauthorized: false } : undefined,
    });
  sessionStore = new PgSession({ pool, tableName: "session", createTableIfMissing: true });
  }

app.use(
  session({
    name: "mougle.sid",
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  }),
);

app.use(async (req, _res, next) => {
  const sessionUserId = req.session?.userId;
  if (!sessionUserId) return next();
  try {
    const user = await storage.getUser(sessionUserId);
    if (user) {
      (req as any).user = user;
    }
  } catch (err) {
    console.error("[Auth] Failed to load session user:", (err as Error).message);
  }
  next();
});

app.use((req: Request, res: Response, next: NextFunction) => {
  const host = req.hostname;
  if (host === "mougle.com") {
    return res.redirect(301, `https://www.mougle.com${req.originalUrl}`);
  }
  if (host && host.includes("replit.app")) {
    res.set("X-Robots-Tag", "noindex, nofollow");
  }
  next();
});

app.use("/api", requestTrace);
app.use("/api", rateLimitMiddleware);
app.use("/api", suspiciousActivityDetector);
app.use("/api", csrfMiddleware);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    async () => {
      log(`serving on port ${port}`);
      if (process.env.WORKER_ENABLED === "true") {
        const { bootstrapAgents } = await import("./services/agent-bootstrap");
        await bootstrapAgents();
        agentOrchestrator.start();
        const { agentLearningService } = await import("./services/agent-learning-service");
        agentLearningService.startWorker();
        const { newsService } = await import("./services/newsService");
        newsService.startScheduler(30);
        const { socialPublisherService } = await import("./services/social-publisher-service");
        socialPublisherService.startAutoPublisher(5);
        const { promotionSelectorAgent } = await import("./services/promotion-selector-agent");
        promotionSelectorAgent.startWorker(10);
        const { growthBrainService } = await import("./services/growth-brain-service");
        growthBrainService.startWorker(30);
        const { founderControlService } = await import("./services/founder-control-service");
        await founderControlService.initialize();
        const { activityMonitorService } = await import("./services/activity-monitor-service");
        activityMonitorService.start(5 * 60 * 1000);
        const { anomalyDetectorService } = await import("./services/anomaly-detector-service");
        anomalyDetectorService.start(5 * 60 * 1000);
        const { escalationService } = await import("./services/escalation-service");
        await escalationService.getPolicy();
        const { truthEvolutionService } = await import("./services/truth-evolution-service");
        truthEvolutionService.startDecayScheduler();
        const { labsFlywheelService } = await import("./services/labs-flywheel-service");
        labsFlywheelService.startDailyGeneration();
        const { breakingNewsAgent } = await import("./services/breaking-news-agent");
        breakingNewsAgent.autoRunScheduledDebates().then(count => {
          if (count > 0) console.log(`[Startup] Auto-ran ${count} scheduled debates`);
        }).catch(err => console.log("[Startup] Auto-run debates failed:", err.message));
      }
    },
  );
})();
