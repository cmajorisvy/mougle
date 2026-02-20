import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { insertPostSchema, insertCommentSchema, insertClaimSchema, insertEvidenceSchema } from "@shared/schema";
import { authService, signupSchema, generateApiToken } from "./services/auth-service";
import { discussionService } from "./services/discussion-service";
import { trustEngine } from "./services/trust-engine";
import { agentService } from "./services/agent-service";
import { reputationService } from "./services/reputation-service";
import { agentOrchestrator } from "./services/agent-orchestrator";
import { economyService } from "./services/economy-service";
import { agentLearningService } from "./services/agent-learning-service";
import { collaborationService } from "./services/agent-collaboration-service";
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
  agentReviews as agentReviews_table,
} from "@shared/schema";
import { eq, desc, asc, sql } from "drizzle-orm";
import * as debateOrchestrator from "./services/debate-orchestrator";
import * as contentFlywheel from "./services/content-flywheel-service";
import { newsPipelineService } from "./services/news-pipeline-service";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { moderateContent, moderateUsername, recordViolation, isUserSpammer, isUserShadowBanned, sanitizeHTML, sanitizeLinks, getUserModerationStatus, stripLinksForSpammer, type ContentCategory } from "./services/content-moderation-service";
import { postCooldownMiddleware } from "./middleware/rate-limiter";
import { aiGateway } from "./services/ai-gateway";

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || bcrypt.hashSync("SunValue@1978", 10);
const adminSessions = new Map<string, { expiresAt: number }>();

function generateAdminToken(): string {
  return `admin_${crypto.randomBytes(32).toString("hex")}`;
}

function verifyAdminToken(req: any): boolean {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return false;
  const token = authHeader.slice(7);
  const session = adminSessions.get(token);
  if (!session) return false;
  if (Date.now() > session.expiresAt) {
    adminSessions.delete(token);
    return false;
  }
  return true;
}

