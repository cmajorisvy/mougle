import { eq } from "drizzle-orm";
import { db } from "../db";
import { storage } from "../storage";
import { agentTrustProfiles, type AgentGenome, type AgentIdentity, type AgentLearningProfile, type AgentMemory, type AgentTrustProfile, type User } from "@shared/schema";
import { getAgentActionDefinition, type AgentActionDefinition, type AgentActionType } from "./agent-action-registry";
import { agentGraphAccessService, type AgentGraphAccessPurpose, type AgentGraphAccessResult } from "./agent-graph-access-service";
import { memoryAccessPolicyService, runPrivateMemoryBlockCheck, type MemoryScope } from "./memory-access-policy";

type BehaviorMetricInput = {
  goalAlignment?: number;
  trustImpact?: number;
  userValue?: number;
  rewardPotential?: number;
  risk?: number;
  cost?: number;
};

export type AgentBehaviorSimulationInput = {
  agentId: string;
  actionType?: AgentActionType;
  event?: {
    type?: string;
    topic?: string;
    targetId?: string;
    content?: string;
  };
  metrics?: BehaviorMetricInput;
  costBudget?: number;
  memoryScope?: MemoryScope;
  allowPrivateMemory?: boolean;
  includeGraphContext?: boolean;
  graphQuery?: string;
  graphPurpose?: AgentGraphAccessPurpose;
  graphAllowHypotheses?: boolean;
  graphExplicitBusinessPermission?: boolean;
  graphMinimumConfidence?: number;
};

type ScoreInputs = Required<BehaviorMetricInput>;

type PolicyCheck = {
  key: string;
  label: string;
  passed: boolean;
  detail: string;
};

type DecisionStatus = "approved" | "blocked" | "request_admin_review";

export type AgentBehaviorSimulationResult = {
  agent: {
    id: string;
    username: string;
    displayName: string;
    role: string | null;
    enabled: boolean;
  };
  event: {
    type: string;
    topic: string | null;
    targetId: string | null;
    content: string | null;
  };
  context: {
    identityLoaded: boolean;
    genomeLoaded: boolean;
    learningProfileLoaded: boolean;
    trustProfileLoaded: boolean;
    memoryScope: MemoryScope;
    memoryAccessAllowed: boolean;
    memoriesRetrieved: number;
    privateMemoryRequested: boolean;
    memoryDeniedCount: number;
    policyExplanations: string[];
    sanitizerRedactions: string[];
  };
  proposedAction: {
    type: AgentActionType;
    label: string;
    description: string;
    executionMode: AgentActionDefinition["executionMode"];
    publicWrite: boolean;
  };
  scoring: {
    formula: string;
    threshold: number;
    inputs: ScoreInputs;
    score: number;
  };
  policyChecks: PolicyCheck[];
  decision: {
    status: DecisionStatus;
    reason: string;
    executable: boolean;
    executionMode: AgentActionDefinition["executionMode"];
  };
  outcomeLog: {
    id: string | null;
    actionType: string;
  };
  graphContext: {
    enabled: boolean;
    nodesRetrieved: number;
    edgesRetrieved: number;
    blockedCounts: AgentGraphAccessResult["blockedCounts"];
    policy: AgentGraphAccessResult["policy"] | null;
    explanations: string[];
    deterministicChecks: AgentGraphAccessResult["deterministicChecks"] | null;
  };
  blockedUnsafeActionCheck: {
    passed: boolean;
    actionType: AgentActionType;
    expected: DecisionStatus;
    actual: DecisionStatus;
    reason: string;
  };
  privateMemoryBlockCheck: {
    passed: boolean;
    vaultType: "personal";
    sensitivity: "private";
    context: "public_debate";
    expected: string;
    actual: string;
    reason: string;
  };
};

const SCORE_THRESHOLD = 0.45;
const DEFAULT_COST_BUDGET = 0.55;

class AgentBehaviorEngineError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : {};
}

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function roundScore(value: number) {
  return Math.round(value * 1000) / 1000;
}

function normalizeEvent(event: AgentBehaviorSimulationInput["event"]) {
  return {
    type: event?.type?.trim() || "admin_behavior_simulation",
    topic: event?.topic?.trim() || null,
    targetId: event?.targetId?.trim() || null,
    content: event?.content?.trim() || null,
  };
}

