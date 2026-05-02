import { desc } from "drizzle-orm";
import { db } from "../db";
import {
  agentKnowledgeSources,
  agentMarketplaceClonePackages,
  agentMemory,
  agentPassportExports,
  agentPassports,
  claimEvidence,
  claims,
  consensusRecords,
  debateParticipants,
  debateTurns,
  evidence,
  knowledgeGraphEdges,
  knowledgeGraphNodes,
  liveDebates,
  marketplaceListings,
  podcastScriptPackages,
  projectPackages,
  projects,
  realityClaims,
  socialDistributionPackages,
  truthMemories,
  youtubePublishingPackages,
  type InsertKnowledgeGraphEdge,
  type InsertKnowledgeGraphNode,
  type KnowledgeGraphEdge,
  type KnowledgeGraphNode,
} from "@shared/schema";
import {
  memoryAccessPolicyService,
  type MemoryAccessDecision,
  type MemorySensitivity,
  type MemoryVaultType,
} from "./memory-access-policy";
import { sanitizeMemoryOutput } from "./memory-output-sanitizer";
import { riskManagementService } from "./risk-management-service";
import { unifiedEvolutionService } from "./unified-evolution-service";

type SourceQuality = "calculated" | "partial" | "fallback";
type Distribution = Record<string, number>;

type BlockedSource = {
  sourceTable: string;
  sourceId: string;
  reason: string;
  vaultType: string;
  sensitivity: string;
};

type BuildGraphResult = {
  nodes: InsertKnowledgeGraphNode[];
  edges: InsertKnowledgeGraphEdge[];
  blockedSources: BlockedSource[];
};

type KnowledgeGraphNodeInput = Omit<InsertKnowledgeGraphNode, "createdAt" | "updatedAt" | "sourceId"> & {
  sourceId: string | number;
};

export type KnowledgeGraphSummary = {
  generatedAt: string;
  internalOnly: true;
  manualSyncOnly: true;
  totals: {
    nodes: number;
    edges: number;
    blockedRestrictedSources: number;
  };
  nodeCountsByType: Distribution;
  edgeCountsByRelation: Distribution;
  verificationDistribution: Distribution;
  vaultDistribution: Distribution;
  sensitivityDistribution: Distribution;
  topConnected: Array<{
    nodeKey: string;
    nodeType: string;
    label: string;
    connectionCount: number;
    verificationStatus: string;
  }>;
  highRiskClusters: Array<{
    nodeKey: string;
    nodeType: string;
    label: string;
    verificationStatus: string;
    confidence: number;
    reason: string;
  }>;
  blockedCounts: {
    total: number;
    bySource: Distribution;
    byReason: Distribution;
    samples: Array<Omit<BlockedSource, "sourceId">>;
  };
  provenanceSummaries: Array<{
    sourceTable: string;
    nodes: number;
    edges: number;
  }>;
  qualitySignals: {
    uesAvailable: boolean;
    sourceQuality: SourceQuality;
    notes: string[];
  };
  safeguards: {
    rootAdminOnly: true;
    internalAdminInspectionOnly: true;
    noRawPrivateMemoryContent: true;
    noPublicGraphRoutes: true;
    noAutonomousGraphExpansion: true;
  };
};

export type KnowledgeGraphSyncResult = {
  syncedAt: string;
  nodesPrepared: number;
  edgesPrepared: number;
  nodesUpserted: number;
  edgesUpserted: number;
  blockedCounts: KnowledgeGraphSummary["blockedCounts"];
  summary: KnowledgeGraphSummary;
};

const GRAPH_SYNC_LIMIT = 150;
const LIST_LIMIT_MAX = 250;
const PUBLIC_VAULTS = new Set(["public", "verified", "behavioral", "business"]);
const PUBLIC_SENSITIVITIES = new Set(["public", "internal", "restricted"]);
const HIGH_RISK_STATUSES = new Set(["unverified", "contested", "rejected", "blocked", "failed", "pending_review"]);
const ALLOWED_MARKETPLACE_STATUSES = new Set(["approved", "sandbox_only", "active"]);
const ALLOWED_INTERNAL_STATUSES = new Set(["approved", "published", "active", "completed", "admin_review", "internal_admin_review", "ready_for_review"]);

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : {};
}

function sourceId(value: unknown) {
  return String(value ?? "unknown");
}

function clamp01(value: unknown, fallback = 0.5) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(1, parsed));
}

