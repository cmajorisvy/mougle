import crypto from "crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import {
  agentDnaMutationHistory,
  agentGenomes,
  agentKnowledgeSources,
  agentTrustProfiles,
  gluonLedgerEntries,
  knowledgePacketAcceptances,
  knowledgePackets,
  userAgents,
  users,
  type AgentGenome,
  type KnowledgePacket,
  type KnowledgePacketAcceptance,
  type UserAgent,
} from "@shared/schema";
import { evaluateMemoryAccess, type MemorySensitivity, type MemoryVaultType } from "./memory-access-policy";
import { sanitizeMemoryOutput } from "./memory-output-sanitizer";
import { unifiedEvolutionService } from "./unified-evolution-service";
import { riskManagementService } from "./risk-management-service";

const VAULT_TYPES = ["business", "public", "behavioral", "verified"] as const;
const SENSITIVITY_LEVELS = ["public", "low", "internal", "restricted"] as const;
const DECISIONS = ["accepted", "rejected", "challenged"] as const;
const ACCEPTING_AGENT_TYPES = ["system_agent", "user_agent", "root_admin"] as const;
const SECRET_REDACTIONS = new Set(["secret_field", "token_or_api_key", "ssn", "card_number", "banking"]);
const REGULATED_PATTERN = /\b(medical|diagnosis|prescription|clinical|legal|lawsuit|contract|tax|investment|financial advice|loan|insurance|securities|bankruptcy)\b/i;
const MAX_PACKET_LIMIT = 100;
const DEFAULT_HALF_LIFE_DAYS = 90;

type PacketInput = {
  creatorAgentId: string;
  title: string;
  summary: string;
  abstractedContent: string;
  sourceType?: string;
  domainTags?: string[];
  industryTags?: string[];
  geoTags?: string[];
  professionTags?: string[];
  vaultType?: string;
  sensitivity?: string;
  privacyLevel?: string;
  consentPolicy?: Record<string, any>;
  evidenceStrength?: number;
  noveltyScore?: number;
  usefulnessPrediction?: number;
  riskScore?: number;
  complianceScore?: number;
  halfLifeDays?: number;
  parentPacketIds?: string[];
};

type AcceptanceInput = {
  acceptingAgentId?: string;
  acceptingAgentType?: string;
  acceptingUserId?: string;
  decision: typeof DECISIONS[number];
  domainMatch?: number;
  receiverAuthority?: number;
  retentionScore?: number;
  realWorldFeedbackScore?: number;
  rationale?: string;
  challengeReason?: string;
  sandboxOnly?: boolean;
};

class KnowledgeEconomyError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : {};
}

function normalizeText(value: unknown, name: string, maxLength: number) {
  if (typeof value !== "string" || !value.trim()) {
    throw new KnowledgeEconomyError(400, `${name} is required`);
  }
  return value.trim().slice(0, maxLength);
}

function optionalText(value: unknown, maxLength: number) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, maxLength) : undefined;
}

function normalizeTags(value: unknown, max = 12) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value
    .filter((item): item is string => typeof item === "string" && !!item.trim())
    .map((item) => item.trim().toLowerCase().slice(0, 64))
  )].slice(0, max);
}

function clamp01(value: unknown, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(1, parsed));
}

