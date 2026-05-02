import { desc, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { riskManagementService } from "./risk-management-service";
import {
  avatarVideoRenderJobs,
  podcastAudioJobs,
  podcastScriptPackages,
  safeModeControls,
  youtubePublishingPackages,
  type AvatarVideoAvatarProfile,
  type AvatarVideoPreviewMetadata,
  type AvatarVideoRenderJob,
  type AvatarVideoRenderProvider,
  type AvatarVideoSceneTemplate,
  type AvatarVideoSegmentMapping,
  type PodcastAudioJob,
  type PodcastAudioJobSegment,
  type PodcastScriptPackage,
  type PodcastScriptPackagePayload,
  type YouTubePublishingPackage,
} from "@shared/schema";

export const avatarVideoRenderProviders = ["dry_run", "heygen", "d_id", "synthesia", "unreal"] as const;
export const avatarVideoSceneTemplates = ["news_desk", "podcast_studio", "debate_arena_summary", "minimal_cards"] as const;

type CreateRenderJobInput = {
  scriptPackageId: number;
  audioJobId?: number | null;
  youtubePackageId?: number | null;
  provider?: AvatarVideoRenderProvider;
  sceneTemplate?: AvatarVideoSceneTemplate;
  createdBy: string;
};

type ProviderStatus = {
  selected: AvatarVideoRenderProvider;
  dryRunDefault: true;
  liveProviderCalls: false;
  configured: boolean;
  placeholderOnly: boolean;
  message: string;
};

type EligibleRenderPackage = {
  scriptPackage: PodcastScriptPackage;
  latestAudioJob: PodcastAudioJob | null;
  youtubePackage: YouTubePublishingPackage | null;
  existingRenderJob: AvatarVideoRenderJob | null;
};

class AvatarVideoRenderError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const CANONICAL_SYSTEM_AGENT_KEYS = new Set([
  "mougle-chief-intelligence",
  "aletheia-truth-validation",
  "arivu-reasoning",
  "astraion-research",
  "mercurion-economics",
  "dharma-governance",
  "chronarch-context",
  "sentinel-risk",
  "voxa-public-voice",
  "architect-builder",
  "contrarian-stress-test",
]);

const REQUIRED_AVATAR_PROFILES: Record<string, AvatarVideoAvatarProfile> = {
  "voxa-public-voice": {
    agentKey: "voxa-public-voice",
    displayName: "Voxa",
    role: "News reader / presenter",
    renderRole: "presenter_host",
    avatarStyle: "studio presenter card",
    source: "required_system_mapping",
  },
  "mougle-chief-intelligence": {
    agentKey: "mougle-chief-intelligence",
    displayName: "MOUGLE",
    role: "Final truth-governed synthesis",
    renderRole: "conclusion_presence",
    avatarStyle: "symbolic synthesis presence",
    source: "required_system_mapping",
  },
};

function ensureProvider(value: string | undefined | null): AvatarVideoRenderProvider {
  if (avatarVideoRenderProviders.includes(value as AvatarVideoRenderProvider)) {
    return value as AvatarVideoRenderProvider;
  }
  return "dry_run";
}

function ensureSceneTemplate(value: string | undefined | null): AvatarVideoSceneTemplate {
  if (avatarVideoSceneTemplates.includes(value as AvatarVideoSceneTemplate)) {
    return value as AvatarVideoSceneTemplate;
  }
  return "news_desk";
}

function providerStatus(provider: AvatarVideoRenderProvider = "dry_run"): ProviderStatus {
  if (provider === "dry_run") {
    return {
      selected: "dry_run",
      dryRunDefault: true,
      liveProviderCalls: false,
      configured: true,
      placeholderOnly: false,
      message: "Dry-run render planning is active. No video provider is called and no video file is generated.",
    };
  }

  return {
    selected: provider,
    dryRunDefault: true,
    liveProviderCalls: false,
    configured: false,
    placeholderOnly: true,
    message: `${provider} is a future placeholder in this phase. Preview planning is allowed, but live rendering remains disabled.`,
  };
}

function truncate(value: string | null | undefined, length = 360) {
  const text = (value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length > length ? `${text.slice(0, length - 3)}...` : text;
}

function safeString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function profileForSpeaker(input: {
  agentKey: string;
  displayName: string;
  role: string;
  source: AvatarVideoAvatarProfile["source"];
}): AvatarVideoAvatarProfile | null {
  const agentKey = input.agentKey.trim();
  if (!CANONICAL_SYSTEM_AGENT_KEYS.has(agentKey)) return null;
  if (agentKey === "voxa-public-voice") return { ...REQUIRED_AVATAR_PROFILES["voxa-public-voice"], source: input.source };
  if (agentKey === "mougle-chief-intelligence") return { ...REQUIRED_AVATAR_PROFILES["mougle-chief-intelligence"], source: input.source };

  return {
    agentKey,
    displayName: input.displayName || agentKey,
    role: input.role || "Specialist system agent",
    renderRole: "speaker_card",
    avatarStyle: "symbolic specialist speaker card",
    source: input.source,
  };
}

function buildAvatarProfileMapping(
  scriptPackage: PodcastScriptPackage,
  audioJob: PodcastAudioJob | null,
) {
  const mapping: Record<string, AvatarVideoAvatarProfile> = {};
  const excludedSpeakers: AvatarVideoPreviewMetadata["excludedSpeakers"] = [];

  for (const assignment of scriptPackage.scriptPackage.speakerAssignments || []) {
    const profile = profileForSpeaker({
      agentKey: assignment.agentKey,
      displayName: assignment.displayName,
      role: assignment.role,
      source: "script_assignment",
    });
    if (profile) {
      mapping[profile.agentKey] = profile;
    } else if (assignment.agentKey) {
      excludedSpeakers.push({
        agentKey: assignment.agentKey,
        displayName: assignment.displayName || assignment.agentKey,
        reason: "User-owned or non-canonical avatars are excluded in Phase 31.",
      });
    }
  }

  for (const profile of Object.values(audioJob?.voiceProfileMapping || {})) {
    if (mapping[profile.agentKey]) continue;
    const avatarProfile = profileForSpeaker({
      agentKey: profile.agentKey,
      displayName: profile.displayName,
      role: profile.role,
      source: "voice_profile",
    });
    if (avatarProfile) mapping[avatarProfile.agentKey] = avatarProfile;
  }

  for (const [agentKey, profile] of Object.entries(REQUIRED_AVATAR_PROFILES)) {
    if (!mapping[agentKey]) mapping[agentKey] = profile;
  }

  return { mapping, excludedSpeakers };
}

function fallbackSegments(script: PodcastScriptPackagePayload): AvatarVideoSegmentMapping[] {
  const rows: Array<{ scriptType: AvatarVideoSegmentMapping["scriptType"]; agentKey: string; displayName: string; role: string; text: string }> = [
    {
      scriptType: "two_minute",
      agentKey: "voxa-public-voice",
      displayName: "Voxa",
      role: "Presenter",
      text: script.twoMinuteNewsScript,
    },
    {
      scriptType: "ten_minute",
      agentKey: "voxa-public-voice",
      displayName: "Voxa",
      role: "Podcast host",
      text: script.tenMinutePodcastScript,
    },
    {
      scriptType: "mougle_conclusion",
      agentKey: "mougle-chief-intelligence",
      displayName: "MOUGLE",
      role: "Final synthesis",
      text: script.youtubeDescription || script.tenMinutePodcastScript,
    },
  ];

  return rows.map((row, index) => ({
    segmentIndex: index,
    scriptType: row.scriptType,
    agentKey: row.agentKey,
    displayName: row.displayName,
    role: row.role,
    textPreview: truncate(row.text, 260),
    audioAvailable: false,
    audioUrl: null,
    audioPath: null,
    status: "script_only",
  }));
}

function mapAudioSegments(audioJob: PodcastAudioJob | null, script: PodcastScriptPackagePayload): AvatarVideoSegmentMapping[] {
  if (!audioJob?.segments?.length) return fallbackSegments(script);
  return audioJob.segments.map((segment: PodcastAudioJobSegment) => ({
    segmentIndex: segment.segmentIndex,
    scriptType: segment.scriptType,
    agentKey: segment.agentKey,
    displayName: segment.displayName,
    role: segment.role,
    textPreview: truncate(segment.textPreview, 260),
    audioAvailable: !!segment.audioUrl || !!segment.audioPath,
    audioUrl: segment.audioUrl,
    audioPath: segment.audioPath,
    status: segment.status,
  }));
}

async function safeModeWarnings() {
  const [controls] = await db.select().from(safeModeControls).limit(1);
  const warnings: string[] = [];
  if (controls?.globalSafeMode) {
    warnings.push("Global safe mode is enabled. Render planning remains manual/admin-review only.");
  }
  if (controls?.pausePodcastAudioGeneration) {
    warnings.push("Podcast/audio generation is paused. Video render planning can continue, but new audio generation is blocked elsewhere.");
  }
  return warnings;
}

function buildPreviewMetadata(params: {
  scriptPackage: PodcastScriptPackage;
  provider: AvatarVideoRenderProvider;
  safeModeWarnings: string[];
  excludedSpeakers: AvatarVideoPreviewMetadata["excludedSpeakers"];
}): AvatarVideoPreviewMetadata {
  const script = params.scriptPackage.scriptPackage;
  const provider = providerStatus(params.provider);
  return {
    title: safeString(script.youtubeTitle, `Mougle Video Render Plan ${params.scriptPackage.id}`),
    thumbnailText: safeString(script.thumbnailText, "Mougle"),
    descriptionPreview: truncate(script.youtubeDescription, 480),
    shortsHooks: Array.isArray(script.shortsHooks) ? script.shortsHooks.slice(0, 8) : [],
    complianceNotes: [
      ...(params.scriptPackage.safetyNotes?.notes || []),
      ...(script.complianceSafetyNotes || []),
    ].filter(Boolean).slice(0, 20),
    sourceEvidenceReferences: (script.sourceEvidenceReferences || []).slice(0, 20),
    providerStatus: {
      selected: provider.selected,
      dryRunDefault: true,
      liveProviderCalls: false,
      message: provider.message,
    },
    safety: {
      internalAdminReviewOnly: true,
      manualRootAdminTriggerOnly: true,
      publicPublishing: false,
      youtubeUpload: false,
      socialPosting: false,
      privateMemoryUsed: false,
      userOwnedAvatarsIncluded: false,
      unreal3dImplementation: false,
    },
    safeModeWarnings: params.safeModeWarnings,
    excludedSpeakers: params.excludedSpeakers,
    generatedAt: new Date().toISOString(),
  };
}

async function latestAudioJobFor(scriptPackageId: number): Promise<PodcastAudioJob | null> {
  const [job] = await db.select().from(podcastAudioJobs)
    .where(eq(podcastAudioJobs.scriptPackageId, scriptPackageId))
    .orderBy(desc(podcastAudioJobs.createdAt))
    .limit(1);
  return job || null;
}

async function latestYouTubePackageFor(scriptPackageId: number): Promise<YouTubePublishingPackage | null> {
  const [pkg] = await db.select().from(youtubePublishingPackages)
    .where(eq(youtubePublishingPackages.scriptPackageId, scriptPackageId))
    .orderBy(desc(youtubePublishingPackages.createdAt))
    .limit(1);
  return pkg || null;
}

async function latestRenderJobFor(scriptPackageId: number): Promise<AvatarVideoRenderJob | null> {
  const [job] = await db.select().from(avatarVideoRenderJobs)
    .where(eq(avatarVideoRenderJobs.scriptPackageId, scriptPackageId))
    .orderBy(desc(avatarVideoRenderJobs.createdAt))
    .limit(1);
  return job || null;
}

async function loadScriptPackage(id: number): Promise<PodcastScriptPackage> {
  const [scriptPackage] = await db.select().from(podcastScriptPackages)
    .where(eq(podcastScriptPackages.id, id))
    .limit(1);
  if (!scriptPackage) throw new AvatarVideoRenderError(404, "Podcast script package not found.");
  return scriptPackage;
}

async function loadAudioJob(id: number | null | undefined, scriptPackageId: number): Promise<PodcastAudioJob | null> {
  if (!id) return latestAudioJobFor(scriptPackageId);
  const [job] = await db.select().from(podcastAudioJobs)
    .where(eq(podcastAudioJobs.id, id))
    .limit(1);
  if (!job) throw new AvatarVideoRenderError(404, "Podcast audio job not found.");
  if (job.scriptPackageId !== scriptPackageId) {
    throw new AvatarVideoRenderError(400, "Podcast audio job does not belong to the selected script package.");
  }
  return job;
}

async function loadYouTubePackage(id: number | null | undefined, scriptPackageId: number): Promise<YouTubePublishingPackage | null> {
  if (!id) return latestYouTubePackageFor(scriptPackageId);
  const [pkg] = await db.select().from(youtubePublishingPackages)
    .where(eq(youtubePublishingPackages.id, id))
    .limit(1);
  if (!pkg) throw new AvatarVideoRenderError(404, "YouTube publishing package not found.");
  if (pkg.scriptPackageId !== scriptPackageId) {
    throw new AvatarVideoRenderError(400, "YouTube publishing package does not belong to the selected script package.");
  }
  return pkg;
}

async function loadRenderJob(id: number): Promise<AvatarVideoRenderJob> {
  const [job] = await db.select().from(avatarVideoRenderJobs)
    .where(eq(avatarVideoRenderJobs.id, id))
    .limit(1);
  if (!job) throw new AvatarVideoRenderError(404, "Avatar/video render job not found.");
  return job;
}

async function buildRenderPlan(params: {
  scriptPackage: PodcastScriptPackage;
  audioJob: PodcastAudioJob | null;
  provider: AvatarVideoRenderProvider;
}) {
  const { mapping, excludedSpeakers } = buildAvatarProfileMapping(params.scriptPackage, params.audioJob);
  const segmentMapping = mapAudioSegments(params.audioJob, params.scriptPackage.scriptPackage);
  const warnings = await safeModeWarnings();
  const previewMetadata = buildPreviewMetadata({
    scriptPackage: params.scriptPackage,
    provider: params.provider,
    safeModeWarnings: warnings,
    excludedSpeakers,
  });
  return {
    avatarProfileMapping: mapping,
    segmentMapping,
    previewMetadata,
    estimatedCost: 0,
  };
}

async function audit(
  action: string,
  actorId: string,
  job: AvatarVideoRenderJob | null,
  outcome: "success" | "blocked" | "failed",
  details: Record<string, unknown> = {},
) {
  await riskManagementService.logAudit({
    actorId,
    actorType: "root_admin",
    action,
    resourceType: "avatar_video_render_job",
    resourceId: job ? String(job.id) : details.scriptPackageId ? String(details.scriptPackageId) : "unknown",
    outcome,
    riskLevel: outcome === "success" ? "medium" : "high",
    details: {
      phase: "phase_31_avatar_video_rendering_foundation",
      internalAdminReviewOnly: true,
      dryRunOnly: true,
      noProviderCall: true,
      noPublishing: true,
      ...details,
    },
  });
}

async function listEligiblePackages(limit = 50): Promise<{
  providerStatus: ProviderStatus;
  safeModeWarnings: string[];
  sceneTemplates: readonly AvatarVideoSceneTemplate[];
  providers: readonly AvatarVideoRenderProvider[];
  items: EligibleRenderPackage[];
}> {
  const scripts = await db.select().from(podcastScriptPackages)
    .where(sql`${podcastScriptPackages.status} in ('admin_review', 'approved')`)
    .orderBy(desc(podcastScriptPackages.createdAt))
    .limit(Math.max(1, Math.min(100, limit)));

  const items: EligibleRenderPackage[] = [];
  for (const scriptPackage of scripts) {
    const [latestAudioJob, youtubePackage, existingRenderJob] = await Promise.all([
      latestAudioJobFor(scriptPackage.id),
      latestYouTubePackageFor(scriptPackage.id),
      latestRenderJobFor(scriptPackage.id),
    ]);
    items.push({ scriptPackage, latestAudioJob, youtubePackage, existingRenderJob });
  }

  return {
    providerStatus: providerStatus("dry_run"),
    safeModeWarnings: await safeModeWarnings(),
    sceneTemplates: avatarVideoSceneTemplates,
    providers: avatarVideoRenderProviders,
    items,
  };
}

async function listJobs(limit = 50): Promise<AvatarVideoRenderJob[]> {
  return db.select().from(avatarVideoRenderJobs)
    .orderBy(desc(avatarVideoRenderJobs.createdAt))
    .limit(Math.max(1, Math.min(100, limit)));
}

async function getJob(id: number) {
  return loadRenderJob(id);
}

async function createJob(input: CreateRenderJobInput): Promise<{
  providerStatus: ProviderStatus;
  job: AvatarVideoRenderJob;
  scriptPackage: PodcastScriptPackage;
  audioJob: PodcastAudioJob | null;
  youtubePackage: YouTubePublishingPackage | null;
}> {
  const scriptPackage = await loadScriptPackage(input.scriptPackageId);
  if (!["admin_review", "approved"].includes(scriptPackage.status)) {
    throw new AvatarVideoRenderError(400, "Only admin-review or approved podcast script packages can be used for video render planning.");
  }

  const provider = ensureProvider(input.provider);
  const sceneTemplate = ensureSceneTemplate(input.sceneTemplate);
  const [audioJob, youtubePackage] = await Promise.all([
    loadAudioJob(input.audioJobId, scriptPackage.id),
    loadYouTubePackage(input.youtubePackageId, scriptPackage.id),
  ]);
  const plan = await buildRenderPlan({ scriptPackage, audioJob, provider });

  const [job] = await db.insert(avatarVideoRenderJobs).values({
    scriptPackageId: scriptPackage.id,
    audioJobId: audioJob?.id || null,
    youtubePackageId: youtubePackage?.id || null,
    status: "draft",
    provider,
    sceneTemplate,
    avatarProfileMapping: plan.avatarProfileMapping,
    segmentMapping: plan.segmentMapping,
    previewMetadata: plan.previewMetadata,
    estimatedCost: plan.estimatedCost,
    actualCost: 0,
    adminReviewStatus: "internal_admin_review",
    outputPath: null,
    outputUrl: null,
    errorMessage: null,
    createdBy: input.createdBy,
  }).returning();

  await audit("avatar_video_render_create", input.createdBy, job, "success", {
    scriptPackageId: scriptPackage.id,
    audioJobId: audioJob?.id || null,
    youtubePackageId: youtubePackage?.id || null,
    provider,
    sceneTemplate,
  });

  return {
    providerStatus: providerStatus(provider),
    job,
    scriptPackage,
    audioJob,
    youtubePackage,
  };
}

async function previewJob(id: number, actorId: string) {
  const job = await loadRenderJob(id);
  if (job.status === "canceled") {
    throw new AvatarVideoRenderError(400, "Canceled render jobs cannot be previewed.");
  }
  const scriptPackage = await loadScriptPackage(job.scriptPackageId);
  const [audioJob, youtubePackage] = await Promise.all([
    loadAudioJob(job.audioJobId, scriptPackage.id),
    loadYouTubePackage(job.youtubePackageId, scriptPackage.id),
  ]);
  const provider = ensureProvider(job.provider);
  const plan = await buildRenderPlan({ scriptPackage, audioJob, provider });
  const [updated] = await db.update(avatarVideoRenderJobs).set({
    status: "preview_ready",
    avatarProfileMapping: plan.avatarProfileMapping,
    segmentMapping: plan.segmentMapping,
    previewMetadata: plan.previewMetadata,
    estimatedCost: plan.estimatedCost,
    errorMessage: null,
    previewedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(avatarVideoRenderJobs.id, id)).returning();

  await audit("avatar_video_render_preview", actorId, updated, "success", {
    provider,
    sceneTemplate: updated.sceneTemplate,
    segmentCount: updated.segmentMapping.length,
  });

  return {
    providerStatus: providerStatus(provider),
    job: updated,
    scriptPackage,
    audioJob,
    youtubePackage,
  };
}

async function renderJob(id: number, actorId: string) {
  const job = await loadRenderJob(id);
  if (job.status === "canceled") {
    throw new AvatarVideoRenderError(400, "Canceled render jobs cannot be rendered.");
  }
  if (job.provider !== "dry_run") {
    const [updated] = await db.update(avatarVideoRenderJobs).set({
      status: "failed",
      errorMessage: "Live avatar/video providers are placeholder-only in Phase 31. Use dry_run for internal render planning.",
      updatedAt: new Date(),
    }).where(eq(avatarVideoRenderJobs.id, id)).returning();
    await audit("avatar_video_render_block_live_provider", actorId, updated, "blocked", { provider: job.provider });
    throw new AvatarVideoRenderError(503, "Live avatar/video providers are not enabled in Phase 31. Use dry_run.");
  }

  const [updated] = await db.update(avatarVideoRenderJobs).set({
    status: "dry_run_completed",
    actualCost: 0,
    errorMessage: null,
    renderedBy: actorId,
    renderedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(avatarVideoRenderJobs.id, id)).returning();

  await audit("avatar_video_render_dry_run", actorId, updated, "success", {
    provider: updated.provider,
    sceneTemplate: updated.sceneTemplate,
    actualCost: 0,
    outputGenerated: false,
  });

  return {
    providerStatus: providerStatus("dry_run"),
    job: updated,
  };
}

async function cancelJob(id: number, actorId: string) {
  const job = await loadRenderJob(id);
  if (job.status === "canceled") return { providerStatus: providerStatus(ensureProvider(job.provider)), job };

  const [updated] = await db.update(avatarVideoRenderJobs).set({
    status: "canceled",
    errorMessage: "Canceled by root admin before any public rendering or publishing.",
    canceledBy: actorId,
    canceledAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(avatarVideoRenderJobs.id, id)).returning();

  await audit("avatar_video_render_cancel", actorId, updated, "success", {
    previousStatus: job.status,
    provider: job.provider,
  });

  return {
    providerStatus: providerStatus(ensureProvider(updated.provider)),
    job: updated,
  };
}

export const avatarVideoRenderService = {
  listEligiblePackages,
  listJobs,
  getJob,
  createJob,
  previewJob,
  renderJob,
  cancelJob,
  providerStatus,
};
