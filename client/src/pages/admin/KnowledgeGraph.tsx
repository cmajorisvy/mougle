import { useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type AdminKnowledgeGraphSummary } from "@/lib/api";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AlertTriangle,
  ArrowLeft,
  Database,
  GitBranch,
  Loader2,
  Lock,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

function labelFor(value: string) {
  return value.replace(/[_-]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatCount(value: number | undefined) {
  return Math.round(value || 0).toLocaleString();
}

function confidence(value: number) {
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

function statusClass(status: string) {
  if (["verified", "approved", "supported", "active", "consensus", "exported"].includes(status)) {
    return "bg-emerald-500/10 text-emerald-300 border-emerald-500/20";
  }
  if (["unverified", "pending", "pending_review", "admin_review", "unscored"].includes(status)) {
    return "bg-yellow-500/10 text-yellow-300 border-yellow-500/20";
  }
  if (["contested", "blocked", "rejected", "revoked", "failed"].includes(status)) {
    return "bg-red-500/10 text-red-300 border-red-500/20";
  }
  return "bg-zinc-500/10 text-zinc-300 border-zinc-500/20";
}

function DistributionCard({
  title,
  items,
}: {
  title: string;
  items: Record<string, number>;
}) {
  const entries = Object.entries(items).sort((a, b) => b[1] - a[1]).slice(0, 8);
  return (
    <Card className="bg-[#10101a]/90 border-white/[0.08] p-5">
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      <div className="space-y-3 mt-4">
        {entries.length === 0 && <p className="text-sm text-zinc-500">No graph records yet.</p>}
        {entries.map(([key, value]) => (
          <div key={`${title}-${key}`} className="flex items-center justify-between gap-3">
            <span className="text-sm text-zinc-400 truncate">{labelFor(key)}</span>
            <Badge className="bg-white/[0.05] text-zinc-300 border-white/[0.08]">{formatCount(value)}</Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}

function DistributionPanel({ title, items }: { title: string; items: Record<string, number> }) {
  const entries = Object.entries(items).sort((a, b) => b[1] - a[1]).slice(0, 8);
  return (
    <div className="rounded-lg border border-white/[0.08] bg-black/20 p-4">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <div className="space-y-3 mt-4">
        {entries.length === 0 && <p className="text-sm text-zinc-500">No blocked records in this bucket.</p>}
        {entries.map(([key, value]) => (
          <div key={`${title}-${key}`} className="flex items-center justify-between gap-3">
            <span className="text-sm text-zinc-400 truncate">{labelFor(key)}</span>
            <Badge className="bg-white/[0.05] text-zinc-300 border-white/[0.08]">{formatCount(value)}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

function Safeguards({ summary }: { summary: AdminKnowledgeGraphSummary }) {
  const items = [
    ["Root Admin Only", summary.safeguards.rootAdminOnly],
    ["Internal Inspection", summary.safeguards.internalAdminInspectionOnly],
    ["No Raw Private Memory", summary.safeguards.noRawPrivateMemoryContent],
    ["No Public Graph Routes", summary.safeguards.noPublicGraphRoutes],
    ["Manual Sync Only", summary.safeguards.noAutonomousGraphExpansion],
  ];

  return (
    <Card className="bg-emerald-500/[0.06] border-emerald-500/20 p-5">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-emerald-300" />
        <h2 className="text-lg font-semibold text-white">Safety Controls</h2>
      </div>
      <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-3 mt-4">
        {items.map(([label, enabled]) => (
          <div key={label as string} className="rounded-lg border border-white/[0.08] bg-black/20 p-3">
            <p className="text-xs text-zinc-500">{label}</p>
            <p className="text-sm font-semibold text-emerald-300 mt-1">{enabled ? "Enabled" : "Unavailable"}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function KnowledgeGraph() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { admin, isLoading: authLoading, isAuthenticated } = useAdminAuth();
  const isRootAdmin = admin?.actor?.type === "root_admin" && admin.role === "super_admin";

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/admin/login", { replace: true });
      return;
    }
    if (!authLoading && isAuthenticated && !isRootAdmin) {
      navigate("/staff/dashboard", { replace: true });
    }
  }, [authLoading, isAuthenticated, isRootAdmin, navigate]);

  const summaryQuery = useQuery({
    queryKey: ["admin-knowledge-graph-summary"],
    queryFn: () => api.admin.knowledgeGraphSummary(),
    enabled: isRootAdmin,
  });

  const nodesQuery = useQuery({
    queryKey: ["admin-knowledge-graph-nodes"],
    queryFn: () => api.admin.knowledgeGraphNodes({ limit: 20 }),
    enabled: isRootAdmin,
  });

  const edgesQuery = useQuery({
    queryKey: ["admin-knowledge-graph-edges"],
    queryFn: () => api.admin.knowledgeGraphEdges({ limit: 20 }),
    enabled: isRootAdmin,
  });

  const syncMutation = useMutation({
    mutationFn: () => api.admin.syncKnowledgeGraph(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-knowledge-graph-summary"] });
      queryClient.invalidateQueries({ queryKey: ["admin-knowledge-graph-nodes"] });
      queryClient.invalidateQueries({ queryKey: ["admin-knowledge-graph-edges"] });
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#060611] flex items-center justify-center text-zinc-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading...
      </div>
    );
  }

  if (!isAuthenticated || !isRootAdmin) return null;

  const summary = summaryQuery.data;

  return (
    <div className="min-h-screen bg-[#070711] text-white">
      <div className="border-b border-white/[0.08] bg-[#0d0d18] px-6 py-6">
        <div className="max-w-7xl mx-auto">
          <button onClick={() => navigate("/admin/dashboard")} className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white mb-4">
            <ArrowLeft className="w-4 h-4" /> Admin Dashboard
          </button>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <Database className="w-8 h-8 text-cyan-300" />
                <h1 className="text-2xl font-bold">Knowledge Graph</h1>
                <Badge className="bg-yellow-500/15 text-yellow-300 border-yellow-500/20">Founder Only</Badge>
                <Badge className="bg-cyan-500/10 text-cyan-300 border-cyan-500/20">Internal Admin Only</Badge>
              </div>
              <p className="text-sm text-zinc-500 mt-2 max-w-3xl">
                Claims, evidence, debates, agents, sources, and approved internal pipeline metadata with vault-aware filtering.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => summaryQuery.refetch()} disabled={summaryQuery.isFetching} className="border-white/10 text-zinc-300">
                {summaryQuery.isFetching ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Refresh
              </Button>
              <Button onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending} className="bg-cyan-500 hover:bg-cyan-400 text-black">
                {syncMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <GitBranch className="w-4 h-4 mr-2" />}
                Manual Sync
              </Button>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {(summaryQuery.error || syncMutation.error) && (
          <Card className="bg-red-500/10 border-red-500/20 p-4 text-red-200">
            {(summaryQuery.error as Error)?.message || (syncMutation.error as Error)?.message || "Unable to load knowledge graph."}
          </Card>
        )}

        {syncMutation.data && (
          <Card className="bg-cyan-500/10 border-cyan-500/20 p-4 text-cyan-100">
            Synced {formatCount(syncMutation.data.nodesUpserted)} nodes and {formatCount(syncMutation.data.edgesUpserted)} edges. Blocked {formatCount(syncMutation.data.blockedCounts.total)} restricted/private memory sources.
          </Card>
        )}

        {summaryQuery.isLoading && (
          <div className="flex items-center justify-center py-20 text-zinc-400">
            <Loader2 className="w-8 h-8 animate-spin mr-3" /> Loading knowledge graph...
          </div>
        )}

        {summary && (
          <>
            <Card className="bg-gradient-to-br from-cyan-500/[0.10] to-violet-500/[0.08] border-cyan-500/20 p-6">
              <div className="grid lg:grid-cols-[1fr_auto] gap-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="bg-cyan-500/10 text-cyan-300 border-cyan-500/20">{summary.qualitySignals.sourceQuality}</Badge>
                    <Badge className="bg-zinc-500/10 text-zinc-300 border-zinc-500/20">
                      UES context {summary.qualitySignals.uesAvailable ? "available" : "unavailable"}
                    </Badge>
                  </div>
                  <p className="text-sm text-zinc-500 mt-4">Internal Graph Foundation</p>
                  <p className="text-5xl font-bold text-white mt-1">{formatCount(summary.totals.nodes)} nodes</p>
                  <p className="text-sm text-zinc-400 mt-4 max-w-3xl leading-6">
                    Manual sync builds deterministic internal graph records and preserves private/restricted material as blocked aggregate counts only.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 min-w-[280px]">
                  {[
                    ["Edges", summary.totals.edges],
                    ["Blocked", summary.totals.blockedRestrictedSources],
                    ["Node Types", Object.keys(summary.nodeCountsByType).length],
                    ["Relations", Object.keys(summary.edgeCountsByRelation).length],
                  ].map(([label, value]) => (
                    <Card key={label as string} className="bg-black/20 border-white/[0.06] p-3">
                      <p className="text-[11px] text-zinc-500">{label}</p>
                      <p className="text-xl font-semibold text-white mt-1">{formatCount(Number(value))}</p>
                    </Card>
                  ))}
                </div>
              </div>
            </Card>

            <Safeguards summary={summary} />

            <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
              <DistributionCard title="Node Counts By Type" items={summary.nodeCountsByType} />
              <DistributionCard title="Edge Counts By Relation" items={summary.edgeCountsByRelation} />
              <DistributionCard title="Verification Distribution" items={summary.verificationDistribution} />
              <DistributionCard title="Vault Distribution" items={summary.vaultDistribution} />
            </div>

            <div className="grid xl:grid-cols-[1fr_.9fr] gap-5">
              <Card className="bg-[#10101a]/90 border-white/[0.08] p-5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-cyan-300" />
                  <h2 className="text-lg font-semibold">Top Connected Topics / Entities</h2>
                </div>
                <div className="space-y-3 mt-4">
                  {summary.topConnected.length === 0 && <p className="text-sm text-zinc-500">Run a manual sync to populate graph connections.</p>}
                  {summary.topConnected.map((item) => (
                    <div key={item.nodeKey} className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">{item.label}</p>
                          <p className="text-xs text-zinc-500">{labelFor(item.nodeType)} · {item.nodeKey}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={statusClass(item.verificationStatus)}>{labelFor(item.verificationStatus)}</Badge>
                          <Badge className="bg-white/[0.05] text-zinc-300 border-white/[0.08]">{item.connectionCount} links</Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="bg-[#10101a]/90 border-white/[0.08] p-5">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-300" />
                  <h2 className="text-lg font-semibold">Unverified / High-Risk Clusters</h2>
                </div>
                <div className="space-y-3 mt-4">
                  {summary.highRiskClusters.length === 0 && <p className="text-sm text-zinc-500">No unverified or low-confidence clusters in the current graph snapshot.</p>}
                  {summary.highRiskClusters.map((item) => (
                    <div key={item.nodeKey} className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">{item.label}</p>
                          <p className="text-xs text-zinc-500">{item.reason}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={statusClass(item.verificationStatus)}>{labelFor(item.verificationStatus)}</Badge>
                          <Badge className="bg-white/[0.05] text-zinc-300 border-white/[0.08]">{confidence(item.confidence)}</Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <div className="grid xl:grid-cols-[.9fr_1.1fr] gap-5">
              <Card className="bg-red-500/[0.04] border-red-500/20 p-5">
                <div className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-red-300" />
                  <h2 className="text-lg font-semibold">Private / Restricted Blocked Counts</h2>
                </div>
                <p className="text-sm text-zinc-500 mt-2">Only aggregate counts and reasons are shown. Source IDs and raw content are intentionally hidden.</p>
                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <DistributionPanel title="Blocked By Source" items={summary.blockedCounts.bySource} />
                  <DistributionPanel title="Blocked By Reason" items={summary.blockedCounts.byReason} />
                </div>
                {summary.blockedCounts.samples.length > 0 && (
                  <div className="space-y-2 mt-4">
                    {summary.blockedCounts.samples.map((item, index) => (
                      <div key={`${item.sourceTable}-${index}`} className="rounded-lg border border-red-500/10 bg-black/20 p-3">
                        <p className="text-xs text-red-200">{labelFor(item.sourceTable)} · {item.vaultType}/{item.sensitivity}</p>
                        <p className="text-xs text-zinc-500 mt-1">{item.reason}</p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card className="bg-[#10101a]/90 border-white/[0.08] p-5">
                <h2 className="text-lg font-semibold">Provenance / Source Summary</h2>
                <div className="overflow-x-auto mt-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-zinc-500 border-b border-white/[0.08]">
                        <th className="py-2 pr-4">Source</th>
                        <th className="py-2 pr-4">Nodes</th>
                        <th className="py-2 pr-4">Edges</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.provenanceSummaries.slice(0, 18).map((item) => (
                        <tr key={item.sourceTable} className="border-b border-white/[0.04]">
                          <td className="py-2 pr-4 text-zinc-300">{labelFor(item.sourceTable)}</td>
                          <td className="py-2 pr-4 text-zinc-400">{formatCount(item.nodes)}</td>
                          <td className="py-2 pr-4 text-zinc-400">{formatCount(item.edges)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          </>
        )}

        <div className="grid xl:grid-cols-2 gap-5">
          <Card className="bg-[#10101a]/90 border-white/[0.08] p-5">
            <h2 className="text-lg font-semibold">Recent Nodes</h2>
            <div className="space-y-3 mt-4">
              {nodesQuery.isLoading && <p className="text-sm text-zinc-500">Loading nodes...</p>}
              {nodesQuery.data?.map((graphNode) => (
                <div key={graphNode.nodeKey} className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-white truncate">{graphNode.label}</p>
                    <Badge className={statusClass(graphNode.verificationStatus)}>{labelFor(graphNode.verificationStatus)}</Badge>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">{labelFor(graphNode.nodeType)} · {labelFor(graphNode.sourceTable)} · {graphNode.vaultType}/{graphNode.sensitivity}</p>
                  {graphNode.summary && <p className="text-xs text-zinc-400 mt-2 line-clamp-2">{graphNode.summary}</p>}
                </div>
              ))}
            </div>
          </Card>

          <Card className="bg-[#10101a]/90 border-white/[0.08] p-5">
            <h2 className="text-lg font-semibold">Recent Edges</h2>
            <div className="space-y-3 mt-4">
              {edgesQuery.isLoading && <p className="text-sm text-zinc-500">Loading edges...</p>}
              {edgesQuery.data?.map((graphEdge) => (
                <div key={graphEdge.edgeKey} className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-white truncate">{labelFor(graphEdge.relationType)}</p>
                    <Badge className={statusClass(graphEdge.verificationStatus)}>{labelFor(graphEdge.verificationStatus)}</Badge>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1 break-all">{graphEdge.sourceNodeKey} {"->"} {graphEdge.targetNodeKey}</p>
                  <p className="text-xs text-zinc-400 mt-2">{graphEdge.vaultType}/{graphEdge.sensitivity} · confidence {confidence(graphEdge.confidence)}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
