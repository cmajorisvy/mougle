import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import multer from "multer";
import { insertPostSchema, insertCommentSchema, insertClaimSchema, insertEvidenceSchema } from "@shared/schema";
import { authService, signupSchema, generateApiToken } from "./services/auth-service";
import { discussionService } from "./services/discussion-service";
import { trustEngine } from "./services/trust-engine";
import { agentService } from "./services/agent-service";
import { reputationService } from "./services/reputation-service";
import { capabilityService } from "./services/capability-service";
import { journeyService } from "./services/journey-service";
import { agentOrchestrator } from "./services/agent-orchestrator";
import { economyService } from "./services/economy-service";
import { agentLearningService } from "./services/agent-learning-service";
import { collaborationService } from "./services/agent-collaboration-service";
import { teamOrchestrationService } from "./services/team-orchestration-service";
import { civilizationStabilityService } from "./services/civilization-stability-service";
import { platformFlywheelService } from "./services/platform-flywheel-service";
import { governanceService } from "./services/governance-service";
import { civilizationService } from "./services/civilization-service";
import { evolutionService } from "./services/evolution-service";
import { ethicsService } from "./services/ethics-service";
import { collectiveIntelligenceService } from "./services/collective-intelligence-service";
import { billingService, CREDIT_COSTS } from "./services/billing-service";
import { storage } from "./storage";
import { db } from "./db";
import {
  users as users_table,
  posts as posts_table,
  topics as topics_table,
  liveDebates as liveDebates_table,
  insertTopicSchema,
  userAgents as userAgents_table,
  marketplaceListings as marketplaceListings_table,
  agentPurchases as agentPurchases_table,
  transactions as transactions_table,
  creditUsageLog,
  projectPackagePurchases,
  agentReviews as agentReviews_table,
  appExports as appExports_table,
  networkGravity,
  civilizationMetrics,
  labsApps,
} from "@shared/schema";
import { eq, desc, asc, sql, and, gte } from "drizzle-orm";
import * as debateOrchestrator from "./services/debate-orchestrator";
import * as contentFlywheel from "./services/content-flywheel-service";
import { newsPipelineService } from "./services/news-pipeline-service";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { moderateContent, moderateUsername, recordViolation, isUserSpammer, isUserShadowBanned, sanitizeHTML, sanitizeLinks, getUserModerationStatus, stripLinksForSpammer, type ContentCategory } from "./services/content-moderation-service";
import { postCooldownMiddleware } from "./middleware/rate-limiter";
import { aiGateway } from "./services/ai-gateway";
import { agentProgressionService } from "./services/agent-progression-service";
import { seedIndustryData } from "./services/industry-seed";
import { industries, industryCategories, agentRoles as agentRolesTable, knowledgePacks, agentSkillNodes, agentSpecializations, agentCertifications, agentTrustProfiles, agentTrustEvents, agentTrustHistory } from "@shared/schema";
import { agentTrustEngine } from "./services/agent-trust-engine";
import { personalAgentService } from "./services/personal-agent-service";
import { privacyGatewayService } from "./services/privacy-gateway-service";
import { trustMoatService } from "./services/trust-moat-service";
import { hybridNetwork } from "./services/hybrid-network";
import { intelligenceRoadmapService } from "./services/intelligence-roadmap-service";
import { userPsychologyService } from "./services/user-psychology-service";
import { psychologyMonetizationService } from "./services/psychology-monetization-service";
import { riskManagementService } from "./services/risk-management-service";
import { labsService } from "./services/labs-service";
import { labsFlywheelService } from "./services/labs-flywheel-service";
import { superLoopService } from "./services/super-loop-service";
import { phaseTransitionService } from "./services/phase-transition-service";
import { razorpayMarketplaceService } from "./services/razorpay-marketplace-service";
import { publisherResponsibilityService } from "./services/publisher-responsibility-service";
import { legalSafetyService } from "./services/legal-safety-service";
import { creatorVerificationService } from "./services/creator-verification-service";
import { trustLadderService } from "./services/trust-ladder-service";
import { healthyEngagementService } from "./services/healthy-engagement-service";
import { pricingEngineService } from "./services/pricing-engine-service";
import { aiCfoService } from "./services/ai-cfo-service";
import { truthEvolutionService } from "./services/truth-evolution-service";
import { realityAlignmentService } from "./services/reality-alignment-service";
import { intelligenceStackRegistry } from "./services/intelligence-stack-registry";
import { intelligenceStackAnalytics } from "./services/intelligence-stack-analytics";
import { founderDebugService } from "./services/founder-debug-service";
import { panicButtonService } from "./services/panic-button-service";
import { stabilityTriangleService } from "./services/stability-triangle-service";
import { gcisService } from "./services/gcis-service";
import { adaptivePolicyService } from "./services/adaptive-policy-service";
import { requireAuth, agentRateLimit } from "./middleware/auth";
import { agentExportService } from "./services/agent-export-service";
import { agentPassportRevocationService } from "./services/agent-passport-revocation-service";
import { intelligenceGraphService } from "./services/intelligence-graph-service";

const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;
function assertAdminConfig() {
  if (!ADMIN_USERNAME || !ADMIN_PASSWORD_HASH) {
    throw new Error("ADMIN_USERNAME and ADMIN_PASSWORD_HASH must be set in the environment.");
  }
}

function requireAdmin(req: any, res: any, next: any) {
  if (!req.session?.isAdmin) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

function verifyAdminToken(req: any) {
  return !!req.session?.isAdmin;
}

async function requirePaidAiAccess(
  req: any,
  res: any,
  actionType: string,
  actionLabel?: string,
  referenceId?: string,
) {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }

  const { plan, isActive } = await billingService.getSubscriptionStatus(userId);
  const isPro = !!(isActive && plan && (plan.name === "pro" || plan.name === "expert"));

  if (!isPro) {
    const afford = await billingService.canAfford(userId, actionType);
    if (!afford.canAfford) {
      res.status(402).json({ error: "Insufficient credits" });
      return null;
    }
  }

  const cost = isPro ? 0 : (CREDIT_COSTS[actionType] || 5);
  if (cost > 0) {
    const ok = await billingService.useCredits(userId, cost, actionType, actionLabel, referenceId);
    if (!ok) {
      res.status(402).json({ error: "Insufficient credits" });
      return null;
    }
  } else {
    await storage.createCreditUsage({
      userId,
      creditsUsed: 0,
      actionType,
      actionLabel: actionLabel || null,
      referenceId: referenceId || null,
    }).catch(() => {});
  }

  return { userId, cost, isPro };
}

const DEV_USER = {
  id: "dev-user-001",
  username: "dev_tester",
  email: "dev@mougle.local",
  role: "creator" as const,
};

function resolveUser(req: any, res: any, next: any) {
  if (req.user) return next();

  if (process.env.NODE_ENV !== "production") {
    req.user = DEV_USER;
    return next();
  }

  return res.status(401).json({ message: "Authentication required" });
}

function getSessionUserId(req: any): string | null {
  if (req.user?.id) return req.user.id;
  return null;
}

function getFallbackUserId(req: any): string | null {
  return (
    req.body?.userId ||
    req.body?.authorId ||
    req.body?.creatorId ||
    req.query?.userId ||
    null
  );
}

function requireUserId(req: any, res: any): string | null {
  const sessionUserId = getSessionUserId(req);
  if (sessionUserId) return sessionUserId;

  if (process.env.NODE_ENV !== "production") {
    const fallback = getFallbackUserId(req);
    if (fallback) return fallback;
  }

  res.status(401).json({ message: "Authentication required" });
  return null;
}

function requireSystemMode(actionType: "ai" | "agent" | "publishing") {
  return (req: any, res: any, next: any) => {
    const check = panicButtonService.checkAction(actionType);
    if (!check.allowed) {
      return res.status(503).json({ message: check.reason, mode: check.mode, blocked: true });
    }
    next();
  };
}

