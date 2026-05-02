import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  api,
  type AdminAvatarVideoActionResult,
  type AdminAvatarVideoCreatePayload,
  type AdminAvatarVideoRenderJob,
  type AdminAvatarVideoSceneTemplate,
} from "@/lib/api";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertTriangle,
  ArrowLeft,
  Clapperboard,
  FileText,
  Loader2,
  Mic2,
  Play,
  RefreshCw,
  ShieldCheck,
  Square,
  Video,
  Volume2,
  Youtube,
} from "lucide-react";

const SCENE_LABELS: Record<AdminAvatarVideoSceneTemplate, string> = {
  news_desk: "News Desk",
  podcast_studio: "Podcast Studio",
  debate_arena_summary: "Debate Arena Summary",
  minimal_cards: "Minimal Speaker Cards",
};

function statusBadgeClass(status: string) {
  if (status === "dry_run_completed" || status === "preview_ready") return "bg-emerald-500/10 text-emerald-300 border-emerald-500/20";
  if (status === "failed" || status === "canceled") return "bg-red-500/10 text-red-300 border-red-500/20";
  if (status === "draft") return "bg-yellow-500/10 text-yellow-300 border-yellow-500/20";
  if (status === "dry_run") return "bg-cyan-500/10 text-cyan-300 border-cyan-500/20";
  return "bg-zinc-500/10 text-zinc-300 border-zinc-500/20";
}

function formatCost(value: number | null | undefined) {
  if (typeof value !== "number") return "$0.0000";
  return `$${value.toFixed(4)}`;
}

function scriptTitle(job: AdminAvatarVideoRenderJob) {
  return job.previewMetadata?.title || `Render Job #${job.id}`;
}

