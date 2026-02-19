import { storage } from "../storage";
import { trustEngine } from "./trust-engine";
import { reputationService } from "./reputation-service";
import { economyService } from "./economy-service";
import { agentLearningService } from "./agent-learning-service";
import { collaborationService } from "./agent-collaboration-service";
import { civilizationService } from "./civilization-service";
import { evolutionService } from "./evolution-service";
import type { User, Post } from "@shared/schema";

const CYCLE_INTERVAL_MS = 60_000;
const MAX_ACTIONS_PER_HOUR = 6;
const COOLDOWN_MS = 5 * 60_000;
const RELEVANCE_THRESHOLD = 0.3;
const MAX_POSTS_TO_SCAN = 20;

interface OrchestratorStatus {
  running: boolean;
  lastCycleAt: Date | null;
  cycleCount: number;
  activeAgentIds: string[];
}

const status: OrchestratorStatus = {
  running: false,
  lastCycleAt: null,
  cycleCount: 0,
  activeAgentIds: [],
};

let intervalHandle: ReturnType<typeof setInterval> | null = null;

function computeTagSimilarity(agentTags: string[], postTopicSlug: string): number {
  if (!agentTags || agentTags.length === 0) return 0.1;
  const normalizedSlug = postTopicSlug.toLowerCase();
  for (const tag of agentTags) {
    const normalizedTag = tag.toLowerCase();
    if (normalizedTag === normalizedSlug) return 1.0;
    if (normalizedTag.includes(normalizedSlug) || normalizedSlug.includes(normalizedTag)) return 0.7;
  }
  return 0.15;
}

async function computeRelevance(agent: User, post: Post): Promise<number> {
  const tags: string[] = [...(agent.industryTags || [])];
  const dbTags = await storage.getExpertiseTags(agent.id);
  for (const t of dbTags) {
    tags.push(t.topicSlug, t.tag);
  }
  if (tags.length === 0 && agent.capabilities) {
    tags.push(...(agent.capabilities as string[]));
  }
  const topicSim = tags.length > 0 ? computeTagSimilarity(tags, post.topicSlug) : 0.4;
  const curiosity = Math.min(1, (agent.energy || 500) / 1000);
  const isDebate = post.isDebate ? 1.2 : 1.0;
  return Math.max(topicSim, 0.35) * curiosity * isDebate;
}

async function decideAction(agent: User, post: Post, hasClaims: boolean): Promise<"comment" | "verify" | "skip"> {
  const commentCount = await storage.getCommentCount(post.id);
  const canAffordComment = economyService.canAffordAction(agent, "comment");
  const canAffordVerify = economyService.canAffordAction(agent, "verify");

  const learnedAction = await agentLearningService.selectAction(
    agent, post, hasClaims, commentCount, canAffordComment, canAffordVerify
  );

  if (learnedAction === "comment") return "comment";
  if (learnedAction === "verify") return "verify";
  return "skip";
}

const ANALYSIS_TEMPLATES = [
  "Looking at the evidence presented, there are several key factors to consider. {topic_specific} The data suggests a nuanced picture that merits further investigation.",
  "This is an important discussion. {topic_specific} Based on available research, the claims here have varying levels of support.",
  "Analyzing the core assertions: {topic_specific} I'd rate the overall evidential basis as moderate, with some claims better supported than others.",
  "From a systematic review perspective, {topic_specific} The methodology behind these claims could benefit from additional peer review.",
  "Cross-referencing with recent publications: {topic_specific} Several of these points align with emerging consensus, though some remain contested.",
];

const TOPIC_INSIGHTS: Record<string, string[]> = {
  ai: [
    "Current transformer architectures show diminishing returns on scale alone.",
    "The shift toward mixture-of-experts models represents a fundamental architectural change.",
    "Benchmark saturation suggests we need new evaluation paradigms.",
    "Emergent capabilities in large models remain poorly understood theoretically.",
  ],
  tech: [
    "Hardware constraints are becoming the primary bottleneck for innovation.",
    "The convergence of edge computing and cloud is reshaping architecture decisions.",
    "Open-source adoption in enterprise continues to accelerate.",
  ],
  science: [
    "Reproducibility remains a significant challenge across multiple domains.",
    "Interdisciplinary approaches are yielding the most impactful results.",
    "Preprint servers have fundamentally changed the pace of scientific discourse.",
  ],
  finance: [
    "Market volatility indicators suggest increased uncertainty ahead.",
    "Algorithmic trading now accounts for the majority of market volume.",
    "Decentralized finance protocols continue to evolve despite regulatory pressure.",
  ],
  politics: [
    "Policy outcomes depend heavily on implementation details often lost in debate.",
    "Comparative analysis across jurisdictions provides useful natural experiments.",
    "Public opinion data shows increasing polarization on this topic.",
  ],
};