function normalizeMetrics(action: AgentActionDefinition, metrics?: BehaviorMetricInput): ScoreInputs {
  return {
    goalAlignment: clamp01(metrics?.goalAlignment ?? action.defaultMetrics.goalAlignment),
    trustImpact: clamp01(metrics?.trustImpact ?? action.defaultMetrics.trustImpact),
    userValue: clamp01(metrics?.userValue ?? action.defaultMetrics.userValue),
    rewardPotential: clamp01(metrics?.rewardPotential ?? action.defaultMetrics.rewardPotential),
    risk: clamp01(metrics?.risk ?? action.baseRisk),
    cost: clamp01(metrics?.cost ?? action.baseCost),
  };
}

export function calculateAgentActionScore(input: ScoreInputs) {
  return roundScore(clamp01(
    0.30 * input.goalAlignment
    + 0.25 * input.trustImpact
    + 0.15 * input.userValue
    + 0.15 * input.rewardPotential
    - 0.20 * input.risk
    - 0.15 * input.cost
  ));
}

function resolveAgentEnabled(identity: AgentIdentity | null) {
  const strategyProfile = asRecord(identity?.strategyProfile);
  return strategyProfile.systemAgent === true && strategyProfile.enabled !== false;
}

function resolvePermissions(identity: AgentIdentity | null) {
  const strategyProfile = asRecord(identity?.strategyProfile);
  const rawPermissions = asRecord(strategyProfile.permissions);
  return Object.fromEntries(
    Object.entries(rawPermissions).filter(([, value]) => value === true)
  ) as Record<string, boolean>;
}

function hasActionPermission(action: AgentActionDefinition, permissions: Record<string, boolean>) {
  if (action.requiredPermissions.length === 0) return true;
  return action.requiredPermissions.some((permission) => permissions[permission] === true);
}

function evaluatePolicy({
  action,
  agentEnabled,
  permissionAllowed,
  memoryAccessAllowed,
  score,
  metrics,
  costBudget,
}: {
  action: AgentActionDefinition;
  agentEnabled: boolean;
  permissionAllowed: boolean;
  memoryAccessAllowed: boolean;
  score: number;
  metrics: ScoreInputs;
  costBudget: number;
}) {
  const effectiveCostLimit = Math.min(action.maxCost, costBudget);
  const checks: PolicyCheck[] = [
    {
      key: "agent_enabled",
      label: "Agent enabled",
      passed: agentEnabled,
      detail: agentEnabled ? "System agent is enabled." : "System agent is disabled or not a seeded system identity.",
    },
    {
      key: "permission_allowed",
      label: "Permission allowed",
      passed: permissionAllowed,
      detail: permissionAllowed
        ? "Agent has at least one required permission for this action."
        : `Requires one of: ${action.requiredPermissions.join(", ") || "none"}.`,
    },
    {
      key: "risk_limit",
      label: "Risk within limit",
      passed: metrics.risk <= action.allowedRisk,
      detail: `Risk ${roundScore(metrics.risk)} must be <= allowed risk ${roundScore(action.allowedRisk)}.`,
    },
    {
      key: "cost_limit",
      label: "Cost within budget",
      passed: metrics.cost <= effectiveCostLimit,
      detail: `Cost ${roundScore(metrics.cost)} must be <= budget ${roundScore(effectiveCostLimit)}.`,
    },
    {
      key: "memory_context_allowed",
      label: "Memory/context allowed",
      passed: memoryAccessAllowed,
      detail: memoryAccessAllowed ? "Requested memory scope is allowed." : "Private memory access is not allowed for this request.",
    },
    {
      key: "mvp_execution_mode",
      label: "MVP execution mode",
      passed: action.executionMode !== "blocked_in_mvp",
      detail: action.executionMode === "blocked_in_mvp"
        ? "This action is intentionally blocked in the MVP."
        : `This action is ${action.executionMode.replace("_", " ")} in the MVP.`,
    },
  ];

  const failedChecks = checks.filter((check) => !check.passed);
  if (failedChecks.length > 0) {
    return {
      checks,
      status: "blocked" as DecisionStatus,
      reason: failedChecks.map((check) => check.label).join(", "),
    };
  }

  if (score < SCORE_THRESHOLD || action.requiresAdminReview) {
    return {
      checks,
      status: "request_admin_review" as DecisionStatus,
      reason: action.requiresAdminReview
        ? "Action requires admin review before any real execution."
        : `Score ${score} is below approval threshold ${SCORE_THRESHOLD}.`,
    };
  }

  return {
    checks,
    status: "approved" as DecisionStatus,
    reason: "All policy checks passed for the fixed MVP action path.",
  };
}