function clampInteger(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function normalizeVault(value: unknown): MemoryVaultType {
  if (typeof value === "string" && (VAULT_TYPES as readonly string[]).includes(value)) {
    return value as MemoryVaultType;
  }
  return "business";
}

function normalizeSensitivity(value: unknown): MemorySensitivity | "low" {
  if (typeof value === "string" && (SENSITIVITY_LEVELS as readonly string[]).includes(value)) {
    return value as MemorySensitivity | "low";
  }
  return "restricted";
}

function sensitivityForMemoryPolicy(value: MemorySensitivity | "low"): MemorySensitivity {
  return value === "low" ? "public" : value;
}

function hashText(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function buildFingerprint(input: {
  creatorAgentId: string;
  title: string;
  summary: string;
  abstractedContent: string;
  sourceType: string;
}) {
  const normalized = [
    input.creatorAgentId,
    input.sourceType,
    input.title,
    input.summary,
    input.abstractedContent,
  ].join("\n").toLowerCase().replace(/\s+/g, " ").trim();
  return hashText(normalized);
}

function isRegulated(input: { title: string; summary: string; abstractedContent: string; domainTags: string[]; industryTags: string[] }) {
  const tags = [...input.domainTags, ...input.industryTags].join(" ");
  return REGULATED_PATTERN.test(`${input.title}\n${input.summary}\n${input.abstractedContent}\n${tags}`);
}

function packetAgeDays(packet: Pick<KnowledgePacket, "freshnessTimestamp" | "createdAt">) {
  const base = packet.freshnessTimestamp || packet.createdAt || new Date();
  return Math.max(0, (Date.now() - new Date(base).getTime()) / 86_400_000);
}

function countDecision(rows: KnowledgePacketAcceptance[], decision: typeof DECISIONS[number]) {
  return rows.filter((row) => row.decision === decision).length;
}

function scoreFromTags(a: string[], b: string[]) {
  if (a.length === 0 || b.length === 0) return 0.5;
  const set = new Set(a.map((item) => item.toLowerCase()));
  const overlap = b.filter((item) => set.has(item.toLowerCase())).length;
  return Math.min(1, overlap / Math.max(1, Math.min(a.length, b.length)));
}

function nonCashoutGuarantees() {
  return {
    nonConvertible: true,
    touchesCreditWallet: false,
    touchesPurchases: false,
    touchesPayouts: false,
    touchesStripe: false,
    touchesRazorpay: false,
    withdrawableFunds: false,
  };
}

async function audit(action: string, actorId: string, actorType: string, outcome: "success" | "denied" | "error", details: Record<string, any>, resourceId?: string) {
  try {
    await riskManagementService.logAudit({
      actorId,
      actorType,
      action,
      resourceType: "knowledge_economy",
      resourceId,
      outcome,
      riskLevel: outcome === "success" ? "medium" : "high",
      details,
    });
  } catch {
    // Audit failures should not expose internals or activate economic side effects.
  }
}

export function generatePrimeColorSignature(primeSeed: string) {
  const seed = primeSeed.trim() || "mougle-prime";
  const digest = hashText(seed);
  const hue = parseInt(digest.slice(0, 6), 16) % 360;
  const saturation = 58 + (parseInt(digest.slice(6, 8), 16) % 28);
  const lightness = 42 + (parseInt(digest.slice(8, 10), 16) % 20);

  function hslToHex(h: number, s: number, l: number) {
    s /= 100;
    l /= 100;
    const k = (n: number) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return `#${[f(0), f(8), f(4)].map((x) => Math.round(255 * x).toString(16).padStart(2, "0")).join("")}`;
  }

  return {
    seedHash: digest.slice(0, 24),
    hue,
    saturation,
    lightness,
    hex: hslToHex(hue, saturation, lightness),
    hsl: `hsl(${hue} ${saturation}% ${lightness}%)`,
  };
}

export function calculateFreshness(ageDays: number, halfLifeDays: number) {
  const safeAge = Math.max(0, Number.isFinite(ageDays) ? ageDays : 0);
  const safeHalfLife = Math.max(1, Number.isFinite(halfLifeDays) ? halfLifeDays : DEFAULT_HALF_LIFE_DAYS);
  return Math.round(Math.pow(0.5, safeAge / safeHalfLife) * 1000) / 1000;
}

export async function calculateWeightedAcceptance(packetId: string) {
  const rows = await db.select().from(knowledgePacketAcceptances).where(eq(knowledgePacketAcceptances.packetId, packetId));
  const acceptedRows = rows.filter((row) => row.decision === "accepted");
  const weightedAcceptance = acceptedRows.reduce((sum, row) => sum + clamp01(row.weightedAcceptanceContribution), 0);

  return {
    packetId,
    weightedAcceptance: Math.round(weightedAcceptance * 1000) / 1000,
    acceptedCount: acceptedRows.length,
    rejectedCount: countDecision(rows, "rejected"),
    challengedCount: countDecision(rows, "challenged"),
    rawAcceptanceCountIgnored: true,
    formula: "sum(weighted accepted contributions); Gluon uses log(1 + weightedAcceptance), not raw count",
  };
}

export function calculateGluon(packet: KnowledgePacket) {
  const freshness = calculateFreshness(packetAgeDays(packet), packet.halfLifeDays || DEFAULT_HALF_LIFE_DAYS);
  const verifiedMultiplier = ["verified", "approved", "supported"].includes(packet.verificationStatus) ? 1 : 0.35;
  const reviewMultiplier = ["approved", "accepted", "verified"].includes(packet.reviewStatus) ? 1 : packet.reviewStatus === "challenged" ? 0.2 : 0.5;
  const safety = asRecord(packet.safetyReport);
  const blockers = Array.isArray(safety.blockers) ? safety.blockers : [];
  const regulated = safety.regulatedClaim === true;
  const unresolvedRegulated = regulated && !["verified", "approved", "supported"].includes(packet.verificationStatus);
  const fraudRisk = packet.riskScore >= 0.85 || blockers.length > 0 || safety.duplicateRisk === true;
  const lowValueRisk = packet.noveltyScore < 0.2 || packet.usefulnessPrediction < 0.2;
  const weightedSignal = Math.log(1 + Math.max(0, packet.weightedAcceptance || 0));
  const qualitySignal =
    0.25 * clamp01(packet.evidenceStrength)
    + 0.20 * clamp01(packet.noveltyScore)
    + 0.20 * clamp01(packet.usefulnessPrediction)
    + 0.20 * clamp01(packet.complianceScore)
    + 0.15 * freshness;
  const riskPenalty = Math.max(0, 1 - clamp01(packet.riskScore));
  const base = 100 * weightedSignal * qualitySignal * riskPenalty * verifiedMultiplier * reviewMultiplier;
  const amount = fraudRisk || unresolvedRegulated || lowValueRisk ? 0 : Math.round(base * 100) / 100;

  return {
    amount,
    nonConvertible: true,
    status: "simulated" as const,
    formula: "100 * log(1 + weightedAcceptance) * qualitySignal * (1 - risk) * verificationMultiplier * reviewMultiplier",
    calculationInputs: {
      weightedAcceptance: packet.weightedAcceptance || 0,
      logWeightedAcceptance: Math.round(weightedSignal * 1000) / 1000,
      evidenceStrength: packet.evidenceStrength,
      noveltyScore: packet.noveltyScore,
      usefulnessPrediction: packet.usefulnessPrediction,
      complianceScore: packet.complianceScore,
      freshness,
      riskScore: packet.riskScore,
      verifiedMultiplier,
      reviewMultiplier,
      fraudRisk,
      lowValueRisk,
      regulated,
      unresolvedRegulated,
    },
    reasons: [
      "Gluon is an internal non-cashout wisdom signal in this phase.",
      "Raw acceptance counts are ignored; calculation uses log(1 + weightedAcceptance).",
      fraudRisk ? "Fraud/high-risk/duplicate blockers reduce Gluon to zero." : "No fraud blocker applied.",
      lowValueRisk ? "Low novelty or low usefulness reduces Gluon to zero." : "Low-value mass publishing gate passed.",
      unresolvedRegulated ? "Regulated claims need verification before Gluon can be earned." : "Regulated-claim verification gate passed or not applicable.",
    ],
    guarantees: nonCashoutGuarantees(),
  };
}

function normalizePacketInput(input: PacketInput) {
  const creatorAgentId = normalizeText(input.creatorAgentId, "creatorAgentId", 120);
  const title = normalizeText(input.title, "title", 180);
  const summary = normalizeText(input.summary, "summary", 1200);
  const abstractedContent = normalizeText(input.abstractedContent, "abstractedContent", 12000);
  const sourceType = optionalText(input.sourceType, 80) || "abstracted_experience";
  const domainTags = normalizeTags(input.domainTags);
  const industryTags = normalizeTags(input.industryTags);
  const geoTags = normalizeTags(input.geoTags);
  const professionTags = normalizeTags(input.professionTags);
  const vaultType = normalizeVault(input.vaultType);
  const sensitivity = normalizeSensitivity(input.sensitivity);
  const halfLifeDays = clampInteger(input.halfLifeDays, DEFAULT_HALF_LIFE_DAYS, 1, 3650);

  return {
    creatorAgentId,
    title,
    summary,
    abstractedContent,
    sourceType,
    domainTags,
    industryTags,
    geoTags,
    professionTags,
    vaultType,
    sensitivity,
    privacyLevel: optionalText(input.privacyLevel, 80) || "internal",
    evidenceStrength: clamp01(input.evidenceStrength, 0.35),
    noveltyScore: clamp01(input.noveltyScore, 0.45),
    usefulnessPrediction: clamp01(input.usefulnessPrediction, 0.45),
    riskScore: clamp01(input.riskScore, 0.4),
    complianceScore: clamp01(input.complianceScore, 0.5),
    halfLifeDays,
    parentPacketIds: normalizeTags(input.parentPacketIds, 20),
    consentPolicy: asRecord(input.consentPolicy),
  };
}

async function getOwnedAgentOrThrow(ownerId: string, agentId: string) {
  const [agent] = await db.select().from(userAgents).where(eq(userAgents.id, agentId)).limit(1);
  if (!agent) throw new KnowledgeEconomyError(404, "Agent not found.");
  if (agent.ownerId !== ownerId) throw new KnowledgeEconomyError(403, "You can create packets only from your own agents.");
  if (agent.agentType !== "user_owned" && agent.type !== "personal") {
    throw new KnowledgeEconomyError(403, "Only user-owned private agents can create knowledge packets in this phase.");
  }
  if (agent.visibility !== "private") {
    throw new KnowledgeEconomyError(400, "Knowledge packets can be drafted only from private agents in this phase.");
  }
  return agent;
}

async function buildPacketPreview(ownerId: string, input: PacketInput) {
  const normalized = normalizePacketInput(input);
  const agent = await getOwnedAgentOrThrow(ownerId, normalized.creatorAgentId);
  const consent = normalized.consentPolicy;
  const explicitConsent = consent.creatorConsent === true || consent.packetConsent === true || consent.crossAgentLearningConsent === true;
  const businessConsent = consent.businessKnowledgeApproved === true || consent.explicitBusinessPermission === true;
  const policy = evaluateMemoryAccess({
    vaultType: normalized.vaultType,
    sensitivity: sensitivityForMemoryPolicy(normalized.sensitivity),
    context: "business_task",
    explicitUserPermission: normalized.vaultType === "business" && businessConsent,
    sourceType: "knowledge_source",
  });
  const contentOutput = sanitizeMemoryOutput(normalized.abstractedContent, {
    redactContactInfo: true,
    behavioralHintOnly: normalized.vaultType === "behavioral",
  });
  const summaryOutput = sanitizeMemoryOutput(normalized.summary, { redactContactInfo: true });
  const titleOutput = sanitizeMemoryOutput(normalized.title, { redactContactInfo: true });
  const regulatedClaim = isRegulated(normalized);
  const sourceFingerprint = buildFingerprint({
    creatorAgentId: normalized.creatorAgentId,
    title: titleOutput.content,
    summary: summaryOutput.content,
    abstractedContent: contentOutput.content,
    sourceType: normalized.sourceType,
  });
  const duplicates = await db.select().from(knowledgePackets)
    .where(and(
      eq(knowledgePackets.creatorAgentId, normalized.creatorAgentId),
      eq(knowledgePackets.sourceFingerprint, sourceFingerprint),
      inArray(knowledgePackets.status, ["draft", "submitted", "accepted", "approved"]),
    ))
    .limit(1);

  const redactions = [...new Set([...contentOutput.redactions, ...summaryOutput.redactions, ...titleOutput.redactions])];
  const blockers: Array<{ code: string; message: string }> = [];
  const warnings: Array<{ code: string; message: string }> = [];

  if (!explicitConsent) blockers.push({ code: "consent_required", message: "Creator consent is required before a packet can enter cross-agent review." });
  if (!policy.allowed) blockers.push({ code: "memory_policy_denied", message: policy.reason });
  if (normalized.vaultType === "business" && !businessConsent) blockers.push({ code: "business_permission_required", message: "Business knowledge requires explicit creator permission." });
  if (normalized.vaultType === "personal" || normalized.sensitivity === "private" || normalized.sensitivity === "secret") {
    blockers.push({ code: "private_memory_blocked", message: "Personal/private/secret memory cannot become shared packet content." });
  }
  if (redactions.some((redaction) => SECRET_REDACTIONS.has(redaction))) {
    blockers.push({ code: "secret_marker_blocked", message: "Secret, credential, payment, banking, or identity markers block packet creation." });
  }
  if (duplicates.length > 0) blockers.push({ code: "duplicate_packet_blocked", message: "A packet with this source fingerprint already exists for this agent." });
  if (normalized.riskScore >= 0.85) blockers.push({ code: "high_risk_blocked", message: "High-risk packets are blocked until reviewed and reduced." });
  if (regulatedClaim) {
    warnings.push({ code: "regulated_claim_requires_verification", message: "Medical, legal, or financial claims remain challenge/review only until verified." });
  }
  if (normalized.usefulnessPrediction < 0.2 || normalized.noveltyScore < 0.2) {
    warnings.push({ code: "low_value_packet", message: "Low novelty or usefulness receives little or no Gluon even if accepted." });
  }

  const safetyReport = {
    phase: "phase_25b_cross_agent_knowledge_economy",
    canCreateDraft: blockers.length === 0,
    canSubmitForReview: blockers.length === 0,
    blockers,
    warnings,
    redactions,
    regulatedClaim,
    duplicateRisk: duplicates.length > 0,
    rawMemoryShared: false,
    abstractedOnly: true,
    marketplaceTransactionsEnabled: false,
    cashoutEnabled: false,
    graphLearningSignalEligible: false,
    rules: [
      "Knowledge packets store abstracted/sanitized knowledge only.",
      "Personal/private memory is blocked.",
      "Business knowledge requires explicit creator consent.",
      "Regulated claims require verification before acceptance value.",
      "Gluon is non-convertible and never touches credits or payouts.",
    ],
  };

  const consentPolicy = {
    creatorConsent: explicitConsent,
    businessKnowledgeApproved: businessConsent,
    crossAgentLearningConsent: consent.crossAgentLearningConsent === true,
    marketplaceKnowledgePackAllowed: consent.marketplaceKnowledgePackAllowed === true && blockers.length === 0,
    rawMemoryShared: false,
    allowedUses: ["internal_review", "sandbox_acceptance", "gluon_simulation", "dna_mutation_preview"],
    blockedUses: ["cashout", "credit_transfer", "public_publish", "marketplace_transaction", "raw_memory_export", "autonomous_action"],
  };

  return {
    agent: {
      id: agent.id,
      name: agent.name,
      ownerId: agent.ownerId,
      visibility: agent.visibility,
    },
    normalized,
    sanitized: {
      title: titleOutput.content,
      summary: summaryOutput.content,
      abstractedContent: contentOutput.content,
    },
    sourceFingerprint,
    consentPolicy,
    safetyReport,
    memoryPolicy: policy,
    nonCashoutGuarantees: nonCashoutGuarantees(),
  };
}

async function listEligibleAgents(userId: string) {
  const agents = await db.select().from(userAgents).where(eq(userAgents.ownerId, userId)).orderBy(desc(userAgents.createdAt));
  return agents.map((agent) => ({
    id: agent.id,
    name: agent.name,
    status: agent.status,
    visibility: agent.visibility,
    eligible: (agent.agentType === "user_owned" || agent.type === "personal") && agent.visibility === "private",
    reason: (agent.agentType === "user_owned" || agent.type === "personal")
      ? agent.visibility === "private" ? "Eligible for abstracted knowledge packet drafts." : "Agent must remain private."
      : "Only user-owned agents are eligible.",
  }));
}

async function previewPacket(userId: string, input: PacketInput) {
  return buildPacketPreview(userId, input);
}

async function createPacket(userId: string, input: PacketInput) {
  const preview = await buildPacketPreview(userId, input);
  const blockers = preview.safetyReport.blockers;
  if (blockers.length > 0) {
    await audit("knowledge_packet_create_blocked", userId, "user", "denied", { blockers: blockers.map((blocker) => blocker.code) });
    throw new KnowledgeEconomyError(400, blockers[0]?.message || "Knowledge packet failed safety checks.");
  }

  const created = await db.insert(knowledgePackets).values({
    creatorAgentId: preview.normalized.creatorAgentId,
    creatorUserId: userId,
    title: preview.sanitized.title,
    summary: preview.sanitized.summary,
    abstractedContent: preview.sanitized.abstractedContent,
    sourceType: preview.normalized.sourceType,
    domainTags: preview.normalized.domainTags,
    industryTags: preview.normalized.industryTags,
    geoTags: preview.normalized.geoTags,
    professionTags: preview.normalized.professionTags,
    vaultType: preview.normalized.vaultType,
    sensitivity: preview.normalized.sensitivity,
    privacyLevel: preview.normalized.privacyLevel,
    consentPolicy: preview.consentPolicy,
    safetyReport: preview.safetyReport,
    sourceFingerprint: preview.sourceFingerprint,
    evidenceStrength: preview.normalized.evidenceStrength,
    noveltyScore: preview.normalized.noveltyScore,
    usefulnessPrediction: preview.normalized.usefulnessPrediction,
    riskScore: preview.normalized.riskScore,
    complianceScore: preview.normalized.complianceScore,
    halfLifeDays: preview.normalized.halfLifeDays,
    verificationStatus: preview.safetyReport.regulatedClaim ? "needs_validation" : "unverified",
    reviewStatus: "draft",
    status: "draft",
    parentPacketIds: preview.normalized.parentPacketIds,
    derivedPacketIds: [],
  }).returning();

  await audit("knowledge_packet_created", userId, "user", "success", {
    creatorAgentId: preview.normalized.creatorAgentId,
    vaultType: preview.normalized.vaultType,
    sensitivity: preview.normalized.sensitivity,
    regulatedClaim: preview.safetyReport.regulatedClaim,
  }, created[0]?.id);

  return getPacketDetail(created[0]!.id, { requesterUserId: userId });
}

async function submitPacket(userId: string, packetId: string) {
  const packet = await getPacketForUser(packetId, userId);
  const safety = asRecord(packet.safetyReport);
  const blockers = Array.isArray(safety.blockers) ? safety.blockers : [];
  if (blockers.length > 0) {
    throw new KnowledgeEconomyError(400, "Resolve packet safety blockers before submission.");
  }
  const reviewStatus = safety.regulatedClaim === true ? "needs_validation" : "pending_review";
  const [updated] = await db.update(knowledgePackets).set({
    status: "submitted",
    reviewStatus,
    submittedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(knowledgePackets.id, packetId)).returning();
  await audit("knowledge_packet_submitted", userId, "user", "success", { reviewStatus }, packetId);
  return getPacketDetail(updated.id, { requesterUserId: userId });
}

async function getPacketForUser(packetId: string, userId: string) {
  const [packet] = await db.select().from(knowledgePackets).where(eq(knowledgePackets.id, packetId)).limit(1);
  if (!packet) throw new KnowledgeEconomyError(404, "Knowledge packet not found.");
  if (packet.creatorUserId !== userId) throw new KnowledgeEconomyError(403, "Forbidden.");
  return packet;
}

async function listUserPackets(userId: string) {
  const rows = await db.select().from(knowledgePackets).where(eq(knowledgePackets.creatorUserId, userId)).orderBy(desc(knowledgePackets.createdAt)).limit(MAX_PACKET_LIMIT);
  return rows.map(safePacketSummary);
}

async function listAdminPackets(status?: string) {
  const rows = status
    ? await db.select().from(knowledgePackets).where(eq(knowledgePackets.status, status)).orderBy(desc(knowledgePackets.createdAt)).limit(MAX_PACKET_LIMIT)
    : await db.select().from(knowledgePackets).orderBy(desc(knowledgePackets.createdAt)).limit(MAX_PACKET_LIMIT);
  return rows.map(safePacketSummary);
}

function safePacketSummary(packet: KnowledgePacket) {
  return {
    ...packet,
    abstractedContent: packet.abstractedContent.slice(0, 900),
    rawPrivateMemoryShared: false,
    gluon: {
      amount: packet.gluonEarned,
      nonConvertible: true,
      cashoutEnabled: false,
    },
  };
}

async function getPacketDetail(packetId: string, options: { requesterUserId?: string; admin?: boolean } = {}) {
  const [packet] = await db.select().from(knowledgePackets).where(eq(knowledgePackets.id, packetId)).limit(1);
  if (!packet) throw new KnowledgeEconomyError(404, "Knowledge packet not found.");
  if (!options.admin && options.requesterUserId && packet.creatorUserId !== options.requesterUserId) {
    throw new KnowledgeEconomyError(403, "Forbidden.");
  }
  const [acceptances, ledgerEntries, mutations, creatorAgent] = await Promise.all([
    db.select().from(knowledgePacketAcceptances).where(eq(knowledgePacketAcceptances.packetId, packetId)).orderBy(desc(knowledgePacketAcceptances.createdAt)),
    db.select().from(gluonLedgerEntries).where(eq(gluonLedgerEntries.packetId, packetId)).orderBy(desc(gluonLedgerEntries.createdAt)).limit(20),
    db.select().from(agentDnaMutationHistory).where(eq(agentDnaMutationHistory.packetId, packetId)).orderBy(desc(agentDnaMutationHistory.createdAt)).limit(20),
    db.select().from(userAgents).where(eq(userAgents.id, packet.creatorAgentId)).limit(1),
  ]);
  return {
    ...safePacketSummary(packet),
    creatorAgent: creatorAgent[0] ? {
      id: creatorAgent[0].id,
      name: creatorAgent[0].name,
      ownerId: creatorAgent[0].ownerId,
      visibility: creatorAgent[0].visibility,
    } : null,
    acceptances,
    gluonLedgerEntries: ledgerEntries,
    dnaMutationHistory: mutations,
    nonCashoutGuarantees: nonCashoutGuarantees(),
  };
}

async function resolveAcceptor(packet: KnowledgePacket, input: AcceptanceInput, actorId: string) {
  const acceptingAgentType = (typeof input.acceptingAgentType === "string" && (ACCEPTING_AGENT_TYPES as readonly string[]).includes(input.acceptingAgentType))
    ? input.acceptingAgentType as typeof ACCEPTING_AGENT_TYPES[number]
    : "root_admin";
  const acceptingAgentId = optionalText(input.acceptingAgentId, 120) || (acceptingAgentType === "root_admin" ? actorId : "");
  if (!acceptingAgentId) throw new KnowledgeEconomyError(400, "acceptingAgentId is required for agent acceptances.");

  if (acceptingAgentId === packet.creatorAgentId) {
    throw new KnowledgeEconomyError(403, "Self-acceptance is blocked.");
  }

  let receiverAuthority = clamp01(input.receiverAuthority, 0.6);
  let acceptingUserId = optionalText(input.acceptingUserId, 120);
  let acceptorTags: string[] = [];

  if (acceptingAgentType === "user_agent") {
    const [agent] = await db.select().from(userAgents).where(eq(userAgents.id, acceptingAgentId)).limit(1);
    if (!agent) throw new KnowledgeEconomyError(404, "Accepting user agent not found.");
    acceptingUserId = agent.ownerId;
    acceptorTags = [agent.industrySlug, agent.categorySlug, agent.roleSlug].filter((item): item is string => typeof item === "string" && !!item);
    if (agent.ownerId === packet.creatorUserId) {
      throw new KnowledgeEconomyError(403, "Same-owner acceptance loops are blocked for user-owned agents.");
    }
    receiverAuthority = clamp01((agent.trustScore || 50) / 100, receiverAuthority);
  }

  if (acceptingAgentType === "system_agent") {
    const [agentUser, trust] = await Promise.all([
      db.select().from(users).where(eq(users.id, acceptingAgentId)).limit(1),
      db.select().from(agentTrustProfiles).where(eq(agentTrustProfiles.agentId, acceptingAgentId)).limit(1),
    ]);
    if (!agentUser[0]) throw new KnowledgeEconomyError(404, "Accepting system agent not found.");
    acceptorTags = Array.isArray(agentUser[0].industryTags) ? agentUser[0].industryTags : [];
    receiverAuthority = clamp01((trust[0]?.compositeTrustScore || agentUser[0].reputation || 50) / 100, receiverAuthority);
  }

  const existing = await db.select().from(knowledgePacketAcceptances)
    .where(and(
      eq(knowledgePacketAcceptances.packetId, packet.id),
      eq(knowledgePacketAcceptances.acceptingAgentId, acceptingAgentId),
      eq(knowledgePacketAcceptances.acceptingAgentType, acceptingAgentType),
    ))
    .limit(1);
  if (existing.length > 0) {
    throw new KnowledgeEconomyError(409, "This accepting agent has already reviewed this packet.");
  }

  return {
    acceptingAgentId,
    acceptingAgentType,
    acceptingUserId,
    receiverAuthority,
    acceptorTags,
  };
}

async function reviewPacket(packetId: string, input: AcceptanceInput, actorId: string) {
  const decision = typeof input.decision === "string" && (DECISIONS as readonly string[]).includes(input.decision)
    ? input.decision as typeof DECISIONS[number]
    : null;
  if (!decision) throw new KnowledgeEconomyError(400, "decision must be accepted, rejected, or challenged.");

  const [packet] = await db.select().from(knowledgePackets).where(eq(knowledgePackets.id, packetId)).limit(1);
  if (!packet) throw new KnowledgeEconomyError(404, "Knowledge packet not found.");
  const acceptor = await resolveAcceptor(packet, input, actorId);
  const safety = asRecord(packet.safetyReport);
  const blockers = Array.isArray(safety.blockers) ? safety.blockers : [];
  const regulatedClaim = safety.regulatedClaim === true;

  if (decision === "accepted" && blockers.length > 0) {
    throw new KnowledgeEconomyError(400, "Packets with safety blockers cannot be accepted.");
  }
  if (decision === "accepted" && regulatedClaim && !["verified", "approved", "supported"].includes(packet.verificationStatus)) {
    throw new KnowledgeEconomyError(400, "Regulated packets must be verified before acceptance.");
  }

  const domainMatch = clamp01(input.domainMatch, scoreFromTags(packet.domainTags || [], acceptor.acceptorTags));
  const receiverAuthority = clamp01(acceptor.receiverAuthority);
  const retentionScore = clamp01(input.retentionScore, 0.5);
  const realWorldFeedbackScore = clamp01(input.realWorldFeedbackScore, 0.5);
  const weightedAcceptanceContribution = decision === "accepted"
    ? Math.round((0.25 * domainMatch + 0.30 * receiverAuthority + 0.25 * retentionScore + 0.20 * realWorldFeedbackScore) * 1000) / 1000
    : 0;
  const ues = acceptor.acceptingAgentType === "root_admin"
    ? null
    : await unifiedEvolutionService.getAgentUes(acceptor.acceptingAgentId).catch(() => null);

  const [created] = await db.insert(knowledgePacketAcceptances).values({
    packetId,
    acceptingAgentId: acceptor.acceptingAgentId,
    acceptingAgentType: acceptor.acceptingAgentType,
    acceptingUserId: acceptor.acceptingUserId || null,
    decision,
    domainMatch,
    receiverAuthority,
    retentionScore,
    realWorldFeedbackScore,
    weightedAcceptanceContribution,
    trustInputs: {
      receiverAuthority,
      selfAcceptanceBlocked: true,
      sameOwnerLoopBlocked: true,
    },
    uesInputs: ues ? {
      UES: ues.scores.UES,
      P: ues.scores.P,
      D: ues.scores.D,
      Omega: ues.scores.Omega,
      Xi: ues.scores.Xi,
      sourceQuality: ues.sourceQuality.overall,
    } : { available: false },
    rationale: optionalText(input.rationale, 1200),
    challengeReason: decision === "challenged" ? optionalText(input.challengeReason, 1200) || "Challenged for further validation." : optionalText(input.challengeReason, 1200),
    sandboxOnly: input.sandboxOnly !== false,
  }).returning();

  const updated = await refreshPacketEconomy(packetId, actorId);
  await audit(`knowledge_packet_${decision}`, actorId, "root_admin", "success", {
    acceptingAgentId: acceptor.acceptingAgentId,
    acceptingAgentType: acceptor.acceptingAgentType,
    contribution: weightedAcceptanceContribution,
  }, packetId);

  return {
    acceptance: created,
    packet: updated,
  };
}

async function refreshPacketEconomy(packetId: string, actorId: string) {
  const [packet] = await db.select().from(knowledgePackets).where(eq(knowledgePackets.id, packetId)).limit(1);
  if (!packet) throw new KnowledgeEconomyError(404, "Knowledge packet not found.");
  const acceptanceScore = await calculateWeightedAcceptance(packetId);
  const rows = await db.select().from(knowledgePacketAcceptances).where(eq(knowledgePacketAcceptances.packetId, packetId));
  const packetForGluon = { ...packet, weightedAcceptance: acceptanceScore.weightedAcceptance };
  const gluon = calculateGluon(packetForGluon);
  const reviewStatus = rows.some((row) => row.decision === "challenged")
    ? "challenged"
    : acceptanceScore.acceptedCount > 0
      ? "accepted"
      : packet.reviewStatus;
  const status = reviewStatus === "accepted" ? "accepted" : packet.status;
  const safetyReport = {
    ...asRecord(packet.safetyReport),
    graphLearningSignalEligible: reviewStatus === "accepted" && ["verified", "approved", "supported"].includes(packet.verificationStatus) && gluon.amount > 0,
    lastWeightedAcceptance: acceptanceScore,
    lastGluonPreview: gluon,
  };

  const [updated] = await db.update(knowledgePackets).set({
    acceptedByAgents: acceptanceScore.acceptedCount,
    rejectedByAgents: acceptanceScore.rejectedCount,
    challengedByAgents: acceptanceScore.challengedCount,
    weightedAcceptance: acceptanceScore.weightedAcceptance,
    gluonEarned: gluon.amount,
    reviewStatus,
    status,
    safetyReport,
    reviewedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(knowledgePackets.id, packetId)).returning();

  await db.insert(gluonLedgerEntries).values({
    packetId,
    agentId: updated.creatorAgentId,
    userId: updated.creatorUserId,
    eventType: "gluon_simulation",
    amount: gluon.amount,
    calculationInputs: gluon.calculationInputs,
    status: "simulated",
    nonConvertible: true,
    reason: "Phase 25B non-cashout Gluon simulation after packet review.",
  });

  await audit("knowledge_packet_gluon_simulated", actorId, "root_admin", "success", {
    amount: gluon.amount,
    nonConvertible: true,
  }, packetId);

  return safePacketSummary(updated);
}

async function previewGluon(packetId: string) {
  const [packet] = await db.select().from(knowledgePackets).where(eq(knowledgePackets.id, packetId)).limit(1);
  if (!packet) throw new KnowledgeEconomyError(404, "Knowledge packet not found.");
  const acceptance = await calculateWeightedAcceptance(packetId);
  return calculateGluon({ ...packet, weightedAcceptance: acceptance.weightedAcceptance });
}

function dnaFromGenome(genome: AgentGenome | null | undefined) {
  return {
    primeSeed: genome?.primeSeed || null,
    primeColorSignature: asRecord(genome?.primeColorSignature),
    dnaMetadata: asRecord(genome?.dnaMetadata),
    curiosity: genome?.curiosity ?? 0.5,
    riskTolerance: genome?.riskTolerance ?? 0.5,
    collaborationBias: genome?.collaborationBias ?? 0.5,
    verificationStrictness: genome?.verificationStrictness ?? 0.5,
    longTermFocus: genome?.longTermFocus ?? 0.5,
    economicStrategy: genome?.economicStrategy || "balanced",
    fitnessScore: genome?.fitnessScore ?? 0,
    generation: genome?.generation ?? 0,
    mutations: genome?.mutations ?? 0,
  };
}

export async function updateAgentDNAAfterLearning(agentId: string, packet: KnowledgePacket) {
  const [genome] = await db.select().from(agentGenomes).where(eq(agentGenomes.agentId, agentId)).limit(1);
  const beforeDna = dnaFromGenome(genome);
  const primeSeed = beforeDna.primeSeed || hashText(`${agentId}:${packet.id}`).slice(0, 24);
  const primeColorSignature = Object.keys(beforeDna.primeColorSignature).length > 0
    ? beforeDna.primeColorSignature
    : generatePrimeColorSignature(primeSeed);
  const acceptance = clamp01(packet.weightedAcceptance / 3, 0);
  const quality = 0.35 * clamp01(packet.evidenceStrength) + 0.25 * clamp01(packet.usefulnessPrediction) + 0.25 * clamp01(packet.complianceScore) + 0.15 * clamp01(packet.noveltyScore);
  const nudge = Math.min(0.04, acceptance * quality * Math.max(0, 1 - clamp01(packet.riskScore)) * 0.04);
  const afterDna = {
    ...beforeDna,
    primeSeed,
    primeColorSignature,
    dnaMetadata: {
      ...beforeDna.dnaMetadata,
      knowledgeEconomy: {
        lastPacketId: packet.id,
        lastPreviewAt: new Date().toISOString(),
        previewOnly: true,
      },
    },
    curiosity: Math.min(1, beforeDna.curiosity + nudge * packet.noveltyScore),
    collaborationBias: Math.min(1, beforeDna.collaborationBias + nudge),
    verificationStrictness: Math.min(1, beforeDna.verificationStrictness + nudge * packet.evidenceStrength),
    longTermFocus: Math.min(1, beforeDna.longTermFocus + nudge * packet.usefulnessPrediction),
    riskTolerance: Math.max(0, beforeDna.riskTolerance - nudge * packet.riskScore),
    mutations: beforeDna.mutations,
  };

  return {
    agentId,
    packetId: packet.id,
    mutationType: "knowledge_packet_learning_preview",
    beforeDna,
    afterDna,
    scoreInputs: {
      weightedAcceptance: packet.weightedAcceptance,
      quality,
      riskScore: packet.riskScore,
      nudge,
      previewOnly: true,
    },
    status: "preview" as const,
    liveGenomeMutated: false,
    oldEvolutionServiceTriggered: false,
  };
}

async function previewDnaMutation(packetId: string, agentId: string | undefined, reviewedBy: string) {
  const [packet] = await db.select().from(knowledgePackets).where(eq(knowledgePackets.id, packetId)).limit(1);
  if (!packet) throw new KnowledgeEconomyError(404, "Knowledge packet not found.");
  const targetAgentId = agentId || packet.creatorAgentId;
  const preview = await updateAgentDNAAfterLearning(targetAgentId, packet);
  const [history] = await db.insert(agentDnaMutationHistory).values({
    agentId: targetAgentId,
    packetId,
    mutationType: preview.mutationType,
    beforeDna: preview.beforeDna,
    afterDna: preview.afterDna,
    scoreInputs: preview.scoreInputs,
    status: "preview",
    reviewedBy,
    reviewedAt: new Date(),
  }).returning();
  await audit("knowledge_packet_dna_preview", reviewedBy, "root_admin", "success", {
    targetAgentId,
    liveGenomeMutated: false,
  }, packetId);
  return {
    ...preview,
    historyId: history.id,
  };
}

export const knowledgeEconomyService = {
  generatePrimeColorSignature,
  calculateFreshness,
  calculateWeightedAcceptance,
  calculateGluon,
  updateAgentDNAAfterLearning,
  listEligibleAgents,
  previewPacket,
  createPacket,
  submitPacket,
  listUserPackets,
  listAdminPackets,
  getPacketDetail,
  reviewPacket,
  previewGluon,
  previewDnaMutation,
};
