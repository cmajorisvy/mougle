import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Play, Video, Download, Clock, CheckCircle, XCircle, Film, Zap, Hash, FileText, ChevronRight } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useLocation, useParams } from "wouter";
import { useState } from "react";

function JobStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    processing: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    completed: "bg-green-500/20 text-green-400 border-green-500/30",
    failed: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  return (
    <span data-testid={`badge-status-${status}`} className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${colors[status] || "bg-gray-500/20 text-gray-400"}`}>
      {status === "processing" && <Loader2 className="w-3 h-3 animate-spin" />}
      {status === "completed" && <CheckCircle className="w-3 h-3" />}
      {status === "failed" && <XCircle className="w-3 h-3" />}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function ClipStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "bg-blue-500/20 text-blue-400",
    rendered: "bg-green-500/20 text-green-400",
    failed: "bg-red-500/20 text-red-400",
    uploaded: "bg-purple-500/20 text-purple-400",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${colors[status] || "bg-gray-500/20 text-gray-400"}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function ProgressBar({ completed, total, failed }: { completed: number; total: number; failed: number }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const failPct = total > 0 ? Math.round((failed / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-400">
        <span>{completed}/{total} clips</span>
        <span>{pct}%</span>
      </div>
      <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
        <div className="h-full flex">
          <div className="bg-green-500 transition-all" style={{ width: `${pct}%` }} />
          <div className="bg-red-500 transition-all" style={{ width: `${failPct}%` }} />
        </div>
      </div>
    </div>
  );
}

export default function ContentFlywheel() {
  const [, navigate] = useLocation();

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["/api/flywheel/jobs"],
    queryFn: () => api.flywheel.jobs(),
    refetchInterval: 5000,
  });

  const { data: debates = [] } = useQuery({
    queryKey: ["/api/debates"],
    queryFn: () => api.debates.list(),
  });

  const triggerMutation = useMutation({
    mutationFn: (debateId: number) => api.flywheel.trigger(debateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/flywheel/jobs"] });
    },
  });

  const completedDebates = debates.filter((d: any) => d.status === "completed" || d.status === "lobby" || d.status === "live");
  const debatesWithoutJobs = completedDebates.filter((d: any) =>
    !jobs.some((j: any) => j.debateId === d.id)
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 data-testid="text-page-title" className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent flex items-center gap-2">
              <Film className="w-7 h-7 text-purple-400" />
              Content Flywheel
            </h1>
            <p className="text-gray-400 text-sm mt-1">Automatically generate viral short-form videos from debate highlights</p>
          </div>
        </div>

        {debatesWithoutJobs.length > 0 && (
          <Card className="bg-gray-900/50 border-gray-800 p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              Available Debates
            </h3>
            <div className="space-y-2">
              {debatesWithoutJobs.map((debate: any) => (
                <div key={debate.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 border border-gray-700/50">
                  <div>
                    <p data-testid={`text-debate-title-${debate.id}`} className="text-sm font-medium text-white">{debate.title}</p>
                    <p className="text-xs text-gray-500">{debate.topic}</p>
                  </div>
                  <Button
                    data-testid={`button-trigger-${debate.id}`}
                    size="sm"
                    onClick={() => triggerMutation.mutate(debate.id)}
                    disabled={triggerMutation.isPending}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {triggerMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    ) : (
                      <Play className="w-4 h-4 mr-1" />
                    )}
                    Generate Clips
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
          </div>
        ) : jobs.length === 0 ? (
          <Card className="bg-gray-900/50 border-gray-800 p-8 text-center">
            <Film className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No flywheel jobs yet</p>
            <p className="text-gray-500 text-sm mt-1">Complete a debate and trigger the flywheel to generate clips</p>
          </Card>
        ) : (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white">Pipeline Jobs</h2>
            {jobs.map((job: any) => (
              <Card
                key={job.id}
                data-testid={`card-job-${job.id}`}
                className="bg-gray-900/50 border-gray-800 p-4 hover:border-purple-500/30 transition-colors cursor-pointer"
                onClick={() => navigate(`/flywheel/${job.id}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-base font-medium text-white flex items-center gap-2">
                      <Video className="w-4 h-4 text-purple-400" />
                      {job.debateTitle || `Debate #${job.debateId}`}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">{job.debateTopic}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <JobStatusBadge status={job.status} />
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  </div>
                </div>
                <ProgressBar completed={job.completedClips} total={job.totalClips} failed={job.failedClips} />
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(job.createdAt).toLocaleDateString()}
                  </span>
                  {job.errorMessage && (
                    <span className="text-red-400 truncate max-w-[200px]">{job.errorMessage}</span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

export function FlywheelJobDetail() {
  const params = useParams<{ id: string }>();
  const jobId = parseInt(params.id || "0");
  const [previewClipId, setPreviewClipId] = useState<number | null>(null);

  const { data: jobData, isLoading } = useQuery({
    queryKey: [`/api/flywheel/jobs/${jobId}`],
    queryFn: () => api.flywheel.job(jobId),
    refetchInterval: (query) => {
      const d = query.state.data;
      return d?.status === "processing" ? 3000 : false;
    },
    enabled: jobId > 0,
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
        </div>
      </Layout>
    );
  }

  if (!jobData) {
    return (
      <Layout>
        <Card className="bg-gray-900/50 border-gray-800 p-8 text-center">
          <p className="text-gray-400">Job not found</p>
        </Card>
      </Layout>
    );
  }

  const clips = jobData.clips || [];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 data-testid="text-job-title" className="text-2xl font-bold text-white flex items-center gap-2">
              <Film className="w-7 h-7 text-purple-400" />
              Flywheel Job #{jobData.id}
            </h1>
            <p className="text-gray-400 text-sm mt-1">Debate #{jobData.debateId}</p>
          </div>
          <JobStatusBadge status={jobData.status} />
        </div>

        <Card className="bg-gray-900/50 border-gray-800 p-4">
          <ProgressBar completed={jobData.completedClips} total={jobData.totalClips} failed={jobData.failedClips} />
          {jobData.errorMessage && (
            <p className="text-red-400 text-sm mt-2">{jobData.errorMessage}</p>
          )}
        </Card>

        {previewClipId && (
          <Card className="bg-gray-900/50 border-gray-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-300">Video Preview</h3>
              <Button size="sm" variant="ghost" onClick={() => setPreviewClipId(null)}>Close</Button>
            </div>
            <video
              data-testid={`video-preview-${previewClipId}`}
              src={api.flywheel.clipVideoUrl(previewClipId)}
              controls
              className="w-full max-w-[360px] mx-auto rounded-lg"
              style={{ aspectRatio: "9/16" }}
            />
          </Card>
        )}

        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Generated Clips ({clips.length})</h2>
          {clips.length === 0 ? (
            <Card className="bg-gray-900/50 border-gray-800 p-6 text-center">
              {jobData.status === "processing" ? (
                <div className="flex items-center justify-center gap-2 text-yellow-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <p>Generating clips...</p>
                </div>
              ) : (
                <p className="text-gray-500">No clips generated</p>
              )}
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {clips.map((clip: any) => (
                <Card key={clip.id} data-testid={`card-clip-${clip.id}`} className="bg-gray-900/50 border-gray-800 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-sm font-medium text-white leading-tight flex-1 mr-2">
                      {clip.title}
                    </h3>
                    <ClipStatusBadge status={clip.status} />
                  </div>

                  {clip.description && (
                    <p className="text-xs text-gray-400 mb-2">{clip.description}</p>
                  )}

                  {clip.hashtags && clip.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {clip.hashtags.slice(0, 5).map((tag: string, i: number) => (
                        <span key={i} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded bg-purple-500/10 text-purple-400">
                          <Hash className="w-2.5 h-2.5" />
                          {tag.replace(/^#/, "")}
                        </span>
                      ))}
                    </div>
                  )}

                  {clip.transcriptSnippet && (
                    <div className="bg-gray-800/50 rounded p-2 mb-2 max-h-20 overflow-y-auto">
                      <p className="text-[11px] text-gray-400 whitespace-pre-line leading-relaxed">
                        <FileText className="w-3 h-3 inline mr-1" />
                        {clip.transcriptSnippet.slice(0, 200)}...
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-2">
                    {clip.durationSeconds && (
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {clip.durationSeconds}s
                      </span>
                    )}
                    <span className="text-xs text-gray-500">{clip.format}</span>
                  </div>

                  {clip.status === "rendered" && clip.videoPath && (
                    <div className="flex gap-2 mt-3">
                      <Button
                        data-testid={`button-preview-${clip.id}`}
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={() => setPreviewClipId(clip.id)}
                      >
                        <Play className="w-3 h-3 mr-1" /> Preview
                      </Button>
                      <a href={api.flywheel.clipVideoUrl(clip.id)} download={`clip_${clip.id}.mp4`}>
                        <Button data-testid={`button-download-${clip.id}`} size="sm" variant="outline" className="text-xs">
                          <Download className="w-3 h-3 mr-1" /> Download
                        </Button>
                      </a>
                    </div>
                  )}

                  {clip.status === "failed" && clip.errorMessage && (
                    <p className="text-xs text-red-400 mt-2 truncate">{clip.errorMessage}</p>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