function proposeAction(input: AgentBehaviorSimulationInput): AgentActionType {
  return input.actionType || "stay_idle";
}

function graphPurposeForAction(action: AgentActionDefinition): AgentGraphAccessPurpose {
  if (["attach_claim", "attach_evidence", "challenge_claim"].includes(action.type)) return "evidence_validation";
  if (["join_debate", "summarize_debate"].includes(action.type)) return "debate_preparation";
  if (action.type === "generate_news_script") return "media_script_review";
  if (action.type === "collaborate_agent") return "synthesis";
  return "reasoning";
}

async function loadAgentContext(agentId: string) {
  const [user, identity, genome, learningProfile] = await Promise.all([
    storage.getUser(agentId),
    storage.getAgentIdentity(agentId),
    storage.getAgentGenome(agentId),
    storage.getLearningProfile(agentId),
  ]);

  const [trustProfile] = await db.select().from(agentTrustProfiles).where(eq(agentTrustProfiles.agentId, agentId));

  return {
    user: user || null,
    identity: identity || null,
    genome: genome || null,
    learningProfile: learningProfile || null,
    trustProfile: trustProfile || null,
  };
}

async function retrievePermittedMemory(
  agentId: string,
  scope: MemoryScope,
  explicitUserPermission: boolean,
) {
  return memoryAccessPolicyService.getPolicyCheckedAgentMemories({
    agentId,
    context: "agent_behavior",
    scope,
    limit: 5,
    explicitUserPermission,
  });
}

function buildLogDetails(input: {
  event: AgentBehaviorSimulationResult["event"];
  context: AgentBehaviorSimulationResult["context"];
  proposedAction: AgentBehaviorSimulationResult["proposedAction"];
  scoring: AgentBehaviorSimulationResult["scoring"];
  policyChecks: PolicyCheck[];
  decision: AgentBehaviorSimulationResult["decision"];
  graphContext: AgentBehaviorSimulationResult["graphContext"];
}) {
  return JSON.stringify({
    phase: "phase_10_agent_behavior_engine_mvp",
    event: input.event,
    context: input.context,
    proposedAction: input.proposedAction,
    scoring: input.scoring,
    policyChecks: input.policyChecks,
    decision: input.decision,
    graphContext: input.graphContext,
    safety: {
      autonomousExecution: false,
      directLlmExecution: false,
      publicPublishing: false,
      graphContextReadOnly: input.graphContext.enabled,
    },
  });
}

function serializeAgent(user: User, identity: AgentIdentity | null, enabled: boolean) {
  const strategyProfile = asRecord(identity?.strategyProfile);
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName || user.username,
    role: typeof strategyProfile.role === "string" ? strategyProfile.role : user.agentDescription,
    enabled,
  };
}

function buildContextSummary(input: {
  identity: AgentIdentity | null;
  genome: AgentGenome | null;
  learningProfile: AgentLearningProfile | null;
  trustProfile: AgentTrustProfile | null;
  memoryScope: AgentBehaviorSimulationResult["context"]["memoryScope"];
  memoryAccessAllowed: boolean;
  memories: AgentMemory[];
  memoryDeniedCount: number;
  policyExplanations: string[];
  sanitizerRedactions: string[];
}) {
  return {
    identityLoaded: !!input.identity,
    genomeLoaded: !!input.genome,
    learningProfileLoaded: !!input.learningProfile,
    trustProfileLoaded: !!input.trustProfile,
    memoryScope: input.memoryScope,
    memoryAccessAllowed: input.memoryAccessAllowed,
    memoriesRetrieved: input.memories.length,
    privateMemoryRequested: input.memoryScope === "private",
    memoryDeniedCount: input.memoryDeniedCount,
    policyExplanations: input.policyExplanations,
    sanitizerRedactions: input.sanitizerRedactions,
  };
}

export function runBlockedUnsafeActionCheck() {
  const action = getAgentActionDefinition("post_message");
  const metrics = normalizeMetrics(action, { risk: 0.95, cost: 0.2, goalAlignment: 1, trustImpact: 1, userValue: 1, rewardPotential: 1 });
  const score = calculateAgentActionScore(metrics);
  const policy = evaluatePolicy({
    action,
    agentEnabled: true,
    permissionAllowed: true,
    memoryAccessAllowed: true,
    score,
    metrics,
    costBudget: 1,
  });

  return {
    passed: policy.status === "blocked",
    actionType: action.type,
    expected: "blocked" as DecisionStatus,
    actual: policy.status,
    reason: policy.reason,
  };
}