function RenderJobCard({
  job,
  onPreview,
  onRender,
  onCancel,
  actionLoading,
}: {
  job: AdminAvatarVideoRenderJob;
  onPreview: (id: number) => void;
  onRender: (id: number) => void;
  onCancel: (id: number) => void;
  actionLoading: string | null;
}) {
  const profiles = Object.values(job.avatarProfileMapping || {});
  const warnings = job.previewMetadata?.safeModeWarnings || [];

  return (
    <Card className="bg-[#10101a]/90 border-white/[0.08] p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Video className="w-5 h-5 text-cyan-300" />
            <h2 className="text-lg font-semibold">Render Job #{job.id}</h2>
            <Badge className={statusBadgeClass(job.status)}>{job.status}</Badge>
            <Badge className={statusBadgeClass(job.provider)}>{job.provider}</Badge>
            <Badge className="bg-zinc-500/10 text-zinc-300 border-zinc-500/20">{SCENE_LABELS[job.sceneTemplate] || job.sceneTemplate}</Badge>
          </div>
          <p className="text-sm text-zinc-100 mt-3">{scriptTitle(job)}</p>
          <p className="text-xs text-zinc-500 mt-1">
            Script package #{job.scriptPackageId}
            {job.audioJobId ? ` - Audio job #${job.audioJobId}` : " - Script-only audio mapping"}
            {job.youtubePackageId ? ` - YouTube package #${job.youtubePackageId}` : ""}
          </p>
          {job.errorMessage && (
            <div className="flex items-start gap-2 text-sm text-red-300 mt-3">
              <AlertTriangle className="w-4 h-4 mt-0.5" />
              <span>{job.errorMessage}</span>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => onPreview(job.id)} disabled={actionLoading === `preview-${job.id}` || job.status === "canceled"} className="border-white/10 text-zinc-300">
            {actionLoading === `preview-${job.id}` ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Preview
          </Button>
          <Button onClick={() => onRender(job.id)} disabled={actionLoading === `render-${job.id}` || job.status === "canceled"} className="bg-cyan-600 hover:bg-cyan-700">
            {actionLoading === `render-${job.id}` ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
            Dry-Run Render
          </Button>
          <Button variant="outline" onClick={() => onCancel(job.id)} disabled={actionLoading === `cancel-${job.id}` || job.status === "canceled"} className="border-red-500/20 text-red-300 hover:bg-red-500/10">
            {actionLoading === `cancel-${job.id}` ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Square className="w-4 h-4 mr-2" />}
            Cancel
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mt-5">
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
          <p className="text-xs text-zinc-500">Estimated Cost</p>
          <p className="text-sm text-zinc-100 mt-1">{formatCost(job.estimatedCost)}</p>
        </div>
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
          <p className="text-xs text-zinc-500">Actual Cost</p>
          <p className="text-sm text-zinc-100 mt-1">{formatCost(job.actualCost)}</p>
        </div>
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
          <p className="text-xs text-zinc-500">Admin Review</p>
          <p className="text-sm text-zinc-100 mt-1">{job.adminReviewStatus}</p>
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="mt-5 rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-3">
          <div className="flex items-start gap-2 text-sm text-yellow-200">
            <AlertTriangle className="w-4 h-4 mt-0.5" />
            <div className="space-y-1">
              {warnings.map((warning) => <p key={warning}>{warning}</p>)}
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-5 mt-5">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100">Avatar / Speaker Mapping</h3>
          <div className="grid gap-2 mt-3">
            {profiles.map((profile) => (
              <div key={profile.agentKey} className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-zinc-100">{profile.displayName}</p>
                  <Badge className="bg-cyan-500/10 text-cyan-300 border-cyan-500/20">{profile.renderRole}</Badge>
                </div>
                <p className="text-xs text-zinc-500 mt-1">{profile.agentKey} - {profile.avatarStyle}</p>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-zinc-100">Script / Audio Segment Mapping</h3>
          <div className="grid gap-2 mt-3 max-h-80 overflow-y-auto pr-1">
            {job.segmentMapping.map((segment) => (
              <div key={`${job.id}-${segment.segmentIndex}-${segment.scriptType}`} className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={segment.audioAvailable ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" : "bg-zinc-500/10 text-zinc-300 border-zinc-500/20"}>
                    {segment.audioAvailable ? "audio linked" : "script only"}
                  </Badge>
                  <p className="text-sm text-zinc-100">Segment {segment.segmentIndex} - {segment.scriptType}</p>
                </div>
                <p className="text-xs text-zinc-500 mt-1">{segment.displayName} - {segment.status}</p>
                <p className="text-sm text-zinc-300 mt-2 leading-6">{segment.textPreview}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function VideoRender() {
  const [, navigate] = useLocation();
  const { admin, isLoading: authLoading, isAuthenticated } = useAdminAuth();
  const isRootAdmin = admin?.actor?.type === "root_admin" && admin.role === "super_admin";
  const [scriptPackageId, setScriptPackageId] = useState("");
  const [sceneTemplate, setSceneTemplate] = useState<AdminAvatarVideoSceneTemplate>("news_desk");
  const [latestResult, setLatestResult] = useState<AdminAvatarVideoActionResult | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated && !isRootAdmin) {
      navigate("/staff/dashboard", { replace: true });
    }
  }, [authLoading, isAuthenticated, isRootAdmin, navigate]);

  const { data: eligible, isLoading: eligibleLoading, refetch: refetchEligible } = useQuery({
    queryKey: ["admin-video-render-eligible"],
    queryFn: () => api.admin.videoRenderEligiblePackages(75),
    enabled: isRootAdmin,
  });

  const { data: jobs = [], isLoading: jobsLoading, refetch: refetchJobs } = useQuery({
    queryKey: ["admin-video-render-jobs"],
    queryFn: () => api.admin.videoRenderJobs(75),
    enabled: isRootAdmin,
  });

  const items = eligible?.items || [];
  const selectedItem = useMemo(
    () => items.find((item) => String(item.scriptPackage.id) === scriptPackageId) || null,
    [items, scriptPackageId],
  );
  const latestJob = latestResult?.job || jobs[0] || null;

  const createMutation = useMutation({
    mutationFn: (payload: AdminAvatarVideoCreatePayload) => api.admin.createVideoRenderJob(payload),
    onMutate: () => {
      setActionError(null);
      setActionLoading("create");
    },
    onSuccess: (result) => {
      setLatestResult(result);
      refetchJobs();
      refetchEligible();
    },
    onError: (err: Error) => setActionError(err.message),
    onSettled: () => setActionLoading(null),
  });

  const actionMutation = useMutation({
    mutationFn: async ({ type, id }: { type: "preview" | "render" | "cancel"; id: number }) => {
      setActionLoading(`${type}-${id}`);
      if (type === "preview") return api.admin.previewVideoRenderJob(id);
      if (type === "render") return api.admin.renderVideoRenderJob(id);
      return api.admin.cancelVideoRenderJob(id);
    },
    onSuccess: (result) => {
      setLatestResult(result);
      refetchJobs();
      refetchEligible();
    },
    onError: (err: Error) => setActionError(err.message),
    onSettled: () => setActionLoading(null),
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#060611] flex items-center justify-center text-zinc-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading...
      </div>
    );
  }

  if (!isAuthenticated || !isRootAdmin) return null;

  return (
    <div className="min-h-screen bg-[#070711] text-white">
      <div className="border-b border-white/[0.08] bg-[#0d0d18] px-6 py-6">
        <div className="max-w-7xl mx-auto">
          <button onClick={() => navigate("/admin/dashboard")} className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white mb-4">
            <ArrowLeft className="w-4 h-4" /> Admin Dashboard
          </button>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <Video className="w-8 h-8 text-cyan-300" />
                <h1 className="text-2xl font-bold">Avatar / Video Render</h1>
                <Badge className="bg-yellow-500/15 text-yellow-300 border-yellow-500/20">Founder Only</Badge>
                <Badge className="bg-cyan-500/10 text-cyan-300 border-cyan-500/20">Dry-run default</Badge>
              </div>
              <p className="text-sm text-zinc-500 mt-2 max-w-3xl">
                Internal render-job planning for approved podcast, audio, and YouTube packages. Admin-review only.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => navigate("/admin/podcast-scripts")} className="border-white/10 text-zinc-300">
                <Mic2 className="w-4 h-4 mr-2" /> Scripts
              </Button>
              <Button variant="outline" onClick={() => navigate("/admin/voice-jobs")} className="border-white/10 text-zinc-300">
                <Volume2 className="w-4 h-4 mr-2" /> Voice Jobs
              </Button>
              <Button variant="outline" onClick={() => navigate("/admin/youtube-publishing")} className="border-white/10 text-zinc-300">
                <Youtube className="w-4 h-4 mr-2" /> YouTube
              </Button>
              <Button variant="outline" onClick={() => navigate("/admin/digital-world")} className="border-white/10 text-zinc-300">
                <Clapperboard className="w-4 h-4 mr-2" /> Digital World
              </Button>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        <Card className="bg-[#10101a]/90 border-white/[0.08] p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-300" />
                <h2 className="text-lg font-semibold">Safety State</h2>
                <Badge className="bg-zinc-500/10 text-zinc-300 border-zinc-500/20">Internal/admin-review only</Badge>
                <Badge className="bg-zinc-500/10 text-zinc-300 border-zinc-500/20">No provider calls</Badge>
                <Badge className="bg-zinc-500/10 text-zinc-300 border-zinc-500/20">No publishing</Badge>
              </div>
              <p className="text-sm text-zinc-500 mt-2">{eligible?.providerStatus.message || "Dry-run provider status will appear after loading."}</p>
            </div>
            <Button variant="outline" onClick={() => { refetchEligible(); refetchJobs(); }} disabled={eligibleLoading || jobsLoading} className="border-white/10 text-zinc-300">
              {eligibleLoading || jobsLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Refresh
            </Button>
          </div>
          {(eligible?.safeModeWarnings || []).length > 0 && (
            <div className="mt-4 rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-3 text-sm text-yellow-200">
              {(eligible?.safeModeWarnings || []).map((warning) => <p key={warning}>{warning}</p>)}
            </div>
          )}
        </Card>

        <div className="grid lg:grid-cols-3 gap-5">
          <Card className="bg-[#10101a]/90 border-white/[0.08] p-5 lg:col-span-2">
            <h2 className="text-lg font-semibold">Create Render Job</h2>
            <p className="text-sm text-zinc-500 mt-1">Uses the selected script package, latest voice job, and latest YouTube package when available.</p>
            <div className="grid md:grid-cols-2 gap-4 mt-5">
              <div>
                <label className="text-xs text-zinc-500">Eligible Package</label>
                <Select value={scriptPackageId} onValueChange={setScriptPackageId}>
                  <SelectTrigger className="mt-2 bg-white/[0.04] border-white/[0.08] text-white">
                    <SelectValue placeholder="Choose a podcast package" />
                  </SelectTrigger>
                  <SelectContent>
                    {items.map((item) => (
                      <SelectItem key={item.scriptPackage.id} value={String(item.scriptPackage.id)}>
                        #{item.scriptPackage.id} - {item.scriptPackage.scriptPackage.youtubeTitle || `Debate ${item.scriptPackage.debateId}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-zinc-500">Scene Template</label>
                <Select value={sceneTemplate} onValueChange={(value) => setSceneTemplate(value as AdminAvatarVideoSceneTemplate)}>
                  <SelectTrigger className="mt-2 bg-white/[0.04] border-white/[0.08] text-white">
                    <SelectValue placeholder="Choose scene template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="news_desk">News Desk</SelectItem>
                    <SelectItem value="podcast_studio">Podcast Studio</SelectItem>
                    <SelectItem value="debate_arena_summary">Debate Arena Summary</SelectItem>
                    <SelectItem value="minimal_cards">Minimal Speaker Cards</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedItem && (
              <div className="grid md:grid-cols-3 gap-3 mt-5">
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
                  <p className="text-xs text-zinc-500">Script Package</p>
                  <p className="text-sm text-zinc-100 mt-1">#{selectedItem.scriptPackage.id} - {selectedItem.scriptPackage.status}</p>
                </div>
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
                  <p className="text-xs text-zinc-500">Audio Job</p>
                  <p className="text-sm text-zinc-100 mt-1">{selectedItem.latestAudioJob ? `#${selectedItem.latestAudioJob.id} - ${selectedItem.latestAudioJob.status}` : "No audio job linked"}</p>
                </div>
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
                  <p className="text-xs text-zinc-500">YouTube Package</p>
                  <p className="text-sm text-zinc-100 mt-1">{selectedItem.youtubePackage ? `#${selectedItem.youtubePackage.id} - ${selectedItem.youtubePackage.status}` : "No YouTube package linked"}</p>
                </div>
              </div>
            )}

            {actionError && (
              <div className="flex items-start gap-2 text-sm text-red-300 mt-4">
                <AlertTriangle className="w-4 h-4 mt-0.5" />
                <span>{actionError}</span>
              </div>
            )}

            <Button
              onClick={() => selectedItem && createMutation.mutate({
                scriptPackageId: selectedItem.scriptPackage.id,
                audioJobId: selectedItem.latestAudioJob?.id || null,
                youtubePackageId: selectedItem.youtubePackage?.id || null,
                provider: "dry_run",
                sceneTemplate,
              })}
              disabled={!selectedItem || actionLoading === "create"}
              className="mt-5 bg-cyan-600 hover:bg-cyan-700"
            >
              {actionLoading === "create" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Video className="w-4 h-4 mr-2" />}
              Create Dry-Run Job
            </Button>
          </Card>

          <Card className="bg-[#10101a]/90 border-white/[0.08] p-5">
            <h2 className="text-lg font-semibold">Provider Plan</h2>
            <div className="mt-4 space-y-3">
              <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 p-3">
                <p className="text-sm font-medium text-cyan-200">dry_run</p>
                <p className="text-xs text-cyan-100/80 mt-1">Default. Plans scene, avatar, and segment metadata without generating video.</p>
              </div>
              {["heygen", "d_id", "synthesia", "unreal"].map((provider) => (
                <div key={provider} className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
                  <p className="text-sm font-medium text-zinc-300">{provider}</p>
                  <p className="text-xs text-zinc-500 mt-1">Placeholder only. Live provider calls are deferred.</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {latestJob && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-5 h-5 text-cyan-300" />
              <h2 className="text-lg font-semibold">Latest Render Plan</h2>
            </div>
            <RenderJobCard
              job={latestJob}
              onPreview={(id) => actionMutation.mutate({ type: "preview", id })}
              onRender={(id) => actionMutation.mutate({ type: "render", id })}
              onCancel={(id) => actionMutation.mutate({ type: "cancel", id })}
              actionLoading={actionLoading}
            />
          </div>
        )}

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clapperboard className="w-5 h-5 text-cyan-300" />
            <h2 className="text-lg font-semibold">Render Job List</h2>
          </div>
          <div className="grid gap-5">
            {jobs.map((job) => (
              <RenderJobCard
                key={job.id}
                job={job}
                onPreview={(id) => actionMutation.mutate({ type: "preview", id })}
                onRender={(id) => actionMutation.mutate({ type: "render", id })}
                onCancel={(id) => actionMutation.mutate({ type: "cancel", id })}
                actionLoading={actionLoading}
              />
            ))}
            {jobs.length === 0 && (
              <Card className="bg-[#10101a]/90 border-white/[0.08] p-6 text-sm text-zinc-500">
                No render jobs yet.
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
