import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Shield, ArrowLeft, AlertTriangle, Loader2,
  Activity, DollarSign, Eye, Globe, Scale,
  CheckCircle, XCircle, Clock, Download, Trash2, FileText
} from "lucide-react";

async function adminGet(url: string) {
  const token = localStorage.getItem("admin_token");
  const res = await fetch(url, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), "Content-Type": "application/json" } });
  if (!res.ok) throw new Error("Request failed");
  return res.json();
}

async function adminPost(url: string, body?: any) {
  const token = localStorage.getItem("admin_token");
  const res = await fetch(url, { method: "POST", headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) throw new Error("Request failed");
  return res.json();
}

function useAdminAuth() {
  const [, navigate] = useLocation();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-verify"],
    queryFn: () => api.admin.verify(),
    retry: false,
    refetchOnWindowFocus: false,
  });
  useEffect(() => {
    if (!isLoading && (isError || !data?.valid)) navigate("/admin/login");
  }, [isLoading, isError, data, navigate]);
  return { isAuthenticated: !!data?.valid, isLoading };
}

const CATEGORY_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  technical: { icon: Activity, color: "text-blue-400 bg-blue-500/20", label: "Technical Risk" },
  economic: { icon: DollarSign, color: "text-green-400 bg-green-500/20", label: "Economic Risk" },
  privacy: { icon: Eye, color: "text-purple-400 bg-purple-500/20", label: "Privacy Risk" },
  ecosystem: { icon: Globe, color: "text-yellow-400 bg-yellow-500/20", label: "Ecosystem Risk" },
  legal: { icon: Scale, color: "text-red-400 bg-red-500/20", label: "Legal Risk" },
};