function generateResponse(agent: User, post: Post): { content: string; confidence: number; reasoningType: string } {
  const template = ANALYSIS_TEMPLATES[Math.floor(Math.random() * ANALYSIS_TEMPLATES.length)];
  const topicInsights = TOPIC_INSIGHTS[post.topicSlug] || TOPIC_INSIGHTS["tech"]!;
  const insight = topicInsights[Math.floor(Math.random() * topicInsights.length)];

  const content = template.replace("{topic_specific}", insight!);
  const confidence = 55 + Math.floor(Math.random() * 35);
  const reasoningTypes = ["Analysis", "Evidence", "Counterpoint", "Synthesis"];
  const reasoningType = reasoningTypes[Math.floor(Math.random() * reasoningTypes.length)]!;

  return { content, confidence, reasoningType };
}

function generateVerificationScore(agent: User, post: Post): { score: number; rationale: string } {
  const baseScore = 0.4 + Math.random() * 0.5;
  const agentWeight = agent.verificationWeight || 1.0;
  const score = Math.min(1, baseScore * agentWeight);

  const rationales = [
    `Systematic analysis of the claims in "${post.title?.substring(0, 40)}..." indicates ${score > 0.7 ? "strong" : score > 0.5 ? "moderate" : "limited"} evidential support. Cross-referencing with established literature and recent findings.`,
    `After evaluating the evidence chain and source credibility for this discussion, the overall assessment is ${score > 0.7 ? "positive" : "cautiously neutral"}. Key claims require ${score > 0.7 ? "minimal" : "further"} verification.`,
    `Multi-factor analysis considering evidence quality, source reliability, and logical consistency yields a confidence of ${Math.round(score * 100)}%. ${score > 0.6 ? "Most claims are well-supported." : "Some claims need stronger backing."}`,
  ];

  return { score, rationale: rationales[Math.floor(Math.random() * rationales.length)]! };
}

async function processAgent(agent: User, posts: Post[]): Promise<void> {
  const oneHourAgo = new Date(Date.now() - 60 * 60_000);
  const recentActions = await storage.getAgentActionCountSince(agent.id, oneHourAgo);
  if (recentActions >= MAX_ACTIONS_PER_HOUR) return;

  const lastActivity = await storage.getAgentLastActivity(agent.id);
  if (lastActivity && lastActivity.createdAt) {
    const elapsed = Date.now() - new Date(lastActivity.createdAt).getTime();
    if (elapsed < COOLDOWN_MS) return;
  }

  for (const post of posts) {
    if (post.authorId === agent.id) continue;

    const relevance = await computeRelevance(agent, post);
    if (relevance < RELEVANCE_THRESHOLD) {
      continue;
    }

    const claims = await storage.getClaims(post.id);
    const action = await decideAction(agent, post, claims.length > 0);

    if (action === "skip") {
      const commentCount = await storage.getCommentCount(post.id);
      const evidenceList = await storage.getEvidence(post.id);
      await agentLearningService.recordReward(agent.id, "observe", post.topicSlug, 0, 0, 0, null, post, commentCount, claims.length > 0, evidenceList.length > 0);
      await storage.createAgentActivity({
        agentId: agent.id,
        postId: post.id,
        actionType: "skip",
        details: "Observed but decided not to participate (learned decision)",
        relevanceScore: relevance,
      });
      continue;
    }

    if (action === "comment") {
      if (!economyService.canAffordAction(agent, "comment")) continue;
      const hasCommented = await storage.hasAgentActedOnPost(agent.id, post.id, "comment");
      if (hasCommented) continue;

      const cost = economyService.getActionCost("comment");
      try { await economyService.spendCredits(agent.id, cost, "agent_comment", post.id, `Comment on post "${post.title?.substring(0, 30)}..."`); } catch { continue; }

      const response = generateResponse(agent, post);
      await storage.createComment({
        postId: post.id,
        authorId: agent.id,
        content: response.content,
        reasoningType: response.reasoningType,
        confidence: response.confidence,
        sources: null,
      });

      const commentRewardTx = await economyService.rewardForComment(agent.id, post.id);
      const commentEarned = commentRewardTx ? commentRewardTx.amount : 0;
      const commentCount = await storage.getCommentCount(post.id);
      const evidenceListC = await storage.getEvidence(post.id);
      await agentLearningService.recordReward(agent.id, "comment", post.topicSlug, commentEarned, cost, 0, null, post, commentCount, claims.length > 0, evidenceListC.length > 0);

      await civilizationService.recordMemory(agent.id, "comment", {
        postId: post.id, topicSlug: post.topicSlug, earned: commentEarned, cost,
      }, `Commented on "${post.title?.substring(0, 30)}..."`, commentEarned - cost);

      await storage.createAgentActivity({
        agentId: agent.id,
        postId: post.id,
        actionType: "comment",
        details: `Posted ${response.reasoningType} comment (confidence: ${response.confidence}%, cost: ${cost} IC, earned: ${commentEarned} IC)`,
        relevanceScore: relevance,
      });

      if (!status.activeAgentIds.includes(agent.id)) {
        status.activeAgentIds.push(agent.id);
      }
      return;
    }

    if (action === "verify") {
      if (!economyService.canAffordAction(agent, "verify")) continue;
      const hasVerified = await storage.hasAgentActedOnPost(agent.id, post.id, "verify");
      if (hasVerified) continue;

      const cost = economyService.getActionCost("verify");
      try { await economyService.spendCredits(agent.id, cost, "agent_verify", post.id, `Verify post "${post.title?.substring(0, 30)}..."`); } catch { continue; }

      const { score, rationale } = generateVerificationScore(agent, post);

      await storage.createAgentVote({
        postId: post.id,
        agentId: agent.id,
        score,
        rationale,
      });

      await trustEngine.recalculate(post.id);
      await reputationService.applyVerificationDelta(post.authorId, post.id, score);
      const verifyRewardTx = await economyService.rewardForVerification(agent.id, post.id, score > 0.6);
      const verifyEarned = verifyRewardTx ? verifyRewardTx.amount : 0;
      const repDelta = score > 0.7 ? 10 : score > 0.5 ? 2 : -5;
      const verifyCommentCount = await storage.getCommentCount(post.id);
      const evidenceListV = await storage.getEvidence(post.id);
      await agentLearningService.recordReward(agent.id, "verify", post.topicSlug, verifyEarned, cost, repDelta, score, post, verifyCommentCount, claims.length > 0, evidenceListV.length > 0);

      await civilizationService.recordMemory(agent.id, "verify", {
        postId: post.id, topicSlug: post.topicSlug, score, earned: verifyEarned, cost, repDelta,
      }, `Verified "${post.title?.substring(0, 30)}..." (score: ${Math.round(score * 100)}%)`, verifyEarned - cost + repDelta);

      await storage.createAgentActivity({
        agentId: agent.id,
        postId: post.id,
        actionType: "verify",
        details: `Submitted verification vote (score: ${Math.round(score * 100)}%, cost: ${cost} IC, earned: ${verifyEarned} IC)`,
        relevanceScore: relevance,
      });

      if (!status.activeAgentIds.includes(agent.id)) {
        status.activeAgentIds.push(agent.id);
      }
      return;
    }
  }
}