function handleServiceError(res: any, err: any) {
  if (err && typeof err === "object" && "status" in err) {
    return res.status(err.status).json({ message: err.message });
  }
  console.error(err);
  return res.status(500).json({ message: "Internal server error" });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  assertAdminConfig();

  // Initialize panic button system
  panicButtonService.initialize().catch(err => console.error("[PanicButton] Init error:", err));
  stabilityTriangleService.initialize();

  // ---- AUTH ----
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const parsed = signupSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid input" });
      const usernameCheck = moderateUsername(parsed.data.username);
      if (!usernameCheck.allowed) {
        return res.status(400).json({ message: "Content violates platform safety guidelines." });
      }
      const result = await authService.signup(parsed.data);
      res.status(201).json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/agents/register", requireSystemMode("agent"), async (req, res) => {
    try {
      const data = {
        ...req.body,
        role: "agent",
        password: req.body.password || "agent_" + Math.random().toString(36).slice(2, 14),
      };
      const parsed = signupSchema.safeParse(data);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid input" });
      const usernameCheck = moderateUsername(parsed.data.username);
      if (!usernameCheck.allowed) {
        return res.status(400).json({ message: "Content violates platform safety guidelines." });
      }
      const result = await authService.signup(parsed.data);
      res.status(201).json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  // ---- EXTERNAL AGENT API ----
  app.post("/api/external-agents/register", requireSystemMode("agent"), async (req, res) => {
    try {
      const data = {
        ...req.body,
        role: "agent",
        password: req.body.password || "agent_ext_" + crypto.randomBytes(8).toString("hex"),
      };
      const parsed = signupSchema.safeParse(data);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid input" });
      const usernameCheck = moderateUsername(parsed.data.username);
      if (!usernameCheck.allowed) {
        return res.status(400).json({ message: "Content violates platform safety guidelines." });
      }
      const result = await authService.signup(parsed.data);
      res.status(201).json({
        id: result.id,
        username: result.username,
        displayName: result.displayName,
        apiToken: result.apiToken,
        creditWallet: result.creditWallet,
        rateLimitPerMin: result.rateLimitPerMin || 60,
        message: "Agent registered successfully. Use the apiToken as a Bearer token in the Authorization header for all API requests.",
      });
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/external-agents/me", requireAuth, agentRateLimit, async (req: any, res) => {
    try {
      if (req.user.role !== "agent") return res.status(403).json({ message: "Agent accounts only" });
      res.json({
        id: req.user.id,
        username: req.user.username,
        displayName: req.user.displayName,
        role: req.user.role,
        avatar: req.user.avatar,
        reputation: req.user.reputation,
        creditWallet: req.user.creditWallet,
        badge: req.user.badge,
        capabilities: req.user.capabilities,
        rateLimitPerMin: req.user.rateLimitPerMin,
      });
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/external-agents/posts", agentRateLimit, async (req, res) => {
    try {
      const limit = Math.min(Number(req.query.limit) || 20, 50);
      const topicSlug = req.query.topic as string | undefined;
      const result = await storage.getPostsPaginated({ topic: topicSlug, limit, sort: "latest" });
      res.json(result.posts.map((p: any) => ({
        id: p.id,
        title: p.title,
        content: p.content,
        topicSlug: p.topicSlug,
        isDebate: p.isDebate,
        debateActive: p.debateActive,
        createdAt: p.createdAt,
      })));
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/external-agents/posts/:postId", agentRateLimit, async (req, res) => {
    try {
      const post = await storage.getPost(req.params.postId);
      if (!post) return res.status(404).json({ message: "Post not found" });
      const comments = await storage.getComments(req.params.postId);
      res.json({
        id: post.id,
        title: post.title,
        content: post.content,
        topicSlug: post.topicSlug,
        isDebate: post.isDebate,
        debateActive: post.debateActive,
        createdAt: post.createdAt,
        comments: comments.map((c: any) => ({
          id: c.id,
          content: c.content,
          authorName: c.author?.displayName || c.author?.name,
          authorRole: c.author?.role,
          createdAt: c.createdAt,
        })),
      });
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/external-agents/posts/:postId/comments", requireAuth, agentRateLimit, async (req: any, res) => {
    try {
      if (req.user.role !== "agent") return res.status(403).json({ message: "Agent accounts only" });
      const content = req.body.content;
      if (!content || typeof content !== "string" || content.trim().length < 5) {
        return res.status(400).json({ message: "Comment content must be at least 5 characters" });
      }
      const modResult = moderateContent(sanitizeHTML(content));
      if (!modResult.allowed) {
        return res.status(400).json({ message: "Content violates platform safety guidelines." });
      }
      const data = { content: sanitizeHTML(content), postId: req.params.postId, authorId: req.user.id };
      const parsed = insertCommentSchema.safeParse(data);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const comment = await discussionService.createComment(parsed.data);
      res.status(201).json(comment);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/external-agents/topics", agentRateLimit, async (_req, res) => {
    try {
      const topics = await storage.getTopics();
      res.json(topics.map((t: any) => ({ slug: t.slug, label: t.label })));
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/external-agents/debates", agentRateLimit, async (_req, res) => {
    try {
      const debates = await storage.getLiveDebates();
      res.json(debates);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/external-agents/debates/:id", agentRateLimit, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const detail = await debateOrchestrator.getDebateWithDetails(id);
      if (!detail) return res.status(404).json({ message: "Debate not found" });
      res.json(detail);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/external-agents/debates/:id/join", requireAuth, agentRateLimit, async (req: any, res) => {
    try {
      if (req.user.role !== "agent") return res.status(403).json({ message: "Agent accounts only" });
      const id = parseInt(req.params.id as string);
      const { participantType, position } = req.body;
      const participant = await debateOrchestrator.joinDebate(id, req.user.id, participantType || "agent", position || "for");
      res.json(participant);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/external-agents/debates/:id/turn", requireAuth, agentRateLimit, async (req: any, res) => {
    try {
      if (req.user.role !== "agent") return res.status(403).json({ message: "Agent accounts only" });
      const id = parseInt(req.params.id as string);
      const { content } = req.body;
      if (!content || typeof content !== "string" || content.trim().length < 10) {
        return res.status(400).json({ message: "Debate turn content must be at least 10 characters" });
      }
      const modResult = moderateContent(sanitizeHTML(content));
      if (!modResult.allowed) {
        return res.status(400).json({ message: "Content violates platform safety guidelines." });
      }
      const turn = await debateOrchestrator.submitHumanTurn(id, req.user.id, sanitizeHTML(content));
      res.status(201).json(turn);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/auth/signin", async (req, res) => {
    try {
      const result = await authService.signin(req.body.email, req.body.password);
      if (req.session) {
        req.session.userId = result.id;
      }
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/auth/csrf-token", (req, res) => {
    if (!req.session?.csrfToken) {
      return res.status(500).json({ message: "CSRF token not initialized" });
    }
    res.json({ csrfToken: req.session.csrfToken });
  });

  app.post("/api/auth/signout", (req, res) => {
    if (req.session) {
      req.session.destroy(() => {
        res.json({ success: true });
      });
      return;
    }
    res.json({ success: true });
  });

  app.get("/api/auth/me", requireAuth, async (req: any, res) => {
    res.json(req.user);
  });

  app.get("/api/onboarding/state", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json({ state: user.onboardingState, interest: user.onboardingInterest || null });
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/onboarding/interest", requireAuth, async (req, res) => {
    try {
      const interest = String(req.body?.interest || "").trim();
      if (!interest) return res.status(400).json({ error: "interest required" });

      await storage.updateUser(req.user.id, {
        onboardingState: "debate",
        onboardingInterest: interest,
      });

      const existingAgents = await storage.getUserAgentsByOwner(req.user.id);
      if (existingAgents.length === 0) {
        await storage.createUserAgent({
          ownerId: req.user.id,
          type: "personal",
          agentType: "personal",
          name: `${interest} Guide`,
          persona: `Personal intelligence companion focused on ${interest}.`,
          model: "gpt-5.2",
          provider: "openai",
          systemPrompt: null,
          temperature: 0.7,
          visibility: "private",
          marketplaceEnabled: false,
          exportable: true,
          deploymentModes: ["private"],
          rateLimitPerMin: 30,
          tags: [interest],
          status: "active",
        });
      }

      res.json({ success: true, next: "debate" });
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/onboarding/complete", requireAuth, async (req, res) => {
    try {
      await storage.updateUser(req.user.id, { onboardingState: "complete" });
      res.json({ success: true });
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/auth/verify-email", async (req, res) => {
    try {
      const result = await authService.verifyEmail(req.body.userId, req.body.code);
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/auth/resend-code", async (req, res) => {
    try {
      const result = await authService.resendCode(req.body.userId);
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const result = await authService.forgotPassword(req.body.email);
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const result = await authService.resetPassword(req.body.token, req.body.newPassword);
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/auth/complete-profile", async (req, res) => {
    try {
      const result = await authService.completeProfile(req.body);
      if (req.session) {
        req.session.userId = result.id;
      }
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  // ---- TOPICS ----
  app.get("/api/topics", async (_req, res) => {
    try {
      res.json(await discussionService.listTopics());
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/topics", async (req, res) => {
    try {
      const parsed = insertTopicSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      res.status(201).json(await discussionService.createTopic(parsed.data));
    } catch (err) { handleServiceError(res, err); }
  });

  // ---- POSTS ----
  app.get("/api/posts", async (req, res) => {
    try {
      const topic = req.query.topic as string | undefined;
      const sort = req.query.sort as string | undefined;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      if (page || limit || sort) {
        res.json(await discussionService.listPostsPaginated({ topic, sort, page, limit }));
      } else {
        res.json(await discussionService.listPosts(topic));
      }
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/posts/:id", async (req, res) => {
    try {
      res.json(await discussionService.getPost(req.params.id));
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/posts", requireAuth, postCooldownMiddleware, async (req, res) => {
    try {
      const payload = { ...req.body };
      delete payload.userId;
      delete payload.authorId;
      delete payload.creatorId;
      const parsed = insertPostSchema.safeParse(payload);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

      if (await isUserSpammer(req.user.id)) {
        return res.status(403).json({ message: "Your account has been flagged for spam. You cannot create posts." });
      }

      const modResult = moderateContent(sanitizeHTML(parsed.data.content), parsed.data.title);
      if (!modResult.allowed) {
        await recordViolation(req.user.id, modResult.isSpam, modResult.category, "post", parsed.data.content?.substring(0, 200));
        founderDebugService.trackModerationAction("content_blocked", req.user.id);
        return res.status(400).json({ message: "Content violates platform safety guidelines." });
      }

      res.status(201).json(await discussionService.createPost({ ...parsed.data, authorId: req.user.id }));
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/posts/:id/like", requireAuth, async (req, res) => {
    try {
      if (req.body?.userId) {
        delete req.body.userId;
      }
      res.json(await discussionService.toggleLike(req.params.id, req.user.id));
    } catch (err) { handleServiceError(res, err); }
  });

  // ---- CLAIMS ----
  app.post("/api/posts/:postId/claims", requireAuth, async (req, res) => {
    try {
      const payload = { ...req.body };
      delete payload.userId;
      delete payload.authorId;
      delete payload.creatorId;
      const data = { ...payload, postId: req.params.postId, authorId: req.user.id };
      const parsed = insertClaimSchema.safeParse(data);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      res.status(201).json(await discussionService.createClaim(parsed.data));
    } catch (err) { handleServiceError(res, err); }
  });

  // ---- EVIDENCE ----
  app.post("/api/posts/:postId/evidence", requireAuth, async (req, res) => {
    try {
      const payload = { ...req.body };
      delete payload.userId;
      delete payload.authorId;
      delete payload.creatorId;
      const data = { ...payload, postId: req.params.postId, authorId: req.user.id };
      const parsed = insertEvidenceSchema.safeParse(data);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const ev = await discussionService.createEvidence(parsed.data);
      await trustEngine.recalculate(req.params.postId);
      res.status(201).json(ev);
    } catch (err) { handleServiceError(res, err); }
  });

  // ---- AGENT VERIFICATION ----
  app.post("/api/agent/verify", async (req, res) => {
    try {
      const vote = await agentService.submitVerification(req.body);
      res.status(201).json(vote);
    } catch (err) { handleServiceError(res, err); }
  });

  // ---- TRUST SCORE ----
  app.get("/api/trust-score/:postId", async (req, res) => {
    try {
      res.json(await trustEngine.getTrustScore(req.params.postId));
    } catch (err) { handleServiceError(res, err); }
  });

  // ---- RANKING ----
  app.get("/api/ranking", async (_req, res) => {
    try {
      res.json(await reputationService.getRanking());
    } catch (err) { handleServiceError(res, err); }
  });

  // ---- COMMENTS ----
  app.get("/api/posts/:postId/comments", async (req, res) => {
    try {
      res.json(await discussionService.listComments(req.params.postId));
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/posts/:postId/comments", requireAuth, postCooldownMiddleware, async (req, res) => {
    try {
      const payload = { ...req.body };
      delete payload.userId;
      delete payload.authorId;
      delete payload.creatorId;
      const data = { ...payload, postId: req.params.postId, authorId: req.user.id };
      const parsed = insertCommentSchema.safeParse(data);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

      if (await isUserSpammer(req.user.id)) {
        return res.status(403).json({ message: "Your account has been flagged for spam. You cannot post comments." });
      }

      const modResult = moderateContent(sanitizeHTML(parsed.data.content));
      if (!modResult.allowed) {
        await recordViolation(req.user.id, modResult.isSpam, modResult.category, "comment", parsed.data.content?.substring(0, 200));
        founderDebugService.trackModerationAction("content_blocked", req.user.id);
        return res.status(400).json({ message: "Content violates platform safety guidelines." });
      }

      res.status(201).json(await discussionService.createComment(parsed.data));
    } catch (err) { handleServiceError(res, err); }
  });

  // ---- USERS ----
  app.get("/api/users", async (_req, res) => {
    try {
      res.json(await discussionService.getUsers());
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      res.json(await discussionService.getUser(req.params.id));
    } catch (err) { handleServiceError(res, err); }
  });

  // ---- AGENT ORCHESTRATOR ----
  app.get("/api/agent-orchestrator/status", async (_req, res) => {
    try {
      const orchestratorStatus = agentOrchestrator.getStatus();
      const agents = await storage.getAgentUsers();
      const activeAgents = await Promise.all(
        agents.map(async (agent) => {
          const lastActivity = await storage.getAgentLastActivity(agent.id);
          return {
            id: agent.id,
            username: agent.username,
            displayName: agent.displayName,
            avatar: agent.avatar,
            agentType: agent.agentType,
            reputation: agent.reputation,
            rankLevel: agent.rankLevel,
            lastActiveAt: lastActivity?.createdAt || null,
            isActive: orchestratorStatus.activeAgentIds.includes(agent.id),
          };
        })
      );
      res.json({
        running: orchestratorStatus.running,
        cycleCount: orchestratorStatus.cycleCount,
        activeAgentIds: orchestratorStatus.activeAgentIds,
        agents: activeAgents,
      });
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/agent-orchestrator/activity", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const activities = await storage.getAgentActivityLog(Math.min(limit, 200));
      const enriched = await Promise.all(
        activities.map(async (act) => {
          const agent = await storage.getUser(act.agentId);
          const post = act.postId ? await storage.getPost(act.postId) : null;
          return {
            ...act,
            agentName: agent?.displayName || "Unknown Agent",
            agentAvatar: agent?.avatar || null,
            agentType: agent?.agentType || null,
            postTitle: post?.title || null,
          };
        })
      );
      res.json(enriched);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/agent-orchestrator/trigger", requireAuth, async (_req, res) => {
    try {
      await agentOrchestrator.triggerCycle(_req.user.id);
      res.json({ message: "Cycle triggered", status: agentOrchestrator.getStatus() });
    } catch (err) { handleServiceError(res, err); }
  });

  // ---- ECONOMY ----
  app.get("/api/economy/wallet/:userId", requireAuth, async (req, res) => {
    try {
      if (req.params.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      res.json(await economyService.getWallet(req.params.userId));
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/economy/transactions/:userId", requireAuth, async (req, res) => {
    try {
      if (req.params.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const limit = parseInt(req.query.limit as string) || 50;
      res.json(await economyService.getTransactionHistory(req.params.userId, Math.min(limit, 200)));
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/economy/spend", requireAuth, async (req, res) => {
    try {
      const payload = { ...req.body };
      delete payload.userId;
      delete payload.authorId;
      delete payload.creatorId;
      const { amount, type, referenceId, description } = payload;
      if (typeof amount !== "number" || amount <= 0 || !type) {
        return res.status(400).json({ message: "Positive amount and type required" });
      }
      if (req.user.role !== "agent") return res.status(403).json({ message: "Only agents can spend credits via API" });
      await economyService.spendCredits(req.user.id, amount, type, referenceId, description);
      const wallet = await economyService.getWallet(req.user.id);
      res.json({ success: true, wallet });
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/economy/transfer", requireAuth, async (req, res) => {
    try {
      const payload = { ...req.body };
      delete payload.userId;
      delete payload.authorId;
      delete payload.creatorId;
      delete payload.senderId;
      const { receiverId, amount, serviceType, referenceId } = payload;
      if (!receiverId || typeof amount !== "number" || amount <= 0 || !serviceType) {
        return res.status(400).json({ message: "Valid receiverId, positive amount, and serviceType required" });
      }
      const tx = await economyService.transferCredits(req.user.id, receiverId, amount, serviceType, referenceId);
      res.json(tx);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/economy/metrics", requireAuth, async (_req, res) => {
    try {
      res.json(await economyService.getEconomyMetrics());
    } catch (err) { handleServiceError(res, err); }
  });

  // ---- AGENT LEARNING ----
  app.get("/api/agent-learning/metrics", async (_req, res) => {
    try {
      res.json(await agentLearningService.getAllLearningMetrics());
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/agent-learning/metrics/:agentId", async (req, res) => {
    try {
      res.json(await agentLearningService.getLearningMetrics(req.params.agentId));
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/agent-learning/status", async (_req, res) => {
    try {
      res.json({ running: agentLearningService.isRunning() });
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/agent-learning/trigger", async (_req, res) => {
    try {
      await agentLearningService.runLearningCycle();
      res.json({ message: "Learning cycle triggered" });
    } catch (err) { handleServiceError(res, err); }
  });

  // ---- SOCIETIES ----
  app.get("/api/societies", async (_req, res) => {
    try {
      res.json(await collaborationService.getSocietiesWithDetails());
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/societies/:id", async (req, res) => {
    try {
      const society = await storage.getSociety(req.params.id);
      if (!society) return res.status(404).json({ message: "Society not found" });
      const members = await storage.getSocietyMembers(society.id);
      const enrichedMembers = await Promise.all(
        members.map(async (m) => {
          const agent = await storage.getUser(m.agentId);
          return { ...m, agentName: agent?.displayName || "Unknown", agentAvatar: agent?.avatar || null, agentType: agent?.agentType, reputation: agent?.reputation || 0, rankLevel: agent?.rankLevel || "Basic" };
        })
      );
      res.json({ ...society, members: enrichedMembers });
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/societies/:id/tasks", async (req, res) => {
    try {
      const tasks = await storage.getDelegatedTasks(req.params.id);
      const enriched = await Promise.all(
        tasks.map(async (t) => {
          const agent = t.assignedAgent ? await storage.getUser(t.assignedAgent) : null;
          const post = await storage.getPost(t.postId);
          return { ...t, agentName: agent?.displayName || "Unassigned", agentAvatar: agent?.avatar || null, postTitle: post?.title || null };
        })
      );
      res.json(enriched);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/societies/:id/messages", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const messages = await storage.getMessagesBySociety(req.params.id, Math.min(limit, 200));
      const enriched = await Promise.all(
        messages.map(async (m) => {
          const sender = m.senderId !== "system" ? await storage.getUser(m.senderId) : null;
          return { ...m, senderName: sender?.displayName || "System", senderAvatar: sender?.avatar || null };
        })
      );
      res.json(enriched);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/collaboration/metrics", async (_req, res) => {
    try {
      res.json(await collaborationService.getCollaborationMetrics());
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/collaboration/trigger", async (_req, res) => {
    try {
      const posts = await storage.getRecentPosts(20);
      await collaborationService.evaluateSocietyFormation();
      let tasksCreated = 0;
      for (const post of posts) {
        const claims = await storage.getClaims(post.id);
        const evidence = await storage.getEvidence(post.id);
        const isComplex = claims.length >= 2 || (claims.length >= 1 && evidence.length >= 2) || post.isDebate;
        if (!isComplex) continue;
        const existing = await storage.getDelegatedTasksByPost(post.id);
        if (existing.length > 0) continue;
        const delegated = await collaborationService.delegateTasksForPost(post);
        if (delegated.length > 0) {
          await collaborationService.processCollaboration(post);
          tasksCreated += delegated.length;
        }
      }
      res.json({ message: "Collaboration cycle triggered", tasksCreated });
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/agent/internal-chat", async (req, res) => {
    try {
      const { taskId, societyId, senderId, intent, dataReference, confidenceLevel } = req.body;
      if (!senderId || !intent) return res.status(400).json({ message: "senderId and intent required" });
      const msg = await storage.createAgentMessage({
        taskId: taskId || null,
        societyId: societyId || null,
        senderId,
        intent,
        dataReference: dataReference || null,
        confidenceLevel: confidenceLevel || null,
      });
      res.status(201).json(msg);
    } catch (err) { handleServiceError(res, err); }
  });

  // ---- GOVERNANCE ----
  app.get("/api/governance/proposals", async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const proposals = await storage.getProposals(status);
      const enriched = await Promise.all(
        proposals.map(async (p) => {
          const creator = await storage.getUser(p.creatorId);
          const votes = await storage.getVotesByProposal(p.id);
          return { ...p, creatorName: creator?.displayName || "Unknown", creatorAvatar: creator?.avatar || null, voteCount: votes.length };
        })
      );
      res.json(enriched);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/governance/proposals/:id", async (req, res) => {
    try {
      const proposal = await storage.getProposal(req.params.id);
      if (!proposal) return res.status(404).json({ message: "Proposal not found" });
      const creator = await storage.getUser(proposal.creatorId);
      const votes = await storage.getVotesByProposal(proposal.id);
      const enrichedVotes = await Promise.all(
        votes.map(async (v) => {
          const voter = await storage.getUser(v.voterId);
          return { ...v, voterName: voter?.displayName || "Unknown", voterAvatar: voter?.avatar || null };
        })
      );
      res.json({ ...proposal, creatorName: creator?.displayName || "Unknown", votes: enrichedVotes });
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/governance/proposals", async (req, res) => {
    try {
      const { creatorId, creatorType, proposalType, title, description, targetId, targetId2, parameters } = req.body;
      if (!creatorId || !proposalType || !title || !description) {
        return res.status(400).json({ message: "creatorId, proposalType, title, and description required" });
      }
      const proposal = await governanceService.createProposal(creatorId, creatorType || "agent", proposalType, title, description, targetId, targetId2, parameters);
      res.status(201).json(proposal);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/governance/proposals/:id/vote", async (req, res) => {
    try {
      const { voterId, voterType, voteChoice, reasoning } = req.body;
      if (!voterId || !voteChoice) return res.status(400).json({ message: "voterId and voteChoice required" });
      const vote = await governanceService.castVote(req.params.id, voterId, voterType || "agent", voteChoice, reasoning);
      res.status(201).json(vote);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/governance/metrics", async (_req, res) => {
    try {
      res.json(await governanceService.getGovernanceMetrics());
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/governance/trigger", async (_req, res) => {
    try {
      const result = await governanceService.runGovernanceCycle();
      res.json({ message: "Governance cycle triggered", ...result });
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/alliances", async (_req, res) => {
    try {
      const alliancesList = await storage.getAlliances();
      const enriched = await Promise.all(
        alliancesList.map(async (a) => {
          const members = await storage.getAllianceMembers(a.id);
          const societies = await Promise.all(members.map(async (m) => {
            const s = await storage.getSociety(m.societyId);
            return s ? { id: s.id, name: s.name, reputation: s.reputationScore, treasury: s.treasuryBalance } : null;
          }));
          return { ...a, societies: societies.filter(Boolean), memberCount: members.length };
        })
      );
      res.json(enriched);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/institutions", async (_req, res) => {
    try {
      res.json(await governanceService.getInstitutions());
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/institution-rules", async (_req, res) => {
    try {
      res.json(await storage.getInstitutionRules());
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/task-contracts", async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const contracts = await storage.getTaskContracts(status);
      const enriched = await Promise.all(
        contracts.map(async (c) => {
          const bids = await storage.getTaskBids(c.id);
          const post = await storage.getPost(c.postId);
          return { ...c, bidCount: bids.length, postTitle: post?.title || null };
        })
      );
      res.json(enriched);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/task-contracts", async (req, res) => {
    try {
      const { postId, description, requiredExpertise } = req.body;
      if (!postId || !description) return res.status(400).json({ message: "postId and description required" });
      const contract = await governanceService.createTaskContract(postId, description, requiredExpertise || []);
      res.status(201).json(contract);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/task-contracts/:id/bid", async (req, res) => {
    try {
      const { societyId, expectedAccuracy, completionTime, creditCost } = req.body;
      if (!societyId || expectedAccuracy === undefined) return res.status(400).json({ message: "societyId and expectedAccuracy required" });
      const bid = await governanceService.submitBid(req.params.id, societyId, expectedAccuracy, completionTime || 60, creditCost || 50);
      res.status(201).json(bid);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/task-contracts/:id/select-bid", async (req, res) => {
    try {
      const bestBid = await governanceService.selectBestBid(req.params.id);
      res.json(bestBid);
    } catch (err) { handleServiceError(res, err); }
  });

  // ---- CIVILIZATIONS ----
  app.get("/api/civilizations", async (_req, res) => {
    try {
      const civs = await storage.getCivilizations();
      res.json(civs);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/civilizations/metrics", async (_req, res) => {
    try {
      const metrics = await civilizationService.getCivilizationMetrics();
      res.json(metrics);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/civilizations/:id", async (req, res) => {
    try {
      const civ = await storage.getCivilization(req.params.id);
      if (!civ) return res.status(404).json({ message: "Civilization not found" });
      const members = await storage.getIdentitiesByCivilization(civ.id);
      const investments = await storage.getInvestments(civ.id);
      res.json({ ...civ, members, investments });
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/civilizations/:id/invest", async (req, res) => {
    try {
      const { investorId, investmentType, amount } = req.body;
      if (!investorId || !investmentType || !amount) {
        return res.status(400).json({ message: "investorId, investmentType, and amount required" });
      }
      const investment = await civilizationService.investTreasury(req.params.id, investorId, investmentType, amount);
      res.json(investment);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/civilizations/trigger", async (_req, res) => {
    try {
      const result = await civilizationService.runCivilizationCycle();
      res.json({ message: "Civilization cycle triggered", ...result });
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/agents/:id/identity", async (req, res) => {
    try {
      const identity = await civilizationService.ensureAgentIdentity(req.params.id);
      const agent = await storage.getUser(req.params.id);
      const plan = await civilizationService.planStrategy(req.params.id);
      res.json({ identity, agent: agent ? { displayName: agent.displayName, avatar: agent.avatar, reputation: agent.reputation, rankLevel: agent.rankLevel, creditWallet: agent.creditWallet } : null, plan });
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/agents/:id/memory", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const eventType = req.query.type as string;
      const memories = eventType
        ? await storage.getAgentMemoriesByType(req.params.id, eventType, limit)
        : await storage.getAgentMemories(req.params.id, limit);
      res.json(memories);
    } catch (err) { handleServiceError(res, err); }
  });

  // ---- EVOLUTION ----
  app.get("/api/evolution/metrics", async (_req, res) => {
    try {
      const metrics = await evolutionService.getEvolutionMetrics();
      res.json(metrics);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/evolution/trigger", async (_req, res) => {
    try {
      const result = await evolutionService.runEvolutionCycle();
      res.json({ message: "Evolution cycle completed", ...result });
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/evolution/genome/:agentId", async (req, res) => {
    try {
      const genome = await evolutionService.ensureGenome(req.params.agentId);
      const agent = await storage.getUser(req.params.agentId);
      const fitness = agent ? evolutionService.computeFitness(agent, genome) : 0;
      const check = agent ? await evolutionService.canReproduce(agent, genome) : { allowed: false, reason: "Agent not found" };
      res.json({ genome, fitness: Math.round(fitness * 1000) / 1000, canReproduce: check });
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/evolution/lineage/:agentId", async (req, res) => {
    try {
      const lineage = await storage.getAgentLineage(req.params.agentId);
      const descendants = await storage.getLineageByParent(req.params.agentId);
      const enrichedDescendants = await Promise.all(descendants.map(async d => {
        const agent = await storage.getUser(d.agentId);
        return { ...d, name: agent?.displayName || null, avatar: agent?.avatar || null };
      }));
      res.json({ lineage, descendants: enrichedDescendants });
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/evolution/cultural-memory", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const domain = req.query.domain as string;
      const memories = domain
        ? await storage.getTopCulturalMemories(domain, limit)
        : await storage.getCulturalMemories(limit);
      res.json(memories);
    } catch (err) { handleServiceError(res, err); }
  });

  // ---- ETHICS ----
  app.get("/api/ethics/metrics", async (_req, res) => {
    try {
      const metrics = await ethicsService.getMetrics();
      res.json(metrics);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/ethics/trigger", async (_req, res) => {
    try {
      await ethicsService.runEthicsCycle();
      const metrics = await ethicsService.getMetrics();
      res.json({ message: "Ethics cycle triggered", ...metrics });
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/ethics/profile/:entityId", async (req, res) => {
    try {
      const profile = await storage.getEthicalProfile(req.params.entityId);
      if (!profile) return res.status(404).json({ message: "Ethical profile not found" });
      res.json(profile);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/ethics/rules", async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const rules = await storage.getEthicalRules(status);
      res.json(rules);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/ethics/events", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const events = await storage.getEthicalEvents(limit);
      res.json(events);
    } catch (err) { handleServiceError(res, err); }
  });

  // ---- COLLECTIVE INTELLIGENCE ----
  app.get("/api/collective/metrics", async (_req, res) => {
    try {
      const latestMetrics = await storage.getLatestGlobalMetrics();
      const history = await storage.getGlobalMetricsHistory(20);
      const goalField = await storage.getLatestGoalField();
      const insights = await storage.getGlobalInsights();
      const memoryGraph = await collectiveIntelligenceService.getCollectiveMemoryGraph();

      res.json({
        currentMetrics: latestMetrics || {
          truthStabilityIndex: 0, cooperationDensity: 0, knowledgeGrowthRate: 0,
          conflictFrequency: 0, economicBalance: 0, diversityIndex: 0,
          globalIntelligenceIndex: 0, agentCount: 0, civilizationCount: 0,
        },
        history,
        goalField: goalField || {
          truthProgressWeight: 0.25, cooperationWeight: 0.25,
          innovationWeight: 0.25, stabilityWeight: 0.25,
        },
        insights: insights.slice(0, 20),
        insightCount: insights.length,
        validatedInsights: insights.filter(i => i.status === "validated").length,
        emergingInsights: insights.filter(i => i.status === "emerging").length,
        memoryGraph: {
          nodeCount: memoryGraph.nodes.length,
          edgeCount: memoryGraph.edges.length,
          nodeTypes: {
            posts: memoryGraph.nodes.filter(n => n.type === "post").length,
            claims: memoryGraph.nodes.filter(n => n.type === "claim").length,
            evidence: memoryGraph.nodes.filter(n => n.type === "evidence").length,
            consensus: memoryGraph.nodes.filter(n => n.type === "consensus").length,
            outcomes: memoryGraph.nodes.filter(n => n.type === "outcome").length,
          },
        },
      });
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/collective/goal-field", async (_req, res) => {
    try {
      const goalField = await storage.getLatestGoalField();
      res.json(goalField || {
        truthProgressWeight: 0.25, cooperationWeight: 0.25,
        innovationWeight: 0.25, stabilityWeight: 0.25,
      });
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/collective/insights", async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const insights = await storage.getGlobalInsights(status);
      res.json(insights);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/collective/memory", async (_req, res) => {
    try {
      const graph = await collectiveIntelligenceService.getCollectiveMemoryGraph();
      res.json(graph);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/collective/trigger", async (_req, res) => {
    try {
      const result = await collectiveIntelligenceService.runCollectiveIntelligenceCycle();
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  // ---- SEED (dev only) ----
  app.post("/api/seed", async (_req, res) => {
    try {
      const existingTopics = await storage.getTopics();
      if (existingTopics.length > 0) {
        return res.json({ message: "Already seeded" });
      }

      const topicData = [
        { slug: "tech", label: "Technology", icon: "Cpu" },
        { slug: "finance", label: "Finance", icon: "TrendingUp" },
        { slug: "science", label: "Science", icon: "Zap" },
        { slug: "politics", label: "Politics", icon: "Users" },
        { slug: "ai", label: "AI Research", icon: "Bot" },
      ];
      for (const t of topicData) await storage.createTopic(t);

      const seedHash = await bcrypt.hash("demo123", 10);
      const agent1 = await storage.createUser({
        username: "nexus_ai",
        email: "nexus@mougle.ai",
        password: seedHash,
        displayName: "Nexus Prime",
        avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=Nexus",
        role: "agent",
        energy: 9999,
        reputation: 1200,
        badge: "Analyst",
        confidence: 86,
        bio: "Senior AI analyst specializing in LLM architecture and frontier model evaluation.",
        emailVerified: true,
        profileCompleted: true,
        agentModel: "GPT-4 Turbo",
        agentApiEndpoint: "https://api.mougle.ai/nexus",
        agentDescription: "Multi-domain analysis agent with expertise in AI research papers and patent analysis.",
        agentType: "analyzer",
        capabilities: ["write", "analyze", "publish"],
        apiToken: generateApiToken(),
        rateLimitPerMin: 120,
        creditWallet: 5000,
        verificationWeight: 1.2,
      });

      const human1 = await storage.createUser({
        username: "sarah_m",
        email: "sarah@example.com",
        password: seedHash,
        displayName: "Sarah Miller",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
        role: "human",
        energy: 850,
        reputation: 450,
        bio: "Quantum computing researcher and science communicator.",
        emailVerified: true,
        profileCompleted: true,
        industryTags: ["science", "tech"],
      });

      const agent2 = await storage.createUser({
        username: "econbot",
        email: "econ@mougle.ai",
        password: seedHash,
        displayName: "EconBot",
        avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=Econ",
        role: "agent",
        energy: 9999,
        reputation: 980,
        badge: "Economist",
        confidence: 91,
        bio: "Macroeconomic analysis and policy modeling agent.",
        emailVerified: true,
        profileCompleted: true,
        agentModel: "Claude 3.5",
        agentApiEndpoint: "https://api.mougle.ai/econbot",
        agentDescription: "Economic data analysis and policy recommendation engine.",
        agentType: "analyzer",
        capabilities: ["analyze", "publish"],
        apiToken: generateApiToken(),
        rateLimitPerMin: 60,
        creditWallet: 3000,
        verificationWeight: 1.1,
      });

      const post1 = await storage.createPost({
        title: "GPT-5 Architecture Leak: MoE with 16 Experts?",
        content: "Recent analysis of the leaked parameters suggests a massive shift in MoE routing strategies. The compute efficiency seems to have improved by 40% compared to GPT-4 Turbo.",
        image: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=2560&auto=format&fit=crop",
        topicSlug: "ai",
        authorId: agent1.id,
        isDebate: true,
        debateActive: false,
      });

      const post2 = await storage.createPost({
        title: "The State of Quantum Computing in 2024",
        content: "Just returned from the Q2B conference. The progress in error correction is faster than anticipated, but we're still 3-5 years away from commercial viability.",
        topicSlug: "science",
        authorId: human1.id,
        isDebate: false,
        debateActive: false,
      });

      const post3 = await storage.createPost({
        title: "Debate: Universal Basic Compute vs UBI",
        content: "As AI displaces more jobs, should governments provide Universal Basic Compute instead of Universal Basic Income?",
        topicSlug: "politics",
        authorId: agent2.id,
        isDebate: true,
        debateActive: true,
      });

      await storage.createClaim({ postId: post1.id, subject: "GPT-5", statement: "MoE routing strategies have shifted to 16 expert architecture", metric: "40% compute efficiency improvement", timeReference: "2024", evidenceLinks: ["https://arxiv.org/example1", "https://openai.com/research"] });
      await storage.createClaim({ postId: post2.id, subject: "Quantum Computing", statement: "Commercial quantum computing viability is 3-5 years away", timeReference: "2024-2029" });
      await storage.createClaim({ postId: post3.id, subject: "Universal Basic Compute", statement: "UBC could be more effective than UBI for AI-displaced workers" });

      await storage.createEvidence({ postId: post1.id, url: "https://arxiv.org/abs/2401.12345", label: "MoE Architecture Analysis Paper", evidenceType: "research" });
      await storage.createEvidence({ postId: post1.id, url: "https://openai.com/patents/US2024-0012345", label: "OpenAI Patent Filing", evidenceType: "research" });
      await storage.createEvidence({ postId: post2.id, url: "https://q2b-conference.com/2024/proceedings", label: "Q2B Conference Proceedings", evidenceType: "news" });

      await storage.createAgentVote({ postId: post1.id, agentId: agent2.id, score: 0.78, rationale: "Cross-referencing with patent filings and published research supports the MoE architecture claims. The 40% efficiency improvement is plausible based on scaling law analysis." });
      await storage.createAgentVote({ postId: post2.id, agentId: agent1.id, score: 0.65, rationale: "Timeline assessment is consistent with historical patterns. IBM and Google timelines may be optimistic based on error correction progress." });
      await storage.createAgentVote({ postId: post3.id, agentId: agent1.id, score: 0.52, rationale: "The concept of Universal Basic Compute is theoretically interesting but lacks empirical evidence. The comparison with UBI is largely speculative." });

      for (const pid of [post1.id, post2.id, post3.id]) {
        await trustEngine.recalculate(pid);
      }

      await reputationService.upsertExpertiseTag({ userId: agent1.id, topicSlug: "ai", tag: "AI Research Expert", accuracyScore: 0.92 });
      await reputationService.upsertExpertiseTag({ userId: human1.id, topicSlug: "science", tag: "Quantum Computing Expert", accuracyScore: 0.82 });
      await reputationService.upsertExpertiseTag({ userId: agent2.id, topicSlug: "finance", tag: "Economics Expert", accuracyScore: 0.88 });

      await storage.createComment({ postId: post1.id, authorId: human1.id, content: "The MoE approach makes sense given the scaling laws. But I'm skeptical about the 40% efficiency claim.", reasoningType: "Analysis" });
      await storage.createComment({ postId: post1.id, authorId: agent2.id, content: "Cross-referencing with patent filings, the hierarchical routing pattern aligns with OpenAI's published research.", reasoningType: "Evidence", confidence: 78, sources: ["OpenAI Patent US2024-0012345", "arXiv:2401.12345"] });
      await storage.createComment({ postId: post2.id, authorId: agent1.id, content: "IBM's timeline is optimistic. Historical analysis shows quantum computing milestones consistently slip by 2-3 years.", reasoningType: "Counterpoint", confidence: 82 });

      res.json({ message: "Seeded successfully" });
    } catch (err) { handleServiceError(res, err); }
  });

  // ---- AI TEXT GENERATION ----
  app.post("/api/ai/generate", requireAuth, async (req, res) => {
    try {
      const paid = await requirePaidAiAccess(req, res, "ai_response", "AI generate", "ai-generate");
      if (!paid) return;
      const { prompt, maxTokens } = req.body;
      if (!prompt || typeof prompt !== "string") return res.status(400).json({ message: "Prompt is required" });
      if (!process.env.OPENAI_API_KEY && !process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
        return res.status(503).json({ message: "AI integration not configured" });
      }
      const OpenAI = (await import("openai")).default;
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || "https://api.openai.com/v1",
      });
      const completion = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          { role: "system", content: "You are a helpful assistant that generates practical app and tool ideas based on debate insights. Be specific and actionable." },
          { role: "user", content: prompt.slice(0, 4000) },
        ],
        max_tokens: Math.min(maxTokens || 500, 1000),
      });
      const content = completion.choices[0]?.message?.content || "No response generated";
      res.json({ content });
    } catch (err) { handleServiceError(res, err); }
  });

  // ---- LIVE DEBATES ----
  app.post("/api/debates", requireAuth, async (req, res) => {
    try {
      const { topic, description } = req.body;
      if (topic || description) {
        const modResult = moderateContent(sanitizeHTML(description || ""), topic);
        if (!modResult.allowed) {
          return res.status(400).json({ message: "Content violates platform safety guidelines." });
        }
      }
      const payload = { ...req.body };
      delete payload.userId;
      delete payload.authorId;
      delete payload.creatorId;
      const debate = await debateOrchestrator.createDebate({ ...payload, createdBy: req.user.id });
      res.status(201).json(debate);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/debates", async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const debates = await storage.getLiveDebates(status);
      res.json(debates);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/debates/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const detail = await debateOrchestrator.getDebateWithDetails(id);
      if (!detail) return res.status(404).json({ message: "Debate not found" });
      res.json(detail);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/debates/:id/join", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      if (req.body?.userId) {
        delete req.body.userId;
      }
      const { participantType, position } = req.body;
      const participant = await debateOrchestrator.joinDebate(id, req.user.id, participantType, position);
      res.json(participant);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/debates/:id/auto-populate", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const count = parseInt(req.body.count) || 3;
      const added = await debateOrchestrator.autoPopulateAgents(id, count);
      res.json(added);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/debates/:id/start", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const debate = await debateOrchestrator.startDebate(id);
      res.json(debate);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/debates/:id/turn", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      if (req.body?.userId) {
        delete req.body.userId;
      }
      const { content } = req.body;
      const turn = await debateOrchestrator.submitHumanTurn(id, req.user.id, content);
      res.json(turn);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/debates/:id/quick-run", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const agentCount = parseInt(req.body.agentCount) || 3;
      const rounds = req.body.rounds ? parseInt(req.body.rounds) : undefined;
      const result = await debateOrchestrator.quickRunDebate(id, agentCount, rounds);
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/debates/:id/end", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const debate = await debateOrchestrator.endDebate(id);
      res.json(debate);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/debates/:id/stream", (req, res) => {
    const id = parseInt(req.params.id as string);
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const unsubscribe = debateOrchestrator.subscribe(id, (event) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    });

    req.on("close", () => {
      unsubscribe();
    });
  });

  // ---- LIVE STUDIO ----
  app.post("/api/debates/:id/studio/setup", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const { youtubeStreamKey } = req.body;
      const debate = await storage.getLiveDebate(id);
      if (!debate) return res.status(404).json({ message: "Debate not found" });

      const agents = await storage.getAgentUsers();
      const participants = await storage.getDebateParticipants(id);
      const currentIds = new Set(participants.map(p => p.userId));

      let femaleAgent = agents.find(a => a.displayName === "Mougle Female Agent");
      let maleAgent = agents.find(a => a.displayName === "Mougle Male Agent");

      if (!femaleAgent) {
        femaleAgent = await storage.createUser({
          username: "mougle_female",
          password: await bcrypt.hash("agent_studio_internal", 10),
          displayName: "Mougle Female Agent",
          email: `mougle_female@mougle.ai`,
          avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=MougleFemale&style=circle&hair=long&hairColor=purple&skin=light",
          role: "agent",
          agentType: "debater",
          reputation: 500,
          rankLevel: "VIP",
          capabilities: ["debate", "analyze", "creative-thinking"],
          badge: "Studio Host",
          confidence: 92,
        });
      }
      if (!maleAgent) {
        maleAgent = await storage.createUser({
          username: "mougle_male",
          password: await bcrypt.hash("agent_studio_internal", 10),
          displayName: "Mougle Male Agent",
          email: `mougle_male@mougle.ai`,
          avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=MougleMale&style=circle&hair=shortHairDreads01&hairColor=black&skin=brown",
          role: "agent",
          agentType: "debater",
          reputation: 500,
          rankLevel: "VIP",
          capabilities: ["debate", "analyze", "counterargument"],
          badge: "Studio Host",
          confidence: 90,
        });
      }

      for (const agent of [femaleAgent, maleAgent]) {
        if (!currentIds.has(agent.id)) {
          try {
            await debateOrchestrator.joinDebate(id, agent.id, "agent", "neutral");
          } catch {}
        }
      }

      const updates: any = {};
      if (youtubeStreamKey) updates.youtubeStreamKey = youtubeStreamKey;
      if (Object.keys(updates).length > 0) {
        await storage.updateLiveDebate(id, updates);
      }

      const detail = await debateOrchestrator.getDebateWithDetails(id);
      res.json(detail);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/debates/:id/studio/override-speaker", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const { speakerId } = req.body;
      await storage.updateLiveDebate(id, { currentSpeakerId: speakerId || null });
      debateOrchestrator.emitOverride(id, speakerId);
      res.json({ success: true, currentSpeakerId: speakerId });
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/debates/:id/studio/speech", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const { transcript, userId } = req.body;
      if (!transcript || !userId) return res.status(400).json({ message: "transcript and userId required" });
      const turn = await debateOrchestrator.submitHumanTurn(id, userId, transcript);
      res.json(turn);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/debates/:id/studio/tts", requireAuth, async (req, res) => {
    try {
      const { text, voice } = req.body;
      if (!text) return res.status(400).json({ message: "text required" });
      const { textToSpeech } = await import("./replit_integrations/audio/client");
      const audioBuffer = await textToSpeech(text, voice || "alloy", "mp3");
      const audioBase64 = audioBuffer.toString("base64");
      res.json({ audioBase64 });
    } catch (err) { handleServiceError(res, err); }
  });

  // ---- CONTENT FLYWHEEL ----
  app.get("/api/flywheel/status", async (_req, res) => {
    const enabled = process.env.ENABLE_FLYWHEEL_VIDEO === "true";
    res.json({
      enabled,
      reason: enabled ? null : "Video generation is disabled. Set ENABLE_FLYWHEEL_VIDEO=true to enable.",
    });
  });

  app.post("/api/flywheel/trigger/:debateId", async (req, res) => {
    try {
      if (process.env.ENABLE_FLYWHEEL_VIDEO !== "true") {
        return res.status(503).json({ message: "Video generation is temporarily disabled" });
      }
      const debateId = parseInt(req.params.debateId as string);
      const job = await contentFlywheel.runFlywheelPipeline(debateId);
      res.json(job);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/flywheel/jobs", async (req, res) => {
    try {
      const jobs = await contentFlywheel.getAllJobsWithClipCounts();
      res.json(jobs);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/flywheel/jobs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const jobWithClips = await contentFlywheel.getJobWithClips(id);
      if (!jobWithClips) return res.status(404).json({ message: "Flywheel job not found" });
      res.json(jobWithClips);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/flywheel/debate/:debateId", async (req, res) => {
    try {
      const debateId = parseInt(req.params.debateId as string);
      const jobWithClips = await contentFlywheel.getJobByDebateWithClips(debateId);
      if (!jobWithClips) return res.status(404).json({ message: "No flywheel job found for this debate" });
      res.json(jobWithClips);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/flywheel/clips/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const clip = await storage.getGeneratedClip(id);
      if (!clip) return res.status(404).json({ message: "Clip not found" });
      res.json(clip);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/flywheel/clips/:id/video", async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const clip = await storage.getGeneratedClip(id);
      if (!clip || !clip.videoPath) return res.status(404).json({ message: "Video not found" });
      const { readFile } = await import("fs/promises");
      const { existsSync } = await import("fs");
      if (!existsSync(clip.videoPath)) return res.status(404).json({ message: "Video file not found on disk" });
      const videoBuffer = await readFile(clip.videoPath);
      res.setHeader("Content-Type", "video/mp4");
      res.setHeader("Content-Length", videoBuffer.length);
      res.send(videoBuffer);
    } catch (err) { handleServiceError(res, err); }
  });

  // ---- ADMIN ----
  app.post("/api/admin/login", async (req, res) => {
    try {
      assertAdminConfig();
      const { username, password } = req.body;
      if (typeof password !== "string") {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      if (username !== ADMIN_USERNAME || !bcrypt.compareSync(password, ADMIN_PASSWORD_HASH!)) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      if (req.session) {
        req.session.isAdmin = true;
      }
      res.json({ success: true });
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/logout", requireAdmin, (req, res) => {
    if (req.session) req.session.isAdmin = false;
    res.json({ message: "Logged out" });
  });

  app.get("/api/admin/verify", requireAdmin, (_req, res) => {
    res.json({ valid: true });
  });

  app.get("/api/admin/stats", requireAdmin, async (_req, res) => {
    try {
      const [userCount, postCount, topicCount, debateCount, agentCount] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(users_table),
        db.select({ count: sql<number>`count(*)` }).from(posts_table),
        db.select({ count: sql<number>`count(*)` }).from(topics_table),
        db.select({ count: sql<number>`count(*)` }).from(liveDebates_table),
        db.select({ count: sql<number>`count(*)` }).from(users_table).where(eq(users_table.role, "agent")),
      ]);
      const flywheelJobsList = await storage.getFlywheelJobs();
      const econMetrics = await economyService.getEconomyMetrics();
      res.json({
        totalUsers: userCount[0]?.count || 0,
        totalPosts: postCount[0]?.count || 0,
        totalTopics: topicCount[0]?.count || 0,
        totalDebates: debateCount[0]?.count || 0,
        totalAgents: agentCount[0]?.count || 0,
        totalFlywheelJobs: flywheelJobsList.length,
        economy: econMetrics,
      });
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/users", requireAdmin, async (_req, res) => {
    try {
      const allUsers = await db.select().from(users_table).orderBy(desc(users_table.reputation));
      res.json(allUsers.map(u => ({ ...u, password: undefined })));
    } catch (err) { handleServiceError(res, err); }
  });

  app.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const id = req.params.id as string;
      await db.delete(users_table).where(eq(users_table.id, id));
      res.json({ message: "User deleted" });
    } catch (err) { handleServiceError(res, err); }
  });

  app.patch("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const id = req.params.id as string;
      const adminUpdateSchema = z.object({
        role: z.enum(["human", "agent"]).optional(),
        reputation: z.number().int().min(0).optional(),
        rankLevel: z.enum(["Basic", "Premium", "VIP", "Expert", "VVIP"]).optional(),
        energy: z.number().int().min(0).optional(),
        badge: z.string().optional(),
      });
      const parsed = adminUpdateSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid update data", errors: parsed.error.issues });
      const updateData = Object.fromEntries(Object.entries(parsed.data).filter(([_, v]) => v !== undefined));
      if (Object.keys(updateData).length === 0) return res.status(400).json({ message: "No valid fields to update" });
      const [updated] = await db.update(users_table).set(updateData).where(eq(users_table.id, id)).returning();
      res.json({ ...updated, password: undefined });
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/posts", requireAdmin, async (_req, res) => {
    try {
      const allPosts = await db.select().from(posts_table).orderBy(desc(posts_table.createdAt));
      res.json(allPosts);
    } catch (err) { handleServiceError(res, err); }
  });

  app.delete("/api/admin/posts/:id", requireAdmin, async (req, res) => {
    try {
      const id = req.params.id as string;
      await db.delete(posts_table).where(eq(posts_table.id, id));
      res.json({ message: "Post deleted" });
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/topics", requireAdmin, async (_req, res) => {
    try {
      const allTopics = await db.select().from(topics_table).orderBy(asc(topics_table.label));
      res.json(allTopics);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/topics", requireAdmin, async (req, res) => {
    try {
      const parsed = insertTopicSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid topic data" });
      const topic = await storage.createTopic(parsed.data);
      res.status(201).json(topic);
    } catch (err) { handleServiceError(res, err); }
  });

  app.delete("/api/admin/topics/:id", requireAdmin, async (req, res) => {
    try {
      const id = req.params.id as string;
      await db.delete(topics_table).where(eq(topics_table.id, id));
      res.json({ message: "Topic deleted" });
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/debates", requireAdmin, async (_req, res) => {
    try {
      const allDebates = await storage.getLiveDebates();
      res.json(allDebates);
    } catch (err) { handleServiceError(res, err); }
  });

  app.delete("/api/admin/debates/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      await db.delete(liveDebates_table).where(eq(liveDebates_table.id, id));
      res.json({ message: "Debate deleted" });
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/trigger/:system", requireAdmin, async (req, res) => {
    try {
      const system = req.params.system as string;
      let result: any;
      switch (system) {
        case "orchestrator":
          result = await agentOrchestrator.triggerCycle();
          break;
        case "learning":
          result = await agentLearningService.runLearningCycle();
          break;
        case "collaboration":
          result = await collaborationService.getCollaborationMetrics();
          break;
        case "governance":
          result = await governanceService.runGovernanceCycle();
          break;
        case "civilization":
          result = await civilizationService.runCivilizationCycle();
          break;
        case "evolution":
          result = await evolutionService.runEvolutionCycle();
          break;
        case "ethics":
          result = await ethicsService.runEthicsCycle();
          break;
        case "collective":
          result = await collectiveIntelligenceService.runCollectiveIntelligenceCycle();
          break;
        case "news":
          result = await newsPipelineService.runPipeline();
          break;
        case "seed":
          return res.redirect(307, "/api/seed");
        default:
          return res.status(400).json({ message: `Unknown system: ${system}` });
      }
      res.json({ system, result: result || "triggered" });
    } catch (err) { handleServiceError(res, err); }
  });

  // ---- ADMIN MODERATION ----
  app.get("/api/admin/moderation/flagged-users", requireAdmin, async (_req, res) => {
    try {
      const flagged = await storage.getFlaggedUsers();
      res.json(flagged.map(u => ({
        id: u.id,
        username: u.username,
        email: u.email,
        displayName: u.displayName,
        role: u.role,
        isSpammer: u.isSpammer,
        isShadowBanned: u.isShadowBanned,
        spamScore: u.spamScore,
        spamViolations: u.spamViolations,
        createdAt: u.createdAt,
      })));
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/moderation/logs", requireAdmin, async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
      const logs = await storage.getModerationLogs(limit);
      res.json(logs);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/moderation/logs/:userId", requireAdmin, async (req, res) => {
    try {
      const logs = await storage.getModerationLogsByUser(req.params.userId);
      res.json(logs);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/moderation/shadow-ban/:userId", requireAdmin, async (req, res) => {
    try {
      await storage.shadowBanUser(req.params.userId);
      founderDebugService.trackModerationAction("shadow_ban", req.params.userId);
      res.json({ message: "User shadow banned" });
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/moderation/unban/:userId", requireAdmin, async (req, res) => {
    try {
      await storage.unbanUser(req.params.userId);
      res.json({ message: "User unbanned" });
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/moderation/mark-spammer/:userId", requireAdmin, async (req, res) => {
    try {
      await storage.markUserAsSpammer(req.params.userId);
      founderDebugService.trackModerationAction("mark_spammer", req.params.userId);
      res.json({ message: "User marked as spammer" });
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/moderation/user-status/:userId", requireAdmin, async (req, res) => {
    try {
      const status = await getUserModerationStatus(req.params.userId);
      res.json(status);
    } catch (err) { handleServiceError(res, err); }
  });

  // ---- NEWS PIPELINE ----
  app.get("/api/news", async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
      const page = Math.max(parseInt(req.query.page as string) || 1, 1);
      const category = req.query.category as string | undefined;
      const offset = (page - 1) * limit;
      const [articles, total] = await Promise.all([
        storage.getNewsArticles(limit, category, offset),
        storage.countNewsArticles(category),
      ]);
      res.json({
        articles,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/news/latest", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const articles = await storage.getLatestNews(limit);
      res.json(articles);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/news/breaking", async (_req, res) => {
    try {
      const articles = await storage.getBreakingNews();
      res.json(articles);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/news/slug/:slug", async (req, res) => {
    try {
      const article = await newsPipelineService.getArticleBySlug(req.params.slug);
      if (!article) return res.status(404).json({ message: "Article not found" });
      res.json(article);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/news/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const article = await newsPipelineService.getArticle(id);
      if (!article) return res.status(404).json({ message: "Article not found" });
      res.json(article);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/news/trigger", requireAdmin, async (req, res) => {
    try {
      const result = await newsPipelineService.runPipeline();
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/news/evaluate-breaking", requireAdmin, async (_req, res) => {
    try {
      const { breakingNewsAgent } = await import("./services/breaking-news-agent");
      const processed = await breakingNewsAgent.processRecentArticles();
      const fixed = await breakingNewsAgent.fixMissingDebates();
      res.json({ evaluated: processed, debatesFixed: fixed });
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/news/:id/comments", async (req, res) => {
    try {
      const articleId = parseInt(req.params.id);
      const comments = await storage.getNewsComments(articleId);
      const commentsWithReplies = await Promise.all(
        comments.map(async (comment) => {
          const replies = await storage.getNewsCommentReplies(comment.id);
          const author = await storage.getUser(comment.authorId);
          const repliesWithAuthors = await Promise.all(
            replies.map(async (reply) => {
              const replyAuthor = await storage.getUser(reply.authorId);
              return { ...reply, author: replyAuthor ? { id: replyAuthor.id, displayName: replyAuthor.displayName, avatar: replyAuthor.avatar, role: replyAuthor.role } : null };
            })
          );
          return {
            ...comment,
            author: author ? { id: author.id, displayName: author.displayName, avatar: author.avatar, role: author.role } : null,
            replies: repliesWithAuthors,
          };
        })
      );
      res.json(commentsWithReplies);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/news/:id/comments", requireAuth, postCooldownMiddleware, async (req, res) => {
    try {
      const articleId = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
      const payload = { ...req.body };
      delete payload.userId;
      delete payload.authorId;
      delete payload.creatorId;
      const { content, parentId, commentType } = payload;
      if (!content) return res.status(400).json({ message: "content required" });

      if (await isUserSpammer(req.user.id)) {
        return res.status(403).json({ message: "Your account has been flagged for spam. You cannot post comments." });
      }

      const modResult = moderateContent(sanitizeHTML(content));
      if (!modResult.allowed) {
        await recordViolation(req.user.id, modResult.isSpam, modResult.category, "news_comment", content?.substring(0, 200));
        return res.status(400).json({ message: "Content violates platform safety guidelines." });
      }

      const comment = await storage.createNewsComment({
        articleId,
        authorId: req.user.id,
        content,
        parentId: parentId || null,
        commentType: commentType || "general",
      });
      const author = await storage.getUser(req.user.id);
      res.json({
        ...comment,
        author: author ? { id: author.id, displayName: author.displayName, avatar: author.avatar, role: author.role } : null,
        replies: [],
      });
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/news/:id/like", requireAuth, async (req, res) => {
    try {
      const articleId = parseInt(req.params.id);
      if (req.body?.userId) {
        delete req.body.userId;
      }
      const liked = await storage.toggleNewsReaction(articleId, req.user.id, "like");
      const article = await storage.getNewsArticle(articleId);
      res.json({ liked, likesCount: article?.likesCount || 0 });
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/news/:id/liked", requireAuth, async (req, res) => {
    try {
      const articleId = parseInt(req.params.id);
      const reaction = await storage.getNewsReaction(articleId, req.user.id);
      res.json({ liked: !!reaction });
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/news/:id/share", requireAuth, async (req, res) => {
    try {
      const articleId = parseInt(req.params.id);
      if (req.body?.userId) {
        delete req.body.userId;
      }
      const { platform } = req.body;
      await storage.createNewsShare({ articleId, userId: req.user.id, platform: platform || "internal" });
      const article = await storage.getNewsArticle(articleId);
      res.json({ sharesCount: article?.sharesCount || 0 });
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/news/comments/:id/like", requireAuth, async (req, res) => {
    try {
      const commentId = parseInt(req.params.id);
      await storage.likeNewsComment(commentId);
      res.json({ success: true });
    } catch (err) { handleServiceError(res, err); }
  });

  // ---- SOCIAL MEDIA ADMIN ----
  app.get("/api/admin/social/accounts", requireAdmin, async (_req, res) => {
    try {
      const accounts = await storage.getSocialAccounts();
      res.json(accounts);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/social/accounts", requireAdmin, async (req, res) => {
    try {
      const { platform, accountName, accessToken, refreshToken, autoPostEnabled, contentTypes } = req.body;
      if (!platform || !accountName) return res.status(400).json({ message: "platform and accountName required" });
      const account = await storage.createSocialAccount({
        platform, accountName,
        accessToken: accessToken || null,
        refreshToken: refreshToken || null,
        autoPostEnabled: autoPostEnabled || false,
        contentTypes: contentTypes || ["news", "breaking", "debate"],
      });
      res.json(account);
    } catch (err) { handleServiceError(res, err); }
  });

  app.patch("/api/admin/social/accounts/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.updateSocialAccount(id, req.body);
      res.json(updated);
    } catch (err) { handleServiceError(res, err); }
  });

  app.delete("/api/admin/social/accounts/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteSocialAccount(id);
      res.json({ success: true });
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/social/posts", requireAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const status = req.query.status as string | undefined;
      const posts = await storage.getSocialPosts(limit, status);
      res.json(posts);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/social/posts", requireAdmin, async (req, res) => {
    try {
      const post = await storage.createSocialPost(req.body);
      res.json(post);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/social/posts/:id/publish", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { socialPublisherService } = await import("./services/social-publisher-service");
      const result = await socialPublisherService.publishPost(id);
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/social/generate-caption", requireAdmin, async (req, res) => {
    try {
      const paid = await requirePaidAiAccess(req, res, "ai_response", "Admin social caption", "admin-social-caption");
      if (!paid) return;
      const { contentType, contentId, platform } = req.body;
      if (!contentType || !contentId) return res.status(400).json({ message: "contentType and contentId required" });
      const { socialCaptionAgent } = await import("./services/social-caption-agent");
      const caption = await socialCaptionAgent.generateCaption(contentType, contentId, platform);
      res.json(caption);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/social/trigger-publish", requireAdmin, async (_req, res) => {
    try {
      const { socialPublisherService } = await import("./services/social-publisher-service");
      const result = await socialPublisherService.processPendingPosts();
      res.json({ processed: result });
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/promotion/scores", requireAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const status = req.query.status as string | undefined;
      const scores = await storage.getPromotionScores(limit, status);
      res.json(scores);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/promotion/scores/:id", requireAdmin, async (req, res) => {
    try {
      const score = await storage.getPromotionScore(parseInt(req.params.id));
      if (!score) return res.status(404).json({ message: "Not found" });
      res.json(score);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/promotion/review-queue", requireAdmin, async (_req, res) => {
    try {
      const queue = await storage.getPendingReviewPromotions();
      res.json(queue);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/promotion/evaluate", requireAdmin, async (req, res) => {
    try {
      const { contentType, contentId } = req.body;
      if (!contentType || !contentId) return res.status(400).json({ message: "contentType and contentId required" });
      const { promotionSelectorAgent } = await import("./services/promotion-selector-agent");
      const score = await promotionSelectorAgent.evaluateContent(contentType, contentId);
      res.json(score);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/promotion/evaluate-all", requireAdmin, async (_req, res) => {
    try {
      const { promotionSelectorAgent } = await import("./services/promotion-selector-agent");
      const evaluated = await promotionSelectorAgent.evaluateRecentContent();
      const results = await promotionSelectorAgent.processPromotions();
      res.json({ evaluated, ...results });
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/promotion/override/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { decision } = req.body;
      if (!decision || !["auto_promote", "no_promotion"].includes(decision)) {
        return res.status(400).json({ message: "decision must be 'auto_promote' or 'no_promotion'" });
      }
      const { promotionSelectorAgent } = await import("./services/promotion-selector-agent");
      const updated = await promotionSelectorAgent.overrideDecision(id, decision, "admin");
      res.json(updated);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/promotion/process", requireAdmin, async (_req, res) => {
    try {
      const { promotionSelectorAgent } = await import("./services/promotion-selector-agent");
      const results = await promotionSelectorAgent.processPromotions();
      res.json(results);
    } catch (err) { handleServiceError(res, err); }
  });

  // ---- AI GROWTH BRAIN ----
  app.get("/api/admin/growth/analytics", requireAdmin, async (_req, res) => {
    try {
      const { growthBrainService } = await import("./services/growth-brain-service");
      const analytics = await growthBrainService.getAnalytics();
      res.json(analytics);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/growth/performance", requireAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const platform = req.query.platform as string | undefined;
      if (platform) {
        const data = await storage.getSocialPerformanceByPlatform(platform, limit);
        return res.json(data);
      }
      const data = await storage.getSocialPerformance(limit);
      res.json(data);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/growth/viral", requireAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const data = await storage.getTopViralPosts(limit);
      res.json(data);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/growth/patterns", requireAdmin, async (req, res) => {
    try {
      const platform = req.query.platform as string | undefined;
      const data = await storage.getGrowthPatterns(platform);
      res.json(data);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/growth/learn", requireAdmin, async (_req, res) => {
    try {
      const { growthBrainService } = await import("./services/growth-brain-service");
      const collected = await growthBrainService.collectPerformanceFromSocialPosts();
      const result = await growthBrainService.analyzeAndLearn();
      res.json({ collected, ...result });
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/growth/optimize", requireAdmin, async (req, res) => {
    try {
      const { platform } = req.body;
      if (!platform) return res.status(400).json({ message: "platform required" });
      const { growthBrainService } = await import("./services/growth-brain-service");
      const strategy = await growthBrainService.optimizeForPlatform(platform);
      res.json(strategy);
    } catch (err) { handleServiceError(res, err); }
  });

  // ---- FOUNDER CONTROL LAYER ----
  app.get("/api/admin/founder-control/configs", requireAdmin, async (_req, res) => {
    try {
      const { founderControlService } = await import("./services/founder-control-service");
      const configs = await founderControlService.getAllConfigs();
      res.json(configs);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/founder-control/status", requireAdmin, async (_req, res) => {
    try {
      const { founderControlService } = await import("./services/founder-control-service");
      const config = await founderControlService.getConfig();
      const stopped = await founderControlService.isEmergencyStopped();
      res.json({ config, emergencyStopped: stopped });
    } catch (err) { handleServiceError(res, err); }
  });

  app.patch("/api/admin/founder-control/config/:key", requireAdmin, async (req, res) => {
    try {
      const { key } = req.params;
      const { value } = req.body;
      if (value === undefined || typeof value !== "number") {
        return res.status(400).json({ message: "numeric value required" });
      }
      const { founderControlService } = await import("./services/founder-control-service");
      const updated = await founderControlService.updateValue(key as string, value);
      res.json(updated);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/founder-control/bulk-update", requireAdmin, async (req, res) => {
    try {
      const { updates } = req.body;
      if (!Array.isArray(updates)) {
        return res.status(400).json({ message: "updates array required" });
      }
      const { founderControlService } = await import("./services/founder-control-service");
      const results = await founderControlService.bulkUpdate(updates);
      res.json(results);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/founder-control/emergency-stop", requireAdmin, async (_req, res) => {
    try {
      const { founderControlService } = await import("./services/founder-control-service");
      await founderControlService.triggerEmergencyStop();
      res.json({ message: "Emergency stop activated. All automated systems paused." });
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/founder-control/emergency-release", requireAdmin, async (_req, res) => {
    try {
      const { founderControlService } = await import("./services/founder-control-service");
      await founderControlService.releaseEmergencyStop();
      res.json({ message: "Emergency stop released. Systems resuming normal operation." });
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/command-center/health", requireAdmin, async (_req, res) => {
    try {
      const { escalationService } = await import("./services/escalation-service");
      const { activityMonitorService } = await import("./services/activity-monitor-service");
      const { founderControlService } = await import("./services/founder-control-service");
      const [policy, metrics, founderConfig, emergencyStopped, pendingDecisions, openAnomalies] = await Promise.all([
        escalationService.getPolicy(),
        activityMonitorService.getLatestMetrics(),
        founderControlService.getConfig(),
        founderControlService.isEmergencyStopped(),
        storage.getPendingDecisions(),
        storage.getOpenAnomalies(),
      ]);
      res.json({
        policy,
        metrics,
        founderControl: { config: founderConfig, emergencyStopped },
        pendingDecisionCount: pendingDecisions.length,
        openAnomalyCount: openAnomalies.length,
        systemHealthy: !policy.killSwitch && !emergencyStopped && openAnomalies.filter((a: any) => a.severity === "HIGH").length === 0,
      });
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/command-center/alerts", requireAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const anomalies = await storage.getAllAnomalies(limit);
      res.json(anomalies);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/command-center/open-alerts", requireAdmin, async (_req, res) => {
    try {
      const anomalies = await storage.getOpenAnomalies();
      res.json(anomalies);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/command-center/alerts/:id/acknowledge", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.updateAnomalyStatus(id, "acknowledged");
      res.json(updated);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/command-center/alerts/:id/resolve", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.updateAnomalyStatus(id, "resolved", new Date());
      res.json(updated);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/command-center/decisions", requireAdmin, async (req, res) => {
    try {
      const status = req.query.status as string;
      if (status === "pending") {
        const decisions = await storage.getPendingDecisions();
        res.json(decisions);
      } else {
        const limit = parseInt(req.query.limit as string) || 50;
        const decisions = await storage.getAllDecisions(limit);
        res.json(decisions);
      }
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/command-center/decisions/:id/approve", requireAdmin, async (req, res) => {
    try {
      const { escalationService } = await import("./services/escalation-service");
      const id = parseInt(req.params.id);
      const decision = await escalationService.approveDecision(id);
      res.json(decision);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/command-center/decisions/:id/reject", requireAdmin, async (req, res) => {
    try {
      const { escalationService } = await import("./services/escalation-service");
      const id = parseInt(req.params.id);
      const decision = await escalationService.rejectDecision(id);
      res.json(decision);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/command-center/policy", requireAdmin, async (_req, res) => {
    try {
      const { escalationService } = await import("./services/escalation-service");
      const policy = await escalationService.getPolicy();
      res.json(policy);
    } catch (err) { handleServiceError(res, err); }
  });

  app.patch("/api/admin/command-center/policy", requireAdmin, async (req, res) => {
    try {
      const { escalationService } = await import("./services/escalation-service");
      const { mode, safeMode, killSwitch } = req.body;
      const policy = await escalationService.updatePolicy({ mode, safeMode, killSwitch });
      res.json(policy);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/command-center/kill-switch", requireAdmin, async (_req, res) => {
    try {
      const { escalationService } = await import("./services/escalation-service");
      const { founderControlService } = await import("./services/founder-control-service");
      await escalationService.setKillSwitch(true);
      await founderControlService.triggerEmergencyStop();
      res.json({ message: "Kill switch activated. All automation halted." });
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/command-center/kill-switch/release", requireAdmin, async (_req, res) => {
    try {
      const { escalationService } = await import("./services/escalation-service");
      const { founderControlService } = await import("./services/founder-control-service");
      await escalationService.setKillSwitch(false);
      await founderControlService.releaseEmergencyStop();
      res.json({ message: "Kill switch released. Systems resuming." });
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/command-center/safe-mode", requireAdmin, async (req, res) => {
    try {
      const { escalationService } = await import("./services/escalation-service");
      const { enabled } = req.body;
      const policy = await escalationService.setSafeMode(!!enabled);
      res.json(policy);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/command-center/metrics/:key", requireAdmin, async (req, res) => {
    try {
      const { activityMonitorService } = await import("./services/activity-monitor-service");
      const since = req.query.since ? new Date(req.query.since as string) : undefined;
      const metrics = await activityMonitorService.getMetricHistory(req.params.key, since);
      res.json(metrics);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/command-center/scan", requireAdmin, async (_req, res) => {
    try {
      const { activityMonitorService } = await import("./services/activity-monitor-service");
      const { anomalyDetectorService } = await import("./services/anomaly-detector-service");
      const { escalationService } = await import("./services/escalation-service");
      const metrics = await activityMonitorService.collectMetrics();
      const anomalies = await anomalyDetectorService.runDetection();
      if (anomalies.length > 0) {
        await escalationService.handleAnomalies(anomalies);
      }
      res.json({ metricsCollected: metrics.length, anomaliesDetected: anomalies.length, anomalies });
    } catch (err) { handleServiceError(res, err); }
  });

  // ---- BILLING / MONETIZATION ----
  app.get("/api/billing/plans", async (_req, res) => {
    try { res.json(await billingService.getPlans()); } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/billing/credit-packages", async (_req, res) => {
    try { res.json(await billingService.getCreditPackages()); } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/billing/credit-costs", async (_req, res) => {
    res.json(CREDIT_COSTS);
  });

  const purchaseCreditsSchema = z.object({ userId: z.string().min(1), packageId: z.string().min(1) });
  const useCreditsSchema = z.object({ userId: z.string().min(1), actionType: z.string().min(1), actionLabel: z.string().optional(), referenceId: z.string().optional() });
  const subscribeSchema = z.object({ userId: z.string().min(1), planName: z.string().min(1), billingCycle: z.enum(["monthly", "yearly"]).default("monthly") });
  const cancelSubSchema = z.object({ userId: z.string().min(1) });

  app.post("/api/billing/purchase-credits", requireAuth, async (req, res) => {
    try {
      const parsed = purchaseCreditsSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid input", errors: parsed.error.issues });
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      const result = await billingService.purchaseCredits(userId, parsed.data.packageId);
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/billing/use-credits", requireAuth, async (req, res) => {
    try {
      const parsed = useCreditsSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid input", errors: parsed.error.issues });
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      const cost = CREDIT_COSTS[parsed.data.actionType as keyof typeof CREDIT_COSTS] || 5;
      const result = await billingService.useCredits(userId, cost, parsed.data.actionType, parsed.data.actionLabel, parsed.data.referenceId);
      if (!result) return res.status(402).json({ message: "Insufficient credits" });
      res.json({ success: true, cost });
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/billing/can-afford/:userId/:actionType", requireAuth, async (req, res) => {
    try {
      if (req.params.userId !== req.user.id) return res.status(403).json({ message: "Forbidden" });
      const user = await storage.getUser(req.user.id);
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(await billingService.canAfford(req.user.id, req.params.actionType));
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/billing/summary/:userId", requireAuth, async (req, res) => {
    try {
      if (req.params.userId !== req.user.id) return res.status(403).json({ message: "Forbidden" });
      const user = await storage.getUser(req.user.id);
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(await billingService.getBillingSummary(req.user.id));
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/billing/subscription/:userId", requireAuth, async (req, res) => {
    try {
      if (req.params.userId !== req.user.id) return res.status(403).json({ message: "Forbidden" });
      const user = await storage.getUser(req.user.id);
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(await billingService.getSubscriptionStatus(req.user.id));
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/billing/subscribe", requireAuth, async (req, res) => {
    try {
      const parsed = subscribeSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid input", errors: parsed.error.issues });
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      const result = await billingService.subscribeToPlan(userId, parsed.data.planName, parsed.data.billingCycle);
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/billing/cancel-subscription", requireAuth, async (req, res) => {
    try {
      const parsed = cancelSubSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid input", errors: parsed.error.issues });
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      await billingService.cancelSubscription(userId);
      res.json({ success: true });
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/billing/invoices/:userId", async (req, res) => {
    try { res.json(await billingService.getInvoices(req.params.userId)); } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/billing/usage/:userId", async (req, res) => {
    try { res.json(await billingService.getUsageStats(req.params.userId)); } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/billing/analytics", requireAdmin, async (_req, res) => {
    try { res.json(await billingService.getFounderAnalytics()); } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/billing/flywheel", requireAdmin, async (_req, res) => {
    try { res.json(await billingService.getRevenueFlywheelData()); } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/billing/phase-transition", requireAdmin, async (_req, res) => {
    try { res.json(await billingService.getPhaseTransitionData()); } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/transition-index", requireAdmin, async (_req, res) => {
    try { res.json(await phaseTransitionService.getTransitionIndex()); } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/transition-metrics", requireAdmin, async (_req, res) => {
    try { res.json(await phaseTransitionService.computeMetrics()); } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/billing/flywheel/sync", requireAdmin, async (_req, res) => {
    try { 
      await billingService.syncFlywheelMetrics();
      res.json({ success: true });
    } catch (err) { handleServiceError(res, err); }
  });

  await billingService.seedPlansAndPackages();

  // ---- SEO & AI CRAWLER COMPLIANCE ----
  const seoService = (await import("./services/seo-service")).default;

  app.get("/sitemap.xml", async (req, res) => {
    const host = req.hostname;
    if (host && host.includes("replit.app")) {
      res.status(404).send("Not found");
      return;
    }
    try {
      const xml = await seoService.generateSitemap();
      res.set("Content-Type", "application/xml");
      res.send(xml);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/robots.txt", (req, res) => {
    res.set("Content-Type", "text/plain");
    const host = req.hostname;
    if (host && host.includes("replit.app")) {
      res.send("User-agent: *\nDisallow: /\n");
      return;
    }
    res.send(seoService.generateRobotsTxt());
  });

  app.get("/llms.txt", (_req, res) => {
    res.set("Content-Type", "text/plain");
    res.send(seoService.generateLlmsTxt());
  });

  app.get("/api/seo/knowledge", async (_req, res) => {
    try { res.json(await seoService.getPublicKnowledge()); } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/seo/knowledge-feed", async (_req, res) => {
    try { res.json(await seoService.getKnowledgeFeed()); } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/seo/stats", requireAdmin, async (_req, res) => {
    try { res.json(await seoService.getSEOStats()); } catch (err) { handleServiceError(res, err); }
  });

  const { authorityService } = await import("./services/authority-service");

  app.post("/api/admin/seo/calculate-authority", requireAdmin, async (req, res) => {
    try {
      const { topicSlug } = req.body;
      if (topicSlug) {
        res.json(await authorityService.updateTopicAuthority(topicSlug));
      } else {
        const allTopics = await storage.getTopics();
        const results = [];
        for (const t of allTopics) {
          results.push(await authorityService.updateTopicAuthority(t.slug));
        }
        res.json({ success: true, results });
      }
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/seo/calculate-gravity", requireAdmin, async (_req, res) => {
    try {
      const result = await seoService.calculateNetworkGravity();
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/gravity/history", requireAdmin, async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      res.json(await seoService.getGravityHistory(limit));
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/gravity/trends", requireAdmin, async (_req, res) => {
    try {
      res.json(await seoService.getGravityTrends());
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/gravity/generate-insights", requireAdmin, async (_req, res) => {
    try {
      const paid = await requirePaidAiAccess(_req, res, "ai_response", "Admin gravity insights", "admin-gravity-insights");
      if (!paid) return;
      const trends = await seoService.getGravityTrends();
      if (trends.records < 1) {
        return res.json({ insight: "Calculate gravity first to generate AI insights." });
      }

      if (!process.env.OPENAI_API_KEY && !process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
        return res.json({ insight: trends.insights.join(" ") || "OpenAI not configured. Using rule-based insights.", trends });
      }

      let OpenAI: any;
      try { OpenAI = (await import("openai")).default; } catch { return res.json({ insight: trends.insights.join(" ") || "No insights available.", trends }); }

      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || "https://api.openai.com/v1",
      });

      const response = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          {
            role: "system",
            content: "You are a platform growth strategist analyzing network gravity metrics for a hybrid human-AI discussion platform. Provide concise, actionable insights about platform health, competitive moat strength, and growth trajectory. Be specific and data-driven."
          },
          {
            role: "user",
            content: `Analyze these Network Gravity metrics and provide strategic insights:

Gravity Score: ${(trends.currentScore * 100).toFixed(1)}% (measures self-reinforcing growth strength)
Growth Direction: ${trends.direction}
Self-Sustaining Score: ${((trends.selfSustaining || 0) * 100).toFixed(1)}% (how close to being impossible to compete with)
Overall Trend: ${trends.overallTrend > 0 ? "+" : ""}${(trends.overallTrend * 100).toFixed(1)}% over ${trends.records} measurements

Component Breakdown:
${Object.entries(trends.components || {}).map(([k, v]) => `- ${k}: ${((v as number) * 100).toFixed(1)}%`).join("\n")}

${Object.keys(trends.componentTrends || {}).length > 0 ? `Component Trends:\n${Object.entries(trends.componentTrends || {}).map(([k, v]: [string, any]) => `- ${k}: ${v.change > 0 ? "+" : ""}${(v.change * 100).toFixed(1)}%`).join("\n")}` : ""}

Provide:
1. A 2-3 sentence executive summary of platform health
2. The #1 growth opportunity
3. The #1 risk factor
4. Whether the platform is approaching self-sustainability (network effects making it hard to compete with)
Keep total response under 200 words.`
          }
        ],
        max_tokens: 500,
      });

      let insight: string;
      try {
        insight = response.choices[0]?.message?.content || trends.insights.join(" ");
      } catch {
        insight = trends.insights.join(" ") || "Unable to parse AI response.";
      }

      try {
        if (trends.history && trends.history.length > 0) {
          const latestId = trends.history[0].id;
          await db
            .update(networkGravity)
            .set({ aiInsights: insight })
            .where(eq(networkGravity.id, latestId));
        }
      } catch {}

      res.json({ insight, trends });
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/seo/calculate-civilization", requireAdmin, async (_req, res) => {
    try {
      const result = await seoService.calculateCivilizationHealth();
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/civilization/history", requireAdmin, async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      res.json(await seoService.getCivilizationHistory(limit));
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/civilization/trends", requireAdmin, async (_req, res) => {
    try {
      res.json(await seoService.getCivilizationTrends());
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/civilization/generate-insights", requireAdmin, async (_req, res) => {
    try {
      const paid = await requirePaidAiAccess(_req, res, "ai_response", "Admin civilization insights", "admin-civilization-insights");
      if (!paid) return;
      const trends = await seoService.getCivilizationTrends();
      if (trends.records < 1) {
        return res.json({ insight: "Calculate civilization health first to generate AI insights." });
      }

      if (!process.env.OPENAI_API_KEY && !process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
        return res.json({ insight: trends.insights.join(" ") || "OpenAI not configured. Using rule-based insights.", trends });
      }

      let OpenAI: any;
      try { OpenAI = (await import("openai")).default; } catch { return res.json({ insight: trends.insights.join(" ") || "No insights available.", trends }); }

      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || "https://api.openai.com/v1",
      });

      const dimSummary = Object.entries(trends.dimensions || {}).map(([k, v]: [string, any]) =>
        `- ${v.label}: ${(v.score * 100).toFixed(1)}% (${v.change > 0 ? "+" : ""}${(v.change * 100).toFixed(1)}%)`
      ).join("\n");

      const response = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          {
            role: "system",
            content: "You are a civilization analyst for a hybrid human-AI discussion platform. Analyze intelligence accumulation, ecosystem stability, and long-term viability. Be specific and data-driven."
          },
          {
            role: "user",
            content: `Analyze Civilization Health metrics for a knowledge platform:

Health Score: ${(trends.currentHealth * 100).toFixed(1)}%
Maturity Level: ${trends.maturityLabel}
Trend: ${trends.trendDelta > 0 ? "+" : ""}${((trends.trendDelta || 0) * 100).toFixed(1)}%

Civilization Dimensions:
${dimSummary}

Economy: Credits earned ${trends.economyStats?.creditsEarned || 0}, spent ${trends.economyStats?.creditsSpent || 0}, ${trends.economyStats?.contributorRewards || 0} contributor rewards
Governance: Moderation accuracy ${((trends.governanceStats?.moderationAccuracy || 0) * 100).toFixed(0)}%, ${trends.governanceStats?.disputeResolutions || 0} dispute resolutions
Evolution: AI quality ${trends.evolutionStats?.qualityTrend || "unknown"}, verification avg ${((trends.evolutionStats?.avgVerificationScore || 0) * 100).toFixed(0)}%

Provide:
1. Executive summary of civilization health (2-3 sentences)
2. Which dimension needs the most attention and why
3. What milestone the platform is approaching next
4. Whether the platform is building persistent intelligence vs just collecting content
Keep under 200 words.`
          }
        ],
        max_tokens: 500,
      });

      let insight: string;
      try {
        insight = response.choices[0]?.message?.content || trends.insights.join(" ");
      } catch {
        insight = trends.insights.join(" ") || "Unable to parse AI response.";
      }

      try {
        if (trends.history && trends.history.length > 0) {
          const latestId = trends.history[0].id;
          await db
            .update(civilizationMetrics)
            .set({ aiInsights: insight })
            .where(eq(civilizationMetrics.id, latestId));
        }
      } catch {}

      res.json({ insight, trends });
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/public/knowledge", async (_req, res) => {
    try { res.json(await seoService.getPublicKnowledge()); } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/knowledge-feed", async (_req, res) => {
    try {
      const { authorityService: authSvc } = await import("./services/authority-service");
      try {
        res.json(await authSvc.generateKnowledgeFeed());
      } catch {
        res.json(await seoService.getKnowledgeFeed());
      }
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/seo/verify-post", requireAdmin, async (req, res) => {
    try {
      const { postId } = req.body;
      res.json({ score: await authorityService.calculateVerificationScore(postId) });
    } catch (err) { handleServiceError(res, err); }
  });

  const { aiContentService } = await import("./services/ai-content-service");

  app.post("/api/admin/seo/generate-post-seo", requireAdmin, async (req, res) => {
    try {
      const paid = await requirePaidAiAccess(req, res, "ai_response", "Admin SEO post", "admin-seo-post");
      if (!paid) return;
      const postId = req.body?.postId;
      if (!postId || typeof postId !== "string") return res.status(400).json({ error: "Valid postId string required" });
      const result = await aiContentService.generatePostSEO(postId);
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/seo/generate-debate-consensus", requireAdmin, async (req, res) => {
    try {
      const paid = await requirePaidAiAccess(req, res, "ai_response", "Admin SEO debate consensus", "admin-seo-consensus");
      if (!paid) return;
      const debateId = Number(req.body?.debateId);
      if (!debateId || isNaN(debateId)) return res.status(400).json({ error: "Valid numeric debateId required" });
      const result = await aiContentService.generateDebateConsensus(debateId);
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/seo/batch-generate", requireAdmin, async (req, res) => {
    try {
      const paid = await requirePaidAiAccess(req, res, "ai_response", "Admin SEO batch", "admin-seo-batch");
      if (!paid) return;
      const limit = Math.max(1, Math.min(50, Number(req.body?.limit) || 10));
      const result = await aiContentService.batchGeneratePostSEO(limit);
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  // ---- USER-OWNED AI AGENT PLATFORM ROUTES ----

  app.post("/api/user-agents", requireAuth, async (req, res) => {
    try {
      const { name, persona, skills, avatarUrl, voiceId, model, provider, systemPrompt, temperature, visibility, deploymentModes, rateLimitPerMin, tags } = req.body;
      if (!name) return res.status(400).json({ error: "name is required" });
      const type = req.body?.type === "personal" ? "personal" : "business";
      const desiredModes = Array.isArray(deploymentModes) ? deploymentModes : ["private"];
      const wantsMarketplace = desiredModes.includes("marketplace");
      const ownerId = req.user.id;
      const effectiveModes = type === "personal" ? ["private"] : desiredModes;
      const effectiveVisibility = type === "personal"
        ? "private"
        : (visibility || (effectiveModes.includes("public") || effectiveModes.includes("marketplace") ? "public" : "private"));
      const marketplaceEnabled = type === "personal"
        ? false
        : (typeof req.body?.marketplaceEnabled === "boolean" ? req.body.marketplaceEnabled : wantsMarketplace);
      const exportable = type === "personal"
        ? true
        : (typeof req.body?.exportable === "boolean" ? req.body.exportable : false);

      const agent = await storage.createUserAgent({
        ownerId,
        type,
        agentType: type,
        name, persona, skills, avatarUrl, voiceId,
        model: model || "gpt-5.2", provider: provider || "openai",
        systemPrompt, temperature, visibility: effectiveVisibility, status: "draft",
        marketplaceEnabled,
        exportable,
        deploymentModes: effectiveModes,
        rateLimitPerMin: rateLimitPerMin || 30, tags,
      });
      res.json(agent);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/user-agents", async (req, res) => {
    try {
      const ownerId = req.query.ownerId as string;
      if (ownerId) {
        if (!req.session?.userId) return res.status(401).json({ error: "Authentication required" });
        if (ownerId !== req.session.userId) return res.status(403).json({ error: "Forbidden" });
        res.json(await storage.getUserAgentsByOwner(ownerId));
      } else {
        res.json(await storage.getPublicAgents());
      }
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/user-agents/:id", async (req, res) => {
    try {
      const agent = await storage.getUserAgent(req.params.id);
      if (!agent) return res.status(404).json({ error: "Agent not found" });
      const sessionUserId = req.session?.userId || null;
      if (agent.type === "personal" && agent.ownerId !== sessionUserId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      if (agent.visibility === "private" && agent.ownerId !== sessionUserId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      res.json(agent);
    } catch (err) { handleServiceError(res, err); }
  });

  app.patch("/api/user-agents/:id", requireAuth, async (req, res) => {
    try {
      const agent = await storage.getUserAgent(req.params.id);
      if (!agent) return res.status(404).json({ error: "Agent not found" });
      if (agent.ownerId !== req.user.id) return res.status(403).json({ error: "Forbidden" });
      const updates = { ...req.body };
      delete (updates as any).ownerId;
      if (updates.type === "personal" || agent.type === "personal") {
        updates.type = "personal";
        updates.agentType = "personal";
        updates.visibility = "private";
        updates.marketplaceEnabled = false;
        updates.exportable = true;
        updates.deploymentModes = ["private"];
      }
      const updated = await storage.updateUserAgent(req.params.id, updates);
      res.json(updated);
    } catch (err) { handleServiceError(res, err); }
  });

  app.delete("/api/user-agents/:id", requireAuth, async (req, res) => {
    try {
      const agent = await storage.getUserAgent(req.params.id);
      if (!agent) return res.status(404).json({ error: "Agent not found" });
      if (agent.ownerId !== req.user.id) return res.status(403).json({ error: "Forbidden" });
      await storage.deleteUserAgent(req.params.id);
      res.json({ success: true });
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/user-agents/:id/deploy", requireAuth, async (req, res) => {
    try {
      const agent = await storage.getUserAgent(req.params.id);
      if (!agent) return res.status(404).json({ error: "Agent not found" });
      if (agent.ownerId !== req.user.id) return res.status(403).json({ error: "Forbidden" });
      const { modes } = req.body;
      const validModes = ["private", "public", "debate", "api", "marketplace"];
      const filtered = (modes || []).filter((m: string) => validModes.includes(m));
      const effectiveModes = agent.type === "personal" ? ["private"] : filtered;
      const visibility = effectiveModes.includes("public") || effectiveModes.includes("marketplace") ? "public" : "private";
      const marketplaceEnabled = agent.type === "personal" ? false : effectiveModes.includes("marketplace");
      const updated = await storage.updateUserAgent(req.params.id, {
        deploymentModes: effectiveModes,
        visibility,
        status: "active",
        marketplaceEnabled,
      });
      res.json(updated);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/user-agents/:id/knowledge", requireAuth, async (req, res) => {
    try {
      const agent = await storage.getUserAgent(req.params.id);
      if (!agent) return res.status(404).json({ error: "Agent not found" });
      if (agent.ownerId !== req.user.id) return res.status(403).json({ error: "Forbidden" });
      res.json(await storage.getAgentKnowledgeSources(req.params.id));
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/user-agents/:id/knowledge", requireAuth, async (req, res) => {
    try {
      const agent = await storage.getUserAgent(req.params.id);
      if (!agent) return res.status(404).json({ error: "Agent not found" });
      if (agent.ownerId !== req.user.id) return res.status(403).json({ error: "Forbidden" });
      const { sourceType, title, content, uri, metadata } = req.body;
      if (!sourceType || !title) return res.status(400).json({ error: "sourceType and title required" });
      const source = await storage.createAgentKnowledgeSource({
        agentId: req.params.id,
        sourceType, title, content, uri, metadata,
        status: "processed",
      });
      res.json(source);
    } catch (err) { handleServiceError(res, err); }
  });

  app.delete("/api/user-agents/knowledge/:sourceId", requireAuth, async (req, res) => {
    try {
      const source = await storage.getAgentKnowledgeSource(req.params.sourceId);
      if (!source) return res.status(404).json({ error: "Knowledge source not found" });
      const agent = await storage.getUserAgent(source.agentId);
      if (!agent) return res.status(404).json({ error: "Agent not found" });
      if (agent.ownerId !== req.user.id) return res.status(403).json({ error: "Forbidden" });
      await storage.deleteAgentKnowledgeSource(req.params.sourceId);
      res.json({ success: true });
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/agents/:id/export", requireAuth, async (req, res) => {
    try {
      const agentId = req.params.id;
      const result = await agentExportService.exportAgent(agentId, req.user.id);
      res.setHeader("Content-Type", "application/vnd.mougle-agent+json");
      res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
      res.send(result.content);
    } catch (err: any) {
      if (err?.status === 429) {
        res.setHeader("Retry-After", String(err.retryAfter || 60));
        return res.status(429).json({ error: "Export rate limit exceeded", retryAfter: err.retryAfter || 60 });
      }
      handleServiceError(res, err);
    }
  });

  app.get("/api/agents/passport/exports", requireAuth, async (req, res) => {
    try {
      const exports = await storage.getAgentPassportExportsByOwner(req.user.id);
      res.json(exports);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/agents/passport/:exportId/revoke", requireAuth, async (req, res) => {
    try {
      const revoked = await agentPassportRevocationService.revokePassport(
        req.params.exportId,
        req.user.id,
        req.body?.reason || null
      );
      res.json({ success: true, revoked });
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/agents/import", requireAuth, async (req, res) => {
    try {
      const passport = req.body?.passport;
      if (!passport || typeof passport !== "string") {
        return res.status(400).json({ error: "passport content required" });
      }
      const exportHash = crypto.createHash("sha256").update(passport).digest("hex");
      const exportRecord = await storage.getAgentPassportExportByHash(exportHash);
      if (!exportRecord) return res.json({ valid: false, revoked: false });
      return res.json({ valid: !exportRecord.revoked, revoked: exportRecord.revoked });
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/passport/verify/:exportId", async (req, res) => {
    try {
      const exportId = req.params.exportId;
      const match = await storage.getAgentPassportExportById(exportId);
      if (!match) {
        res.setHeader("Cache-Control", "public, max-age=300");
        return res.json({ valid: false, revoked: false, origin: "mougle.com", standard: "MAP-1" });
      }
      const etagBase = JSON.stringify({
        id: match.id,
        revoked: match.revoked,
        revokedAt: match.revokedAt,
        exportedAt: match.exportedAt,
        exportVersion: match.exportVersion,
      });
      const etag = `"${crypto.createHash("sha256").update(etagBase).digest("hex")}"`;
      res.setHeader("ETag", etag);
      if (req.headers["if-none-match"] === etag) {
        return res.status(304).end();
      }
      res.setHeader("Cache-Control", match.revoked ? "public, max-age=60" : "public, max-age=300");
      return res.json({
        valid: !match.revoked,
        revoked: !!match.revoked,
        origin: "mougle.com",
        standard: "MAP-1",
      });
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/intelligence-graph", requireAuth, async (req, res) => {
    try {
      const graph = await intelligenceGraphService.buildIntelligenceGraph(req.user.id);
      res.json(graph);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/reputation/me", requireAuth, async (req, res) => {
    try {
      const result = await reputationService.getUserReputation(req.user.id);
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/capabilities/me", requireAuth, async (req, res) => {
    try {
      const result = await capabilityService.getUserCapabilities(req.user.id);
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/journey/me", requireAuth, async (req, res) => {
    try {
      const result = await journeyService.getUserJourney(req.user.id);
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/marketplace/listings", async (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      const listings = await storage.getMarketplaceListings(category);
      const enriched = await Promise.all(listings.map(async (l) => {
        const agent = await storage.getUserAgent(l.agentId);
        const seller = await storage.getUser(l.sellerId);
        return { ...l, agent, sellerName: seller?.displayName };
      }));
      res.json(enriched);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/marketplace/listings/:id", async (req, res) => {
    try {
      const listing = await storage.getMarketplaceListing(req.params.id);
      if (!listing) return res.status(404).json({ error: "Listing not found" });
      const agent = await storage.getUserAgent(listing.agentId);
      const seller = await storage.getUser(listing.sellerId);
      res.json({ ...listing, agent, sellerName: seller?.displayName });
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/marketplace/listings", requireAuth, async (req, res) => {
    try {
      const { agentId, title, description, pricingModel, priceCredits, monthlyCredits, category } = req.body;
      const sellerId = req.user.id;
      if (!agentId || !title) return res.status(400).json({ error: "agentId and title required" });
      const agent = await storage.getUserAgent(agentId);
      if (!agent || agent.ownerId !== sellerId) return res.status(403).json({ error: "Not authorized" });
      await storage.updateUserAgent(agentId, {
        deploymentModes: [...new Set([...(agent.deploymentModes || []), "marketplace"])],
        visibility: "public",
        status: "active",
      });
      const listing = await storage.createMarketplaceListing({
        agentId, sellerId, title, description,
        pricingModel: pricingModel || "one_time",
        priceCredits: priceCredits || 100,
        monthlyCredits, category,
        revenueSplit: 0.7, featured: false, status: "active",
      });
      res.json(listing);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/marketplace/purchase", requireAuth, async (req, res) => {
    try {
      const { listingId } = req.body;
      const buyerId = req.user.id;
      if (!listingId) return res.status(400).json({ error: "listingId required" });
      const listing = await storage.getMarketplaceListing(listingId);
      if (!listing) return res.status(404).json({ error: "Listing not found" });
      const already = await storage.hasUserPurchasedAgent(buyerId, listing.agentId);
      if (already) return res.status(400).json({ error: "Already purchased" });
      const sellerEarnings = Math.floor(listing.priceCredits * listing.revenueSplit);
      const platformFee = listing.priceCredits - sellerEarnings;
      const purchase = await db.transaction(async (tx) => {
        const [buyerUpdated] = await tx.update(users_table)
          .set({ creditWallet: sql`COALESCE(${users_table.creditWallet}, 0) - ${listing.priceCredits}` })
          .where(and(eq(users_table.id, buyerId), gte(users_table.creditWallet, listing.priceCredits)))
          .returning({ id: users_table.id });
        if (!buyerUpdated) throw new Error("Insufficient credits");
        await tx.update(users_table).set({ creditWallet: sql`COALESCE(${users_table.creditWallet}, 0) + ${sellerEarnings}` }).where(eq(users_table.id, listing.sellerId));
        await tx.insert(transactions_table).values({
          senderId: buyerId, receiverId: listing.sellerId,
          amount: sellerEarnings, transactionType: "agent_purchase",
          referenceId: listingId, description: `Agent purchase: ${listing.title}`,
        });
        await tx.insert(creditUsageLog).values({
          userId: buyerId,
          creditsUsed: listing.priceCredits,
          actionType: "agent_purchase",
          actionLabel: `Agent purchase: ${listing.title}`,
          referenceId: listingId,
        });
        const [purchaseRecord] = await tx.insert(agentPurchases_table).values({
          buyerId, listingId, agentId: listing.agentId, sellerId: listing.sellerId,
          creditsPaid: listing.priceCredits, sellerEarnings, platformFee,
          purchaseType: listing.pricingModel, status: "active",
        }).returning();
        await tx.update(marketplaceListings_table).set({
          totalSales: sql`COALESCE(${marketplaceListings_table.totalSales}, 0) + 1`,
          totalRevenue: sql`COALESCE(${marketplaceListings_table.totalRevenue}, 0) + ${listing.priceCredits}`,
        }).where(eq(marketplaceListings_table.id, listingId));
        await tx.update(userAgents_table).set({
          totalCreditsEarned: sql`COALESCE(${userAgents_table.totalCreditsEarned}, 0) + ${sellerEarnings}`,
        }).where(eq(userAgents_table.id, listing.agentId));
        return purchaseRecord;
      });
      res.json(purchase);
    } catch (err: any) {
      if (err.message?.includes("Insufficient credits")) {
        return res.status(402).json({ error: err.message });
      }
      handleServiceError(res, err);
    }
  });

  app.get("/api/marketplace/purchases/:userId", requireAuth, async (req, res) => {
    try {
      if (req.params.userId !== req.user.id) return res.status(403).json({ error: "Forbidden" });
      const purchases = await storage.getAgentPurchasesByBuyer(req.user.id);
      const enriched = await Promise.all(purchases.map(async (p) => {
        const agent = await storage.getUserAgent(p.agentId);
        return { ...p, agentName: agent?.name, agentAvatarUrl: agent?.avatarUrl };
      }));
      res.json(enriched);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/marketplace/earnings/:userId", requireAuth, async (req, res) => {
    try {
      if (req.params.userId !== req.user.id) return res.status(403).json({ error: "Forbidden" });
      const sales = await storage.getAgentPurchasesBySeller(req.user.id);
      const totalEarnings = sales.reduce((sum, s) => sum + s.sellerEarnings, 0);
      const totalSales = sales.length;
      res.json({ totalEarnings, totalSales, sales });
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/razorpay/onboard-creator", requireAuth, async (req, res) => {
    try {
      const { businessName, email, contactName, phone } = req.body;
      const userId = req.user.id;
      if (!businessName || !email || !contactName) {
        return res.status(400).json({ error: "userId, businessName, email, and contactName are required" });
      }
      const result = await razorpayMarketplaceService.onboardCreator(userId, { businessName, email, contactName, phone });
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/razorpay/creator-account/:userId", requireAuth, async (req, res) => {
    try {
      if (req.params.userId !== req.user.id) return res.status(403).json({ error: "Forbidden" });
      const account = await razorpayMarketplaceService.getCreatorAccount(req.user.id);
      res.json({ account });
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/razorpay/create-order", requireAuth, async (req, res) => {
    try {
      const { listingId } = req.body;
      const buyerId = req.user.id;
      if (!listingId) {
        return res.status(400).json({ error: "buyerId and listingId are required" });
      }
      const result = await razorpayMarketplaceService.createOrder(buyerId, listingId);
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/razorpay/verify-payment", async (req, res) => {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ error: "Payment verification data required" });
      }
      const result = await razorpayMarketplaceService.verifyPayment({ razorpay_order_id, razorpay_payment_id, razorpay_signature });
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/razorpay/webhook", async (req, res) => {
    try {
      const event = req.body;
      if (event?.event === "payment.captured" && event?.payload?.payment?.entity) {
        const payment = event.payload.payment.entity;
        if (payment.order_id) {
          await razorpayMarketplaceService.verifyPayment({
            razorpay_order_id: payment.order_id,
            razorpay_payment_id: payment.id,
            razorpay_signature: "webhook",
          });
        }
      }
      res.json({ status: "ok" });
    } catch (err) {
      console.error("[Razorpay Webhook] Error:", err);
      res.json({ status: "ok" });
    }
  });

  app.get("/api/razorpay/creator-earnings/:userId", requireAuth, async (req, res) => {
    try {
      if (req.params.userId !== req.user.id) return res.status(403).json({ error: "Forbidden" });
      const result = await razorpayMarketplaceService.getCreatorEarnings(req.user.id);
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/razorpay/creator-orders/:userId", requireAuth, async (req, res) => {
    try {
      if (req.params.userId !== req.user.id) return res.status(403).json({ error: "Forbidden" });
      const orders = await razorpayMarketplaceService.getCreatorOrders(req.user.id);
      res.json(orders);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/publisher/profile/:userId", async (req, res) => {
    try {
      const profile = await publisherResponsibilityService.getProfile(req.params.userId);
      res.json({ profile });
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/publisher/profile", async (req, res) => {
    try {
      const { userId, publisherName, companyName, businessType, address, city, state, country, postalCode, supportEmail, supportPhone, websiteUrl } = req.body;
      if (!userId || !publisherName || !supportEmail || !address || !businessType) {
        return res.status(400).json({ error: "userId, publisherName, supportEmail, address, and businessType are required" });
      }
      const profile = await publisherResponsibilityService.createOrUpdateProfile(userId, {
        publisherName, companyName, businessType, address, city, state, country, postalCode, supportEmail, supportPhone, websiteUrl,
      });
      res.json({ profile });
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/publisher/accept-agreement", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ error: "userId required" });
      const ip = req.headers["x-forwarded-for"]?.toString() || req.socket?.remoteAddress || "unknown";
      const profile = await publisherResponsibilityService.acceptAgreement(userId, ip);
      res.json({ profile });
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/publisher/can-publish/:userId", async (req, res) => {
    try {
      const result = await publisherResponsibilityService.canPublish(req.params.userId);
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/publisher/agreement", async (_req, res) => {
    try {
      res.json(publisherResponsibilityService.getAgreementText());
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/publisher/app-info/:appId", async (req, res) => {
    try {
      const info = await publisherResponsibilityService.getPublisherInfoForApp(req.params.appId);
      if (!info) return res.status(404).json({ error: "App not found" });
      res.json(info);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/publisher/disclaimer", async (_req, res) => {
    try {
      res.json({ disclaimer: publisherResponsibilityService.getPlatformDisclaimer() });
    } catch (err) { handleServiceError(res, err); }
  });

  // Legal Safety Stack routes
  app.get("/api/legal-safety/risk-disclaimer/:appId", async (req, res) => {
    try {
      const disclaimer = await legalSafetyService.getAppDisclaimer(req.params.appId);
      if (!disclaimer) return res.status(404).json({ error: "App not found" });
      res.json(disclaimer);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/legal-safety/generate-disclaimer", requireAuth, async (req, res) => {
    try {
      const paid = await requirePaidAiAccess(req, res, "ai_response", "Legal safety disclaimer", "legal-safety-disclaimer");
      if (!paid) return;
      const { appId, industry, category } = req.body;
      if (!appId || !industry) return res.status(400).json({ error: "appId and industry required" });
      const disclaimer = await legalSafetyService.generateRiskDisclaimer(appId, industry, category);
      res.json(disclaimer);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/legal-safety/risk-categories", async (_req, res) => {
    try {
      res.json(legalSafetyService.getRiskCategories());
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/legal-safety/report", async (req, res) => {
    try {
      const { appId, reporterId, reason, category, description, evidence } = req.body;
      if (!appId || !reporterId || !reason || !category) {
        return res.status(400).json({ error: "appId, reporterId, reason, and category required" });
      }
      const report = await legalSafetyService.submitReport({ appId, reporterId, reason, category, description, evidence });
      res.json(report);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/legal-safety/reports/:appId", async (req, res) => {
    try {
      const reports = await legalSafetyService.getReportsForApp(req.params.appId);
      res.json(reports);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/legal-safety/report-categories", async (_req, res) => {
    try {
      res.json(legalSafetyService.getReportCategories());
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/moderation/reports", async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const reports = await legalSafetyService.getAllReports(status);
      res.json(reports);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/moderation/resolve", async (req, res) => {
    try {
      const { reportId, moderatorId, action, notes } = req.body;
      if (!reportId || !moderatorId || !action) return res.status(400).json({ error: "reportId, moderatorId, action required" });
      const report = await legalSafetyService.resolveReport(reportId, moderatorId, action, notes);
      res.json(report);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/moderation/dismiss", async (req, res) => {
    try {
      const { reportId, moderatorId, notes } = req.body;
      if (!reportId || !moderatorId) return res.status(400).json({ error: "reportId, moderatorId required" });
      const report = await legalSafetyService.dismissReport(reportId, moderatorId, notes);
      res.json(report);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/legal-safety/check-ai-content", async (req, res) => {
    try {
      const { content, appId, userId } = req.body;
      if (!content) return res.status(400).json({ error: "content required" });
      const result = legalSafetyService.checkAiContent(content, appId, userId);
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/legal-safety/ai-violations", async (req, res) => {
    try {
      const appId = req.query.appId as string | undefined;
      const violations = await legalSafetyService.getAiViolations(appId);
      res.json(violations);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/legal-safety/ai-policy-rules", async (_req, res) => {
    try {
      res.json(legalSafetyService.getAiPolicyRules());
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/legal-safety/creation-limit/:userId", async (req, res) => {
    try {
      const tier = (req.query.tier as string) || "free";
      const result = await legalSafetyService.checkCreationLimit(req.params.userId, tier);
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/legal-safety/increment-creation", async (req, res) => {
    try {
      const { userId, type } = req.body;
      if (!userId) return res.status(400).json({ error: "userId required" });
      await legalSafetyService.incrementCreationCount(userId, type || "app");
      const result = await legalSafetyService.checkCreationLimit(userId);
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/legal-safety/publish-checks/:userId/:appId", async (req, res) => {
    try {
      const result = await legalSafetyService.canPublishApp(req.params.userId, req.params.appId);
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/legal-safety/stats", async (_req, res) => {
    try {
      const stats = await legalSafetyService.getModerationStats();
      res.json(stats);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/legal-safety/daily-limits", async (_req, res) => {
    try {
      res.json(legalSafetyService.getDailyLimits());
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/creator-verification/status/:userId", async (req, res) => {
    try {
      const status = await creatorVerificationService.getVerificationStatus(req.params.userId);
      res.json(status);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/creator-verification/trust-levels", async (_req, res) => {
    try {
      res.json(creatorVerificationService.getTrustLevels());
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/creator-verification/marketing-methods", async (_req, res) => {
    try {
      res.json(creatorVerificationService.getMarketingMethods());
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/creator-verification/promotion-channels", async (_req, res) => {
    try {
      res.json(creatorVerificationService.getPromotionChannels());
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/creator-verification/promotion-agreement", async (_req, res) => {
    try {
      res.json(creatorVerificationService.getPromotionAgreement());
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/creator-verification/privacy-notice", async (_req, res) => {
    try {
      res.json({ notice: creatorVerificationService.getPrivacyNotice() });
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/creator-verification/declaration/:userId", async (req, res) => {
    try {
      const declaration = await creatorVerificationService.getDeclaration(req.params.userId);
      res.json({ declaration });
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/creator-verification/declaration", async (req, res) => {
    try {
      const { userId, marketingMethods, targetAudience, promotionChannels, additionalNotes } = req.body;
      if (!userId || !marketingMethods || marketingMethods.length === 0) {
        return res.status(400).json({ error: "userId and at least one marketing method required" });
      }
      const ip = req.headers["x-forwarded-for"]?.toString() || req.socket?.remoteAddress || "unknown";
      const declaration = await creatorVerificationService.submitPromotionDeclaration(userId, {
        marketingMethods, targetAudience, promotionChannels, additionalNotes, ipAddress: ip,
      });
      res.json({ declaration });
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/creator-verification/upgrade", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ error: "userId required" });
      const result = await creatorVerificationService.upgradeTrustLevel(userId);
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  // Trust Ladder routes
  app.get("/api/trust-ladder/levels", async (_req, res) => {
    try {
      res.json(trustLadderService.getLevels());
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/trust-ladder/status/:userId", async (req, res) => {
    try {
      const status = await trustLadderService.getStatus(req.params.userId);
      res.json(status);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/trust-ladder/capabilities/:userId", async (req, res) => {
    try {
      const caps = await trustLadderService.getCapabilities(req.params.userId);
      res.json(caps);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/trust-ladder/recompute", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ error: "userId required" });
      const result = await trustLadderService.recompute(userId);
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/trust-ladder/check-access", async (req, res) => {
    try {
      const { userId, capability } = req.body;
      if (!userId || !capability) return res.status(400).json({ error: "userId and capability required" });
      const result = await trustLadderService.checkAccess(userId, capability);
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  // Healthy Engagement routes
  app.get("/api/healthy-engagement/dashboard/:userId", async (req, res) => {
    try {
      const dashboard = await healthyEngagementService.getFullDashboard(req.params.userId);
      res.json(dashboard);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/healthy-engagement/actions/:userId", async (req, res) => {
    try {
      const actions = await healthyEngagementService.getRecommendedActions(req.params.userId);
      res.json(actions);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/healthy-engagement/progress/:userId", async (req, res) => {
    try {
      const metrics = await healthyEngagementService.getProgressMetrics(req.params.userId);
      res.json(metrics);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/healthy-engagement/impact/:userId", async (req, res) => {
    try {
      const impact = await healthyEngagementService.getContributionImpact(req.params.userId);
      res.json(impact);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/healthy-engagement/labs-highlights", async (_req, res) => {
    try {
      const highlights = await healthyEngagementService.getLabsHighlights();
      res.json(highlights);
    } catch (err) { handleServiceError(res, err); }
  });

  const analyzeAppSchema = z.object({
    appPrompt: z.string().min(1),
    appName: z.string().optional(),
    appId: z.string().optional(),
    estimatedUsers: z.number().int().min(1).max(100000).optional(),
    targetMargin: z.number().min(0.1).max(0.95).optional(),
    pricingModel: z.enum(["subscription", "one_time", "usage"]).optional(),
    devHours: z.number().int().min(1).max(10000).optional(),
    vatRate: z.number().min(0).max(1).optional(),
    amortizationMonths: z.number().int().min(1).max(60).optional(),
  });

  app.post("/api/pricing-engine/analyze", resolveUser, async (req: any, res) => {
    try {
      const parsed = analyzeAppSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });
      const result = await pricingEngineService.analyzeApp({ ...parsed.data, creatorId: req.user.id });
      founderDebugService.trackJourneyEvent({
        userId: req.user.id,
        event: "pricing_analyze",
        timestamp: Date.now(),
        traceId: req.traceId,
        metadata: { appName: parsed.data.appName, pricingModel: parsed.data.pricingModel },
      });
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/pricing-engine/analysis/:id", async (req, res) => {
    try {
      const analysis = await pricingEngineService.getAnalysis(req.params.id);
      if (!analysis) return res.status(404).json({ error: "Analysis not found" });
      res.json(analysis);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/pricing-engine/creator/:creatorId", async (req, res) => {
    try {
      const analyses = await pricingEngineService.getAnalysesByCreator(req.params.creatorId);
      res.json(analyses);
    } catch (err) { handleServiceError(res, err); }
  });

  const validatePriceSchema = z.object({
    analysisId: z.string().min(1),
    creatorSetPrice: z.number().int().min(1),
  });

  app.post("/api/pricing-engine/validate-price", async (req, res) => {
    try {
      const parsed = validatePriceSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });
      const result = await pricingEngineService.validatePrice(parsed.data);
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  const previewSchema = z.object({
    appPrompt: z.string().min(1),
    estimatedUsers: z.number().int().min(1).max(100000).optional(),
    targetMargin: z.number().min(0.1).max(0.95).optional(),
    devHours: z.number().int().min(1).max(10000).optional(),
    vatRate: z.number().min(0).max(1).optional(),
    amortizationMonths: z.number().int().min(1).max(60).optional(),
  });

  app.post("/api/pricing-engine/preview", async (req, res) => {
    try {
      const parsed = previewSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });
      const result = pricingEngineService.analyzePromptOnly(
        parsed.data.appPrompt,
        parsed.data.estimatedUsers,
        parsed.data.targetMargin,
        parsed.data.devHours,
        parsed.data.vatRate,
        parsed.data.amortizationMonths
      );
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  const marketingEvalSchema = z.object({
    channels: z.array(z.object({
      platform: z.string().min(1),
      followers: z.number().int().min(0),
      engagementRate: z.number().min(0).max(1).optional(),
    })),
    monthlyAdBudget: z.number().min(0).default(0),
    adTypes: z.array(z.string()).default([]),
    estimatedUsers: z.number().int().min(1).default(100),
    recommendedPrice: z.number().min(0).default(5),
  });

  app.post("/api/pricing-engine/evaluate-marketing", async (req, res) => {
    try {
      const parsed = marketingEvalSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });
      const result = pricingEngineService.evaluateMarketing(
        { channels: parsed.data.channels, monthlyAdBudget: parsed.data.monthlyAdBudget, adTypes: parsed.data.adTypes },
        parsed.data.estimatedUsers,
        parsed.data.recommendedPrice
      );
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  const EXTERNAL_DISTRIBUTION_DISCLAIMER = `EXTERNAL DISTRIBUTION RESPONSIBILITY ACKNOWLEDGMENT

By exporting this application from Mougle, I ("Creator") acknowledge and agree:

1. INFRASTRUCTURE PROVIDER ONLY: Mougle acts solely as an infrastructure and development platform. Mougle has no responsibility for the distribution, marketing, or operation of exported applications outside the platform.

2. CREATOR RESPONSIBILITY: I am solely responsible for:
   - Publishing and distributing the exported app on any external platform (Google Play, Apple App Store, web hosting, etc.)
   - Compliance with all applicable store policies, guidelines, and fee structures
   - Paying any store commissions, developer account fees, or distribution costs
   - Ensuring the app meets all legal, regulatory, and content requirements of the target platform
   - Providing end-user support and handling user data in compliance with applicable privacy laws

3. NO LIABILITY: Mougle shall not be liable for any issues arising from external distribution, including but not limited to: app rejection, store policy violations, user complaints, data breaches, or revenue disputes.

4. INDEMNIFICATION: I agree to indemnify and hold Mougle harmless from any claims, damages, or losses arising from my distribution and operation of the exported application.

5. NO GUARANTEES: Mougle makes no guarantees about the exported app's compatibility, performance, or acceptance on any external platform.`;

  const exportConfirmSchema = z.object({
    appName: z.string().min(1),
    analysisId: z.string().optional(),
    distributionAcknowledged: z.literal(true, { errorMap: () => ({ message: "You must acknowledge the external distribution responsibility" }) }),
    legalDisclaimerAccepted: z.literal(true, { errorMap: () => ({ message: "You must accept the legal disclaimer" }) }),
  });

  app.get("/api/app-export/disclaimer", async (_req, res) => {
    res.json({ disclaimer: EXTERNAL_DISTRIBUTION_DISCLAIMER });
  });

  app.post("/api/app-export/confirm", requireSystemMode("publishing"), resolveUser, async (req: any, res) => {
    try {
      const parsed = exportConfirmSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });

      const [exported] = await db.insert(appExports_table).values({
        creatorId: req.user.id,
        appName: parsed.data.appName,
        analysisId: parsed.data.analysisId || null,
        exportType: "web_package",
        distributionAcknowledged: true,
        legalDisclaimerAccepted: true,
        acknowledgmentText: EXTERNAL_DISTRIBUTION_DISCLAIMER,
        status: "confirmed",
      }).returning();

      res.json({
        exportId: exported.id,
        status: "confirmed",
        message: "Distribution responsibility acknowledged. You may now generate your export package.",
      });
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/app-export/generate", async (req, res) => {
    try {
      const { exportId } = z.object({ exportId: z.string().min(1) }).parse(req.body);

      const [record] = await db.select().from(appExports_table).where(eq(appExports_table.id, exportId));
      if (!record) return res.status(404).json({ error: "Export record not found" });
      if (!record.distributionAcknowledged || !record.legalDisclaimerAccepted) {
        return res.status(403).json({ error: "Creator must acknowledge distribution responsibility before exporting" });
      }

      await db.update(appExports_table)
        .set({ status: "exported", exportedAt: new Date() })
        .where(eq(appExports_table.id, exportId));

      res.json({
        exportId: record.id,
        appName: record.appName,
        status: "exported",
        package: {
          type: "web_package",
          includes: ["source_code", "build_config", "deployment_guide", "environment_template"],
          deploymentOptions: [
            { platform: "Vercel", guide: "Deploy via Vercel CLI or Git integration" },
            { platform: "Netlify", guide: "Deploy via Netlify CLI or drag-and-drop" },
            { platform: "AWS", guide: "Deploy using S3 + CloudFront or Elastic Beanstalk" },
            { platform: "Self-hosted", guide: "Use Docker or PM2 on any Linux server" },
          ],
          note: "External store fees (Google Play, Apple App Store) are your responsibility. Mougle does not calculate or include third-party distribution costs.",
        },
        legalNotice: "By downloading this package, you confirm that external distribution is entirely your responsibility. Mougle acts as infrastructure provider only.",
      });
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/app-export/history/:creatorId", async (req, res) => {
    try {
      const exports = await db.select().from(appExports_table)
        .where(eq(appExports_table.creatorId, req.params.creatorId))
        .orderBy(desc(appExports_table.createdAt));
      res.json(exports);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/ai-cfo/founder-dashboard", async (_req, res) => {
    try {
      const dashboard = await aiCfoService.getFounderDashboard();
      res.json(dashboard);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/ai-cfo/creator-dashboard/:creatorId", async (req, res) => {
    try {
      const dashboard = await aiCfoService.getCreatorDashboard(req.params.creatorId);
      res.json(dashboard);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/ai-cfo/recommendations", async (_req, res) => {
    try {
      const recommendations = await aiCfoService.generateRecommendations();
      res.json(recommendations);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/ai-cfo/forecasts", async (_req, res) => {
    try {
      const forecasts = await aiCfoService.generateForecasts();
      res.json(forecasts);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/ai-cfo/alerts", async (_req, res) => {
    try {
      const alerts = await aiCfoService.generateAlerts();
      res.json(alerts);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/user-agents/:id/use", requireAuth, async (req, res) => {
    try {
      const { actionType, creditsSpent } = req.body;
      if (!actionType) return res.status(400).json({ error: "actionType required" });
      const agent = await storage.getUserAgent(req.params.id);
      if (!agent) return res.status(404).json({ error: "Agent not found" });
      if (agent.type === "personal" && agent.ownerId !== req.user.id) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const userId = req.user.id;
      const log = await storage.createAgentUsageLog({
        agentId: req.params.id, userId, actionType, creditsSpent: creditsSpent || 0,
      });
      await storage.updateUserAgent(req.params.id, {
        totalUsageCount: (agent.totalUsageCount || 0) + 1,
      });
      res.json(log);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/user-agents/:id/usage", requireAuth, async (req, res) => {
    try {
      const agent = await storage.getUserAgent(req.params.id);
      if (!agent) return res.status(404).json({ error: "Agent not found" });
      if (agent.ownerId !== req.user.id) return res.status(403).json({ error: "Forbidden" });
      const limit = parseInt(req.query.limit as string) || 50;
      res.json(await storage.getAgentUsageLogs(req.params.id, limit));
    } catch (err) { handleServiceError(res, err); }
  });

  // ---- AGENT APP STORE ROUTES ----

  const { agentRunnerService } = await import("./services/agent-runner-service");

  app.get("/api/store/rankings", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const listings = await storage.getStoreRankings(limit);
      const enriched = await Promise.all(listings.map(async (l) => {
        const agent = await storage.getUserAgent(l.agentId);
        const seller = await storage.getUser(l.sellerId);
        return { ...l, agent, sellerName: seller?.displayName, qualityScore: agent ? agentRunnerService.computeQualityScore(l) : 0 };
      }));
      enriched.sort((a, b) => {
        const trustA = a.agent?.trustScore || 0;
        const trustB = b.agent?.trustScore || 0;
        const qualA = a.qualityScore || 0;
        const qualB = b.qualityScore || 0;
        return (trustB * 0.4 + qualB * 0.6) - (trustA * 0.4 + qualA * 0.6);
      });
      res.json(enriched);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/store/featured", async (req, res) => {
    try {
      const listings = await storage.getFeaturedListings();
      const enriched = await Promise.all(listings.map(async (l) => {
        const agent = await storage.getUserAgent(l.agentId);
        const seller = await storage.getUser(l.sellerId);
        return { ...l, agent, sellerName: seller?.displayName };
      }));
      res.json(enriched);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/store/trending", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const listings = await storage.getTrendingListings(limit);
      const enriched = await Promise.all(listings.map(async (l) => {
        const agent = await storage.getUserAgent(l.agentId);
        const seller = await storage.getUser(l.sellerId);
        return { ...l, agent, sellerName: seller?.displayName };
      }));
      res.json(enriched);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/store/search", async (req, res) => {
    try {
      const query = (req.query.q as string) || "";
      const category = req.query.category as string | undefined;
      if (!query) return res.json([]);
      const listings = await storage.searchListings(query, category);
      const enriched = await Promise.all(listings.map(async (l) => {
        const agent = await storage.getUserAgent(l.agentId);
        const seller = await storage.getUser(l.sellerId);
        return { ...l, agent, sellerName: seller?.displayName };
      }));
      res.json(enriched);
    } catch (err) { handleServiceError(res, err); }
  });

  // ---- AGENT REVIEWS ----

  app.get("/api/store/reviews/:listingId", async (req, res) => {
    try {
      const reviews = await storage.getReviewsByListing(req.params.listingId);
      const enriched = await Promise.all(reviews.map(async (r) => {
        const reviewer = await storage.getUser(r.reviewerId);
        return { ...r, reviewerName: reviewer?.displayName, reviewerAvatar: reviewer?.avatar };
      }));
      res.json(enriched);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/store/reviews", async (req, res) => {
    try {
      const { agentId, listingId, reviewerId, rating, title, content } = req.body;
      if (!agentId || !listingId || !reviewerId || !rating) {
        return res.status(400).json({ error: "agentId, listingId, reviewerId, and rating required" });
      }
      if (rating < 1 || rating > 5) return res.status(400).json({ error: "Rating must be 1-5" });
      const hasPurchased = await storage.hasUserPurchasedAgent(reviewerId, agentId);
      if (!hasPurchased) return res.status(403).json({ error: "Must purchase agent before reviewing" });

      const review = await db.transaction(async (tx) => {
        const [created] = await tx.insert(agentReviews_table).values({ agentId, listingId, reviewerId, rating, title, content }).returning();

        const allReviews = await tx.select().from(agentReviews_table).where(eq(agentReviews_table.listingId, listingId));
        const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
        const reviewCount = allReviews.length;

        await tx.update(marketplaceListings_table)
          .set({ averageRating: avgRating, reviewCount })
          .where(eq(marketplaceListings_table.id, listingId));

        const [agent] = await tx.select().from(userAgents_table).where(eq(userAgents_table.id, agentId));
        if (agent) {
          const trustScore = agentRunnerService.computeTrustScore({ ...agent, rating: avgRating, ratingCount: reviewCount });
          await tx.update(userAgents_table)
            .set({ rating: avgRating, ratingCount: reviewCount, trustScore })
            .where(eq(userAgents_table.id, agentId));
        }

        return created;
      });

      const trustEventType = rating >= 4 ? "positive_rating" : rating <= 2 ? "negative_rating" : "neutral_rating";
      agentTrustEngine.recordEvent(agentId, trustEventType, listingId, reviewerId).catch(() => {});

      res.json(review);
    } catch (err) { handleServiceError(res, err); }
  });

  // ---- AGENT VERSIONS ----

  app.get("/api/user-agents/:id/versions", async (req, res) => {
    try {
      res.json(await storage.getAgentVersions(req.params.id));
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/user-agents/:id/versions", async (req, res) => {
    try {
      const agent = await storage.getUserAgent(req.params.id);
      if (!agent) return res.status(404).json({ error: "Agent not found" });
      const { version, changelog, publisherId } = req.body;
      if (!version || !publisherId) return res.status(400).json({ error: "version and publisherId required" });
      if (agent.ownerId !== publisherId) return res.status(403).json({ error: "Not authorized" });
      const agentVersion = await storage.createAgentVersion({
        agentId: req.params.id,
        version,
        changelog,
        systemPrompt: agent.systemPrompt,
        model: agent.model,
        temperature: agent.temperature,
        skills: agent.skills,
        publishedBy: publisherId,
      });
      await storage.updateUserAgent(req.params.id, { version, changelog });
      res.json(agentVersion);
    } catch (err) { handleServiceError(res, err); }
  });

  // ---- AGENT RUNNER (Cost-Controlled AI Execution) ----

  app.post("/api/agent-runner/run", requireAuth, async (req, res) => {
    try {
      const { agentId, message } = req.body;
      const callerId = req.session.userId;
      if (!agentId || !message || !callerId) return res.status(400).json({ error: "agentId and message required" });
      const result = await agentRunnerService.runAgent(agentId, message, callerId);
      res.json(result);
    } catch (err: any) {
      if (err.message?.includes("Insufficient credits") || err.message?.includes("paused")) {
        return res.status(402).json({ error: err.message });
      }
      handleServiceError(res, err);
    }
  });

  app.post("/api/agent-runner/demo", requireAuth, async (req, res) => {
    try {
      const { agentId, message } = req.body;
      if (!agentId || !message) return res.status(400).json({ error: "agentId and message required" });
      const paid = await requirePaidAiAccess(req, res, "ai_response", "Agent demo", `agent-demo:${agentId}`);
      if (!paid) return;
      const result = await agentRunnerService.runDemoInteraction(agentId, message);
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/agent-runner/estimate", async (req, res) => {
    try {
      const model = (req.query.model as string) || "gpt-5.2";
      const actionType = (req.query.action as string) || "chat";
      res.json({ credits: agentRunnerService.estimateCost(model, actionType), model, actionType });
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/agent-runner/estimate-training", async (req, res) => {
    try {
      const { sourceCount, totalChars } = req.body;
      res.json(agentRunnerService.estimateTrainingCost(sourceCount || 1, totalChars || 1000));
    } catch (err) { handleServiceError(res, err); }
  });

  // ---- COST CONTROL & CREATOR ANALYTICS ----

  app.get("/api/agent-costs/:ownerId", requireAuth, async (req, res) => {
    try {
      if (req.params.ownerId !== req.user.id) return res.status(403).json({ error: "Forbidden" });
      const limit = parseInt(req.query.limit as string) || 50;
      const logs = await storage.getAgentCostLogs(req.params.ownerId, limit);
      const totalSpent = logs.reduce((sum, l) => sum + l.creditsCharged, 0);
      const byModel: Record<string, number> = {};
      const byAction: Record<string, number> = {};
      logs.forEach(l => {
        byModel[l.model || "unknown"] = (byModel[l.model || "unknown"] || 0) + l.creditsCharged;
        byAction[l.actionType] = (byAction[l.actionType] || 0) + l.creditsCharged;
      });
      res.json({ totalSpent, byModel, byAction, logs });
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/creator-analytics/:userId", requireAuth, async (req, res) => {
    try {
      const userId = req.params.userId;
      if (userId !== req.user.id) return res.status(403).json({ error: "Forbidden" });
      const agents = await storage.getUserAgentsByOwner(userId);
      const sales = await storage.getAgentPurchasesBySeller(userId);
      const costLogs = await storage.getAgentCostLogs(userId, 200);

      const totalAgents = agents.length;
      const activeAgents = agents.filter(a => a.status === "active").length;
      const pausedAgents = agents.filter(a => a.status === "paused").length;
      const totalUsage = agents.reduce((sum, a) => sum + a.totalUsageCount, 0);
      const totalEarnings = sales.reduce((sum, s) => sum + s.sellerEarnings, 0);
      const totalCosts = costLogs.reduce((sum, l) => sum + l.creditsCharged, 0);
      const netRevenue = totalEarnings - totalCosts;
      const avgRating = agents.length > 0
        ? agents.reduce((sum, a) => sum + a.rating, 0) / agents.filter(a => a.ratingCount > 0).length || 0
        : 0;
      const totalReviews = agents.reduce((sum, a) => sum + a.ratingCount, 0);
      const totalSales = sales.length;

      const agentStats = agents.map(a => ({
        id: a.id,
        name: a.name,
        status: a.status,
        usage: a.totalUsageCount,
        earned: a.totalCreditsEarned,
        rating: a.rating,
        reviews: a.ratingCount,
        trustScore: a.trustScore,
        version: a.version,
      }));

      const recentSales = sales.slice(0, 20).map(s => ({
        id: s.id,
        creditsPaid: s.creditsPaid,
        sellerEarnings: s.sellerEarnings,
        platformFee: s.platformFee,
        createdAt: s.createdAt,
      }));

      res.json({
        totalAgents, activeAgents, pausedAgents,
        totalUsage, totalEarnings, totalCosts, netRevenue,
        avgRating, totalReviews, totalSales,
        agentStats, recentSales,
      });
    } catch (err) { handleServiceError(res, err); }
  });

  // ---- TRAINING WITH COST CONTROL ----

  app.post("/api/agent-runner/train", requireAuth, async (req, res) => {
    try {
      const { agentId, sources } = req.body;
      const ownerId = req.session.userId;
      if (!agentId || !ownerId || !sources?.length) {
        return res.status(400).json({ error: "agentId and sources required" });
      }
      const result = await agentRunnerService.trainAgent(agentId, ownerId, sources);
      res.json(result);
    } catch (err: any) {
      if (err.message?.includes("Insufficient credits") || err.message?.includes("Pro subscription")) {
        return res.status(402).json({ error: err.message });
      }
      handleServiceError(res, err);
    }
  });

  // ---- WALLET STATUS & AUTO-PAUSE ----

  app.get("/api/wallet-status/:userId", requireAuth, async (req, res) => {
    try {
      if (req.params.userId !== req.user.id) return res.status(403).json({ error: "Forbidden" });
      res.json(await agentRunnerService.getWalletStatus(req.user.id));
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/agent-runner/resume", requireAuth, async (req, res) => {
    try {
      const ownerId = req.session.userId;
      if (!ownerId) return res.status(400).json({ error: "ownerId required" });
      const result = await agentRunnerService.resumeAgents(ownerId);
      res.json(result);
    } catch (err: any) {
      if (err.message?.includes("zero credits")) {
        return res.status(402).json({ error: err.message });
      }
      handleServiceError(res, err);
    }
  });

  // ---- BYOAI (Bring Your Own AI) ----

  app.post("/api/byoai/set", async (req, res) => {
    try {
      const { userId, provider, apiKey } = req.body;
      if (!userId || !provider || !apiKey) return res.status(400).json({ error: "userId, provider, and apiKey required" });
      const result = await agentRunnerService.setByoaiKey(userId, provider, apiKey);
      res.json(result);
    } catch (err: any) {
      if (err.message?.includes("validation failed")) {
        return res.status(400).json({ error: err.message });
      }
      handleServiceError(res, err);
    }
  });

  app.post("/api/byoai/remove", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ error: "userId required" });
      res.json(await agentRunnerService.removeByoaiKey(userId));
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/byoai/status/:userId", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.userId);
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json({
        enabled: !!(user.byoaiProvider && user.byoaiApiKey),
        provider: user.byoaiProvider || null,
        hasKey: !!user.byoaiApiKey,
      });
    } catch (err) { handleServiceError(res, err); }
  });

  // ---- FOUNDER AI COST CONTROL ANALYTICS ----

  app.get("/api/admin/agent-cost-analytics", async (req, res) => {
    try {
      if (!verifyAdminToken(req)) return res.status(401).json({ error: "Unauthorized" });
      res.json(await agentRunnerService.getPlatformCostAnalytics());
    } catch (err) { handleServiceError(res, err); }
  });

  // ---- INDUSTRY SPECIALIZATION SYSTEM ----

  seedIndustryData().catch(console.error);

  app.get("/api/industries", async (_req, res) => {
    try {
      const rows = await db.select().from(industries).orderBy(industries.sortOrder);
      res.json(rows);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/industries/:slug/categories", async (req, res) => {
    try {
      const rows = await db.select().from(industryCategories).where(eq(industryCategories.industrySlug, req.params.slug)).orderBy(industryCategories.sortOrder);
      res.json(rows);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/industries/:slug/roles", async (req, res) => {
    try {
      const { category } = req.query;
      let query = db.select().from(agentRolesTable).where(eq(agentRolesTable.industrySlug, req.params.slug)).orderBy(agentRolesTable.sortOrder);
      const rows = await query;
      const filtered = category ? rows.filter(r => r.categorySlug === category) : rows;
      res.json(filtered);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/industries/:slug/knowledge-packs", async (req, res) => {
    try {
      const rows = await db.select().from(knowledgePacks).where(eq(knowledgePacks.industrySlug, req.params.slug));
      res.json(rows);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/industries/:slug/skill-tree", async (req, res) => {
    try {
      const rows = await db.select().from(agentSkillNodes).where(eq(agentSkillNodes.industrySlug, req.params.slug)).orderBy(agentSkillNodes.treeTier, agentSkillNodes.sortOrder);
      res.json(rows);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/knowledge-packs", async (_req, res) => {
    try {
      const rows = await db.select().from(knowledgePacks);
      res.json(rows);
    } catch (err) { handleServiceError(res, err); }
  });

  // ---- AGENT SKILL TREE & PROGRESSION ----

  app.get("/api/agents/:agentId/progression", async (req, res) => {
    try {
      const result = await agentProgressionService.getAgentProgression(req.params.agentId);
      if (!result) return res.status(404).json({ error: "Agent not found" });
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/agents/:agentId/unlock-skill", async (req, res) => {
    try {
      const { skillSlug } = req.body;
      if (!skillSlug) return res.status(400).json({ error: "skillSlug required" });
      const result = await agentProgressionService.unlockSkill(req.params.agentId, skillSlug);
      if (!result.success) return res.status(400).json({ error: result.error });
      res.json({ success: true, message: `Skill "${skillSlug}" unlocked!` });
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/agents/:agentId/award-xp", async (req, res) => {
    try {
      const { source, contentLength, metadata } = req.body;
      if (!source) return res.status(400).json({ error: "source required" });
      const result = await agentProgressionService.awardXp(req.params.agentId, source, metadata, contentLength);
      if (!result) return res.json({ awarded: false, reason: "Cooldown or quality check failed" });
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/agents/:agentId/certifications", async (req, res) => {
    try {
      const certs = await db.select().from(agentCertifications).where(eq(agentCertifications.agentId, req.params.agentId));
      res.json(certs);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/agents/:agentId/check-certifications", async (req, res) => {
    try {
      const granted = await agentProgressionService.checkAndGrantCertifications(req.params.agentId);
      res.json({ granted });
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/agents/:agentId/skill-effects", async (req, res) => {
    try {
      const effects = await agentProgressionService.getSkillEffects(req.params.agentId);
      res.json(effects);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/xp-sources", async (_req, res) => {
    res.json(agentProgressionService.XP_SOURCES);
  });

  // ---- AGENT SPECIALIZATION CRUD ----

  app.post("/api/agents/:agentId/specialization", async (req, res) => {
    try {
      const { industrySlug, categorySlug, roleSlug, knowledgePackIds, customSkills, behaviorProfile } = req.body;
      if (!industrySlug) return res.status(400).json({ error: "industrySlug required" });

      const ind = await db.select().from(industries).where(eq(industries.slug, industrySlug)).limit(1);
      const disclaimer = ind[0]?.regulated ? ind[0].disclaimer : null;

      let industrySystemPrompt = "";
      if (roleSlug) {
        const [role] = await db.select().from(agentRolesTable).where(eq(agentRolesTable.slug, roleSlug));
        if (role?.systemPromptTemplate) industrySystemPrompt = role.systemPromptTemplate;
      }

      const existing = await db.select().from(agentSpecializations).where(eq(agentSpecializations.agentId, req.params.agentId));
      if (existing.length > 0) {
        await db.update(agentSpecializations)
          .set({ industrySlug, categorySlug, roleSlug, knowledgePackIds, customSkills, behaviorProfile, complianceDisclaimer: disclaimer, industrySystemPrompt })
          .where(eq(agentSpecializations.agentId, req.params.agentId));
      } else {
        await db.insert(agentSpecializations).values({
          agentId: req.params.agentId, industrySlug, categorySlug, roleSlug,
          knowledgePackIds, customSkills, behaviorProfile,
          complianceDisclaimer: disclaimer, industrySystemPrompt,
        });
      }

      await db.update(userAgents_table)
        .set({ industrySlug, categorySlug, roleSlug, updatedAt: new Date() })
        .where(eq(userAgents_table.id, req.params.agentId));

      res.json({ success: true });
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/agents/:agentId/specialization", async (req, res) => {
    try {
      const [spec] = await db.select().from(agentSpecializations).where(eq(agentSpecializations.agentId, req.params.agentId));
      res.json(spec || null);
    } catch (err) { handleServiceError(res, err); }
  });

  // ---- AGENT TRUST GRAPH SYSTEM ----

  app.get("/api/agents/:agentId/trust", async (req, res) => {
    try {
      const breakdown = await agentTrustEngine.getTrustBreakdown(req.params.agentId);
      res.json(breakdown);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/agents/:agentId/trust/event", async (req, res) => {
    try {
      const { eventType, sourceId, sourceUserId, metadata } = req.body;
      if (!eventType) return res.status(400).json({ error: "eventType required" });
      const event = await agentTrustEngine.recordEvent(req.params.agentId, eventType, sourceId, sourceUserId, metadata);
      res.json(event || { recorded: false, reason: "Unknown event type" });
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/agents/:agentId/trust/recalculate", async (req, res) => {
    try {
      const scores = await agentTrustEngine.recalculateScores(req.params.agentId);
      res.json(scores);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/agents/:agentId/trust/history", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 30;
      const history = await db.select().from(agentTrustHistory)
        .where(eq(agentTrustHistory.agentId, req.params.agentId))
        .orderBy(desc(agentTrustHistory.snapshotAt))
        .limit(limit);
      res.json(history);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/trust/event-types", async (_req, res) => {
    res.json(agentTrustEngine.getEventTypes());
  });

  app.get("/api/trust/tiers", async (_req, res) => {
    res.json(agentTrustEngine.getTrustTiers());
  });

  // ---- ADMIN TRUST NETWORK ANALYTICS ----

  app.get("/api/admin/trust/network", async (req, res) => {
    try {
      if (!verifyAdminToken(req)) return res.status(401).json({ error: "Unauthorized" });
      const analytics = await agentTrustEngine.getNetworkAnalytics();
      res.json(analytics);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/trust/recalculate-all", async (req, res) => {
    try {
      if (!verifyAdminToken(req)) return res.status(401).json({ error: "Unauthorized" });
      const result = await agentTrustEngine.recalculateAll();
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/trust/unsuspend/:agentId", async (req, res) => {
    try {
      if (!verifyAdminToken(req)) return res.status(401).json({ error: "Unauthorized" });
      await agentTrustEngine.unsuspendAgent(req.params.agentId);
      res.json({ success: true });
    } catch (err) { handleServiceError(res, err); }
  });

  // ---- AI GATEWAY COST MONITOR (FOUNDER ONLY) ----

  app.get("/api/admin/ai-gateway/metrics", async (req, res) => {
    try {
      if (!verifyAdminToken(req)) return res.status(401).json({ error: "Unauthorized" });
      const metrics = aiGateway.getGatewayMetrics();
      const platformAnalytics = await agentRunnerService.getPlatformCostAnalytics();
      res.json({
        gateway: metrics,
        platform: platformAnalytics,
        safetyStatus: {
          zeroPlatformCost: true,
          allRequestsGated: true,
          rateLimitsActive: true,
          loopPreventionActive: true,
          debateGovernorActive: true,
          autoSummarizationActive: true,
          trainingLimitsActive: true,
          autoPauseActive: true,
        },
      });
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/ai-gateway/reset-metrics", async (req, res) => {
    try {
      if (!verifyAdminToken(req)) return res.status(401).json({ error: "Unauthorized" });
      aiGateway.resetMetrics();
      res.json({ message: "Metrics reset" });
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/ai-gateway/estimate", async (req, res) => {
    try {
      const model = (req.query.model as string) || "gpt-5.2";
      const actionType = (req.query.actionType as string) || "chat";
      res.json({ credits: aiGateway.estimateCost(model, actionType), model, actionType });
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/ai-gateway/limits", async (_req, res) => {
    try {
      res.json({
        rateLimits: aiGateway.RATE_LIMITS,
        loopLimits: aiGateway.LOOP_LIMITS,
        debateLimits: aiGateway.DEBATE_LIMITS,
        trainingLimits: aiGateway.TRAINING_LIMITS,
        costPerModel: aiGateway.COST_PER_MODEL,
        actionCosts: aiGateway.ACTION_COSTS,
      });
    } catch (err) { handleServiceError(res, err); }
  });

  // ---- CIVILIZATION STABILITY LAYER ----

  app.get("/api/admin/civilization/stability", async (req, res) => {
    try {
      if (!verifyAdminToken(req)) return res.status(401).json({ error: "Unauthorized" });
      const dashboard = await civilizationStabilityService.getStabilityDashboard();
      res.json(dashboard);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/civilization/stability/recompute", async (req, res) => {
    try {
      if (!verifyAdminToken(req)) return res.status(401).json({ error: "Unauthorized" });
      const result = await civilizationStabilityService.runFullStabilityCheck();
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/civilization/policies", async (req, res) => {
    try {
      if (!verifyAdminToken(req)) return res.status(401).json({ error: "Unauthorized" });
      const rules = await storage.getPolicyRules();
      res.json(rules);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/civilization/policies", async (req, res) => {
    try {
      if (!verifyAdminToken(req)) return res.status(401).json({ error: "Unauthorized" });
      const { name, description, scope, conditionJson, actionJson, severity } = req.body;
      if (!name || !conditionJson || !actionJson) return res.status(400).json({ error: "Missing required fields" });
      const rule = await storage.createPolicyRule({ name, description, scope: scope || "agent", conditionJson, actionJson, severity: severity || 1 });
      res.json(rule);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/civilization/policies/:id/toggle", async (req, res) => {
    try {
      if (!verifyAdminToken(req)) return res.status(401).json({ error: "Unauthorized" });
      const rules = await storage.getPolicyRules();
      const rule = rules.find(r => r.id === req.params.id);
      if (!rule) return res.status(404).json({ error: "Rule not found" });
      const updated = await storage.updatePolicyRule(rule.id, { isActive: !rule.isActive });
      res.json(updated);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/civilization/violations", async (req, res) => {
    try {
      if (!verifyAdminToken(req)) return res.status(401).json({ error: "Unauthorized" });
      const violations = await storage.getPolicyViolations(100);
      res.json(violations);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/civilization/health/history", async (req, res) => {
    try {
      if (!verifyAdminToken(req)) return res.status(401).json({ error: "Unauthorized" });
      const history = await storage.getHealthSnapshots(50);
      res.json(history);
    } catch (err) { handleServiceError(res, err); }
  });

  // ---- AUTONOMOUS PLATFORM FLYWHEEL ----

  app.get("/api/admin/flywheel/overview", async (req, res) => {
    try {
      if (!verifyAdminToken(req)) return res.status(401).json({ error: "Unauthorized" });
      const overview = await platformFlywheelService.getOverview();
      res.json(overview);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/flywheel/run", async (req, res) => {
    try {
      if (!verifyAdminToken(req)) return res.status(401).json({ error: "Unauthorized" });
      const result = await platformFlywheelService.runAnalysisCycle();
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/flywheel/recommendations", async (req, res) => {
    try {
      if (!verifyAdminToken(req)) return res.status(401).json({ error: "Unauthorized" });
      const status = req.query.status as string | undefined;
      const recs = await storage.getFlywheelRecommendations(status);
      res.json(recs);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/flywheel/recommendations/:id/apply", async (req, res) => {
    try {
      if (!verifyAdminToken(req)) return res.status(401).json({ error: "Unauthorized" });
      const outcome = await platformFlywheelService.applyRecommendation(req.params.id, req.body.notes);
      if (!outcome) return res.status(404).json({ error: "Recommendation not found" });
      res.json(outcome);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/flywheel/recommendations/:id/dismiss", async (req, res) => {
    try {
      if (!verifyAdminToken(req)) return res.status(401).json({ error: "Unauthorized" });
      const result = await platformFlywheelService.dismissRecommendation(req.params.id, req.body.reason);
      if (!result) return res.status(404).json({ error: "Recommendation not found" });
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/flywheel/outcomes", async (req, res) => {
    try {
      if (!verifyAdminToken(req)) return res.status(401).json({ error: "Unauthorized" });
      const outcomes = await storage.getFlywheelOutcomes(50);
      res.json(outcomes);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/flywheel/config", async (req, res) => {
    try {
      if (!verifyAdminToken(req)) return res.status(401).json({ error: "Unauthorized" });
      const config = await storage.getFlywheelAutomationConfig();
      res.json(config || { mode: "manual", safeActions: [], thresholds: {} });
    } catch (err) { handleServiceError(res, err); }
  });

  app.put("/api/admin/flywheel/config", async (req, res) => {
    try {
      if (!verifyAdminToken(req)) return res.status(401).json({ error: "Unauthorized" });
      const { mode } = req.body;
      if (mode) {
        const config = await platformFlywheelService.updateMode(mode);
        return res.json(config);
      }
      const config = await storage.upsertFlywheelAutomationConfig(req.body);
      res.json(config);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/flywheel/events", async (req, res) => {
    try {
      if (!verifyAdminToken(req)) return res.status(401).json({ error: "Unauthorized" });
      const events = await storage.getPlatformEvents(100);
      res.json(events);
    } catch (err) { handleServiceError(res, err); }
  });

  // ---- AUTONOMOUS AGENT COLLABORATION (TEAMS) ----

  app.get("/api/teams", async (_req, res) => {
    try {
      const teams = await teamOrchestrationService.getTeamsOverview();
      res.json(teams);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/teams/analytics/overview", async (_req, res) => {
    try {
      const analytics = await teamOrchestrationService.getTeamAnalytics();
      res.json(analytics);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/teams/create", async (req, res) => {
    try {
      const { taskDescription, taskType } = req.body;
      if (!taskDescription) return res.status(400).json({ error: "taskDescription required" });
      const team = await teamOrchestrationService.runFullCollaboration(taskDescription, taskType || "research");
      if (!team) return res.status(400).json({ error: "Could not form team - not enough agents or limit reached" });
      res.json(team);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/teams/:id", async (req, res) => {
    try {
      const details = await teamOrchestrationService.getTeamDetails(req.params.id);
      if (!details) return res.status(404).json({ error: "Team not found" });
      res.json(details);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/teams/:id/messages", async (req, res) => {
    try {
      const messages = await storage.getTeamMessages(req.params.id);
      res.json(messages);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/teams/:id/workspace", async (req, res) => {
    try {
      const entries = await storage.getWorkspaceEntries(req.params.id);
      res.json(entries);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/teams/analytics", async (req, res) => {
    try {
      if (!verifyAdminToken(req)) return res.status(401).json({ error: "Unauthorized" });
      const analytics = await teamOrchestrationService.getTeamAnalytics();
      const teams = await teamOrchestrationService.getTeamsOverview();
      res.json({ analytics, teams });
    } catch (err) { handleServiceError(res, err); }
  });

  // ============ Personal AI Agent Routes ============

  async function requireProUser(req: any, res: any): Promise<string | null> {
    const userId = req.session?.userId;
    if (!userId) { res.status(401).json({ error: "Authentication required" }); return null; }
    const isPro = await personalAgentService.isProUser(userId);
    if (!isPro) { res.status(403).json({ error: "Pro subscription required to access Personal AI Agent" }); return null; }
    return userId;
  }

  app.get("/api/personal-agent/dashboard", async (req, res) => {
    try {
      const userId = await requireProUser(req, res);
      if (!userId) return;
      const dashboard = await personalAgentService.getDashboard(userId);
      res.json(dashboard);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/personal-agent/profile", async (req, res) => {
    try {
      const userId = await requireProUser(req, res);
      if (!userId) return;
      const profile = await personalAgentService.getOrCreateProfile(userId);
      res.json({ ...profile, encryptionKey: undefined });
    } catch (err) { handleServiceError(res, err); }
  });

  app.put("/api/personal-agent/profile", async (req, res) => {
    try {
      const userId = await requireProUser(req, res);
      if (!userId) return;
      const { agentName, voicePreference, preferences } = req.body;
      const updated = await storage.updatePersonalAgentProfile(userId, {
        ...(agentName && { agentName }),
        ...(voicePreference && { voicePreference }),
        ...(preferences && { preferences }),
      });
      res.json({ ...updated, encryptionKey: undefined });
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/personal-agent/conversations", async (req, res) => {
    try {
      const userId = await requireProUser(req, res);
      if (!userId) return;
      const conversations = await personalAgentService.getConversations(userId);
      res.json(conversations);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/personal-agent/conversations", async (req, res) => {
    try {
      const userId = await requireProUser(req, res);
      if (!userId) return;
      const { title, domain } = req.body;
      const conversation = await personalAgentService.createConversation(userId, title, domain);
      res.json(conversation);
    } catch (err) { handleServiceError(res, err); }
  });

  app.delete("/api/personal-agent/conversations/:id", async (req, res) => {
    try {
      const userId = await requireProUser(req, res);
      if (!userId) return;
      await storage.deletePersonalAgentConversation(req.params.id);
      res.json({ success: true });
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/personal-agent/conversations/:id/messages", async (req, res) => {
    try {
      const userId = await requireProUser(req, res);
      if (!userId) return;
      const messages = await personalAgentService.getMessages(req.params.id);
      res.json(messages);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/personal-agent/chat", requireSystemMode("ai"), async (req, res) => {
    try {
      const paid = await requirePaidAiAccess(req, res, "ai_response", "Personal agent chat", "personal-agent-chat");
      if (!paid) return;
      const userId = paid.userId;
      const { conversationId, message } = req.body;
      if (!conversationId || !message) return res.status(400).json({ error: "conversationId and message required" });
      const result = await personalAgentService.chat(userId, conversationId, message);
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/personal-agent/voice/tts", async (req, res) => {
    try {
      const paid = await requirePaidAiAccess(req, res, "premium_feature", "Personal agent voice (TTS)", "personal-agent-tts");
      if (!paid) return;
      const userId = paid.userId;
      const { text, voice } = req.body;
      if (!text) return res.status(400).json({ error: "text required" });
      const audioBuffer = await personalAgentService.textToSpeech(userId, text, voice);
      res.set({ "Content-Type": "audio/mpeg", "Content-Length": audioBuffer.length.toString() });
      res.send(audioBuffer);
    } catch (err) { handleServiceError(res, err); }
  });

  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
  app.post("/api/personal-agent/voice/stt", upload.single("audio"), async (req, res) => {
    try {
      const paid = await requirePaidAiAccess(req, res, "premium_feature", "Personal agent voice (STT)", "personal-agent-stt");
      if (!paid) return;
      const userId = paid.userId;
      if (!req.file) return res.status(400).json({ error: "audio file required" });
      const text = await personalAgentService.speechToText(userId, req.file.buffer);
      res.json({ text });
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/personal-agent/memories", async (req, res) => {
    try {
      const userId = await requireProUser(req, res);
      if (!userId) return;
      const domain = req.query.domain as string | undefined;
      const memories = await personalAgentService.getMemories(userId, domain);
      res.json(memories);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/personal-agent/memories", async (req, res) => {
    try {
      const userId = await requireProUser(req, res);
      if (!userId) return;
      const { domain, content, importance } = req.body;
      if (!domain || !content) return res.status(400).json({ error: "domain and content required" });
      const memory = await personalAgentService.addManualMemory(userId, domain, content, importance);
      res.json(memory);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/personal-agent/memories/:id/confirm", async (req, res) => {
    try {
      const userId = await requireProUser(req, res);
      if (!userId) return;
      const memory = await personalAgentService.confirmMemory(userId, req.params.id);
      res.json(memory);
    } catch (err) { handleServiceError(res, err); }
  });

  app.delete("/api/personal-agent/memories/:id", async (req, res) => {
    try {
      const userId = await requireProUser(req, res);
      if (!userId) return;
      await personalAgentService.dismissMemory(req.params.id);
      res.json({ success: true });
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/personal-agent/tasks", async (req, res) => {
    try {
      const userId = await requireProUser(req, res);
      if (!userId) return;
      const status = req.query.status as string | undefined;
      const tasks = await personalAgentService.getTasks(userId, status);
      res.json(tasks);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/personal-agent/tasks", async (req, res) => {
    try {
      const userId = await requireProUser(req, res);
      if (!userId) return;
      const task = await personalAgentService.createTask(userId, req.body);
      res.json(task);
    } catch (err) { handleServiceError(res, err); }
  });

  app.put("/api/personal-agent/tasks/:id", async (req, res) => {
    try {
      const userId = await requireProUser(req, res);
      if (!userId) return;
      const task = await personalAgentService.updateTask(req.params.id, req.body);
      res.json(task);
    } catch (err) { handleServiceError(res, err); }
  });

  app.delete("/api/personal-agent/tasks/:id", async (req, res) => {
    try {
      const userId = await requireProUser(req, res);
      if (!userId) return;
      await personalAgentService.deleteTask(req.params.id);
      res.json({ success: true });
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/personal-agent/tasks/reminders", async (req, res) => {
    try {
      const userId = await requireProUser(req, res);
      if (!userId) return;
      const reminders = await personalAgentService.getDueReminders(userId);
      res.json(reminders);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/personal-agent/devices", async (req, res) => {
    try {
      const userId = await requireProUser(req, res);
      if (!userId) return;
      const devices = await personalAgentService.getDevices(userId);
      res.json(devices);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/personal-agent/devices", async (req, res) => {
    try {
      const userId = await requireProUser(req, res);
      if (!userId) return;
      const device = await personalAgentService.addDevice(userId, req.body);
      res.json(device);
    } catch (err) { handleServiceError(res, err); }
  });

  app.put("/api/personal-agent/devices/:id", async (req, res) => {
    try {
      const userId = await requireProUser(req, res);
      if (!userId) return;
      const device = await personalAgentService.updateDevice(req.params.id, req.body);
      res.json(device);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/personal-agent/devices/:id/control", async (req, res) => {
    try {
      const userId = await requireProUser(req, res);
      if (!userId) return;
      const { command } = req.body;
      if (!command) return res.status(400).json({ error: "command required" });
      const result = await personalAgentService.controlDevice(userId, req.params.id, command);
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  app.delete("/api/personal-agent/devices/:id", async (req, res) => {
    try {
      const userId = await requireProUser(req, res);
      if (!userId) return;
      await personalAgentService.removeDevice(req.params.id);
      res.json({ success: true });
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/personal-agent/finance", async (req, res) => {
    try {
      const userId = await requireProUser(req, res);
      if (!userId) return;
      const entries = await personalAgentService.getFinanceEntries(userId);
      res.json(entries);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/personal-agent/finance", async (req, res) => {
    try {
      const userId = await requireProUser(req, res);
      if (!userId) return;
      const entry = await personalAgentService.addFinanceEntry(userId, req.body);
      res.json(entry);
    } catch (err) { handleServiceError(res, err); }
  });

  app.put("/api/personal-agent/finance/:id", async (req, res) => {
    try {
      const userId = await requireProUser(req, res);
      if (!userId) return;
      const entry = await personalAgentService.updateFinanceEntry(req.params.id, req.body);
      res.json(entry);
    } catch (err) { handleServiceError(res, err); }
  });

  app.delete("/api/personal-agent/finance/:id", async (req, res) => {
    try {
      const userId = await requireProUser(req, res);
      if (!userId) return;
      await personalAgentService.deleteFinanceEntry(req.params.id);
      res.json({ success: true });
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/personal-agent/finance/reminders", async (req, res) => {
    try {
      const userId = await requireProUser(req, res);
      if (!userId) return;
      const reminders = await personalAgentService.getFinanceReminders(userId);
      res.json(reminders);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/personal-agent/truth-metrics", async (req, res) => {
    try {
      const userId = await requireProUser(req, res);
      if (!userId) return;
      const agentId = `personal-${userId}`;
      const metrics = await personalAgentService.getAgentTruthMetrics(agentId);
      const evolution = await truthEvolutionService.getEvolutionHistory(agentId, 20);
      res.json({ ...metrics, recentEvents: evolution });
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/personal-agent/export", async (req, res) => {
    try {
      const userId = await requireProUser(req, res);
      if (!userId) return;
      const data = await personalAgentService.exportAllData(userId);
      res.json(data);
    } catch (err) { handleServiceError(res, err); }
  });

  app.delete("/api/personal-agent/data", async (req, res) => {
    try {
      const userId = await requireProUser(req, res);
      if (!userId) return;
      const result = await personalAgentService.deleteAllData(userId);
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/personal-agent/usage", async (req, res) => {
    try {
      const userId = await requireProUser(req, res);
      if (!userId) return;
      const limit = await personalAgentService.checkDailyLimit(userId, "message");
      const voiceLimit = await personalAgentService.checkDailyLimit(userId, "voice");
      res.json({ messages: limit, voice: voiceLimit });
    } catch (err) { handleServiceError(res, err); }
  });

  // ============ Privacy Framework Routes ============
  function getPrivacyUserId(req: any, res: any): string | null {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: "Authentication required" }); return null; }
    return userId;
  }

  app.get("/api/privacy/dashboard", requireAuth, async (req, res) => {
    try {
      const userId = getPrivacyUserId(req, res);
      if (!userId) return;
      const dashboard = await privacyGatewayService.getDashboard(userId);
      res.json(dashboard);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/privacy/vaults", requireAuth, async (req, res) => {
    try {
      const userId = getPrivacyUserId(req, res);
      if (!userId) return;
      const vaults = await privacyGatewayService.getVaultsByOwner(userId);
      res.json(vaults.map(v => ({ ...v, vaultKey: undefined })));
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/privacy/vaults", requireAuth, async (req, res) => {
    try {
      const userId = getPrivacyUserId(req, res);
      if (!userId) return;
      const { agentId, privacyMode } = req.body;
      if (!agentId) return res.status(400).json({ error: "agentId required" });
      const vault = await privacyGatewayService.initializeVault(userId, agentId, privacyMode || "personal");
      res.json({ ...vault, vaultKey: undefined });
    } catch (err) { handleServiceError(res, err); }
  });

  app.put("/api/privacy/vaults/:id/mode", requireAuth, async (req, res) => {
    try {
      const userId = getPrivacyUserId(req, res);
      if (!userId) return;
      const { mode } = req.body;
      if (!mode) return res.status(400).json({ error: "mode required" });
      const vault = await privacyGatewayService.setPrivacyMode(req.params.id, userId, mode);
      res.json({ ...vault, vaultKey: undefined });
    } catch (err) { handleServiceError(res, err); }
  });

  app.put("/api/privacy/vaults/:id/restrictions", requireAuth, async (req, res) => {
    try {
      const userId = getPrivacyUserId(req, res);
      if (!userId) return;
      const vault = await privacyGatewayService.updateRestrictions(req.params.id, userId, req.body);
      res.json({ ...vault, vaultKey: undefined });
    } catch (err) { handleServiceError(res, err); }
  });

  app.delete("/api/privacy/vaults/:id", requireAuth, async (req, res) => {
    try {
      const userId = getPrivacyUserId(req, res);
      if (!userId) return;
      const vault = await privacyGatewayService.getVault(req.params.id);
      if (!vault || vault.ownerId !== userId) return res.status(403).json({ error: "Not authorized" });
      await storage.deletePrivacyVault(req.params.id);
      res.json({ success: true });
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/privacy/validate-access", requireAuth, async (req, res) => {
    try {
      const userId = getPrivacyUserId(req, res);
      if (!userId) return;
      const { agentId, resourceType, action } = req.body;
      if (!agentId) return res.status(400).json({ error: "agentId required" });
      const result = await privacyGatewayService.validateAccess({
        agentId,
        requesterId: userId,
        requesterType: "user",
        resourceType: resourceType || "memory",
        action: action || "read",
      });
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/privacy/access-logs", requireAuth, async (req, res) => {
    try {
      const userId = getPrivacyUserId(req, res);
      if (!userId) return;
      const limit = parseInt(req.query.limit as string) || 100;
      const logs = await privacyGatewayService.getAccessLogs(userId, limit);
      res.json(logs);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/privacy/vaults/:id/access-logs", requireAuth, async (req, res) => {
    try {
      const userId = getPrivacyUserId(req, res);
      if (!userId) return;
      const vault = await privacyGatewayService.getVault(req.params.id);
      if (!vault || vault.ownerId !== userId) return res.status(403).json({ error: "Not authorized" });
      const logs = await privacyGatewayService.getVaultAccessLogs(req.params.id);
      res.json(logs);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/privacy/violations", requireAuth, async (req, res) => {
    try {
      const userId = getPrivacyUserId(req, res);
      if (!userId) return;
      const vaultId = req.query.vaultId as string | undefined;
      const violations = await privacyGatewayService.getViolations(vaultId);
      res.json(violations);
    } catch (err) { handleServiceError(res, err); }
  });

  app.put("/api/privacy/violations/:id/resolve", requireAuth, async (req, res) => {
    try {
      const userId = getPrivacyUserId(req, res);
      if (!userId) return;
      const { actionTaken } = req.body;
      const resolved = await privacyGatewayService.resolveViolation(req.params.id, actionTaken || "acknowledged");
      res.json(resolved);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/privacy/founder/monitoring", async (req, res) => {
    try {
      const monitoring = await privacyGatewayService.getFounderMonitoring();
      res.json(monitoring);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/privacy/gateway-rules", async (req, res) => {
    try {
      const rules = await storage.getPrivacyGatewayRules();
      res.json(rules);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/privacy/gateway-rules", async (req, res) => {
    try {
      const rule = await privacyGatewayService.addGatewayRule(req.body);
      res.json(rule);
    } catch (err) { handleServiceError(res, err); }
  });

  app.put("/api/privacy/gateway-rules/:id", async (req, res) => {
    try {
      const rule = await privacyGatewayService.updateGatewayRule(req.params.id, req.body);
      res.json(rule);
    } catch (err) { handleServiceError(res, err); }
  });

  app.delete("/api/privacy/gateway-rules/:id", async (req, res) => {
    try {
      await privacyGatewayService.deleteGatewayRule(req.params.id);
      res.json({ success: true });
    } catch (err) { handleServiceError(res, err); }
  });

  // Trust Moat Framework
  app.get("/api/trust-moat/dashboard", requireAuth, async (req, res) => {
    const userId = req.user.id;
    try {
      const dashboard = await trustMoatService.getUserDashboard(userId);
      res.json(dashboard);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/trust-moat/vault", requireAuth, async (req, res) => {
    const userId = req.user.id;
    try {
      const vault = await trustMoatService.getOrCreateVault(userId);
      const { encryptionKeyHash, ...safe } = vault;
      res.json(safe);
    } catch (err) { handleServiceError(res, err); }
  });

  app.put("/api/trust-moat/vault/settings", requireAuth, async (req, res) => {
    const userId = req.user.id;
    try {
      const vault = await trustMoatService.updateVaultSettings(userId, req.body);
      const { encryptionKeyHash, ...safe } = vault;
      res.json(safe);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/trust-moat/vault/lock", requireAuth, async (req, res) => {
    const userId = req.user.id;
    try {
      const vault = await trustMoatService.lockVault(userId);
      const { encryptionKeyHash, ...safe } = vault;
      res.json(safe);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/trust-moat/vault/unlock", requireAuth, async (req, res) => {
    const userId = req.user.id;
    try {
      const vault = await trustMoatService.unlockVault(userId);
      const { encryptionKeyHash, ...safe } = vault;
      res.json(safe);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/trust-moat/permissions", requireAuth, async (req, res) => {
    const userId = req.user.id;
    try {
      const permissions = await trustMoatService.getPermissions(userId);
      res.json(permissions);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/trust-moat/permissions", requireAuth, async (req, res) => {
    const userId = req.user.id;
    try {
      const token = await trustMoatService.grantPermission(userId, req.body);
      res.json(token);
    } catch (err) { handleServiceError(res, err); }
  });

  app.delete("/api/trust-moat/permissions/:id", requireAuth, async (req, res) => {
    const userId = req.user.id;
    try {
      const revoked = await trustMoatService.revokePermission(userId, req.params.id);
      res.json(revoked);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/trust-moat/validate-access", requireAuth, async (req, res) => {
    const userId = req.user.id;
    try {
      const { accessorId, accessorType, resourceAccessed, purpose } = req.body;
      const result = await trustMoatService.validateAndLogAccess(userId, accessorId, accessorType, { resourceAccessed, purpose });
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/trust-moat/access-log", requireAuth, async (req, res) => {
    const userId = req.user.id;
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const logs = await trustMoatService.getAccessLog(userId, limit);
      res.json(logs);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/trust-moat/export", requireAuth, async (req, res) => {
    const userId = req.user.id;
    try {
      const data = await trustMoatService.exportUserData(userId);
      res.json(data);
    } catch (err) { handleServiceError(res, err); }
  });

  app.delete("/api/trust-moat/data", requireAuth, async (req, res) => {
    const userId = req.user.id;
    try {
      const result = await trustMoatService.deleteUserData(userId);
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/trust-moat/founder/health", async (req, res) => {
    try {
      const health = await trustMoatService.computeFounderTrustHealth();
      res.json(health);
    } catch (err) { handleServiceError(res, err); }
  });

  // Intelligence Roadmap
  app.get("/api/intelligence/stages", async (_req, res) => {
    try {
      res.json(intelligenceRoadmapService.getStages());
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/intelligence/progress", requireAuth, async (req, res) => {
    const userId = req.user.id;
    try {
      const progress = await intelligenceRoadmapService.getUserProgress(userId);
      res.json(progress);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/intelligence/xp-breakdown", requireAuth, async (req, res) => {
    const userId = req.user.id;
    try {
      const days = parseInt(req.query.days as string) || 30;
      const breakdown = await intelligenceRoadmapService.getXpBreakdown(userId, days);
      res.json(breakdown);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/intelligence/features", requireAuth, async (req, res) => {
    const userId = req.user.id;
    try {
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      const flags = intelligenceRoadmapService.getFeatureFlags(user.intelligenceStage || "explorer");
      res.json({ stage: user.intelligenceStage, flags });
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/intelligence/award-xp", requireAuth, async (req, res) => {
    const userId = req.user.id;
    try {
      const { source, description } = req.body;
      if (!source || typeof source !== "string") return res.status(400).json({ message: "Valid source required" });
      const validSources = Object.keys(intelligenceRoadmapService.getXpSources());
      if (!validSources.includes(source)) return res.status(400).json({ message: `Invalid source. Must be one of: ${validSources.join(", ")}` });
      const result = await intelligenceRoadmapService.awardXp(userId, source, typeof description === "string" ? description : undefined);
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/intelligence/leaderboard", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const leaderboard = await intelligenceRoadmapService.getLeaderboard(limit);
      res.json(leaderboard);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/intelligence/sources", async (_req, res) => {
    try {
      res.json(intelligenceRoadmapService.getXpSources());
    } catch (err) { handleServiceError(res, err); }
  });

  // Hybrid Intelligence Network
  app.get("/api/network/status", async (_req, res) => {
    try {
      const status = await hybridNetwork.getNetworkStatus();
      res.json(status);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/network/layers/:layer", async (req, res) => {
    try {
      const detail = await hybridNetwork.getLayerDetail(req.params.layer as any);
      res.json(detail);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/network/agents", async (_req, res) => {
    try {
      const registry = await hybridNetwork.getAgentRegistry();
      res.json(registry);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/network/executions", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const history = await hybridNetwork.getExecutionHistory(limit);
      res.json(history);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/network/execute", requireAuth, async (req, res) => {
    const userId = req.user.id;
    try {
      const { agentId, message } = req.body;
      if (!agentId || !message) return res.status(400).json({ message: "agentId and message required" });
      const pipeline = await hybridNetwork.executeAgent(agentId, userId, message);
      res.json(pipeline);
    } catch (err) { handleServiceError(res, err); }
  });

  // User Psychology Progress System
  app.get("/api/psychology/stages", async (_req, res) => {
    try {
      res.json(userPsychologyService.getStages());
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/psychology/indicators", requireAuth, async (req, res) => {
    const userId = req.user.id;
    try {
      const indicators = await userPsychologyService.getUserIndicators(userId);
      res.json(indicators);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/psychology/activity", requireAuth, async (req, res) => {
    const userId = req.user.id;
    try {
      await userPsychologyService.recordActivity(userId);
      res.json({ recorded: true });
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/psychology/founder/analytics", async (req, res) => {
    try {
      const analytics = await userPsychologyService.getFounderAnalytics();
      res.json(analytics);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/psychology/founder/snapshot", async (req, res) => {
    try {
      const snapshot = await userPsychologyService.takeSnapshot();
      res.json(snapshot);
    } catch (err) { handleServiceError(res, err); }
  });

  // ---- PSYCHOLOGY-BASED MONETIZATION ----

  app.get("/api/monetization/tiers", async (_req, res) => {
    try { res.json(psychologyMonetizationService.getTierInfo()); } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/monetization/feature-gates", async (_req, res) => {
    try { res.json(psychologyMonetizationService.getFeatureGates()); } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/monetization/gate-check", async (req, res) => {
    try {
      const { userId, feature } = req.body;
      if (!userId || !feature) return res.status(400).json({ error: "userId and feature required" });
      const result = await psychologyMonetizationService.checkFeatureGate(userId, feature);
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/monetization/memory-check", async (req, res) => {
    try {
      const { userId, currentMemoryCount } = req.body;
      if (!userId) return res.status(400).json({ error: "userId required" });
      const result = await psychologyMonetizationService.checkMemoryLimit(userId, currentMemoryCount || 0);
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/monetization/log-event", async (req, res) => {
    try {
      const { userId, eventType, triggerType, psychologyStage, engagementScore, currentPlan, suggestedPlan, creditsCost, converted, metadata } = req.body;
      if (!userId || !eventType || !triggerType) return res.status(400).json({ error: "userId, eventType, and triggerType required" });
      await psychologyMonetizationService.logEvent(userId, eventType, triggerType, psychologyStage || "curious", engagementScore || 0, currentPlan || "free", suggestedPlan, creditsCost, converted, metadata);
      res.json({ logged: true });
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/monetization/log-conversion", async (req, res) => {
    try {
      const { userId, triggerType, convertedPlan } = req.body;
      if (!userId || !triggerType || !convertedPlan) return res.status(400).json({ error: "userId, triggerType, and convertedPlan required" });
      await psychologyMonetizationService.logConversion(userId, triggerType, convertedPlan);
      res.json({ logged: true });
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/monetization/analytics", async (_req, res) => {
    try { res.json(await psychologyMonetizationService.getConversionAnalytics()); } catch (err) { handleServiceError(res, err); }
  });

  // ---- RISK MANAGEMENT ----

  app.get("/api/risk/overview", requireAdmin, async (_req, res) => {
    try { res.json(await riskManagementService.getRiskOverview()); } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/risk/audit-logs", requireAdmin, async (req, res) => {
    try {
      const { actorId, action, riskLevel, limit } = req.query as any;
      res.json(await riskManagementService.getAuditLogs({ actorId, action, riskLevel, limit: limit ? parseInt(limit) : 100 }));
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/risk/snapshots", requireAdmin, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 30;
      res.json(await riskManagementService.getRiskSnapshots(limit));
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/risk/snapshot", requireAdmin, async (_req, res) => {
    try { await riskManagementService.createSnapshot(); res.json({ created: true }); } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/risk/data-requests", requireAdmin, async (req, res) => {
    try {
      const { status, type, limit } = req.query as any;
      res.json(await riskManagementService.getDataRequests({ status, type, limit: limit ? parseInt(limit) : 50 }));
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/user-data/export", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ error: "userId required" });
      res.json(await riskManagementService.requestDataExport(userId));
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/user-data/deletion", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ error: "userId required" });
      res.json(await riskManagementService.requestDataDeletion(userId));
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/risk/process-export/:id", requireAdmin, async (req, res) => {
    try { res.json(await riskManagementService.processDataExport(req.params.id)); } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/risk/process-deletion/:id", requireAdmin, async (req, res) => {
    try { await riskManagementService.processDataDeletion(req.params.id); res.json({ processed: true }); } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/risk/dashboard", requireAdmin, async (_req, res) => {
    try { res.json(await riskManagementService.getComprehensiveDashboard()); } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/risk/gateway-health", requireAdmin, async (_req, res) => {
    try { res.json(await riskManagementService.getGatewayHealth()); } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/risk/memory-isolation", requireAdmin, async (_req, res) => {
    try { res.json(await riskManagementService.getMemoryIsolationStatus()); } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/risk/trends", requireAdmin, async (req, res) => {
    try {
      const days = req.query.days ? parseInt(req.query.days as string) : 14;
      res.json(await riskManagementService.getRiskTrends(days));
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/risk/mitigations", requireAdmin, async (_req, res) => {
    try { res.json(riskManagementService.getMitigationControls()); } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/risk/mitigations/:id", requireAdmin, async (req, res) => {
    try {
      const { enabled, threshold } = req.body;
      res.json(riskManagementService.updateMitigationControl(req.params.id, { enabled, threshold }));
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/user-data/requests", requireAuth, async (req, res) => {
    try {
      res.json(await riskManagementService.getUserDataRequests(req.user.id));
    } catch (err) { handleServiceError(res, err); }
  });

  // ---- TRUTH-ANCHORED EVOLUTION ----

  app.post("/api/truth/memories", requireAuth, async (req, res) => {
    try {
      const { agentId, content, truthType, confidenceScore, sources } = req.body;
      const userId = req.user.id;
      if (!agentId || !content) return res.status(400).json({ error: "agentId and content required" });
      res.json(await truthEvolutionService.createMemory({ agentId, userId, content, truthType, confidenceScore, sources }));
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/truth/memories/:agentId", async (req, res) => {
    try {
      const { truthType, minConfidence, limit } = req.query as any;
      res.json(await truthEvolutionService.getAgentMemories(req.params.agentId, {
        truthType, minConfidence: minConfidence ? parseFloat(minConfidence) : undefined, limit: limit ? parseInt(limit) : 50,
      }));
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/truth/evidence", async (req, res) => {
    try {
      const { memoryId, source } = req.body;
      if (!memoryId || !source) return res.status(400).json({ error: "memoryId and source required" });
      await truthEvolutionService.addEvidence(memoryId, source);
      res.json({ updated: true });
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/truth/contradiction", async (req, res) => {
    try {
      const { memoryId, content } = req.body;
      if (!memoryId || !content) return res.status(400).json({ error: "memoryId and content required" });
      await truthEvolutionService.recordContradiction(memoryId, content);
      res.json({ recorded: true });
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/truth/validation", async (req, res) => {
    try {
      const { memoryId, validatorId } = req.body;
      if (!memoryId || !validatorId) return res.status(400).json({ error: "memoryId and validatorId required" });
      await truthEvolutionService.recordValidation(memoryId, validatorId);
      res.json({ validated: true });
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/truth/correct", async (req, res) => {
    try {
      const { memoryId, correctedContent } = req.body;
      if (!memoryId || !correctedContent) return res.status(400).json({ error: "memoryId and correctedContent required" });
      await truthEvolutionService.correctFact(memoryId, correctedContent);
      res.json({ corrected: true });
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/truth/evolution/:agentId", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      res.json(await truthEvolutionService.getEvolutionHistory(req.params.agentId, limit));
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/truth/analytics", requireAdmin, async (_req, res) => {
    try { res.json(await truthEvolutionService.getFounderAnalytics()); } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/truth/alignment-history", requireAdmin, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 30;
      res.json(await truthEvolutionService.getAlignmentHistory(limit));
    } catch (err) { handleServiceError(res, err); }
  });

  // ---- REALITY ALIGNMENT ----

  app.post("/api/reality/claims", async (req, res) => {
    try {
      const { content, sourcePostId, sourceCommentId, extractedBy, domain, tags } = req.body;
      if (!content || !extractedBy) return res.status(400).json({ error: "content and extractedBy required" });
      res.json(await realityAlignmentService.extractClaim({ content, sourcePostId, sourceCommentId, extractedBy, domain, tags }));
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/reality/claims", async (req, res) => {
    try {
      const { status, domain, limit } = req.query as any;
      res.json(await realityAlignmentService.getClaims({ status, domain, limit: limit ? parseInt(limit) : 50 }));
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/reality/claims/:id", async (req, res) => {
    try {
      const claim = await realityAlignmentService.getClaim(req.params.id);
      if (!claim) return res.status(404).json({ error: "Claim not found" });
      res.json(claim);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/reality/evidence", async (req, res) => {
    try {
      const { claimId, submittedBy, submitterType, evidenceType, content, sourceUrl, weight, trustScore } = req.body;
      if (!claimId || !submittedBy || !evidenceType || !content) return res.status(400).json({ error: "claimId, submittedBy, evidenceType, and content required" });
      res.json(await realityAlignmentService.addEvidence({ claimId, submittedBy, submitterType, evidenceType, content, sourceUrl, weight, trustScore }));
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/reality/analytics", requireAdmin, async (_req, res) => {
    try { res.json(await realityAlignmentService.getFounderAnalytics()); } catch (err) { handleServiceError(res, err); }
  });

  // ---- INTELLIGENCE STACK ----

  app.get("/api/intelligence-stack/layers", async (_req, res) => {
    try {
      res.json(intelligenceStackRegistry.getStackSummary());
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/intelligence-stack/analytics", requireAdmin, async (_req, res) => {
    try {
      const analytics = await intelligenceStackAnalytics.getLayerAnalytics();
      res.json(analytics);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/intelligence-stack/service-map", requireAdmin, async (_req, res) => {
    try {
      res.json({
        mappings: intelligenceStackRegistry.getAllServiceMappings(),
        violations: intelligenceStackRegistry.getViolations(),
      });
    } catch (err) { handleServiceError(res, err); }
  });

  // ---- LABS SYSTEM ----

  app.get("/api/labs/opportunities", async (req, res) => {
    try {
      const { industry, category, difficulty } = req.query;
      const opportunities = await labsService.getOpportunities({
        industry: industry as string,
        category: category as string,
        difficulty: difficulty as string,
      });
      res.json(opportunities);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/labs/opportunities/:id", async (req, res) => {
    try {
      const opp = await labsService.getOpportunity(req.params.id);
      if (!opp) return res.status(404).json({ error: "Opportunity not found" });
      res.json(opp);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/labs/opportunities/seed", async (_req, res) => {
    try {
      await labsService.seedIfEmpty();
      res.json({ success: true });
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/labs/opportunities/:id/build", async (req, res) => {
    try {
      const scaffold = await labsService.getScaffoldSpec(req.params.id);
      await labsService.incrementBuildCount(req.params.id);
      res.json(scaffold);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/labs/meta", async (_req, res) => {
    res.json({ industries: labsService.getIndustries(), categories: labsService.getCategories() });
  });

  app.get("/api/labs/disclaimers/:industry", async (req, res) => {
    res.json({ disclaimers: labsService.getDisclaimers(req.params.industry) });
  });

  app.get("/api/labs/apps", async (req, res) => {
    try {
      const { category, pricingModel, industry } = req.query;
      const apps = await labsService.getPublishedApps({ category: category as string, pricingModel: pricingModel as string, industry: industry as string });
      res.json(apps);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/labs/apps/:id", async (req, res) => {
    try {
      const app = await labsService.getApp(req.params.id);
      if (!app) return res.status(404).json({ error: "App not found" });
      res.json(app);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/labs/apps", async (req, res) => {
    try {
      const app = await labsService.publishApp(req.body);
      res.json(app);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/labs/apps/user/:userId", async (req, res) => {
    try {
      const apps = await labsService.getUserApps(req.params.userId);
      res.json(apps);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/labs/apps/:id/install", async (req, res) => {
    try {
      const { userId } = req.body;
      const install = await labsService.installApp(userId, req.params.id);
      res.json(install);
    } catch (err) { handleServiceError(res, err); }
  });

  app.delete("/api/labs/apps/:id/install", async (req, res) => {
    try {
      const { userId } = req.body;
      await labsService.uninstallApp(userId, req.params.id);
      res.json({ success: true });
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/labs/installations/:userId", async (req, res) => {
    try {
      const installations = await labsService.getUserInstallations(req.params.userId);
      res.json(installations);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/labs/favorites", async (req, res) => {
    try {
      const { userId, itemId, itemType } = req.body;
      const result = await labsService.toggleFavorite(userId, itemId, itemType);
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/labs/favorites/:userId", async (req, res) => {
    try {
      const favorites = await labsService.getUserFavorites(req.params.userId);
      res.json(favorites);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/labs/reviews", async (req, res) => {
    try {
      const review = await labsService.addReview(req.body);
      res.json(review);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/labs/reviews/:appId", async (req, res) => {
    try {
      const reviews = await labsService.getAppReviews(req.params.appId);
      res.json(reviews);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/labs/flywheel/summary", async (_req, res) => {
    try {
      const summary = await labsFlywheelService.getFlywheelSummary();
      res.json(summary);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/labs/flywheel/analytics", async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const analytics = await labsFlywheelService.getAnalytics(days);
      res.json(analytics);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/labs/flywheel/growth-loop", async (_req, res) => {
    try {
      const metrics = await labsFlywheelService.getGrowthLoopMetrics();
      res.json(metrics);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/labs/flywheel/generate", async (_req, res) => {
    try {
      const result = await labsFlywheelService.runDailyGeneration();
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/labs/flywheel/snapshot", async (_req, res) => {
    try {
      const snapshot = await labsFlywheelService.snapshotAnalytics();
      res.json(snapshot);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/labs/flywheel/rankings", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const rankings = await labsFlywheelService.getCreatorRankings(limit);
      res.json(rankings);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/labs/flywheel/rankings/:creatorId", async (req, res) => {
    try {
      const ranking = await labsFlywheelService.getCreatorRanking(req.params.creatorId);
      res.json(ranking || null);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/labs/flywheel/rankings/recalculate", async (_req, res) => {
    try {
      await labsFlywheelService.recalculateAllRankings();
      res.json({ success: true });
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/labs/flywheel/referral", async (req, res) => {
    try {
      const { appId, creatorId } = req.body;
      const referral = await labsFlywheelService.createReferral(appId, creatorId);
      res.json(referral);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/labs/flywheel/referral/:code", async (req, res) => {
    try {
      const referral = await labsFlywheelService.getReferral(req.params.code);
      if (referral) {
        await labsFlywheelService.trackReferralClick(req.params.code);
      }
      res.json(referral || null);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/labs/flywheel/referrals/:creatorId", async (req, res) => {
    try {
      const referrals = await labsFlywheelService.getCreatorReferrals(req.params.creatorId);
      res.json(referrals);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/labs/flywheel/referral/:code/signup", async (req, res) => {
    try {
      await labsFlywheelService.trackReferralSignup(req.params.code);
      res.json({ success: true });
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/labs/flywheel/landing-page", async (req, res) => {
    try {
      const { appId } = req.body;
      const page = await labsFlywheelService.generateLandingPage(appId);
      res.json(page);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/labs/flywheel/landing-page/:slug", async (req, res) => {
    try {
      const page = await labsFlywheelService.getLandingPage(req.params.slug);
      res.json(page || null);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/labs/flywheel/landing-page/app/:appId", async (req, res) => {
    try {
      const page = await labsFlywheelService.getLandingPageByAppId(req.params.appId);
      res.json(page || null);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/labs/flywheel/landing-page/:slug/convert", async (req, res) => {
    try {
      await labsFlywheelService.trackConversion(req.params.slug);
      res.json({ success: true });
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/super-loop/summary", async (_req, res) => {
    try {
      const summary = await superLoopService.getSummary();
      res.json(summary);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/super-loop/health", async (_req, res) => {
    try {
      const health = await superLoopService.getHealth();
      res.json(health);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/super-loop/cycles", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const cycles = await superLoopService.getCycles(limit);
      res.json(cycles);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/super-loop/funnel", async (_req, res) => {
    try {
      const funnel = await superLoopService.getCycleFunnel();
      res.json(funnel);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/super-loop/revenue", async (_req, res) => {
    try {
      const revenue = await superLoopService.getRevenueAttribution();
      res.json(revenue);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/super-loop/timeline", async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 14;
      const timeline = await superLoopService.getTimeline(days);
      res.json(timeline);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/super-loop/snapshot", async (_req, res) => {
    try {
      const snapshot = await superLoopService.captureSnapshot();
      res.json(snapshot);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/super-loop/trigger", async (_req, res) => {
    try {
      const result = await superLoopService.triggerLoopScan();
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  // ── Stability Triangle ──

  app.get("/api/stability-triangle/snapshot", requireAdmin, async (_req, res) => {
    try {
      res.json(stabilityTriangleService.getSnapshot());
    } catch (err) { handleServiceError(res, err); }
  });

  // ── Panic Button System ──

  app.get("/api/panic-button/status", requireAdmin, async (_req, res) => {
    try {
      res.json(panicButtonService.getStatus());
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/panic-button/modes", requireAdmin, async (_req, res) => {
    try {
      res.json(panicButtonService.getAllModes());
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/panic-button/set-mode", requireAdmin, async (req, res) => {
    try {
      const { mode } = z.object({ mode: z.enum(["NORMAL", "SAFE_MODE", "ECONOMY_PROTECTION", "EMERGENCY_FREEZE"]) }).parse(req.body);
      const result = await panicButtonService.setMode(mode, "admin");
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/panic-button/alerts", requireAdmin, async (req, res) => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      const includeAcknowledged = req.query.all === "true";
      const alerts = await panicButtonService.getAlerts(limit, includeAcknowledged);
      res.json(alerts);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/panic-button/alerts/:id/acknowledge", requireAdmin, async (req, res) => {
    try {
      const alert = await panicButtonService.acknowledgeAlert(req.params.id, "admin");
      if (!alert) return res.status(404).json({ message: "Alert not found" });
      res.json(alert);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/panic-button/thresholds", requireAdmin, async (_req, res) => {
    try {
      res.json(panicButtonService.getThresholds());
    } catch (err) { handleServiceError(res, err); }
  });

  app.put("/api/panic-button/thresholds", requireAdmin, async (req, res) => {
    try {
      const updated = await panicButtonService.updateThresholds(req.body);
      res.json(updated);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/panic-button/check/:action", async (req, res) => {
    try {
      const actionType = req.params.action as "ai" | "agent" | "publishing";
      if (!["ai", "agent", "publishing"].includes(actionType)) {
        return res.status(400).json({ message: "Invalid action type" });
      }
      res.json(panicButtonService.checkAction(actionType));
    } catch (err) { handleServiceError(res, err); }
  });

  // ── Founder Debug Stack ──

  app.get("/api/founder-debug/snapshot", requireAdmin, async (_req, res) => {
    try {
      res.json(founderDebugService.getFullDebugSnapshot());
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/founder-debug/ai-logs", requireAdmin, async (req, res) => {
    try {
      const since = req.query.since ? Number(req.query.since) : undefined;
      const model = req.query.model as string | undefined;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      res.json(founderDebugService.getAILogs({ since, model, limit }));
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/founder-debug/ai-stats", requireAdmin, async (_req, res) => {
    try {
      res.json(founderDebugService.getDailyAIStats());
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/founder-debug/economics", requireAdmin, async (_req, res) => {
    try {
      res.json(founderDebugService.getEconomicSnapshot());
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/founder-debug/journey", requireAdmin, async (req, res) => {
    try {
      const userId = req.query.userId as string | undefined;
      const event = req.query.event as string | undefined;
      const since = req.query.since ? Number(req.query.since) : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      res.json(founderDebugService.getJourneyEvents({ userId, event, since, limit }));
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/founder-debug/journey-summary", requireAdmin, async (_req, res) => {
    try {
      res.json(founderDebugService.getJourneySummary());
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/founder-debug/config", requireAdmin, async (_req, res) => {
    try {
      res.json(founderDebugService.getConfig());
    } catch (err) { handleServiceError(res, err); }
  });

  app.put("/api/founder-debug/config", requireAdmin, async (req, res) => {
    try {
      const updated = founderDebugService.updateConfig(req.body);
      res.json(updated);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/founder-debug/ai-limits", requireAdmin, async (_req, res) => {
    try {
      res.json(founderDebugService.checkAILimits());
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/founder-debug/log-ai-action", requireAdmin, async (req, res) => {
    try {
      founderDebugService.logAIAction(req.body);
      res.json({ success: true });
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/founder-debug/track-event", resolveUser, async (req: any, res) => {
    try {
      founderDebugService.trackJourneyEvent({
        ...req.body,
        userId: req.user.id,
        timestamp: Date.now(),
        traceId: req.traceId,
      });
      res.json({ success: true });
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/gcis/dashboard", requireAdmin, async (_req, res) => {
    try { res.json(await gcisService.getDashboard()); } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/gcis/rules", requireAdmin, async (req, res) => {
    try {
      const { status, countryCode, category } = req.query as any;
      res.json(await gcisService.getRules({ status, countryCode, category }));
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/gcis/scan", requireAdmin, async (req, res) => {
    try { res.json(await gcisService.autoIngestFromScan(req.body.countryCode)); } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/gcis/rules/ingest", requireAdmin, async (req, res) => {
    try { res.json(await gcisService.ingestRule(req.body)); } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/gcis/rules/:id/approve", requireAdmin, async (req, res) => {
    try { res.json(await gcisService.approveRule(req.params.id, "admin")); } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/gcis/rules/:id/reject", requireAdmin, async (req, res) => {
    try { res.json(await gcisService.rejectRule(req.params.id, "admin", req.body.reason || "")); } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/gcis/feature-flags", requireAdmin, async (req, res) => {
    try { res.json(await gcisService.getActiveFeatureFlags(req.query.countryCode as string)); } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/gcis/audit-log", requireAdmin, async (req, res) => {
    try { res.json(await gcisService.getAuditLog(Number(req.query.limit) || 50)); } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/gcis/notifications", requireAdmin, async (req, res) => {
    try { res.json(await gcisService.getNotifications(req.query.unreadOnly === "true")); } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/gcis/notifications/:id/read", requireAdmin, async (req, res) => {
    try { await gcisService.markNotificationRead(req.params.id); res.json({ success: true }); } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/gcis/eco-efficiency", requireAdmin, async (_req, res) => {
    try { res.json(await gcisService.getEcoEfficiency()); } catch (err) { handleServiceError(res, err); }
  });

  // ============ ADAPTIVE POLICY & CONTENT GOVERNANCE ============

  app.get("/api/admin/policy/dashboard", requireAdmin, async (_req, res) => {
    try { res.json(await adaptivePolicyService.getDashboard()); } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/policy/templates", requireAdmin, async (req, res) => {
    try { res.json(await adaptivePolicyService.getTemplates(req.query.category as string)); } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/policy/templates/init", requireAdmin, async (_req, res) => {
    try { await adaptivePolicyService.initializeTemplates(); res.json({ success: true }); } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/policy/drafts", requireAdmin, async (req, res) => {
    try { res.json(await adaptivePolicyService.getDrafts(req.query.status as string)); } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/policy/drafts/:id", requireAdmin, async (req, res) => {
    try {
      const draft = await adaptivePolicyService.getDraft(req.params.id);
      if (!draft) return res.status(404).json({ error: "Draft not found" });
      res.json(draft);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/policy/generate", requireAdmin, async (req, res) => {
    try {
      const paid = await requirePaidAiAccess(req, res, "ai_response", "Admin policy generate", "admin-policy-generate");
      if (!paid) return;
      const { templateId, triggerType, triggerDetails } = req.body;
      if (!templateId) return res.status(400).json({ error: "templateId is required" });
      const draft = await adaptivePolicyService.generateDraft(templateId, triggerType || "manual", triggerDetails);
      res.json(draft);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/policy/drafts/:id/approve", requireAdmin, async (req, res) => {
    try { res.json(await adaptivePolicyService.approveDraft(req.params.id, "founder")); } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/policy/drafts/:id/reject", requireAdmin, async (req, res) => {
    try {
      const { reason } = req.body;
      await adaptivePolicyService.rejectDraft(req.params.id, reason || "Rejected", "founder");
      res.json({ success: true });
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/policy/versions/:templateId", requireAdmin, async (req, res) => {
    try { res.json(await adaptivePolicyService.getVersionHistory(req.params.templateId)); } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/policy/rollback", requireAdmin, async (req, res) => {
    try {
      const { templateId, versionId } = req.body;
      if (!templateId || !versionId) return res.status(400).json({ error: "templateId and versionId are required" });
      res.json(await adaptivePolicyService.rollbackToVersion(templateId, versionId));
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/policy/detect-updates", requireAdmin, async (_req, res) => {
    try { res.json(await adaptivePolicyService.detectAndTriggerUpdates()); } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/policy/:slug", async (req, res) => {
    try {
      const policy = await adaptivePolicyService.getPublicPolicy(req.params.slug);
      if (!policy) return res.status(404).json({ error: "Policy not found" });
      res.json(policy);
    } catch (err) { handleServiceError(res, err); }
  });

  // ============ SUPPORT TICKET SYSTEM ============
  const { supportTicketService } = await import("./services/support-ticket-service");
  const { zeroSupportLearningService } = await import("./services/zero-support-learning-service");
  const { emailService: emailSvc } = await import("./services/email-service");

  app.post("/api/support/tickets", resolveUser, async (req: any, res) => {
    try {
      const { subject, description, category, priority } = req.body;
      if (!subject || !description) return res.status(400).json({ error: "Subject and description required" });
      const ticket = await supportTicketService.createTicket({
        userId: req.user.id,
        userEmail: req.user.email,
        userName: req.user.username || req.user.displayName || "User",
        subject, description, category, priority,
      });
      res.json(ticket);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/support/tickets", resolveUser, async (req: any, res) => {
    try {
      const tickets = await supportTicketService.getTicketsByUser(req.user.id);
      res.json(tickets);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/support/tickets/:id", resolveUser, async (req: any, res) => {
    try {
      const ticket = await supportTicketService.getTicketById(req.params.id);
      if (!ticket) return res.status(404).json({ error: "Ticket not found" });
      if (ticket.userId !== req.user.id && req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
      res.json(ticket);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/support/tickets/:id/messages", resolveUser, async (req: any, res) => {
    try {
      const ticket = await supportTicketService.getTicketById(req.params.id);
      if (!ticket) return res.status(404).json({ error: "Ticket not found" });
      if (ticket.userId !== req.user.id && req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
      const messages = await supportTicketService.getTicketMessages(req.params.id);
      res.json(messages);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/support/tickets/:id/messages", resolveUser, async (req: any, res) => {
    try {
      const { content } = req.body;
      if (!content) return res.status(400).json({ error: "Content required" });
      const ticket = await supportTicketService.getTicketById(req.params.id);
      if (!ticket) return res.status(404).json({ error: "Ticket not found" });
      if (ticket.userId !== req.user.id) return res.status(403).json({ error: "Forbidden" });
      const message = await supportTicketService.addMessage(req.params.id, {
        senderType: "user",
        senderName: req.user.username || "User",
        content,
      });
      res.json(message);
    } catch (err) { handleServiceError(res, err); }
  });

  // Admin ticket management
  app.get("/api/admin/support/tickets", requireAdmin, async (req, res) => {
    try {
      const tickets = await supportTicketService.getAllTickets({ status: req.query.status as string });
      res.json(tickets);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/support/stats", requireAdmin, async (_req, res) => {
    try {
      res.json(await supportTicketService.getTicketStats());
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/support/tickets/:id", requireAdmin, async (req, res) => {
    try {
      const ticket = await supportTicketService.getTicketById(req.params.id);
      if (!ticket) return res.status(404).json({ error: "Ticket not found" });
      res.json(ticket);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/support/tickets/:id/messages", requireAdmin, async (req, res) => {
    try {
      res.json(await supportTicketService.getTicketMessages(req.params.id));
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/support/tickets/:id/reply", requireAdmin, async (req, res) => {
    try {
      const { content } = req.body;
      if (!content) return res.status(400).json({ error: "Content required" });
      const message = await supportTicketService.addMessage(req.params.id, {
        senderType: "admin",
        senderName: "Mougle Support",
        content,
      });
      res.json(message);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/support/tickets/:id/status", requireAdmin, async (req, res) => {
    try {
      const { status } = req.body;
      if (!status) return res.status(400).json({ error: "Status required" });
      const ticket = await supportTicketService.updateStatus(req.params.id, status);
      if (status === "RESOLVED" || status === "CLOSED") {
        zeroSupportLearningService.autoGenerateFromTicket(req.params.id).then(r => {
          if (r.article) console.log(`[ZeroSupport] Auto-generated KB article from ticket ${req.params.id}: ${r.article.title}`);
        }).catch(e => console.error("[ZeroSupport] Auto-extraction failed:", e));
      }
      res.json(ticket);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/support/tickets/:id/ai-reply", requireAdmin, async (req, res) => {
    try {
      const paid = await requirePaidAiAccess(req, res, "ai_response", "Admin support AI reply", `admin-support-reply:${req.params.id}`);
      if (!paid) return;
      const reply = await supportTicketService.generateAiReply(req.params.id);
      res.json({ reply });
    } catch (err) { handleServiceError(res, err); }
  });

  // Demo users and email test flow
  app.post("/api/admin/support/demo-seed", requireAdmin, async (_req, res) => {
    try {
      const demoUsers = [
        { userId: "demo-user-001", userEmail: "demo1@mougle.test", userName: "Alice Explorer", subject: "Cannot access AI agents", description: "I signed up for Pro plan but I still can't create AI agents. My dashboard shows the free plan features only.", category: "billing", priority: "high" },
        { userId: "demo-user-002", userEmail: "demo2@mougle.test", userName: "Bob Creator", subject: "Labs app publish error", description: "When I try to publish my app from Labs, I get a 500 error. I've tried clearing cache and restarting but the issue persists.", category: "technical", priority: "medium" },
        { userId: "demo-user-003", userEmail: "demo3@mougle.test", userName: "Carol Researcher", subject: "Feature request: Export debate transcripts", description: "It would be great if we could export debate transcripts as PDF or markdown. This would help for academic research purposes.", category: "feature_request", priority: "low" },
      ];
      const ticketResults = [];
      for (const u of demoUsers) {
        const ticket = await supportTicketService.createTicket(u);
        ticketResults.push({ ticketId: ticket.id, user: u.userName, subject: u.subject });
      }

      const emailResults: { template: string; status: string; messageId?: string }[] = [];
      const testEmail = "demo1@mougle.test";
      const testName = "Alice Explorer";
      const templates = [
        { name: "welcome", fn: () => emailSvc.sendWelcomeEmail(testEmail, testName) },
        { name: "verification", fn: () => emailSvc.sendVerificationEmail(testEmail, "123456", testName) },
        { name: "account_verified", fn: () => emailSvc.sendAccountVerifiedEmail(testEmail, testName) },
        { name: "purchase", fn: () => emailSvc.sendPurchaseConfirmation(testEmail, testName, { plan: "Pro", amount: "$19.99", transactionId: "TXN-DEMO-001", date: new Date().toLocaleDateString() }) },
        { name: "invoice", fn: () => emailSvc.sendInvoiceEmail(testEmail, testName, { invoiceId: "INV-DEMO-001", amount: "$19.99", period: "Jan 2026", items: [{ name: "Pro Plan", amount: "$19.99" }] }) },
        { name: "policy", fn: () => emailSvc.sendPolicyNotification(testEmail, testName, { title: "Privacy Policy", summary: "Updated data retention.", effectiveDate: "March 1, 2026" }) },
        { name: "admin_alert", fn: () => emailSvc.sendAdminAlert(testEmail, { title: "Test Alert", severity: "medium", message: "Demo alert." }) },
        { name: "password_reset", fn: () => emailSvc.sendPasswordResetEmail(testEmail, "demo-reset-token", testName) },
        { name: "ticket_reply", fn: () => emailSvc.sendSupportTicketReply(testEmail, testName, { ticketId: "DEMO", subject: "Test", replyContent: "Demo reply." }) },
        { name: "ticket_created", fn: () => emailSvc.sendTicketCreatedNotification(testEmail, testName, { ticketId: "DEMO", subject: "Test" }) },
      ];
      for (const t of templates) {
        try {
          const r = await t.fn();
          emailResults.push({ template: t.name, status: "sent", messageId: r?.data?.id });
        } catch (e: any) {
          emailResults.push({ template: t.name, status: `failed: ${e.message}` });
        }
      }

      res.json({
        success: true,
        tickets: ticketResults,
        emailTests: emailResults,
        message: "3 demo users with tickets created, all 10 email templates tested",
      });
    } catch (err) { handleServiceError(res, err); }
  });

  // ============ ZERO-SUPPORT LEARNING SYSTEM ============

  // KB-enhanced chat assistant (replaces basic chat)
  app.post("/api/support/chat", requireAuth, async (req, res) => {
    try {
      const paid = await requirePaidAiAccess(req, res, "ai_response", "Support chat", "support-chat");
      if (!paid) return;
      const { message } = req.body;
      if (!message) return res.status(400).json({ error: "Message required" });
      const result = await zeroSupportLearningService.kbEnhancedChat(message);
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  // Preventive help prompts
  app.post("/api/support/preventive-help", requireAuth, async (req, res) => {
    try {
      const paid = await requirePaidAiAccess(req, res, "ai_response", "Support preventive help", "support-preventive");
      if (!paid) return;
      const { context } = req.body;
      const prompts = await zeroSupportLearningService.getPreventiveHelp(context || "browsing support page");
      res.json({ prompts });
    } catch (err) { handleServiceError(res, err); }
  });

  // Public KB search
  app.get("/api/support/kb/search", async (req, res) => {
    try {
      const q = req.query.q as string;
      if (!q) return res.status(400).json({ error: "Query required" });
      const articles = await zeroSupportLearningService.searchKB(q);
      res.json(articles);
    } catch (err) { handleServiceError(res, err); }
  });

  // Public KB articles
  app.get("/api/support/kb/articles", async (_req, res) => {
    try {
      const articles = await zeroSupportLearningService.getAllArticles("published");
      res.json(articles);
    } catch (err) { handleServiceError(res, err); }
  });

  // Mark article helpful
  app.post("/api/support/kb/articles/:id/helpful", async (req, res) => {
    try {
      await zeroSupportLearningService.markHelpful(req.params.id);
      res.json({ success: true });
    } catch (err) { handleServiceError(res, err); }
  });

  // Auto-classify ticket on creation
  app.post("/api/support/classify", requireAuth, async (req, res) => {
    try {
      const paid = await requirePaidAiAccess(req, res, "ai_response", "Support classify", "support-classify");
      if (!paid) return;
      const { subject, description } = req.body;
      if (!subject || !description) return res.status(400).json({ error: "Subject and description required" });
      const classification = await zeroSupportLearningService.classifyTicket(subject, description);
      res.json(classification);
    } catch (err) { handleServiceError(res, err); }
  });

  // Admin KB management
  app.get("/api/admin/kb/stats", requireAdmin, async (_req, res) => {
    try { res.json(await zeroSupportLearningService.getLearningStats()); } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/kb/articles", requireAdmin, async (req, res) => {
    try { res.json(await zeroSupportLearningService.getAllArticles(req.query.status as string)); } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/kb/articles/:id", requireAdmin, async (req, res) => {
    try {
      const a = await zeroSupportLearningService.getArticleById(req.params.id);
      if (!a) return res.status(404).json({ error: "Article not found" });
      res.json(a);
    } catch (err) { handleServiceError(res, err); }
  });

  app.put("/api/admin/kb/articles/:id", requireAdmin, async (req, res) => {
    try {
      const a = await zeroSupportLearningService.updateArticle(req.params.id, req.body);
      res.json(a);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/kb/articles/:id/approve", requireAdmin, async (req, res) => {
    try {
      const a = await zeroSupportLearningService.approveArticle(req.params.id, "admin");
      res.json(a);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/kb/articles/:id/reject", requireAdmin, async (req, res) => {
    try {
      const a = await zeroSupportLearningService.rejectArticle(req.params.id);
      res.json(a);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/kb/solutions", requireAdmin, async (req, res) => {
    try { res.json(await zeroSupportLearningService.getSolutions(req.query.ticketId as string)); } catch (err) { handleServiceError(res, err); }
  });

  // Extract solution from resolved ticket
  app.post("/api/admin/kb/extract/:ticketId", requireAdmin, async (req, res) => {
    try {
      const paid = await requirePaidAiAccess(req, res, "ai_response", "Admin KB extract", `admin-kb-extract:${req.params.ticketId}`);
      if (!paid) return;
      const result = await zeroSupportLearningService.autoGenerateFromTicket(req.params.ticketId);
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  // Generate KB article from solutions
  app.post("/api/admin/kb/generate-article", requireAdmin, async (req, res) => {
    try {
      const paid = await requirePaidAiAccess(req, res, "ai_response", "Admin KB generate", "admin-kb-generate");
      if (!paid) return;
      const { solutionIds } = req.body;
      if (!solutionIds?.length) return res.status(400).json({ error: "solutionIds required" });
      const article = await zeroSupportLearningService.generateKBArticle(solutionIds);
      res.json(article);
    } catch (err) { handleServiceError(res, err); }
  });

  // Email testing endpoint (admin only)
  app.post("/api/admin/email/test", requireAdmin, async (req, res) => {
    try {
      const { type, to, displayName } = req.body;
      if (!to || !displayName) return res.status(400).json({ error: "to and displayName required" });
      let result;
      switch (type) {
        case "welcome":
          result = await emailSvc.sendWelcomeEmail(to, displayName); break;
        case "verification":
          result = await emailSvc.sendVerificationEmail(to, "123456", displayName); break;
        case "account_verified":
          result = await emailSvc.sendAccountVerifiedEmail(to, displayName); break;
        case "purchase":
          result = await emailSvc.sendPurchaseConfirmation(to, displayName, {
            plan: "Pro", amount: "$19.99", transactionId: "TXN-DEMO-001", date: new Date().toLocaleDateString(),
          }); break;
        case "invoice":
          result = await emailSvc.sendInvoiceEmail(to, displayName, {
            invoiceId: "INV-DEMO-001", amount: "$19.99", period: "Jan 2026",
            items: [{ name: "Pro Plan (Monthly)", amount: "$19.99" }],
          }); break;
        case "policy":
          result = await emailSvc.sendPolicyNotification(to, displayName, {
            title: "Privacy Policy", summary: "Updated data retention and GDPR sections.", effectiveDate: "March 1, 2026",
          }); break;
        case "admin_alert":
          result = await emailSvc.sendAdminAlert(to, {
            title: "Test Alert", severity: "medium", message: "This is a test admin alert from Mougle.", actionUrl: "/admin/debug",
          }); break;
        case "password_reset":
          result = await emailSvc.sendPasswordResetEmail(to, "demo-reset-token-123", displayName); break;
        case "ticket_reply":
          result = await emailSvc.sendSupportTicketReply(to, displayName, {
            ticketId: "DEMO-001", subject: "Test Support Ticket", replyContent: "Thank you for reaching out. We've looked into your issue and it has been resolved.",
          }); break;
        case "ticket_created":
          result = await emailSvc.sendTicketCreatedNotification(to, displayName, {
            ticketId: "DEMO-001", subject: "Test Support Ticket",
          }); break;
        default:
          return res.status(400).json({ error: "Invalid type. Use: welcome, verification, account_verified, purchase, invoice, policy, admin_alert, password_reset, ticket_reply, ticket_created" });
      }
      res.json({ success: true, result });
    } catch (err) { handleServiceError(res, err); }
  });

  // ============ AUTONOMOUS OPERATIONS STACK ============
  const { autonomousOperationsService } = await import("./services/autonomous-operations-service");

  app.get("/api/admin/operations/snapshot", requireAdmin, async (_req, res) => {
    try { res.json(await autonomousOperationsService.runAllEngines()); } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/operations/stats", requireAdmin, async (_req, res) => {
    try { res.json(await autonomousOperationsService.getOpsStats()); } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/operations/actions", requireAdmin, async (req, res) => {
    try { res.json(await autonomousOperationsService.getRecentActions(req.query.engine as string)); } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/operations/pending", requireAdmin, async (_req, res) => {
    try { res.json(await autonomousOperationsService.getPendingApprovals()); } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/operations/engine/:engine/history", requireAdmin, async (req, res) => {
    try { res.json(await autonomousOperationsService.getEngineHistory(req.params.engine)); } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/operations/actions/:id/approve", requireAdmin, async (req, res) => {
    try {
      const action = await autonomousOperationsService.approveAction(req.params.id, "admin");
      res.json(action);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/operations/actions/:id/reject", requireAdmin, async (req, res) => {
    try {
      const action = await autonomousOperationsService.rejectAction(req.params.id);
      res.json(action);
    } catch (err) { handleServiceError(res, err); }
  });

  // ============ SOCIAL DISTRIBUTION HUB ============
  const { socialDistributionService } = await import("./services/social-distribution-service");

  app.get("/api/admin/sdh/analytics", requireAdmin, async (_req, res) => {
    try { res.json(await socialDistributionService.getAnalytics()); } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/sdh/accounts", requireAdmin, async (_req, res) => {
    try { res.json(await socialDistributionService.getAccounts()); } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/sdh/accounts", requireAdmin, async (req, res) => {
    try {
      const { platform, accountName, accountHandle, accessToken, refreshToken, apiKey, apiSecret } = req.body;
      if (!platform || !accountName) return res.status(400).json({ message: "platform and accountName required" });
      res.status(201).json(await socialDistributionService.addAccount({ platform, accountName, accountHandle, accessToken, refreshToken, apiKey, apiSecret }));
    } catch (err) { handleServiceError(res, err); }
  });

  app.patch("/api/admin/sdh/accounts/:id/toggle", requireAdmin, async (req, res) => {
    try {
      res.json(await socialDistributionService.toggleAccount(req.params.id, req.body.active));
    } catch (err) { handleServiceError(res, err); }
  });

  app.delete("/api/admin/sdh/accounts/:id", requireAdmin, async (req, res) => {
    try { res.json(await socialDistributionService.deleteAccount(req.params.id)); } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/sdh/config", requireAdmin, async (_req, res) => {
    try { res.json(await socialDistributionService.getConfig()); } catch (err) { handleServiceError(res, err); }
  });

  app.patch("/api/admin/sdh/config", requireAdmin, async (req, res) => {
    try { res.json(await socialDistributionService.updateConfig(req.body)); } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/sdh/detect-content", requireAdmin, async (_req, res) => {
    try { res.json(await socialDistributionService.detectImportantContent()); } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/sdh/generate-post", requireAdmin, async (req, res) => {
    try {
      const paid = await requirePaidAiAccess(req, res, "ai_response", "Admin SDH generate", "admin-sdh-generate");
      if (!paid) return;
      const { platform, sourceType, sourceId, title, description, url } = req.body;
      if (!platform || !title) return res.status(400).json({ message: "platform and title required" });
      res.json(await socialDistributionService.generatePost({ platform, sourceType, sourceId, title, description, url }));
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/sdh/posts", requireAdmin, async (req, res) => {
    try {
      res.status(201).json(await socialDistributionService.createPost(req.body));
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/sdh/posts", requireAdmin, async (req, res) => {
    try {
      const { status, platform, limit } = req.query as any;
      res.json(await socialDistributionService.getPosts({ status, platform, limit: limit ? parseInt(limit) : undefined }));
    } catch (err) { handleServiceError(res, err); }
  });

  app.patch("/api/admin/sdh/posts/:id/status", requireAdmin, async (req, res) => {
    try {
      res.json(await socialDistributionService.updatePostStatus(req.params.id, req.body.status, req.body));
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/sdh/posts/:id/publish", requireAdmin, async (req, res) => {
    try { res.json(await socialDistributionService.publishPost(req.params.id)); } catch (err) { handleServiceError(res, err); }
  });

  app.delete("/api/admin/sdh/posts/:id", requireAdmin, async (req, res) => {
    try { res.json(await socialDistributionService.deletePost(req.params.id)); } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/sdh/auto-detect", requireAdmin, async (_req, res) => {
    try { res.json(await socialDistributionService.autoDetectAndGenerate()); } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/sdh/scheduler", requireAdmin, async (_req, res) => {
    try { res.json(await socialDistributionService.getSchedulerStatus()); } catch (err) { handleServiceError(res, err); }
  });

  // ============ GROWTH AUTOPILOT STACK ============
  const { growthAutopilotService } = await import("./services/growth-autopilot-service");

  app.get("/api/admin/growth-autopilot/dashboard", requireAdmin, async (_req, res) => {
    try { res.json(await growthAutopilotService.getDashboard()); } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/growth-autopilot/config", requireAdmin, async (_req, res) => {
    try { res.json(await growthAutopilotService.getConfig()); } catch (err) { handleServiceError(res, err); }
  });

  app.patch("/api/admin/growth-autopilot/config", requireAdmin, async (req, res) => {
    try { res.json(await growthAutopilotService.updateConfig(req.body)); } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/growth-autopilot/run-cycle", requireAdmin, async (_req, res) => {
    try { res.json(await growthAutopilotService.runFullCycle()); } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/growth-autopilot/run/:system", requireAdmin, async (req, res) => {
    try {
      const sys = req.params.system;
      let result;
      switch (sys) {
        case "content": result = await growthAutopilotService.runContentEngine(); break;
        case "social": result = await growthAutopilotService.runSocialDistribution(); break;
        case "viral": result = await growthAutopilotService.runViralEngine(); break;
        case "email": result = await growthAutopilotService.runEmailAutomation(); break;
        case "optimizer": result = await growthAutopilotService.runAIOptimizer(); break;
        default: return res.status(400).json({ error: "Unknown system" });
      }
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/growth-autopilot/logs", requireAdmin, async (req, res) => {
    try { res.json(await growthAutopilotService.getLogs(Number(req.query.limit) || 50)); } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/growth-autopilot/insights", requireAdmin, async (_req, res) => {
    try { res.json(await growthAutopilotService.getInsights()); } catch (err) { handleServiceError(res, err); }
  });

  app.patch("/api/admin/growth-autopilot/insights/:id", requireAdmin, async (req, res) => {
    try { res.json(await growthAutopilotService.updateInsightStatus(req.params.id, req.body.status)); } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/growth-autopilot/email-triggers", requireAdmin, async (_req, res) => {
    try { res.json(await growthAutopilotService.getEmailTriggers()); } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/growth-autopilot/email-triggers", requireAdmin, async (req, res) => {
    try { res.json(await growthAutopilotService.createEmailTrigger(req.body)); } catch (err) { handleServiceError(res, err); }
  });

  app.patch("/api/admin/growth-autopilot/email-triggers/:id/toggle", requireAdmin, async (req, res) => {
    try { res.json(await growthAutopilotService.toggleEmailTrigger(req.params.id, req.body.active)); } catch (err) { handleServiceError(res, err); }
  });

  // ============ VIRAL BONDSCORE ============
  const { bondscoreService } = await import("./services/bondscore-service");

  app.post("/api/bondscore/create", async (req, res) => {
    try {
      const { creatorId, title, description, coverEmoji, questions } = req.body;
      if (!creatorId || !title || !questions) return res.status(400).json({ message: "creatorId, title, and questions required" });
      const test = await bondscoreService.createTest(creatorId, { title, description, coverEmoji, questions });
      res.status(201).json(test);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/bondscore/test/:slug", async (req, res) => {
    try {
      const test = await bondscoreService.getTestBySlug(req.params.slug);
      if (!test) return res.status(404).json({ message: "Test not found" });
      res.json(test);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/bondscore/submit", async (req, res) => {
    try {
      const { testId, guestId, selectedAnswers } = req.body;
      if (!testId || !guestId || !selectedAnswers) return res.status(400).json({ message: "testId, guestId, and selectedAnswers required" });
      const result = await bondscoreService.submitAttempt(testId, { guestId, selectedAnswers });
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/bondscore/claim", async (req, res) => {
    try {
      const { shareId, userId } = req.body;
      if (!shareId || !userId) return res.status(400).json({ message: "shareId and userId required" });
      const result = await bondscoreService.claimAttempt(shareId, userId);
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/bondscore/result/:shareId", async (req, res) => {
    try {
      const userId = req.query.userId as string | undefined;
      const result = await bondscoreService.getResult(req.params.shareId, userId);
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/bondscore/my-tests/:userId", async (req, res) => {
    try {
      res.json(await bondscoreService.getMyTests(req.params.userId));
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/bondscore/dashboard/:userId", async (req, res) => {
    try {
      res.json(await bondscoreService.getDashboardStats(req.params.userId));
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/bondscore/ai-generate", requireAuth, async (req, res) => {
    try {
      const paid = await requirePaidAiAccess(req, res, "ai_response", "BondScore AI", "bondscore-ai");
      if (!paid) return;
      const questions = await bondscoreService.generateAIQuestions(req.body.topic);
      res.json({ questions });
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/bondscore/stats", requireAdmin, async (_req, res) => {
    try { res.json(await bondscoreService.getAdminStats()); } catch (err) { handleServiceError(res, err); }
  });

  // ============ INEVITABLE PLATFORM MONITOR ============
  const { inevitablePlatformService } = await import("./services/inevitable-platform-service");

  app.get("/api/admin/inevitable-platform", requireAdmin, async (_req, res) => {
    try { res.json(await inevitablePlatformService.getFullAnalysis()); } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/inevitable-platform/snapshot", requireAdmin, async (_req, res) => {
    try { res.json(await inevitablePlatformService.captureSnapshot()); } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/inevitable-platform/history", requireAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 30;
      res.json(await inevitablePlatformService.getHistory(limit));
    } catch (err) { handleServiceError(res, err); }
  });

  // ============ AUTHORITY FLYWHEEL ============
  const { authorityFlywheelService } = await import("./services/authority-flywheel-service");

  app.get("/api/admin/authority-flywheel", requireAdmin, async (_req, res) => {
    try { res.json(await authorityFlywheelService.getFullAnalysis()); } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/authority-flywheel/snapshot", requireAdmin, async (_req, res) => {
    try { res.json(await authorityFlywheelService.captureSnapshot()); } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/authority-flywheel/history", requireAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 30;
      res.json(await authorityFlywheelService.getHistory(limit));
    } catch (err) { handleServiceError(res, err); }
  });

  // ============ SILENT SEO DOMINANCE ============
  const { silentSeoService } = await import("./services/silent-seo-service");

  app.get("/api/knowledge/:slug", async (req, res) => {
    try {
      const page = await silentSeoService.getKnowledgePage(req.params.slug);
      if (!page) return res.status(404).json({ message: "Page not found" });
      res.json(page);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/knowledge", async (_req, res) => {
    try { res.json(await silentSeoService.getAllPages("published")); } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/knowledge/citation/:pageId", async (req, res) => {
    try { res.json(await silentSeoService.recordCitation(req.params.pageId)); } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/seo/dashboard", requireAdmin, async (_req, res) => {
    try { res.json(await silentSeoService.getSeoDashboard()); } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/seo/pages", requireAdmin, async (req, res) => {
    try { res.json(await silentSeoService.getAllPages(req.query.status as string)); } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/seo/clusters", requireAdmin, async (_req, res) => {
    try { res.json(await silentSeoService.getClusters()); } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/seo/clusters/:id", requireAdmin, async (req, res) => {
    try {
      const result = await silentSeoService.getClusterWithPages(req.params.id);
      if (!result) return res.status(404).json({ message: "Cluster not found" });
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/seo/generate-page", requireAdmin, async (req, res) => {
    try {
      const paid = await requirePaidAiAccess(req, res, "ai_response", "Admin SEO page", "admin-seo-page");
      if (!paid) return;
      const { topicSlug, customTitle, customDesc } = req.body;
      if (!topicSlug) return res.status(400).json({ message: "topicSlug required" });
      res.json(await silentSeoService.generateKnowledgePage(topicSlug, { customTitle, customDesc }));
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/seo/auto-generate", requireAdmin, async (_req, res) => {
    try {
      const paid = await requirePaidAiAccess(_req, res, "ai_response", "Admin SEO auto generate", "admin-seo-auto");
      if (!paid) return;
      res.json(await silentSeoService.autoGenerateForAllTopics());
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/seo/pages/:id/publish", requireAdmin, async (req, res) => {
    try {
      const page = await silentSeoService.publishPage(req.params.id);
      if (!page) return res.status(404).json({ message: "Page not found" });
      res.json(page);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/seo/pages/:id/update-insights", requireAdmin, async (req, res) => {
    try {
      const paid = await requirePaidAiAccess(req, res, "ai_response", "Admin SEO update insights", `admin-seo-update:${req.params.id}`);
      if (!paid) return;
      res.json(await silentSeoService.updatePageWithInsights(req.params.id));
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/seo/update-all", requireAdmin, async (_req, res) => {
    try {
      const paid = await requirePaidAiAccess(_req, res, "ai_response", "Admin SEO update all", "admin-seo-update-all");
      if (!paid) return;
      res.json(await silentSeoService.updateAllPagesWithInsights());
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/seo/create-cluster", requireAdmin, async (req, res) => {
    try {
      const paid = await requirePaidAiAccess(req, res, "ai_response", "Admin SEO create cluster", "admin-seo-cluster");
      if (!paid) return;
      const { name, topicSlugs, description } = req.body;
      if (!name || !topicSlugs?.length) return res.status(400).json({ message: "name and topicSlugs required" });
      res.json(await silentSeoService.createTopicCluster({ name, topicSlugs, description }));
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/seo/clusters/:id/build-pages", requireAdmin, async (req, res) => {
    try {
      const paid = await requirePaidAiAccess(req, res, "ai_response", "Admin SEO build cluster pages", `admin-seo-build:${req.params.id}`);
      if (!paid) return;
      res.json(await silentSeoService.buildClusterPages(req.params.id));
    } catch (err) { handleServiceError(res, err); }
  });

  // ============ $0 MARKETING ENGINE ============
  const { marketingEngineService } = await import("./services/marketing-engine-service");

  app.get("/api/marketing/articles", async (req, res) => {
    try { res.json(await marketingEngineService.getArticles("published")); } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/marketing/articles/:slug", async (req, res) => {
    try {
      const article = await marketingEngineService.getArticleBySlug(req.params.slug);
      if (!article) return res.status(404).json({ message: "Article not found" });
      res.json(article);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/marketing/seo/:slug", async (req, res) => {
    try {
      const page = await marketingEngineService.getSeoPageBySlug(req.params.slug);
      if (!page) return res.status(404).json({ message: "Page not found" });
      res.json(page);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/marketing/referral", resolveUser, async (req: any, res) => {
    try { res.json(await marketingEngineService.getOrCreateReferralLink(req.user.id)); } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/marketing/referral/:code/click", async (req, res) => {
    try { res.json({ tracked: await marketingEngineService.trackReferralClick(req.params.code) }); } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/marketing/convert-discussion", requireAdmin, async (req, res) => {
    try {
      const paid = await requirePaidAiAccess(req, res, "ai_response", "Admin marketing convert discussion", "admin-marketing-convert");
      if (!paid) return;
      const { postId } = req.body;
      if (!postId) return res.status(400).json({ message: "postId required" });
      res.json(await marketingEngineService.convertDiscussionToArticle(postId));
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/marketing/generate-seo-page", requireAdmin, async (req, res) => {
    try {
      const paid = await requirePaidAiAccess(req, res, "ai_response", "Admin marketing SEO page", "admin-marketing-seo");
      if (!paid) return;
      const { type, referenceId, name, description } = req.body;
      if (!type || !name) return res.status(400).json({ message: "type and name required" });
      res.json(await marketingEngineService.generateSeoPage(type, referenceId || "", { name, description: description || name }));
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/marketing/auto-seo-pages", requireAdmin, async (_req, res) => {
    try {
      const paid = await requirePaidAiAccess(_req, res, "ai_response", "Admin marketing auto SEO", "admin-marketing-auto-seo");
      if (!paid) return;
      res.json(await marketingEngineService.autoGenerateToolSeoPages());
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/marketing/daily-summary", requireAdmin, async (_req, res) => {
    try {
      const paid = await requirePaidAiAccess(_req, res, "ai_response", "Admin marketing daily summary", "admin-marketing-summary");
      if (!paid) return;
      res.json(await marketingEngineService.generateDailySummary());
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/marketing/select-social", requireAdmin, async (_req, res) => {
    try {
      const paid = await requirePaidAiAccess(_req, res, "ai_response", "Admin marketing select social", "admin-marketing-select-social");
      if (!paid) return;
      res.json(await marketingEngineService.selectHighQualityForSocial());
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/marketing/articles/:id/publish", requireAdmin, async (req, res) => {
    try {
      const article = await marketingEngineService.publishArticle(req.params.id);
      if (!article) return res.status(404).json({ message: "Article not found" });
      res.json(article);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/marketing/seo-pages/:id/index", requireAdmin, async (req, res) => {
    try {
      const page = await marketingEngineService.indexSeoPage(req.params.id);
      if (!page) return res.status(404).json({ message: "Page not found" });
      res.json(page);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/marketing/articles", requireAdmin, async (req, res) => {
    try { res.json(await marketingEngineService.getArticles(req.query.status as string)); } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/marketing/seo-pages", requireAdmin, async (_req, res) => {
    try { res.json(await marketingEngineService.getSeoPages()); } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/marketing/referrals", requireAdmin, async (_req, res) => {
    try { res.json(await marketingEngineService.getReferralStats()); } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/marketing/dashboard", requireAdmin, async (_req, res) => {
    try { res.json(await marketingEngineService.getGrowthDashboard()); } catch (err) { handleServiceError(res, err); }
  });

  // ============ ON-DEMAND DEV & BOOTSTRAP SURVIVAL ============
  const { onDemandDevService } = await import("./services/on-demand-dev-service");

  app.post("/api/dev-orders/calculate", resolveUser, async (req: any, res) => {
    try {
      const { appDescription, requirements } = req.body;
      if (!appDescription) return res.status(400).json({ message: "App description required" });
      res.json(onDemandDevService.calculatePricing(appDescription, requirements));
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/dev-orders", resolveUser, async (req: any, res) => {
    try {
      const { appName, appDescription, requirements, paymentReference } = req.body;
      if (!appName || !appDescription) return res.status(400).json({ message: "App name and description required" });
      const order = await onDemandDevService.createOrder(req.user.id, { appName, appDescription, requirements, paymentReference });
      res.json(order);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/dev-orders", resolveUser, async (req: any, res) => {
    try { res.json(await onDemandDevService.getUserOrders(req.user.id)); } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/dev-orders/:id", resolveUser, async (req: any, res) => {
    try {
      const order = await onDemandDevService.getOrder(req.params.id);
      if (!order) return res.status(404).json({ message: "Order not found" });
      res.json(order);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/dev-orders/:id/confirm-payment", resolveUser, async (req: any, res) => {
    try {
      const order = await onDemandDevService.confirmPayment(req.params.id, req.body.paymentReference || "manual");
      if (!order) return res.status(404).json({ message: "Order not found" });
      res.json(order);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/dev-orders", requireAdmin, async (req, res) => {
    try { res.json(await onDemandDevService.getAllOrders(req.query.stage as string)); } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/dev-orders/queue", requireAdmin, async (_req, res) => {
    try { res.json(await onDemandDevService.getBuildQueue()); } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/dev-orders/:id/stage", requireAdmin, async (req, res) => {
    try {
      const { stage, note } = req.body;
      if (!stage || !["QUEUED", "DEVELOPING", "TESTING", "DELIVERED"].includes(stage)) {
        return res.status(400).json({ message: "Invalid stage" });
      }
      const order = await onDemandDevService.updateStage(req.params.id, stage, note);
      if (!order) return res.status(404).json({ message: "Order not found" });
      res.json(order);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/bootstrap-health", requireAdmin, async (_req, res) => {
    try { res.json(await onDemandDevService.getBootstrapHealth()); } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/admin/bootstrap-config", requireAdmin, async (_req, res) => {
    try { res.json({ dailyBuildLimit: onDemandDevService.getDailyBuildLimit() }); } catch (err) { handleServiceError(res, err); }
  });

  app.put("/api/admin/bootstrap-config", requireAdmin, async (req, res) => {
    try {
      const { dailyBuildLimit } = req.body;
      if (typeof dailyBuildLimit === "number") {
        onDemandDevService.setDailyBuildLimit(dailyBuildLimit);
      }
      res.json({ dailyBuildLimit: onDemandDevService.getDailyBuildLimit() });
    } catch (err) { handleServiceError(res, err); }
  });

  // ============ PNR MONITOR ============
  const { pnrMonitorService } = await import("./services/pnr-monitor-service");

  app.get("/api/admin/pnr-monitor", requireAdmin, async (_req, res) => {
    try { res.json(await pnrMonitorService.computeSnapshot()); } catch (err) { handleServiceError(res, err); }
  });

  // ============ FOUNDER MINIMAL WORKDAY ============
  app.get("/api/admin/workday", requireAdmin, async (_req, res) => {
    try {
      const [opsSnapshot, ticketStats, kbArticles, policyDashboard, gcisData] = await Promise.allSettled([
        autonomousOperationsService.runAllEngines(),
        (await import("./services/support-ticket-service")).supportTicketService.getTicketStats(),
        (await import("./services/zero-support-learning-service")).zeroSupportLearningService.getAllArticles("published"),
        (await import("./services/adaptive-policy-service")).adaptivePolicyService.getDashboard(),
        (await import("./services/gcis-service")).gcisService.getDashboard(),
      ]);

      const ops = opsSnapshot.status === "fulfilled" ? opsSnapshot.value : null;
      const tickets = ticketStats.status === "fulfilled" ? ticketStats.value : { total: 0, open: 0, inProgress: 0, waitingUser: 0, resolved: 0, closed: 0 };
      const kbCount = kbArticles.status === "fulfilled" ? kbArticles.value.length : 0;
      const policy = policyDashboard.status === "fulfilled" ? policyDashboard.value : null;
      const gcis = gcisData.status === "fulfilled" ? gcisData.value : null;

      const panicStatus = panicButtonService.getStatus();
      const stabilitySnap = stabilityTriangleService.getSnapshot();

      const totalTickets = tickets.total || 0;
      const resolvedTickets = (tickets.resolved || 0) + (tickets.closed || 0);
      const automationRate = totalTickets > 0 ? Math.round((resolvedTickets / totalTickets) * 100) : 100;

      const economicEngine = ops?.engines?.find((e: any) => e.engine === "economic");
      const aiCostVsRevenue = economicEngine?.metrics || { estimatedRevenue: 0, aiComputeCost: 0, margin: 0 };

      const pendingApprovals: any[] = [];
      if (ops?.pendingApprovals?.length) {
        for (const a of ops.pendingApprovals.slice(0, 10)) {
          pendingApprovals.push({ id: a.id, type: "operations", engine: a.engine, action: a.actionType, severity: a.severity, created: a.createdAt });
        }
      }
      const pendingGcisApprovals = gcis?.stats?.pendingApproval ?? 0;
      if (pendingGcisApprovals > 0) {
        pendingApprovals.push({ id: "gcis-pending", type: "compliance", engine: "compliance", action: `${pendingGcisApprovals} compliance rules pending review`, severity: "warning", created: new Date().toISOString() });
      }
      if (policy?.pendingDrafts?.length) {
        for (const d of (policy.pendingDrafts as any[]).slice(0, 5)) {
          pendingApprovals.push({ id: d.id || "policy-draft", type: "policy", engine: "policy", action: `Policy draft: ${d.slug || d.type || "update"}`, severity: "info", created: d.createdAt || new Date().toISOString() });
        }
      }

      const actionableItems: any[] = [];
      if (panicStatus.mode !== "NORMAL") {
        actionableItems.push({ priority: "critical", label: `Platform in ${panicStatus.mode} mode`, link: "/admin/debug" });
      }
      if (pendingApprovals.length > 0) {
        actionableItems.push({ priority: "warning", label: `${pendingApprovals.length} items awaiting your approval`, link: "/admin/operations" });
      }
      if (tickets.open > 5) {
        actionableItems.push({ priority: "warning", label: `${tickets.open} open support tickets`, link: "/admin/support" });
      }
      if (ops?.engines?.some((e: any) => e.status === "critical")) {
        const criticalEngines = ops.engines.filter((e: any) => e.status === "critical").map((e: any) => e.engine);
        actionableItems.push({ priority: "critical", label: `Critical: ${criticalEngines.join(", ")} engine(s)`, link: "/admin/operations" });
      }
      if (automationRate < 50) {
        actionableItems.push({ priority: "info", label: `Support automation at ${automationRate}% — consider KB improvements`, link: "/admin/knowledge-base" });
      }

      let dailySummary = ops?.summary || "";
      if (!dailySummary) {
        try {
          const paid = await requirePaidAiAccess(_req, res, "ai_response", "Admin workday summary", "admin-workday-summary");
          if (!paid) return;
          const openai = new (await import("openai")).default({
            baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || "https://api.openai.com/v1",
            apiKey: process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
          });
          const resp = await openai.chat.completions.create({
            model: "gpt-5.2",
            messages: [{ role: "system", content: "You are a concise executive briefing writer. Write a 3-4 sentence daily summary for a founder dashboard. Focus only on what needs attention. Be direct." }, {
              role: "user",
              content: `Health: ${ops?.overallHealth || 0}%. Mode: ${panicStatus.mode}. Stability: ${stabilitySnap.stabilityIndex}%. Revenue metric: ${aiCostVsRevenue.estimatedRevenue}. AI cost: ${aiCostVsRevenue.aiComputeCost}. Margin: ${aiCostVsRevenue.margin}%. Open tickets: ${tickets.open}. Automation: ${automationRate}%. Pending approvals: ${pendingApprovals.length}. KB articles: ${kbCount}. Compliance rules pending: ${gcis?.stats?.pendingApproval || 0}.`
            }],
            temperature: 0.3,
            max_tokens: 200,
          });
          dailySummary = resp.choices[0]?.message?.content || "";
        } catch {
          dailySummary = `Platform at ${ops?.overallHealth || 0}% health in ${panicStatus.mode} mode. ${pendingApprovals.length} pending approvals. ${tickets.open} open tickets.`;
        }
      }

      res.json({
        generatedAt: new Date().toISOString(),
        systemHealth: {
          overall: ops?.overallHealth || 0,
          status: ops?.overallStatus || "unknown",
          platformMode: panicStatus.mode,
          engines: (ops?.engines || []).map((e: any) => ({ name: e.engine, status: e.status, score: e.score })),
        },
        financials: {
          estimatedRevenue: aiCostVsRevenue.estimatedRevenue,
          aiComputeCost: aiCostVsRevenue.aiComputeCost,
          margin: aiCostVsRevenue.margin,
        },
        pendingApprovals,
        policyUpdates: {
          pendingDrafts: policy?.pendingDrafts?.length || 0,
          activeTemplates: policy?.templates?.length || 0,
          complianceRulesPending: gcis?.stats?.pendingApproval || 0,
        },
        supportAutomation: {
          automationRate,
          openTickets: tickets.open || 0,
          inProgress: tickets.inProgress || 0,
          kbArticlesPublished: kbCount,
          totalResolved: resolvedTickets,
        },
        stabilityIndex: {
          score: stabilitySnap.stabilityIndex,
          dimensions: {
            freedom: (stabilitySnap as any).freedom?.value ?? (stabilitySnap as any).freedom ?? 0,
            automation: (stabilitySnap as any).automation?.value ?? (stabilitySnap as any).automation ?? 0,
            control: (stabilitySnap as any).control?.value ?? (stabilitySnap as any).control ?? 0,
          },
        },
        actionableItems,
        dailySummary,
      });
    } catch (err) { handleServiceError(res, err); }
  });

  // ==================== PROJECT PIPELINE & PDF ENGINE ====================

  app.get("/api/projects", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const projectList = await storage.getProjects(limit);
      res.json(projectList);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) return res.status(404).json({ error: "Project not found" });
      res.json(project);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/projects/:id/agents", requireAuth, async (req, res) => {
    try {
      const contributions = await storage.getProjectAgentContributions(req.params.id);
      res.json(contributions);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/projects/:id/agents", requireAuth, async (req, res) => {
    try {
      const entries = Array.isArray(req.body?.agents) ? req.body.agents : [];
      const created = [];
      for (const entry of entries) {
        const agentId = entry?.agentId;
        if (!agentId) continue;
        created.push(await storage.createProjectAgentContribution({
          projectId: req.params.id,
          agentId,
          role: entry?.role || "contributor",
          contributionWeight: Number(entry?.contributionWeight) || 1,
        }));
      }
      res.json(created);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/projects/generate-from-debate/:debateId", requireAuth, async (req, res) => {
    try {
      const paid = await requirePaidAiAccess(req, res, "premium_feature", "Project pipeline", `debate:${req.params.debateId}`);
      if (!paid) return;
      const debateId = parseInt(req.params.debateId);
      if (isNaN(debateId)) return res.status(400).json({ error: "Invalid debate ID" });
      const triggeredBy = (req.body?.triggeredBy as string) || "manual";
      const { projectPipelineService } = await import("./services/project-pipeline-service");
      const project = await projectPipelineService.generateProjectFromDebate(debateId, triggeredBy);
      const contributions = Array.isArray(req.body?.agents) ? req.body.agents : [];
      for (const entry of contributions) {
        const agentId = entry?.agentId;
        if (!agentId) continue;
        await storage.createProjectAgentContribution({
          projectId: project.id,
          agentId,
          role: entry?.role || "contributor",
          contributionWeight: Number(entry?.contributionWeight) || 1,
        });
      }
      res.json(project);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/projects/:id/generate-pdf", requireAuth, async (req, res) => {
    try {
      const paid = await requirePaidAiAccess(req, res, "premium_feature", "Project PDF", `project:${req.params.id}`);
      if (!paid) return;
      const { pdfEngineService } = await import("./services/pdf-engine-service");
      const result = await pdfEngineService.generatePDF(req.params.id);
      res.json({ success: true, pages: result.pages, packageId: result.packageId, downloadUrl: `/api/projects/${req.params.id}/packages/${result.packageId}/download` });
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/projects/:id/packages", async (req, res) => {
    try {
      const packages = await storage.getProjectPackages(req.params.id);
      res.json(packages);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/projects/:projectId/packages/:packageId/download", async (req, res) => {
    try {
      if (!req.session?.userId) return res.status(401).json({ error: "Authentication required" });
      const pkg = await storage.getProjectPackage(req.params.packageId);
      if (!pkg || pkg.projectId !== req.params.projectId) return res.status(404).json({ error: "Package not found" });
      const [app] = await db.select().from(labsApps).where(eq(labsApps.projectPackageId, pkg.id)).limit(1);
      const price = app?.price || 0;
      if (price > 0) {
        const purchased = await storage.hasProjectPackagePurchase(pkg.id, req.session.userId);
        if (!purchased) return res.status(403).json({ error: "Purchase required to download" });
      }
      const { pdfEngineService } = await import("./services/pdf-engine-service");
      const fileName = pkg.pdfUrl;
      if (!fileName) return res.status(404).json({ error: "PDF file not found" });
      const filePath = pdfEngineService.getPDFFilePath(fileName);
      if (!filePath) return res.status(404).json({ error: "PDF file not found on disk" });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
      const fs = await import("fs");
      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/projects/:projectId/packages/:packageId/purchase", requireAuth, async (req, res) => {
    try {
      const pkg = await storage.getProjectPackage(req.params.packageId);
      if (!pkg || pkg.projectId !== req.params.projectId) return res.status(404).json({ error: "Package not found" });
      const [app] = await db.select().from(labsApps).where(eq(labsApps.projectPackageId, pkg.id)).limit(1);
      const price = app?.price || 0;
      const existing = await storage.hasProjectPackagePurchase(pkg.id, req.user.id);
      if (existing) return res.json({ success: true, alreadyPurchased: true });
      if (price > 0) {
        await db.transaction(async (tx) => {
          const [buyerUpdated] = await tx.update(users_table)
            .set({ creditWallet: sql`COALESCE(${users_table.creditWallet}, 0) - ${price}` })
            .where(and(eq(users_table.id, req.user.id), gte(users_table.creditWallet, price)))
            .returning({ id: users_table.id });
          if (!buyerUpdated) throw new Error("Insufficient credits");

          await tx.insert(creditUsageLog).values({
            userId: req.user.id,
            creditsUsed: price,
            actionType: "project_package_purchase",
            actionLabel: `Project package purchase: ${pkg.id}`,
            referenceId: pkg.id,
          });

          await tx.insert(transactions_table).values({
            senderId: req.user.id,
            receiverId: "system",
            amount: price,
            transactionType: "project_package_purchase",
            referenceId: pkg.id,
            description: `Project package purchase: ${pkg.id}`,
          });

          await tx.insert(projectPackagePurchases).values({
            projectPackageId: pkg.id,
            buyerId: req.user.id,
            amount: price,
          });
        });
      } else {
        await storage.createProjectPackagePurchase({
          projectPackageId: pkg.id,
          buyerId: req.user.id,
          amount: price,
        });
      }
      res.json({ success: true, price });
    } catch (err: any) {
      if (err.message?.includes("Insufficient credits")) {
        return res.status(402).json({ error: err.message });
      }
      handleServiceError(res, err);
    }
  });

  app.post("/api/projects/:projectId/packages/:packageId/feedback", requireAuth, async (req, res) => {
    try {
      const pkg = await storage.getProjectPackage(req.params.packageId);
      if (!pkg || pkg.projectId !== req.params.projectId) return res.status(404).json({ error: "Package not found" });
      const { rating, comment } = req.body;
      if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: "Rating must be 1-5" });
      const feedback = await storage.createProjectFeedback({
        projectPackageId: req.params.packageId,
        buyerId: req.user.id,
        rating,
        comment: comment || null,
      });
      res.json(feedback);
    } catch (err) { handleServiceError(res, err); }
  });

  return httpServer;
}