function truncate(value: unknown, max = 360) {
  const text = typeof value === "string" ? value : value == null ? "" : JSON.stringify(value);
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}...` : clean;
}

function safeLabel(value: unknown, fallback: string) {
  const sanitized = sanitizeMemoryOutput(value || fallback, { redactContactInfo: true });
  return truncate(sanitized.content || fallback, 120);
}

function safeSummary(value: unknown, max = 420) {
  const sanitized = sanitizeMemoryOutput(value || "", { redactContactInfo: true });
  return truncate(sanitized.content, max);
}

function safeBehavioralSummary(value: unknown) {
  const sanitized = sanitizeMemoryOutput(value || "", { behavioralHintOnly: true, redactContactInfo: true });
  return truncate(sanitized.content, 280);
}

function slug(value: unknown) {
  return truncate(value || "unknown", 160)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || "unknown";
}

function addCount(distribution: Distribution, key: string | null | undefined, amount = 1) {
  const safeKey = key || "unknown";
  distribution[safeKey] = (distribution[safeKey] || 0) + amount;
}

function uniqueByKey<T extends Record<string, any>>(items: T[], key: keyof T) {
  const seen = new Map<string, T>();
  for (const item of items) {
    seen.set(String(item[key]), item);
  }
  return [...seen.values()];
}

function explicitPermission(record: unknown) {
  const metadata = asRecord(asRecord(record).metadata);
  return metadata.explicitUserPermission === true
    || metadata.businessUseApproved === true
    || metadata.exportAllowed === true
    || metadata.vaultPermissionGranted === true
    || metadata.knowledgeGraphAllowed === true;
}

function normalizeVault(value: unknown): MemoryVaultType | "unknown" {
  return typeof value === "string" && PUBLIC_VAULTS.has(value) ? value as MemoryVaultType : "unknown";
}

function normalizeSensitivity(value: unknown): MemorySensitivity | "unknown" {
  return typeof value === "string" && PUBLIC_SENSITIVITIES.has(value) ? value as MemorySensitivity : "unknown";
}

function blockFromDecision(sourceTable: string, id: unknown, decision: MemoryAccessDecision): BlockedSource {
  return {
    sourceTable,
    sourceId: sourceId(id),
    reason: decision.reason,
    vaultType: decision.vaultType,
    sensitivity: decision.sensitivity,
  };
}

function memoryDecision(sourceTable: string, record: { id: string; vaultType?: string | null; sensitivity?: string | null; metadata?: unknown }) {
  const sourceType = sourceTable === "agent_memory" ? "agent_memory" : sourceTable === "truth_memories" ? "truth_memory" : "knowledge_source";
  const decision = memoryAccessPolicyService.evaluate({
    vaultType: record.vaultType,
    sensitivity: record.sensitivity,
    context: "admin_inspection",
    explicitUserPermission: explicitPermission(record),
    sourceType,
  });

  if (decision.vaultType === "unknown" || decision.sensitivity === "unknown") {
    return { allowed: false, decision };
  }

  if (decision.vaultType === "personal" || decision.sensitivity === "private" || decision.sensitivity === "secret") {
    return { allowed: false, decision };
  }

  if (decision.vaultType === "business" && !explicitPermission(record)) {
    return { allowed: false, decision };
  }

  return { allowed: decision.allowed, decision };
}

function sourceMeta(sourceTable: string, sourceIdValue: unknown, extra: Record<string, any> = {}) {
  return {
    sourceTable,
    sourceId: sourceId(sourceIdValue),
    syncedBy: "knowledge_graph_service",
    ...extra,
  };
}

function node(input: KnowledgeGraphNodeInput): InsertKnowledgeGraphNode {
  return {
    ...input,
    label: safeLabel(input.label, input.nodeKey),
    summary: input.summary ? safeSummary(input.summary) : null,
    sourceId: sourceId(input.sourceId),
    confidence: clamp01(input.confidence),
    verificationStatus: input.verificationStatus || "unverified",
    vaultType: input.vaultType || "public",
    sensitivity: input.sensitivity || "public",
    visibility: input.visibility || "internal",
    provenance: input.provenance || {},
    metadata: input.metadata || {},
  };
}

function edge(input: Omit<InsertKnowledgeGraphEdge, "createdAt" | "updatedAt">): InsertKnowledgeGraphEdge {
  return {
    ...input,
    confidence: clamp01(input.confidence),
    verificationStatus: input.verificationStatus || "unverified",
    vaultType: input.vaultType || "public",
    sensitivity: input.sensitivity || "public",
    visibility: input.visibility || "internal",
    provenance: input.provenance || {},
    metadata: input.metadata || {},
  };
}

function addTopic(nodes: InsertKnowledgeGraphNode[], edges: InsertKnowledgeGraphEdge[], label: string, sourceKey: string, relationType = "about_topic") {
  const topicKey = `topic:${slug(label)}`;
  nodes.push(node({
    nodeKey: topicKey,
    nodeType: "topic",
    label,
    summary: "Topic node derived from an approved/internal source record.",
    sourceTable: "derived_topic",
    sourceId: topicKey,
    confidence: 0.55,
    verificationStatus: "unverified",
    vaultType: "public",
    sensitivity: "public",
    visibility: "internal",
    provenance: sourceMeta("derived_topic", topicKey),
    metadata: { derived: true },
  }));
  edges.push(edge({
    edgeKey: `${sourceKey}->${relationType}->${topicKey}`,
    sourceNodeKey: sourceKey,
    targetNodeKey: topicKey,
    relationType,
    confidence: 0.55,
    verificationStatus: "unverified",
    vaultType: "public",
    sensitivity: "public",
    visibility: "internal",
    provenance: sourceMeta("derived_topic", topicKey, { sourceNodeKey: sourceKey }),
    metadata: {},
  }));
}

async function selectLimited<T>(table: any, limit = GRAPH_SYNC_LIMIT): Promise<T[]> {
  try {
    return await db.select().from(table).orderBy(desc(table.createdAt)).limit(limit) as T[];
  } catch {
    return await db.select().from(table).limit(limit) as T[];
  }
}

function summarizeBlocked(blockedSources: BlockedSource[]) {
  const bySource: Distribution = {};
  const byReason: Distribution = {};
  for (const blocked of blockedSources) {
    addCount(bySource, blocked.sourceTable);
    addCount(byReason, blocked.reason);
  }
  return {
    total: blockedSources.length,
    bySource,
    byReason,
    samples: blockedSources.slice(0, 12).map(({ sourceTable, reason, vaultType, sensitivity }) => ({
      sourceTable,
      reason,
      vaultType,
      sensitivity,
    })),
  };
}

class KnowledgeGraphService {
  async listNodes(params: { nodeType?: string; verificationStatus?: string; limit?: number } = {}) {
    const limit = Math.min(Math.max(params.limit || 100, 1), LIST_LIMIT_MAX);
    const rows = await db.select().from(knowledgeGraphNodes)
      .orderBy(desc(knowledgeGraphNodes.updatedAt))
      .limit(limit);

    return rows.filter((row) => {
      if (params.nodeType && row.nodeType !== params.nodeType) return false;
      if (params.verificationStatus && row.verificationStatus !== params.verificationStatus) return false;
      return true;
    });
  }

  async listEdges(params: { relationType?: string; limit?: number } = {}) {
    const limit = Math.min(Math.max(params.limit || 100, 1), LIST_LIMIT_MAX);
    const rows = await db.select().from(knowledgeGraphEdges)
      .orderBy(desc(knowledgeGraphEdges.updatedAt))
      .limit(limit);

    return rows.filter((row) => !params.relationType || row.relationType === params.relationType);
  }

  async getSummary(): Promise<KnowledgeGraphSummary> {
    const [nodes, edges, blockedCounts, ues] = await Promise.all([
      db.select().from(knowledgeGraphNodes).limit(2000),
      db.select().from(knowledgeGraphEdges).limit(3000),
      this.getBlockedMemorySummary(),
      unifiedEvolutionService.getGlobalScore().catch(() => null),
    ]);

    return this.buildSummary(nodes, edges, blockedCounts, ues != null);
  }

  async sync(params: { actorId: string; actorType: string }): Promise<KnowledgeGraphSyncResult> {
    const prepared = await this.buildGraph();
    const nodes = uniqueByKey(prepared.nodes, "nodeKey");
    const edges = uniqueByKey(prepared.edges, "edgeKey");

    let nodesUpserted = 0;
    let edgesUpserted = 0;

    for (const graphNode of nodes) {
      await db.insert(knowledgeGraphNodes).values(graphNode).onConflictDoUpdate({
        target: knowledgeGraphNodes.nodeKey,
        set: {
          nodeType: graphNode.nodeType,
          label: graphNode.label,
          summary: graphNode.summary,
          sourceTable: graphNode.sourceTable,
          sourceId: graphNode.sourceId,
          confidence: graphNode.confidence,
          verificationStatus: graphNode.verificationStatus,
          vaultType: graphNode.vaultType,
          sensitivity: graphNode.sensitivity,
          visibility: graphNode.visibility,
          provenance: graphNode.provenance,
          metadata: graphNode.metadata,
          updatedAt: new Date(),
        },
      });
      nodesUpserted += 1;
    }

    for (const graphEdge of edges) {
      await db.insert(knowledgeGraphEdges).values(graphEdge).onConflictDoUpdate({
        target: knowledgeGraphEdges.edgeKey,
        set: {
          sourceNodeKey: graphEdge.sourceNodeKey,
          targetNodeKey: graphEdge.targetNodeKey,
          relationType: graphEdge.relationType,
          confidence: graphEdge.confidence,
          verificationStatus: graphEdge.verificationStatus,
          vaultType: graphEdge.vaultType,
          sensitivity: graphEdge.sensitivity,
          visibility: graphEdge.visibility,
          provenance: graphEdge.provenance,
          metadata: graphEdge.metadata,
          updatedAt: new Date(),
        },
      });
      edgesUpserted += 1;
    }

    const blockedCounts = summarizeBlocked(prepared.blockedSources);
    await riskManagementService.logAudit({
      actorId: params.actorId,
      actorType: params.actorType,
      action: "knowledge_graph_sync",
      resourceType: "knowledge_graph",
      resourceId: "manual_sync",
      outcome: "success",
      riskLevel: prepared.blockedSources.length > 0 ? "medium" : "low",
      details: {
        nodesPrepared: nodes.length,
        edgesPrepared: edges.length,
        blockedCounts,
        manualSyncOnly: true,
        noRawPrivateMemoryContent: true,
      },
    });

    const summary = await this.getSummary();
    return {
      syncedAt: new Date().toISOString(),
      nodesPrepared: nodes.length,
      edgesPrepared: edges.length,
      nodesUpserted,
      edgesUpserted,
      blockedCounts,
      summary,
    };
  }

  private buildSummary(
    nodes: KnowledgeGraphNode[],
    edges: KnowledgeGraphEdge[],
    blockedCounts: KnowledgeGraphSummary["blockedCounts"],
    uesAvailable: boolean,
  ): KnowledgeGraphSummary {
    const nodeCountsByType: Distribution = {};
    const edgeCountsByRelation: Distribution = {};
    const verificationDistribution: Distribution = {};
    const vaultDistribution: Distribution = {};
    const sensitivityDistribution: Distribution = {};
    const sourceNodeCounts: Distribution = {};
    const sourceEdgeCounts: Distribution = {};
    const connectionCounts: Distribution = {};

    for (const graphNode of nodes) {
      addCount(nodeCountsByType, graphNode.nodeType);
      addCount(verificationDistribution, graphNode.verificationStatus);
      addCount(vaultDistribution, graphNode.vaultType);
      addCount(sensitivityDistribution, graphNode.sensitivity);
      addCount(sourceNodeCounts, graphNode.sourceTable);
    }

    for (const graphEdge of edges) {
      addCount(edgeCountsByRelation, graphEdge.relationType);
      addCount(sourceEdgeCounts, asRecord(graphEdge.provenance).sourceTable || graphEdge.relationType);
      addCount(connectionCounts, graphEdge.sourceNodeKey);
      addCount(connectionCounts, graphEdge.targetNodeKey);
    }

    const nodesByKey = new Map(nodes.map((graphNode) => [graphNode.nodeKey, graphNode]));
    const topConnected = Object.entries(connectionCounts)
      .map(([nodeKey, connectionCount]) => ({ nodeKey, connectionCount, node: nodesByKey.get(nodeKey) }))
      .filter((item): item is { nodeKey: string; connectionCount: number; node: KnowledgeGraphNode } => Boolean(item.node))
      .sort((a, b) => b.connectionCount - a.connectionCount)
      .slice(0, 10)
      .map(({ nodeKey, connectionCount, node }) => ({
        nodeKey,
        nodeType: node.nodeType,
        label: node.label,
        connectionCount,
        verificationStatus: node.verificationStatus,
      }));

    const highRiskClusters = nodes
      .filter((graphNode) => HIGH_RISK_STATUSES.has(graphNode.verificationStatus) || graphNode.confidence < 0.35)
      .sort((a, b) => a.confidence - b.confidence)
      .slice(0, 10)
      .map((graphNode) => ({
        nodeKey: graphNode.nodeKey,
        nodeType: graphNode.nodeType,
        label: graphNode.label,
        verificationStatus: graphNode.verificationStatus,
        confidence: graphNode.confidence,
        reason: graphNode.confidence < 0.35 ? "Low confidence" : `Verification status is ${graphNode.verificationStatus}`,
      }));

    const allSources = new Set([...Object.keys(sourceNodeCounts), ...Object.keys(sourceEdgeCounts)]);
    const provenanceSummaries = [...allSources].sort().map((sourceTable) => ({
      sourceTable,
      nodes: sourceNodeCounts[sourceTable] || 0,
      edges: sourceEdgeCounts[sourceTable] || 0,
    }));

    return {
      generatedAt: new Date().toISOString(),
      internalOnly: true,
      manualSyncOnly: true,
      totals: {
        nodes: nodes.length,
        edges: edges.length,
        blockedRestrictedSources: blockedCounts.total,
      },
      nodeCountsByType,
      edgeCountsByRelation,
      verificationDistribution,
      vaultDistribution,
      sensitivityDistribution,
      topConnected,
      highRiskClusters,
      blockedCounts,
      provenanceSummaries,
      qualitySignals: {
        uesAvailable,
        sourceQuality: nodes.length > 10 && edges.length > 10 ? "calculated" : nodes.length > 0 ? "partial" : "fallback",
        notes: [
          "Summary is based on internal graph records only.",
          "Private/restricted memory appears only as aggregate blocked counts.",
          uesAvailable ? "Phase 12 UES global score is available as read-only context." : "Phase 12 UES global score was unavailable; graph summary still loaded.",
        ],
      },
      safeguards: {
        rootAdminOnly: true,
        internalAdminInspectionOnly: true,
        noRawPrivateMemoryContent: true,
        noPublicGraphRoutes: true,
        noAutonomousGraphExpansion: true,
      },
    };
  }

  private async getBlockedMemorySummary() {
    const blocked: BlockedSource[] = [];
    const [knowledge, memories, truths] = await Promise.all([
      selectLimited<typeof agentKnowledgeSources.$inferSelect>(agentKnowledgeSources, 1000),
      selectLimited<typeof agentMemory.$inferSelect>(agentMemory, 1000),
      selectLimited<typeof truthMemories.$inferSelect>(truthMemories, 1000),
    ]);

    for (const source of knowledge) {
      const { allowed, decision } = memoryDecision("agent_knowledge_sources", source);
      if (!allowed || decision.vaultType === "business") blocked.push(blockFromDecision("agent_knowledge_sources", source.id, decision));
    }
    for (const memory of memories) {
      const { allowed, decision } = memoryDecision("agent_memory", memory);
      if (!allowed) blocked.push(blockFromDecision("agent_memory", memory.id, decision));
    }
    for (const truth of truths) {
      const { allowed, decision } = memoryDecision("truth_memories", truth);
      if (!allowed) blocked.push(blockFromDecision("truth_memories", truth.id, decision));
    }

    return summarizeBlocked(blocked);
  }

  private async buildGraph(): Promise<BuildGraphResult> {
    const nodes: InsertKnowledgeGraphNode[] = [];
    const edges: InsertKnowledgeGraphEdge[] = [];
    const blockedSources: BlockedSource[] = [];

    const [
      realityClaimRows,
      claimEvidenceRows,
      consensusRows,
      legacyClaimRows,
      legacyEvidenceRows,
      debateRows,
      participantRows,
      turnRows,
      knowledgeRows,
      memoryRows,
      truthRows,
      passportRows,
      passportExportRows,
      cloneRows,
      listingRows,
      scriptRows,
      youtubeRows,
      socialRows,
      projectRows,
      projectPackageRows,
    ] = await Promise.all([
      selectLimited<typeof realityClaims.$inferSelect>(realityClaims),
      selectLimited<typeof claimEvidence.$inferSelect>(claimEvidence),
      selectLimited<typeof consensusRecords.$inferSelect>(consensusRecords),
      selectLimited<typeof claims.$inferSelect>(claims),
      selectLimited<typeof evidence.$inferSelect>(evidence),
      selectLimited<typeof liveDebates.$inferSelect>(liveDebates),
      selectLimited<typeof debateParticipants.$inferSelect>(debateParticipants),
      selectLimited<typeof debateTurns.$inferSelect>(debateTurns),
      selectLimited<typeof agentKnowledgeSources.$inferSelect>(agentKnowledgeSources),
      selectLimited<typeof agentMemory.$inferSelect>(agentMemory),
      selectLimited<typeof truthMemories.$inferSelect>(truthMemories),
      selectLimited<typeof agentPassports.$inferSelect>(agentPassports),
      selectLimited<typeof agentPassportExports.$inferSelect>(agentPassportExports),
      selectLimited<typeof agentMarketplaceClonePackages.$inferSelect>(agentMarketplaceClonePackages),
      selectLimited<typeof marketplaceListings.$inferSelect>(marketplaceListings),
      selectLimited<typeof podcastScriptPackages.$inferSelect>(podcastScriptPackages),
      selectLimited<typeof youtubePublishingPackages.$inferSelect>(youtubePublishingPackages),
      selectLimited<typeof socialDistributionPackages.$inferSelect>(socialDistributionPackages),
      selectLimited<typeof projects.$inferSelect>(projects),
      selectLimited<typeof projectPackages.$inferSelect>(projectPackages),
    ]);

    for (const claim of realityClaimRows) {
      const key = `claim:reality:${claim.id}`;
      nodes.push(node({
        nodeKey: key,
        nodeType: "claim",
        label: claim.content,
        summary: claim.content,
        sourceTable: "reality_claims",
        sourceId: claim.id,
        confidence: claim.confidenceScore,
        verificationStatus: claim.status,
        vaultType: "public",
        sensitivity: "public",
        visibility: "internal",
        provenance: sourceMeta("reality_claims", claim.id, { extractedBy: claim.extractedBy, domain: claim.domain }),
        metadata: { agreementLevel: claim.agreementLevel, evidenceStrength: claim.evidenceStrength, tags: claim.tags || [] },
      }));
      if (claim.domain) addTopic(nodes, edges, claim.domain, key, "belongs_to_domain");
      for (const tag of claim.tags || []) addTopic(nodes, edges, tag, key, "tagged_with");
    }

    for (const evidenceRow of claimEvidenceRows) {
      const evidenceKey = `evidence:reality:${evidenceRow.id}`;
      const claimKey = `claim:reality:${evidenceRow.claimId}`;
      nodes.push(node({
        nodeKey: evidenceKey,
        nodeType: "evidence",
        label: evidenceRow.sourceUrl || evidenceRow.content,
        summary: evidenceRow.sourceUrl ? `Evidence reference: ${evidenceRow.sourceUrl}` : evidenceRow.content,
        sourceTable: "claim_evidence",
        sourceId: evidenceRow.id,
        confidence: evidenceRow.trustScore,
        verificationStatus: evidenceRow.evidenceType,
        vaultType: "public",
        sensitivity: "public",
        visibility: "internal",
        provenance: sourceMeta("claim_evidence", evidenceRow.id, { claimId: evidenceRow.claimId, submitterType: evidenceRow.submitterType }),
        metadata: { evidenceType: evidenceRow.evidenceType, weight: evidenceRow.weight },
      }));
      edges.push(edge({
        edgeKey: `${evidenceKey}->${evidenceRow.evidenceType}->${claimKey}`,
        sourceNodeKey: evidenceKey,
        targetNodeKey: claimKey,
        relationType: evidenceRow.evidenceType === "contradicting" ? "contradicts" : "supports",
        confidence: evidenceRow.trustScore,
        verificationStatus: evidenceRow.evidenceType,
        vaultType: "public",
        sensitivity: "public",
        visibility: "internal",
        provenance: sourceMeta("claim_evidence", evidenceRow.id),
        metadata: { weight: evidenceRow.weight },
      }));
      if (evidenceRow.sourceUrl) {
        const sourceKey = `source:url:${slug(evidenceRow.sourceUrl)}`;
        nodes.push(node({
          nodeKey: sourceKey,
          nodeType: "source",
          label: evidenceRow.sourceUrl,
          summary: "External evidence source URL.",
          sourceTable: "claim_evidence",
          sourceId: evidenceRow.id,
          confidence: evidenceRow.trustScore,
          verificationStatus: "source_reference",
          vaultType: "public",
          sensitivity: "public",
          visibility: "internal",
          provenance: sourceMeta("claim_evidence", evidenceRow.id),
          metadata: { url: evidenceRow.sourceUrl },
        }));
        edges.push(edge({
          edgeKey: `${evidenceKey}->cites_source->${sourceKey}`,
          sourceNodeKey: evidenceKey,
          targetNodeKey: sourceKey,
          relationType: "cites_source",
          confidence: evidenceRow.trustScore,
          verificationStatus: "source_reference",
          vaultType: "public",
          sensitivity: "public",
          visibility: "internal",
          provenance: sourceMeta("claim_evidence", evidenceRow.id),
          metadata: {},
        }));
      }
    }

    for (const consensus of consensusRows) {
      const key = `consensus:${consensus.id}`;
      const claimKey = `claim:reality:${consensus.claimId}`;
      nodes.push(node({
        nodeKey: key,
        nodeType: "consensus",
        label: `Consensus ${consensus.previousStatus} to ${consensus.newStatus}`,
        summary: `Consensus update moved claim from ${consensus.previousStatus} to ${consensus.newStatus}.`,
        sourceTable: "consensus_records",
        sourceId: consensus.id,
        confidence: consensus.newConfidence,
        verificationStatus: consensus.newStatus,
        vaultType: "verified",
        sensitivity: "public",
        visibility: "internal",
        provenance: sourceMeta("consensus_records", consensus.id, { claimId: consensus.claimId }),
        metadata: { participantCount: consensus.participantCount, evidenceCount: consensus.evidenceCount, trigger: consensus.trigger },
      }));
      edges.push(edge({
        edgeKey: `${key}->updates_claim->${claimKey}`,
        sourceNodeKey: key,
        targetNodeKey: claimKey,
        relationType: "updates_claim",
        confidence: consensus.newConfidence,
        verificationStatus: consensus.newStatus,
        vaultType: "verified",
        sensitivity: "public",
        visibility: "internal",
        provenance: sourceMeta("consensus_records", consensus.id),
        metadata: { previousStatus: consensus.previousStatus, newStatus: consensus.newStatus },
      }));
    }

    for (const claim of legacyClaimRows) {
      const key = `claim:post:${claim.id}`;
      nodes.push(node({
        nodeKey: key,
        nodeType: "claim",
        label: claim.subject,
        summary: claim.statement,
        sourceTable: "claims",
        sourceId: claim.id,
        confidence: 0.5,
        verificationStatus: "unverified",
        vaultType: "public",
        sensitivity: "public",
        visibility: "internal",
        provenance: sourceMeta("claims", claim.id, { postId: claim.postId }),
        metadata: { metric: claim.metric, timeReference: claim.timeReference },
      }));
    }

    for (const evidenceRow of legacyEvidenceRows) {
      const evidenceKey = `evidence:post:${evidenceRow.id}`;
      nodes.push(node({
        nodeKey: evidenceKey,
        nodeType: "evidence",
        label: evidenceRow.label,
        summary: evidenceRow.url,
        sourceTable: "evidence",
        sourceId: evidenceRow.id,
        confidence: 0.5,
        verificationStatus: evidenceRow.evidenceType,
        vaultType: "public",
        sensitivity: "public",
        visibility: "internal",
        provenance: sourceMeta("evidence", evidenceRow.id, { postId: evidenceRow.postId, claimId: evidenceRow.claimId }),
        metadata: { url: evidenceRow.url, evidenceType: evidenceRow.evidenceType },
      }));
      if (evidenceRow.claimId) {
        edges.push(edge({
          edgeKey: `${evidenceKey}->evidence_for->claim:post:${evidenceRow.claimId}`,
          sourceNodeKey: evidenceKey,
          targetNodeKey: `claim:post:${evidenceRow.claimId}`,
          relationType: "evidence_for",
          confidence: 0.5,
          verificationStatus: evidenceRow.evidenceType,
          vaultType: "public",
          sensitivity: "public",
          visibility: "internal",
          provenance: sourceMeta("evidence", evidenceRow.id),
          metadata: {},
        }));
      }
    }

    for (const debate of debateRows) {
      if (["deleted", "rejected"].includes(debate.status)) continue;
      const key = `debate:${debate.id}`;
      nodes.push(node({
        nodeKey: key,
        nodeType: "debate",
        label: debate.title,
        summary: debate.consensusSummary || debate.description || "Debate metadata only.",
        sourceTable: "live_debates",
        sourceId: debate.id,
        confidence: debate.confidenceScore ?? 0.5,
        verificationStatus: debate.status,
        vaultType: "public",
        sensitivity: "public",
        visibility: "internal",
        provenance: sourceMeta("live_debates", debate.id, { createdBy: debate.createdBy }),
        metadata: { format: debate.format, totalRounds: debate.totalRounds, internalStatus: debate.status, disagreementSummary: truncate(debate.disagreementSummary || "", 240) },
      }));
      addTopic(nodes, edges, debate.topic, key, "debates_topic");
    }

    for (const participant of participantRows) {
      const debateKey = `debate:${participant.debateId}`;
      const participantKey = `agent:${slug(participant.userId)}`;
      nodes.push(node({
        nodeKey: participantKey,
        nodeType: participant.participantType === "agent" ? "agent" : "participant",
        label: participant.userId,
        summary: `${participant.participantType} debate participant metadata.`,
        sourceTable: "debate_participants",
        sourceId: participant.id,
        confidence: 0.5,
        verificationStatus: participant.isActive ? "active" : "inactive",
        vaultType: "public",
        sensitivity: "public",
        visibility: "internal",
        provenance: sourceMeta("debate_participants", participant.id, { debateId: participant.debateId }),
        metadata: { role: participant.role, participantType: participant.participantType, position: participant.position },
      }));
      edges.push(edge({
        edgeKey: `${participantKey}->participates_in->${debateKey}`,
        sourceNodeKey: participantKey,
        targetNodeKey: debateKey,
        relationType: "participates_in",
        confidence: 0.5,
        verificationStatus: participant.isActive ? "active" : "inactive",
        vaultType: "public",
        sensitivity: "public",
        visibility: "internal",
        provenance: sourceMeta("debate_participants", participant.id),
        metadata: { role: participant.role },
      }));
    }

    for (const turn of turnRows) {
      const key = `debate-turn:${turn.id}`;
      nodes.push(node({
        nodeKey: key,
        nodeType: "debate_turn",
        label: `Round ${turn.roundNumber} turn ${turn.turnOrder}`,
        summary: turn.content,
        sourceTable: "debate_turns",
        sourceId: turn.id,
        confidence: turn.tcsScore ?? 0.5,
        verificationStatus: turn.tcsScore != null ? "scored" : "unscored",
        vaultType: "public",
        sensitivity: "internal",
        visibility: "internal",
        provenance: sourceMeta("debate_turns", turn.id, { debateId: turn.debateId, participantId: turn.participantId }),
        metadata: { roundNumber: turn.roundNumber, turnOrder: turn.turnOrder, wordCount: turn.wordCount },
      }));
      edges.push(edge({
        edgeKey: `${key}->belongs_to_debate->debate:${turn.debateId}`,
        sourceNodeKey: key,
        targetNodeKey: `debate:${turn.debateId}`,
        relationType: "belongs_to_debate",
        confidence: turn.tcsScore ?? 0.5,
        verificationStatus: turn.tcsScore != null ? "scored" : "unscored",
        vaultType: "public",
        sensitivity: "internal",
        visibility: "internal",
        provenance: sourceMeta("debate_turns", turn.id),
        metadata: {},
      }));
    }

    for (const source of knowledgeRows) {
      const { allowed, decision } = memoryDecision("agent_knowledge_sources", source);
      if (!allowed) {
        blockedSources.push(blockFromDecision("agent_knowledge_sources", source.id, decision));
        continue;
      }
      const key = `knowledge-source:${source.id}`;
      const businessMetadataOnly = decision.vaultType === "business";
      nodes.push(node({
        nodeKey: key,
        nodeType: "source",
        label: source.title,
        summary: businessMetadataOnly
          ? "Business knowledge source approved for internal graph as metadata only; raw content withheld."
          : source.content || source.uri || source.title,
        sourceTable: "agent_knowledge_sources",
        sourceId: source.id,
        confidence: decision.vaultType === "verified" ? 0.85 : 0.6,
        verificationStatus: source.status,
        vaultType: decision.vaultType,
        sensitivity: decision.sensitivity,
        visibility: "internal",
        provenance: sourceMeta("agent_knowledge_sources", source.id, { agentId: source.agentId, policyReason: decision.reason }),
        metadata: { sourceType: source.sourceType, status: source.status, redactedRawContent: businessMetadataOnly },
      }));
      edges.push(edge({
        edgeKey: `${key}->belongs_to_agent->agent:${slug(source.agentId)}`,
        sourceNodeKey: key,
        targetNodeKey: `agent:${slug(source.agentId)}`,
        relationType: "belongs_to_agent",
        confidence: 0.6,
        verificationStatus: source.status,
        vaultType: decision.vaultType,
        sensitivity: decision.sensitivity,
        visibility: "internal",
        provenance: sourceMeta("agent_knowledge_sources", source.id),
        metadata: { policyReason: decision.reason },
      }));
    }

    for (const memory of memoryRows) {
      const { allowed, decision } = memoryDecision("agent_memory", memory);
      if (!allowed) {
        blockedSources.push(blockFromDecision("agent_memory", memory.id, decision));
        continue;
      }
      const key = `agent-memory:${memory.id}`;
      nodes.push(node({
        nodeKey: key,
        nodeType: "agent_memory",
        label: memory.eventType,
        summary: decision.vaultType === "behavioral" ? safeBehavioralSummary(memory.contextData) : safeSummary(memory.contextData),
        sourceTable: "agent_memory",
        sourceId: memory.id,
        confidence: 0.5 + Math.max(-0.2, Math.min(0.2, memory.rewardOutcome || 0)),
        verificationStatus: "sanitized",
        vaultType: decision.vaultType,
        sensitivity: decision.sensitivity,
        visibility: "internal",
        provenance: sourceMeta("agent_memory", memory.id, { agentId: memory.agentId, policyReason: decision.reason }),
        metadata: { eventType: memory.eventType, rewardOutcome: memory.rewardOutcome, rawMemoryContentStored: false },
      }));
      edges.push(edge({
        edgeKey: `${key}->influences_agent->agent:${slug(memory.agentId)}`,
        sourceNodeKey: key,
        targetNodeKey: `agent:${slug(memory.agentId)}`,
        relationType: "influences_agent",
        confidence: 0.45,
        verificationStatus: "sanitized",
        vaultType: decision.vaultType,
        sensitivity: decision.sensitivity,
        visibility: "internal",
        provenance: sourceMeta("agent_memory", memory.id),
        metadata: { styleHintOnly: decision.vaultType === "behavioral" },
      }));
    }

    for (const truth of truthRows) {
      const { allowed, decision } = memoryDecision("truth_memories", truth);
      if (!allowed) {
        blockedSources.push(blockFromDecision("truth_memories", truth.id, decision));
        continue;
      }
      const key = `truth-memory:${truth.id}`;
      nodes.push(node({
        nodeKey: key,
        nodeType: "verified_memory",
        label: truth.truthType,
        summary: decision.vaultType === "business"
          ? "Business truth memory approved for internal graph as metadata only; raw content withheld."
          : truth.content,
        sourceTable: "truth_memories",
        sourceId: truth.id,
        confidence: truth.confidenceScore,
        verificationStatus: truth.truthType,
        vaultType: decision.vaultType,
        sensitivity: decision.sensitivity,
        visibility: "internal",
        provenance: sourceMeta("truth_memories", truth.id, { agentId: truth.agentId, policyReason: decision.reason }),
        metadata: {
          evidenceCount: truth.evidenceCount,
          contradictionCount: truth.contradictionCount,
          validationCount: truth.validationCount,
          rawMemoryContentStored: decision.vaultType !== "business",
        },
      }));
    }

    for (const passport of passportRows) {
      const key = `passport:${passport.id}`;
      nodes.push(node({
        nodeKey: key,
        nodeType: "agent_passport",
        label: `Agent passport v${passport.exportVersion}`,
        summary: "Agent passport metadata only; hashes and private memory are not exposed.",
        sourceTable: "agent_passports",
        sourceId: passport.id,
        confidence: passport.revokedAt ? 0.25 : 0.7,
        verificationStatus: passport.revokedAt ? "revoked" : "active",
        vaultType: "public",
        sensitivity: "internal",
        visibility: "internal",
        provenance: sourceMeta("agent_passports", passport.id, { agentId: passport.agentId }),
        metadata: { exportVersion: passport.exportVersion, revoked: Boolean(passport.revokedAt) },
      }));
      edges.push(edge({
        edgeKey: `${key}->describes_agent->agent:${slug(passport.agentId)}`,
        sourceNodeKey: key,
        targetNodeKey: `agent:${slug(passport.agentId)}`,
        relationType: "describes_agent",
        confidence: passport.revokedAt ? 0.25 : 0.7,
        verificationStatus: passport.revokedAt ? "revoked" : "active",
        vaultType: "public",
        sensitivity: "internal",
        visibility: "internal",
        provenance: sourceMeta("agent_passports", passport.id),
        metadata: {},
      }));
    }

    for (const passportExport of passportExportRows) {
      const key = `passport-export:${passportExport.id}`;
      nodes.push(node({
        nodeKey: key,
        nodeType: "passport_export",
        label: `Passport export v${passportExport.exportVersion}`,
        summary: "Agent passport export metadata only; export hashes are not displayed.",
        sourceTable: "agent_passport_exports",
        sourceId: passportExport.id,
        confidence: passportExport.revoked ? 0.25 : 0.65,
        verificationStatus: passportExport.revoked ? "revoked" : "exported",
        vaultType: "public",
        sensitivity: "internal",
        visibility: "internal",
        provenance: sourceMeta("agent_passport_exports", passportExport.id, { agentId: passportExport.agentId }),
        metadata: { exportVersion: passportExport.exportVersion, revoked: passportExport.revoked },
      }));
    }

    for (const clonePackage of cloneRows) {
      if (!ALLOWED_MARKETPLACE_STATUSES.has(clonePackage.reviewStatus) && !ALLOWED_MARKETPLACE_STATUSES.has(clonePackage.status)) continue;
      const key = `marketplace-clone:${clonePackage.id}`;
      nodes.push(node({
        nodeKey: key,
        nodeType: "marketplace_clone",
        label: `Safe clone package ${clonePackage.exportMode}`,
        summary: "Approved/sandbox safe clone package metadata only. Sanitized clone data is not expanded into public graph output.",
        sourceTable: "agent_marketplace_clone_packages",
        sourceId: clonePackage.id,
        confidence: clonePackage.reviewStatus === "approved" ? 0.75 : 0.55,
        verificationStatus: clonePackage.reviewStatus,
        vaultType: "public",
        sensitivity: "internal",
        visibility: "internal",
        provenance: sourceMeta("agent_marketplace_clone_packages", clonePackage.id, { sourceAgentId: clonePackage.sourceAgentId }),
        metadata: { exportMode: clonePackage.exportMode, status: clonePackage.status, reviewStatus: clonePackage.reviewStatus },
      }));
      edges.push(edge({
        edgeKey: `${key}->sanitized_clone_of->agent:${slug(clonePackage.sourceAgentId)}`,
        sourceNodeKey: key,
        targetNodeKey: `agent:${slug(clonePackage.sourceAgentId)}`,
        relationType: "sanitized_clone_of",
        confidence: 0.7,
        verificationStatus: clonePackage.reviewStatus,
        vaultType: "public",
        sensitivity: "internal",
        visibility: "internal",
        provenance: sourceMeta("agent_marketplace_clone_packages", clonePackage.id),
        metadata: { originalPrivateMemoryIncluded: false },
      }));
    }

    for (const listing of listingRows) {
      if (!ALLOWED_MARKETPLACE_STATUSES.has(listing.status)) continue;
      const key = `marketplace-listing:${listing.id}`;
      nodes.push(node({
        nodeKey: key,
        nodeType: "marketplace_listing",
        label: listing.title,
        summary: "Marketplace listing metadata only; Phase 19 safe clone controls govern public listing exposure.",
        sourceTable: "marketplace_listings",
        sourceId: listing.id,
        confidence: listing.averageRating ? clamp01(listing.averageRating / 5) : 0.5,
        verificationStatus: listing.status,
        vaultType: "public",
        sensitivity: "public",
        visibility: "internal",
        provenance: sourceMeta("marketplace_listings", listing.id, { agentId: listing.agentId }),
        metadata: { category: listing.category, reviewCount: listing.reviewCount, featured: listing.featured },
      }));
    }

    for (const scriptPackage of scriptRows) {
      if (!ALLOWED_INTERNAL_STATUSES.has(scriptPackage.status)) continue;
      const key = `podcast-script:${scriptPackage.id}`;
      const packageRecord = asRecord(scriptPackage.scriptPackage);
      nodes.push(node({
        nodeKey: key,
        nodeType: "podcast_script",
        label: packageRecord.youtubeTitle || `Podcast script package ${scriptPackage.id}`,
        summary: "Podcast script package metadata and safety notes only; full scripts are not copied into the graph.",
        sourceTable: "podcast_script_packages",
        sourceId: scriptPackage.id,
        confidence: scriptPackage.status === "approved" ? 0.75 : 0.55,
        verificationStatus: scriptPackage.status,
        vaultType: "public",
        sensitivity: "internal",
        visibility: "internal",
        provenance: sourceMeta("podcast_script_packages", scriptPackage.id, { debateId: scriptPackage.debateId, sourceArticleId: scriptPackage.sourceArticleId }),
        metadata: { safetyNotes: scriptPackage.safetyNotes, copiedFullScript: false },
      }));
      edges.push(edge({
        edgeKey: `${key}->derived_from_debate->debate:${scriptPackage.debateId}`,
        sourceNodeKey: key,
        targetNodeKey: `debate:${scriptPackage.debateId}`,
        relationType: "derived_from_debate",
        confidence: 0.55,
        verificationStatus: scriptPackage.status,
        vaultType: "public",
        sensitivity: "internal",
        visibility: "internal",
        provenance: sourceMeta("podcast_script_packages", scriptPackage.id),
        metadata: {},
      }));
    }

    for (const youtubePackage of youtubeRows) {
      const key = `youtube-package:${youtubePackage.id}`;
      nodes.push(node({
        nodeKey: key,
        nodeType: "youtube_package",
        label: asRecord(youtubePackage.packageMetadata).title || `YouTube package ${youtubePackage.id}`,
        summary: "YouTube publishing package metadata only. Upload remains manual and root-admin gated.",
        sourceTable: "youtube_publishing_packages",
        sourceId: youtubePackage.id,
        confidence: youtubePackage.approvalStatus === "approved" ? 0.75 : 0.45,
        verificationStatus: youtubePackage.approvalStatus,
        vaultType: "public",
        sensitivity: "internal",
        visibility: "internal",
        provenance: sourceMeta("youtube_publishing_packages", youtubePackage.id, { scriptPackageId: youtubePackage.scriptPackageId }),
        metadata: { status: youtubePackage.status, uploadStatus: youtubePackage.uploadStatus, provider: youtubePackage.provider },
      }));
      edges.push(edge({
        edgeKey: `${key}->packages_script->podcast-script:${youtubePackage.scriptPackageId}`,
        sourceNodeKey: key,
        targetNodeKey: `podcast-script:${youtubePackage.scriptPackageId}`,
        relationType: "packages_script",
        confidence: 0.55,
        verificationStatus: youtubePackage.approvalStatus,
        vaultType: "public",
        sensitivity: "internal",
        visibility: "internal",
        provenance: sourceMeta("youtube_publishing_packages", youtubePackage.id),
        metadata: {},
      }));
    }

    for (const socialPackage of socialRows) {
      const key = `social-package:${socialPackage.id}`;
      nodes.push(node({
        nodeKey: key,
        nodeType: "social_distribution_package",
        label: asRecord(socialPackage.generatedCopy).sourceTitle || `Social distribution package ${socialPackage.id}`,
        summary: "Social distribution package metadata only. Generated copy is not copied into the graph.",
        sourceTable: "social_distribution_packages",
        sourceId: socialPackage.id,
        confidence: socialPackage.approvalStatus === "approved" ? 0.7 : 0.45,
        verificationStatus: socialPackage.approvalStatus,
        vaultType: "public",
        sensitivity: "internal",
        visibility: "internal",
        provenance: sourceMeta("social_distribution_packages", socialPackage.id, { sourceType: socialPackage.sourceType }),
        metadata: { mode: socialPackage.mode, status: socialPackage.status, postingStatus: socialPackage.postingStatus, targetPlatforms: socialPackage.targetPlatforms },
      }));
    }

    for (const project of projectRows) {
      const key = `project:${project.id}`;
      nodes.push(node({
        nodeKey: key,
        nodeType: "project",
        label: project.title,
        summary: "Project metadata only; raw blueprint JSON is not ingested into the knowledge graph.",
        sourceTable: "projects",
        sourceId: project.id,
        confidence: project.status === "approved" || project.status === "completed" ? 0.7 : 0.45,
        verificationStatus: project.status,
        vaultType: "business",
        sensitivity: "restricted",
        visibility: "internal",
        provenance: sourceMeta("projects", project.id, { createdBy: project.createdBy }),
        metadata: { projectType: project.projectType, status: project.status, blueprintIngested: false },
      }));
      if (project.topicSlug) addTopic(nodes, edges, project.topicSlug, key, "project_topic");
      if (project.debateId) {
        edges.push(edge({
          edgeKey: `${key}->derived_from_debate->debate:${project.debateId}`,
          sourceNodeKey: key,
          targetNodeKey: `debate:${project.debateId}`,
          relationType: "derived_from_debate",
          confidence: 0.5,
          verificationStatus: project.status,
          vaultType: "business",
          sensitivity: "restricted",
          visibility: "internal",
          provenance: sourceMeta("projects", project.id),
          metadata: {},
        }));
      }
    }

    for (const pkg of projectPackageRows) {
      const key = `project-package:${pkg.id}`;
      nodes.push(node({
        nodeKey: key,
        nodeType: "project_package",
        label: `Project package v${pkg.versionNumber}`,
        summary: "Project package metadata only; generated files are not copied into the graph.",
        sourceTable: "project_packages",
        sourceId: pkg.id,
        confidence: pkg.councilApproved ? 0.75 : 0.45,
        verificationStatus: pkg.councilApproved ? "approved" : "unverified",
        vaultType: "business",
        sensitivity: "restricted",
        visibility: "internal",
        provenance: sourceMeta("project_packages", pkg.id, { projectId: pkg.projectId }),
        metadata: { pages: pkg.pages, councilApproved: pkg.councilApproved },
      }));
      edges.push(edge({
        edgeKey: `${key}->packages_project->project:${pkg.projectId}`,
        sourceNodeKey: key,
        targetNodeKey: `project:${pkg.projectId}`,
        relationType: "packages_project",
        confidence: pkg.councilApproved ? 0.75 : 0.45,
        verificationStatus: pkg.councilApproved ? "approved" : "unverified",
        vaultType: "business",
        sensitivity: "restricted",
        visibility: "internal",
        provenance: sourceMeta("project_packages", pkg.id),
        metadata: {},
      }));
    }

    return { nodes, edges, blockedSources };
  }
}

export const knowledgeGraphService = new KnowledgeGraphService();