async function runCollaborationCycle(posts: Post[]): Promise<void> {
  try {
    await collaborationService.evaluateSocietyFormation();

    for (const post of posts) {
      const claims = await storage.getClaims(post.id);
      const evidence = await storage.getEvidence(post.id);

      const isComplex = claims.length >= 2 || (claims.length >= 1 && evidence.length >= 2) || post.isDebate;
      if (!isComplex) continue;

      const existingTasks = await storage.getDelegatedTasksByPost(post.id);
      if (existingTasks.length > 0) {
        const pendingTasks = existingTasks.filter(t => t.status === "pending");
        if (pendingTasks.length > 0) {
          await collaborationService.processCollaboration(post);
        }
        continue;
      }

      const delegated = await collaborationService.delegateTasksForPost(post);
      if (delegated.length > 0) {
        await collaborationService.processCollaboration(post);
      }
    }
  } catch (err) {
    console.error("[AgentOrchestrator] Collaboration cycle error:", err);
  }
}

async function runCycle(): Promise<void> {
  try {
    const agents = await storage.getAgentUsers();
    if (agents.length === 0) return;

    const posts = await storage.getRecentPosts(MAX_POSTS_TO_SCAN);
    if (posts.length === 0) return;

    status.activeAgentIds = [];

    const shuffledAgents = agents.sort(() => Math.random() - 0.5);

    for (const agent of shuffledAgents) {
      const shuffledPosts = posts.sort(() => Math.random() - 0.5);
      await processAgent(agent, shuffledPosts);
    }

    await runCollaborationCycle(posts);

    try {
      await civilizationService.runCivilizationCycle();
    } catch (err) {
      console.error("[AgentOrchestrator] Civilization cycle error:", err);
    }

    try {
      await evolutionService.runEvolutionCycle();
    } catch (err) {
      console.error("[AgentOrchestrator] Evolution cycle error:", err);
    }

    status.lastCycleAt = new Date();
    status.cycleCount++;
  } catch (err) {
    console.error("[AgentOrchestrator] Cycle error:", err);
  }
}

export const agentOrchestrator = {
  start() {
    if (status.running) return;
    status.running = true;
    console.log("[AgentOrchestrator] Starting autonomous agent system");

    setTimeout(() => runCycle(), 5000);

    intervalHandle = setInterval(() => runCycle(), CYCLE_INTERVAL_MS);
  },

  stop() {
    if (intervalHandle) {
      clearInterval(intervalHandle);
      intervalHandle = null;
    }
    status.running = false;
    console.log("[AgentOrchestrator] Stopped");
  },

  getStatus(): OrchestratorStatus {
    return { ...status };
  },

  async triggerCycle(): Promise<void> {
    await runCycle();
  },
};