function requireAdmin(req: any, res: any, next: any) {
  if (!verifyAdminToken(req)) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
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

  app.post("/api/agents/register", async (req, res) => {
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

  app.post("/api/auth/signin", async (req, res) => {
    try {
      const result = await authService.signin(req.body.email, req.body.password);
      res.json(result);
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
      const topicSlug = req.query.topic as string | undefined;
      res.json(await discussionService.listPosts(topicSlug));
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/posts/:id", async (req, res) => {
    try {
      res.json(await discussionService.getPost(req.params.id));
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/posts", postCooldownMiddleware, async (req, res) => {
    try {
      const parsed = insertPostSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

      if (parsed.data.authorId && await isUserSpammer(parsed.data.authorId)) {
        return res.status(403).json({ message: "Your account has been flagged for spam. You cannot create posts." });
      }

      const modResult = moderateContent(sanitizeHTML(parsed.data.content), parsed.data.title);
      if (!modResult.allowed) {
        if (parsed.data.authorId) await recordViolation(parsed.data.authorId, modResult.isSpam, modResult.category, "post", parsed.data.content?.substring(0, 200));
        return res.status(400).json({ message: "Content violates platform safety guidelines." });
      }

      res.status(201).json(await discussionService.createPost(parsed.data));
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/posts/:id/like", async (req, res) => {
    try {
      res.json(await discussionService.toggleLike(req.params.id, req.body.userId));
    } catch (err) { handleServiceError(res, err); }
  });

  // ---- CLAIMS ----
  app.post("/api/posts/:postId/claims", async (req, res) => {
    try {
      const data = { ...req.body, postId: req.params.postId };
      const parsed = insertClaimSchema.safeParse(data);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      res.status(201).json(await discussionService.createClaim(parsed.data));
    } catch (err) { handleServiceError(res, err); }
  });

  // ---- EVIDENCE ----
  app.post("/api/posts/:postId/evidence", async (req, res) => {
    try {
      const data = { ...req.body, postId: req.params.postId };
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

  app.post("/api/posts/:postId/comments", postCooldownMiddleware, async (req, res) => {
    try {
      const data = { ...req.body, postId: req.params.postId };
      const parsed = insertCommentSchema.safeParse(data);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

      if (parsed.data.authorId && await isUserSpammer(parsed.data.authorId)) {
        return res.status(403).json({ message: "Your account has been flagged for spam. You cannot post comments." });
      }

      const modResult = moderateContent(sanitizeHTML(parsed.data.content));
      if (!modResult.allowed) {
        if (parsed.data.authorId) await recordViolation(parsed.data.authorId, modResult.isSpam, modResult.category, "comment", parsed.data.content?.substring(0, 200));
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
            capabilities: agent.capabilities,
            lastActiveAt: lastActivity?.createdAt || null,
            isActive: orchestratorStatus.activeAgentIds.includes(agent.id),
          };
        })
      );
      res.json({
        ...orchestratorStatus,
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

  app.post("/api/agent-orchestrator/trigger", async (_req, res) => {
    try {
      await agentOrchestrator.triggerCycle();
      res.json({ message: "Cycle triggered", status: agentOrchestrator.getStatus() });
    } catch (err) { handleServiceError(res, err); }
  });

  // ---- ECONOMY ----
  app.get("/api/economy/wallet/:userId", async (req, res) => {
    try {
      res.json(await economyService.getWallet(req.params.userId));
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/economy/transactions/:userId", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      res.json(await economyService.getTransactionHistory(req.params.userId, Math.min(limit, 200)));
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/economy/spend", async (req, res) => {
    try {
      const { userId, amount, type, referenceId, description } = req.body;
      if (!userId || typeof amount !== "number" || amount <= 0 || !type) {
        return res.status(400).json({ message: "Valid userId, positive amount, and type required" });
      }
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      if (user.role !== "agent") return res.status(403).json({ message: "Only agents can spend credits via API" });
      const apiToken = req.headers["x-api-token"] as string;
      if (!apiToken || apiToken !== user.apiToken) {
        return res.status(401).json({ message: "Invalid or missing API token" });
      }
      await economyService.spendCredits(userId, amount, type, referenceId, description);
      const wallet = await economyService.getWallet(userId);
      res.json({ success: true, wallet });
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/economy/transfer", async (req, res) => {
    try {
      const { senderId, receiverId, amount, serviceType, referenceId } = req.body;
      if (!senderId || !receiverId || typeof amount !== "number" || amount <= 0 || !serviceType) {
        return res.status(400).json({ message: "Valid senderId, receiverId, positive amount, and serviceType required" });
      }
      const sender = await storage.getUser(senderId);
      if (!sender) return res.status(404).json({ message: "Sender not found" });
      const apiToken = req.headers["x-api-token"] as string;
      if (!apiToken || apiToken !== sender.apiToken) {
        return res.status(401).json({ message: "Invalid or missing API token" });
      }
      const tx = await economyService.transferCredits(senderId, receiverId, amount, serviceType, referenceId);
      res.json(tx);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/economy/metrics", async (_req, res) => {
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
        email: "nexus@dig8opia.ai",
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
        agentApiEndpoint: "https://api.dig8opia.ai/nexus",
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
        email: "econ@dig8opia.ai",
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
        agentApiEndpoint: "https://api.dig8opia.ai/econbot",
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

  // ---- LIVE DEBATES ----
  app.post("/api/debates", async (req, res) => {
    try {
      const { topic, description } = req.body;
      if (topic || description) {
        const modResult = moderateContent(sanitizeHTML(description || ""), topic);
        if (!modResult.allowed) {
          return res.status(400).json({ message: "Content violates platform safety guidelines." });
        }
      }
      const debate = await debateOrchestrator.createDebate(req.body);
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

  app.post("/api/debates/:id/join", async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const { userId, participantType, position } = req.body;
      const participant = await debateOrchestrator.joinDebate(id, userId, participantType, position);
      res.json(participant);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/debates/:id/auto-populate", async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const count = parseInt(req.body.count) || 3;
      const added = await debateOrchestrator.autoPopulateAgents(id, count);
      res.json(added);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/debates/:id/start", async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const debate = await debateOrchestrator.startDebate(id);
      res.json(debate);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/debates/:id/turn", async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const { userId, content } = req.body;
      const turn = await debateOrchestrator.submitHumanTurn(id, userId, content);
      res.json(turn);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/debates/:id/quick-run", async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const agentCount = parseInt(req.body.agentCount) || 3;
      const rounds = req.body.rounds ? parseInt(req.body.rounds) : undefined;
      const result = await debateOrchestrator.quickRunDebate(id, agentCount, rounds);
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/debates/:id/end", async (req, res) => {
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
  app.post("/api/debates/:id/studio/setup", async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const { youtubeStreamKey } = req.body;
      const debate = await storage.getLiveDebate(id);
      if (!debate) return res.status(404).json({ message: "Debate not found" });

      const agents = await storage.getAgentUsers();
      const participants = await storage.getDebateParticipants(id);
      const currentIds = new Set(participants.map(p => p.userId));

      let femaleAgent = agents.find(a => a.displayName === "Dig8opia Female Agent");
      let maleAgent = agents.find(a => a.displayName === "Dig8opia Male Agent");

      if (!femaleAgent) {
        femaleAgent = await storage.createUser({
          username: "dig8opia_female",
          password: await bcrypt.hash("agent_studio_internal", 10),
          displayName: "Dig8opia Female Agent",
          email: `dig8opia_female@dig8opia.ai`,
          avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Dig8opiaFemale&style=circle&hair=long&hairColor=purple&skin=light",
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
          username: "dig8opia_male",
          password: await bcrypt.hash("agent_studio_internal", 10),
          displayName: "Dig8opia Male Agent",
          email: `dig8opia_male@dig8opia.ai`,
          avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Dig8opiaMale&style=circle&hair=shortHairDreads01&hairColor=black&skin=brown",
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

  app.post("/api/debates/:id/studio/override-speaker", async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const { speakerId } = req.body;
      await storage.updateLiveDebate(id, { currentSpeakerId: speakerId || null });
      debateOrchestrator.emitOverride(id, speakerId);
      res.json({ success: true, currentSpeakerId: speakerId });
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/debates/:id/studio/speech", async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const { transcript, userId } = req.body;
      if (!transcript || !userId) return res.status(400).json({ message: "transcript and userId required" });
      const turn = await debateOrchestrator.submitHumanTurn(id, userId, transcript);
      res.json(turn);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/debates/:id/studio/tts", async (req, res) => {
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
  app.post("/api/flywheel/trigger/:debateId", async (req, res) => {
    try {
      const debateId = parseInt(req.params.debateId as string);
      const job = await contentFlywheel.runFlywheelPipeline(debateId);
      res.status(201).json(job);
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
      const { username, password } = req.body;
      if (username !== ADMIN_USERNAME || !bcrypt.compareSync(password, ADMIN_PASSWORD_HASH)) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      const token = generateAdminToken();
      adminSessions.set(token, { expiresAt: Date.now() + 24 * 60 * 60 * 1000 });
      res.json({ token, expiresIn: 86400 });
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/logout", requireAdmin, (req, res) => {
    const token = req.headers.authorization?.slice(7);
    if (token) adminSessions.delete(token);
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
        newsPipelineService.getArticles(limit, category, offset),
        newsPipelineService.countArticles(category),
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
      const limit = parseInt(req.query.limit as string) || 5;
      const articles = await newsPipelineService.getLatestNews(limit);
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

  app.post("/api/news/:id/comments", postCooldownMiddleware, async (req, res) => {
    try {
      const articleId = parseInt(req.params.id);
      const { authorId, content, parentId, commentType } = req.body;
      if (!authorId || !content) return res.status(400).json({ message: "authorId and content required" });

      if (await isUserSpammer(authorId)) {
        return res.status(403).json({ message: "Your account has been flagged for spam. You cannot post comments." });
      }

      const modResult = moderateContent(sanitizeHTML(content));
      if (!modResult.allowed) {
        await recordViolation(authorId, modResult.isSpam, modResult.category, "news_comment", content?.substring(0, 200));
        return res.status(400).json({ message: "Content violates platform safety guidelines." });
      }

      const comment = await storage.createNewsComment({
        articleId,
        authorId,
        content,
        parentId: parentId || null,
        commentType: commentType || "general",
      });
      const author = await storage.getUser(authorId);
      res.json({
        ...comment,
        author: author ? { id: author.id, displayName: author.displayName, avatar: author.avatar, role: author.role } : null,
        replies: [],
      });
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/news/:id/like", async (req, res) => {
    try {
      const articleId = parseInt(req.params.id);
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ message: "userId required" });
      const liked = await storage.toggleNewsReaction(articleId, userId, "like");
      const article = await storage.getNewsArticle(articleId);
      res.json({ liked, likesCount: article?.likesCount || 0 });
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/news/:id/liked", async (req, res) => {
    try {
      const articleId = parseInt(req.params.id);
      const userId = req.query.userId as string;
      if (!userId) return res.json({ liked: false });
      const reaction = await storage.getNewsReaction(articleId, userId);
      res.json({ liked: !!reaction });
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/news/:id/share", async (req, res) => {
    try {
      const articleId = parseInt(req.params.id);
      const { userId, platform } = req.body;
      if (!userId) return res.status(400).json({ message: "userId required" });
      await storage.createNewsShare({ articleId, userId, platform: platform || "internal" });
      const article = await storage.getNewsArticle(articleId);
      res.json({ sharesCount: article?.sharesCount || 0 });
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/news/comments/:id/like", async (req, res) => {
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

  app.post("/api/billing/purchase-credits", async (req, res) => {
    try {
      const parsed = purchaseCreditsSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid input", errors: parsed.error.issues });
      const user = await storage.getUser(parsed.data.userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      const result = await billingService.purchaseCredits(parsed.data.userId, parsed.data.packageId);
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/billing/use-credits", async (req, res) => {
    try {
      const parsed = useCreditsSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid input", errors: parsed.error.issues });
      const user = await storage.getUser(parsed.data.userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      const cost = CREDIT_COSTS[parsed.data.actionType as keyof typeof CREDIT_COSTS] || 5;
      const result = await billingService.useCredits(parsed.data.userId, cost, parsed.data.actionType, parsed.data.actionLabel, parsed.data.referenceId);
      if (!result) return res.status(402).json({ message: "Insufficient credits" });
      res.json({ success: true, cost });
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/billing/can-afford/:userId/:actionType", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(await billingService.canAfford(req.params.userId, req.params.actionType));
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/billing/summary/:userId", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(await billingService.getBillingSummary(req.params.userId));
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/billing/subscription/:userId", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(await billingService.getSubscriptionStatus(req.params.userId));
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/billing/subscribe", async (req, res) => {
    try {
      const parsed = subscribeSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid input", errors: parsed.error.issues });
      const user = await storage.getUser(parsed.data.userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      const result = await billingService.subscribeToPlan(parsed.data.userId, parsed.data.planName, parsed.data.billingCycle);
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/billing/cancel-subscription", async (req, res) => {
    try {
      const parsed = cancelSubSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid input", errors: parsed.error.issues });
      const user = await storage.getUser(parsed.data.userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      await billingService.cancelSubscription(parsed.data.userId);
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

  app.post("/api/admin/billing/flywheel/sync", requireAdmin, async (_req, res) => {
    try { 
      await billingService.syncFlywheelMetrics();
      res.json({ success: true });
    } catch (err) { handleServiceError(res, err); }
  });

  await billingService.seedPlansAndPackages();

  // ---- SEO & AI CRAWLER COMPLIANCE ----
  const seoService = (await import("./services/seo-service")).default;

  app.get("/sitemap.xml", async (_req, res) => {
    try {
      const xml = await seoService.generateSitemap();
      res.set("Content-Type", "application/xml");
      res.send(xml);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/robots.txt", (_req, res) => {
    res.set("Content-Type", "text/plain");
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
      const trends = await seoService.getGravityTrends();
      if (trends.records < 1) {
        return res.json({ insight: "Calculate gravity first to generate AI insights." });
      }

      if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
        return res.json({ insight: trends.insights.join(" ") || "OpenAI not configured. Using rule-based insights.", trends });
      }

      let OpenAI: any;
      try { OpenAI = (await import("openai")).default; } catch { return res.json({ insight: trends.insights.join(" ") || "No insights available.", trends }); }

      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
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
      const trends = await seoService.getCivilizationTrends();
      if (trends.records < 1) {
        return res.json({ insight: "Calculate civilization health first to generate AI insights." });
      }

      if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
        return res.json({ insight: trends.insights.join(" ") || "OpenAI not configured. Using rule-based insights.", trends });
      }

      let OpenAI: any;
      try { OpenAI = (await import("openai")).default; } catch { return res.json({ insight: trends.insights.join(" ") || "No insights available.", trends }); }

      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const dimSummary = Object.entries(trends.dimensions || {}).map(([k, v]: [string, any]) =>
        `- ${v.label}: ${(v.score * 100).toFixed(1)}% (${v.change > 0 ? "+" : ""}${(v.change * 100).toFixed(1)}%)`
      ).join("\n");

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
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
      const postId = req.body?.postId;
      if (!postId || typeof postId !== "string") return res.status(400).json({ error: "Valid postId string required" });
      const result = await aiContentService.generatePostSEO(postId);
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/seo/generate-debate-consensus", requireAdmin, async (req, res) => {
    try {
      const debateId = Number(req.body?.debateId);
      if (!debateId || isNaN(debateId)) return res.status(400).json({ error: "Valid numeric debateId required" });
      const result = await aiContentService.generateDebateConsensus(debateId);
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/admin/seo/batch-generate", requireAdmin, async (req, res) => {
    try {
      const limit = Math.max(1, Math.min(50, Number(req.body?.limit) || 10));
      const result = await aiContentService.batchGeneratePostSEO(limit);
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  // ---- USER-OWNED AI AGENT PLATFORM ROUTES ----

  app.post("/api/user-agents", async (req, res) => {
    try {
      const { ownerId, name, persona, skills, avatarUrl, voiceId, model, provider, systemPrompt, temperature, visibility, deploymentModes, rateLimitPerMin, tags } = req.body;
      if (!ownerId || !name) return res.status(400).json({ error: "ownerId and name are required" });
      const agent = await storage.createUserAgent({
        ownerId, name, persona, skills, avatarUrl, voiceId,
        model: model || "gpt-4o", provider: provider || "openai",
        systemPrompt, temperature, visibility, status: "draft",
        deploymentModes: deploymentModes || ["private"],
        rateLimitPerMin: rateLimitPerMin || 30, tags,
      });
      res.json(agent);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/user-agents", async (req, res) => {
    try {
      const ownerId = req.query.ownerId as string;
      if (ownerId) {
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
      res.json(agent);
    } catch (err) { handleServiceError(res, err); }
  });

  app.patch("/api/user-agents/:id", async (req, res) => {
    try {
      const agent = await storage.getUserAgent(req.params.id);
      if (!agent) return res.status(404).json({ error: "Agent not found" });
      const updated = await storage.updateUserAgent(req.params.id, req.body);
      res.json(updated);
    } catch (err) { handleServiceError(res, err); }
  });

  app.delete("/api/user-agents/:id", async (req, res) => {
    try {
      await storage.deleteUserAgent(req.params.id);
      res.json({ success: true });
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/user-agents/:id/deploy", async (req, res) => {
    try {
      const agent = await storage.getUserAgent(req.params.id);
      if (!agent) return res.status(404).json({ error: "Agent not found" });
      const { modes } = req.body;
      const validModes = ["private", "public", "debate", "api", "marketplace"];
      const filtered = (modes || []).filter((m: string) => validModes.includes(m));
      const visibility = filtered.includes("public") || filtered.includes("marketplace") ? "public" : "private";
      const updated = await storage.updateUserAgent(req.params.id, {
        deploymentModes: filtered,
        visibility,
        status: "active",
      });
      res.json(updated);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/user-agents/:id/knowledge", async (req, res) => {
    try {
      res.json(await storage.getAgentKnowledgeSources(req.params.id));
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/user-agents/:id/knowledge", async (req, res) => {
    try {
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

  app.delete("/api/user-agents/knowledge/:sourceId", async (req, res) => {
    try {
      await storage.deleteAgentKnowledgeSource(req.params.sourceId);
      res.json({ success: true });
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

  app.post("/api/marketplace/listings", async (req, res) => {
    try {
      const { agentId, sellerId, title, description, pricingModel, priceCredits, monthlyCredits, category } = req.body;
      if (!agentId || !sellerId || !title) return res.status(400).json({ error: "agentId, sellerId, and title required" });
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

  app.post("/api/marketplace/purchase", async (req, res) => {
    try {
      const { buyerId, listingId } = req.body;
      if (!buyerId || !listingId) return res.status(400).json({ error: "buyerId and listingId required" });
      const listing = await storage.getMarketplaceListing(listingId);
      if (!listing) return res.status(404).json({ error: "Listing not found" });
      const already = await storage.hasUserPurchasedAgent(buyerId, listing.agentId);
      if (already) return res.status(400).json({ error: "Already purchased" });
      const buyer = await storage.getUser(buyerId);
      if (!buyer || (buyer.creditWallet || 0) < listing.priceCredits) {
        return res.status(400).json({ error: "Insufficient credits" });
      }
      const sellerEarnings = Math.floor(listing.priceCredits * listing.revenueSplit);
      const platformFee = listing.priceCredits - sellerEarnings;
      const purchase = await db.transaction(async (tx) => {
        await tx.update(users_table).set({ creditWallet: sql`COALESCE(${users_table.creditWallet}, 0) - ${listing.priceCredits}` }).where(eq(users_table.id, buyerId));
        await tx.update(users_table).set({ creditWallet: sql`COALESCE(${users_table.creditWallet}, 0) + ${sellerEarnings}` }).where(eq(users_table.id, listing.sellerId));
        await tx.insert(transactions_table).values({
          senderId: buyerId, receiverId: listing.sellerId,
          amount: sellerEarnings, transactionType: "agent_purchase",
          referenceId: listingId, description: `Agent purchase: ${listing.title}`,
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
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/marketplace/purchases/:userId", async (req, res) => {
    try {
      const purchases = await storage.getAgentPurchasesByBuyer(req.params.userId);
      const enriched = await Promise.all(purchases.map(async (p) => {
        const agent = await storage.getUserAgent(p.agentId);
        return { ...p, agentName: agent?.name, agentAvatarUrl: agent?.avatarUrl };
      }));
      res.json(enriched);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/marketplace/earnings/:userId", async (req, res) => {
    try {
      const sales = await storage.getAgentPurchasesBySeller(req.params.userId);
      const totalEarnings = sales.reduce((sum, s) => sum + s.sellerEarnings, 0);
      const totalSales = sales.length;
      res.json({ totalEarnings, totalSales, sales });
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/user-agents/:id/use", async (req, res) => {
    try {
      const { userId, actionType, creditsSpent } = req.body;
      if (!userId || !actionType) return res.status(400).json({ error: "userId and actionType required" });
      const agent = await storage.getUserAgent(req.params.id);
      if (!agent) return res.status(404).json({ error: "Agent not found" });
      const log = await storage.createAgentUsageLog({
        agentId: req.params.id, userId, actionType, creditsSpent: creditsSpent || 0,
      });
      await storage.updateUserAgent(req.params.id, {
        totalUsageCount: (agent.totalUsageCount || 0) + 1,
      });
      res.json(log);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/user-agents/:id/usage", async (req, res) => {
    try {
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

  app.post("/api/agent-runner/run", async (req, res) => {
    try {
      const { agentId, message, callerId } = req.body;
      if (!agentId || !message || !callerId) return res.status(400).json({ error: "agentId, message, and callerId required" });
      const result = await agentRunnerService.runAgent(agentId, message, callerId);
      res.json(result);
    } catch (err: any) {
      if (err.message?.includes("Insufficient credits") || err.message?.includes("paused")) {
        return res.status(402).json({ error: err.message });
      }
      handleServiceError(res, err);
    }
  });

  app.post("/api/agent-runner/demo", async (req, res) => {
    try {
      const { agentId, message } = req.body;
      if (!agentId || !message) return res.status(400).json({ error: "agentId and message required" });
      const result = await agentRunnerService.runDemoInteraction(agentId, message);
      res.json(result);
    } catch (err) { handleServiceError(res, err); }
  });

  app.get("/api/agent-runner/estimate", async (req, res) => {
    try {
      const model = (req.query.model as string) || "gpt-4o";
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

  app.get("/api/agent-costs/:ownerId", async (req, res) => {
    try {
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

  app.get("/api/creator-analytics/:userId", async (req, res) => {
    try {
      const userId = req.params.userId;
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

  app.post("/api/agent-runner/train", async (req, res) => {
    try {
      const { agentId, ownerId, sources } = req.body;
      if (!agentId || !ownerId || !sources?.length) {
        return res.status(400).json({ error: "agentId, ownerId, and sources required" });
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

  app.get("/api/wallet-status/:userId", async (req, res) => {
    try {
      res.json(await agentRunnerService.getWalletStatus(req.params.userId));
    } catch (err) { handleServiceError(res, err); }
  });

  app.post("/api/agent-runner/resume", async (req, res) => {
    try {
      const { ownerId } = req.body;
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
      const model = (req.query.model as string) || "gpt-4o-mini";
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

  return httpServer;
}
