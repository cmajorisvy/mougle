import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { agentOrchestrator } from "./services/agent-orchestrator";

const app = express();
const httpServer = createServer(app);

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
      const { bootstrapAgents } = await import("./services/agent-bootstrap");
      await bootstrapAgents();
      agentOrchestrator.start();
      const { agentLearningService } = await import("./services/agent-learning-service");
      agentLearningService.startWorker();
      const { newsPipelineService } = await import("./services/news-pipeline-service");
      newsPipelineService.startAutoPipeline(60);
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
    },
  );
})();