export async function simulateAgentBehaviorDecision(input: AgentBehaviorSimulationInput): Promise<AgentBehaviorSimulationResult> {
  const agentId = input.agentId.trim();
  if (!agentId) {
    throw new AgentBehaviorEngineError(400, "agentId is required");
  }

  const { user, identity, genome, learningProfile, trustProfile } = await loadAgentContext(agentId);
  if (!user || user.role !== "agent") {
    throw new AgentBehaviorEngineError(404, "System agent not found");
  }

  const action = getAgentActionDefinition(proposeAction(input));
  const event = normalizeEvent(input.event);
  const permissions = resolvePermissions(identity);
  const agentEnabled = resolveAgentEnabled(identity);
  const permissionAllowed = hasActionPermission(action, permissions);
  const memoryScope = input.memoryScope || "behavioral";
  const memoryPolicy = await retrievePermittedMemory(agentId, memoryScope, input.allowPrivateMemory === true);
  const graphAccess = input.includeGraphContext
    ? await agentGraphAccessService.retrieveRelevantGraphContext({
      requesterType: "system_agent",
      requesterAgentId: agentId,
      purpose: input.graphPurpose || graphPurposeForAction(action),
      query: input.graphQuery || event.topic || event.content || action.label,
      limit: 6,
      allowHypotheses: input.graphAllowHypotheses === true,
      explicitBusinessPermission: input.graphExplicitBusinessPermission === true,
      minimumConfidence: input.graphMinimumConfidence,
    })
    : null;
  const graphContext: AgentBehaviorSimulationResult["graphContext"] = graphAccess
    ? {
      enabled: true,
      nodesRetrieved: graphAccess.context.nodes.length,
      edgesRetrieved: graphAccess.context.edges.length,
      blockedCounts: graphAccess.blockedCounts,
      policy: graphAccess.policy,
      explanations: graphAccess.explanations,
      deterministicChecks: graphAccess.deterministicChecks,
    }
    : {
      enabled: false,
      nodesRetrieved: 0,
      edgesRetrieved: 0,
      blockedCounts: { total: 0, byReason: {} },
      policy: null,
      explanations: ["Internal graph context retrieval was not requested for this simulation."],
      deterministicChecks: null,
    };
  const memories = memoryPolicy.records;
  const memoryAccessAllowed = memoryPolicy.requestAllowed;
  const context = buildContextSummary({
    identity,
    genome,
    learningProfile,
    trustProfile,
    memoryScope,
    memoryAccessAllowed,
    memories,
    memoryDeniedCount: memoryPolicy.deniedCount,
    policyExplanations: memoryPolicy.explanations,
    sanitizerRedactions: memoryPolicy.redactions,
  });
  const metrics = normalizeMetrics(action, input.metrics);
  const score = calculateAgentActionScore(metrics);
  const costBudget = clamp01(input.costBudget ?? DEFAULT_COST_BUDGET);
  const policy = evaluatePolicy({
    action,
    agentEnabled,
    permissionAllowed,
    memoryAccessAllowed,
    score,
    metrics,
    costBudget,
  });
  const proposedAction = {
    type: action.type,
    label: action.label,
    description: action.description,
    executionMode: action.executionMode,
    publicWrite: action.publicWrite,
  };
  const scoring = {
    formula: "0.30*goal_alignment + 0.25*trust_impact + 0.15*user_value + 0.15*reward_potential - 0.20*risk - 0.15*cost",
    threshold: SCORE_THRESHOLD,
    inputs: metrics,
    score,
  };
  const decision = {
    status: policy.status,
    reason: policy.reason,
    executable: policy.status === "approved" && action.executionMode === "log_only",
    executionMode: action.executionMode,
  };

  const details = buildLogDetails({ event, context, proposedAction, scoring, policyChecks: policy.checks, decision, graphContext });
  const activity = await storage.createAgentActivity({
    agentId,
    postId: event.targetId,
    actionType: `behavior_${action.type}_${decision.status}`,
    details,
    relevanceScore: score,
  });

  return {
    agent: serializeAgent(user, identity, agentEnabled),
    event,
    context,
    proposedAction,
    scoring,
    policyChecks: policy.checks,
    decision,
    outcomeLog: {
      id: activity.id,
      actionType: activity.actionType,
    },
    graphContext,
    blockedUnsafeActionCheck: runBlockedUnsafeActionCheck(),
    privateMemoryBlockCheck: runPrivateMemoryBlockCheck(),
  };
}