const STATUS_STYLES: Record<string, string> = {
  healthy: "bg-green-500/20 text-green-400 border-green-500/30",
  warning: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function RiskControlCenter() {
  const { isAuthenticated, isLoading: authLoading } = useAdminAuth();
  const [activeTab, setActiveTab] = useState<"overview" | "audit" | "data-requests">("overview");
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: overview, isLoading } = useQuery({
    queryKey: ["risk-overview"],
    queryFn: () => adminGet("/api/risk/overview"),
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });

  const { data: auditLogs } = useQuery({
    queryKey: ["risk-audit-logs"],
    queryFn: () => adminGet("/api/risk/audit-logs?limit=50"),
    enabled: isAuthenticated && activeTab === "audit",
  });

  const { data: dataRequests } = useQuery({
    queryKey: ["risk-data-requests"],
    queryFn: () => adminGet("/api/risk/data-requests"),
    enabled: isAuthenticated && activeTab === "data-requests",
  });

  const snapshotMutation = useMutation({
    mutationFn: () => adminPost("/api/risk/snapshot"),
    onSuccess: () => {
      toast({ title: "Snapshot created" });
      queryClient.invalidateQueries({ queryKey: ["risk-overview"] });
    },
  });

  const processExportMutation = useMutation({
    mutationFn: (id: string) => adminPost(`/api/risk/process-export/${id}`),
    onSuccess: () => {
      toast({ title: "Export processed" });
      queryClient.invalidateQueries({ queryKey: ["risk-data-requests"] });
    },
  });

  const processDeletionMutation = useMutation({
    mutationFn: (id: string) => adminPost(`/api/risk/process-deletion/${id}`),
    onSuccess: () => {
      toast({ title: "Deletion processed" });
      queryClient.invalidateQueries({ queryKey: ["risk-data-requests"] });
    },
  });

  if (authLoading || isLoading) {
    return <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-purple-400" /></div>;
  }

  const categories = Object.entries(CATEGORY_CONFIG);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} data-testid="button-back-admin">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 rounded-lg"><Shield className="w-6 h-6 text-red-400" /></div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-risk-title">Risk Control Center</h1>
              <p className="text-sm text-gray-400">Monitor and mitigate platform risks across all dimensions</p>
            </div>
          </div>
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="outline" onClick={() => snapshotMutation.mutate()} disabled={snapshotMutation.isPending} data-testid="button-take-snapshot">
              {snapshotMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Take Snapshot"}
            </Button>
          </div>
        </div>

        {overview && (
          <div className="mb-6">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${STATUS_STYLES[overview.overallStatus] || STATUS_STYLES.healthy}`} data-testid="text-overall-risk">
              {overview.overallStatus === "critical" ? <AlertTriangle className="w-5 h-5" /> :
               overview.overallStatus === "warning" ? <AlertTriangle className="w-5 h-5" /> :
               <CheckCircle className="w-5 h-5" />}
              <span className="font-semibold">Overall Risk: {overview.overallScore}/100</span>
              <span className="capitalize">({overview.overallStatus})</span>
            </div>
          </div>
        )}

        <div className="flex gap-2 mb-6 border-b border-gray-800 pb-2">
          {(["overview", "audit", "data-requests"] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} data-testid={`tab-${tab}`}
              className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${activeTab === tab ? "bg-white/10 text-white" : "text-gray-400 hover:text-gray-200"}`}>
              {tab === "overview" ? "Risk Overview" : tab === "audit" ? "Audit Logs" : "Data Requests"}
            </button>
          ))}
        </div>

        {activeTab === "overview" && overview && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
              {categories.map(([key, config]) => {
                const Icon = config.icon;
                const score = overview.categoryScores?.[key] || 0;
                const status = score > 60 ? "critical" : score > 30 ? "warning" : "healthy";
                return (
                  <Card key={key} className="bg-[#12121a] border-gray-800 p-4" data-testid={`card-risk-${key}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`p-1.5 rounded ${config.color}`}><Icon className="w-4 h-4" /></div>
                      <span className="text-sm font-medium text-gray-300">{config.label}</span>
                    </div>
                    <div className="flex items-end gap-2">
                      <span className="text-2xl font-bold">{score}</span>
                      <span className="text-xs text-gray-400 mb-1">/100</span>
                    </div>
                    <div className={`mt-2 text-xs px-2 py-0.5 rounded inline-block ${STATUS_STYLES[status]}`}>
                      {status}
                    </div>
                  </Card>
                );
              })}
            </div>

            <h3 className="text-lg font-semibold mb-4">Risk Indicators</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {overview.indicators?.map((ind: any, i: number) => {
                const config = CATEGORY_CONFIG[ind.category];
                const Icon = config?.icon || Activity;
                return (
                  <Card key={i} className="bg-[#12121a] border-gray-800 p-4" data-testid={`indicator-${ind.name.toLowerCase().replace(/\s+/g, '-')}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium">{ind.name}</span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded ${STATUS_STYLES[ind.status]}`}>{ind.status}</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-bold">{ind.value}</span>
                      {ind.threshold > 0 && <span className="text-xs text-gray-500">threshold: {ind.threshold}</span>}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{ind.description}</p>
                  </Card>
                );
              })}
            </div>
          </>
        )}

        {activeTab === "audit" && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Recent Audit Logs</h3>
            {auditLogs?.length === 0 ? (
              <Card className="bg-[#12121a] border-gray-800 p-8 text-center text-gray-400">No audit logs yet</Card>
            ) : (
              <div className="space-y-2">
                {auditLogs?.map((log: any) => (
                  <Card key={log.id} className="bg-[#12121a] border-gray-800 p-3 flex items-center gap-3" data-testid={`audit-log-${log.id}`}>
                    <div className={`w-2 h-2 rounded-full ${log.riskLevel === "critical" ? "bg-red-400" : log.riskLevel === "high" ? "bg-orange-400" : log.riskLevel === "medium" ? "bg-yellow-400" : "bg-green-400"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{log.action}</span>
                        <span className="text-xs text-gray-500">{log.resourceType}</span>
                      </div>
                      <div className="text-xs text-gray-400">Actor: {log.actorId} ({log.actorType}) - {log.outcome}</div>
                    </div>
                    <span className="text-xs text-gray-500">{new Date(log.createdAt).toLocaleString()}</span>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "data-requests" && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Data Export & Deletion Requests</h3>
            {(!dataRequests || dataRequests.length === 0) ? (
              <Card className="bg-[#12121a] border-gray-800 p-8 text-center text-gray-400" data-testid="text-no-data-requests">No data requests</Card>
            ) : (
              <div className="space-y-2">
                {dataRequests.map((req: any) => (
                  <Card key={req.id} className="bg-[#12121a] border-gray-800 p-4" data-testid={`data-request-${req.id}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {req.requestType === "export" ? <Download className="w-4 h-4 text-blue-400" /> : <Trash2 className="w-4 h-4 text-red-400" />}
                        <div>
                          <span className="text-sm font-medium capitalize">{req.requestType}</span>
                          <span className="text-xs text-gray-400 ml-2">User: {req.userId}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs px-2 py-1 rounded ${req.status === "completed" ? "bg-green-500/20 text-green-400" : req.status === "processing" ? "bg-blue-500/20 text-blue-400" : req.status === "failed" ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                          {req.status}
                        </span>
                        {req.status === "pending" && (
                          <Button size="sm" variant="outline"
                            onClick={() => req.requestType === "export" ? processExportMutation.mutate(req.id) : processDeletionMutation.mutate(req.id)}
                            disabled={processExportMutation.isPending || processDeletionMutation.isPending}
                            data-testid={`button-process-${req.id}`}>
                            Process
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Requested: {new Date(req.requestedAt).toLocaleString()}</div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
