import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Dna,
  Loader2,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react";

function statusClass(status: string) {
  if (["accepted", "approved", "verified"].includes(status)) return "bg-emerald-500/10 text-emerald-300 border-emerald-500/20";
  if (["challenged", "needs_validation", "pending_review", "submitted"].includes(status)) return "bg-yellow-500/10 text-yellow-300 border-yellow-500/20";
  if (["rejected", "blocked"].includes(status)) return "bg-red-500/10 text-red-300 border-red-500/20";
  return "bg-zinc-500/10 text-zinc-300 border-zinc-500/20";
}

function blockers(packet: any) {
  return Array.isArray(packet?.safetyReport?.blockers) ? packet.safetyReport.blockers : [];
}

function warnings(packet: any) {
  return Array.isArray(packet?.safetyReport?.warnings) ? packet.safetyReport.warnings : [];
}

function score(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "0.00";
  return parsed.toFixed(2);
}

export default function KnowledgeEconomy() {
  const [, navigate] = useLocation();
  const { admin, isLoading } = useAdminAuth();
  const queryClient = useQueryClient();
  const [selectedPacketId, setSelectedPacketId] = useState<string | null>(null);
  const [noteById, setNoteById] = useState<Record<string, string>>({});
  const [previewById, setPreviewById] = useState<Record<string, any>>({});
  const isRootAdmin = admin?.actor?.type === "root_admin" && admin.role === "super_admin";

  useEffect(() => {
    if (!isLoading && !isRootAdmin) navigate("/admin/login", { replace: true });
  }, [isLoading, isRootAdmin, navigate]);

  const packetsQuery = useQuery({
    queryKey: ["/api/admin/knowledge-economy/packets"],
    queryFn: () => api.admin.knowledgeEconomyPackets(),
    enabled: isRootAdmin,
  });

  const detailQuery = useQuery({
    queryKey: ["/api/admin/knowledge-economy/packets", selectedPacketId],
    queryFn: () => api.admin.knowledgeEconomyPacket(selectedPacketId!),
    enabled: isRootAdmin && !!selectedPacketId,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/knowledge-economy/packets"] });
    if (selectedPacketId) queryClient.invalidateQueries({ queryKey: ["/api/admin/knowledge-economy/packets", selectedPacketId] });
  };

  const acceptMutation = useMutation({
    mutationFn: (id: string) => api.admin.acceptKnowledgePacket(id, { rationale: noteById[id] || "Accepted by root-admin review.", acceptingAgentType: "root_admin" }),
    onSuccess: refresh,
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => api.admin.rejectKnowledgePacket(id, { rationale: noteById[id] || "Rejected by root-admin review.", acceptingAgentType: "root_admin" }),
    onSuccess: refresh,
  });

  const challengeMutation = useMutation({
    mutationFn: (id: string) => api.admin.challengeKnowledgePacket(id, { challengeReason: noteById[id] || "Needs more evidence before acceptance.", acceptingAgentType: "root_admin" }),
    onSuccess: refresh,
  });

  const gluonPreviewMutation = useMutation({
    mutationFn: (id: string) => api.admin.previewKnowledgePacketGluon(id),
    onSuccess: (data, id) => setPreviewById((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), gluon: data } })),
  });

  const dnaPreviewMutation = useMutation({
    mutationFn: (id: string) => api.admin.previewKnowledgePacketDna(id),
    onSuccess: (data, id) => setPreviewById((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), dna: data } })),
  });

  if (isLoading || packetsQuery.isLoading) {
    return (
      <div className="min-h-screen bg-[#070711] text-white flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isRootAdmin) return null;

  const packets = packetsQuery.data || [];
  const selected = detailQuery.data;

  return (
    <div className="min-h-screen bg-[#070711] text-white">
      <div className="border-b border-white/[0.08] bg-[#0d0d18]/90">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <button onClick={() => navigate("/admin/dashboard")} className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-200">
            <ArrowLeft className="w-4 h-4" />
            Admin Dashboard
          </button>
          <Badge className="bg-violet-500/10 text-violet-300 border-violet-500/20">Root admin only</Badge>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-violet-600/15 via-cyan-600/10 to-transparent p-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center">
              <Dna className="w-5 h-5 text-violet-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Knowledge Economy</h1>
              <p className="text-sm text-zinc-400 mt-1">Consent-controlled packets, weighted acceptance, Gluon simulation, and DNA learning previews.</p>
            </div>
          </div>
        </div>

        <Card className="bg-emerald-500/[0.06] border-emerald-500/20 p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-300 mt-0.5" />
            <div>
              <h2 className="font-semibold text-white">Phase 25B Safety Boundary</h2>
              <p className="text-sm text-emerald-100/70 mt-1">
                Gluon is non-withdrawable, non-cashout, and separate from credits, purchases, payouts, Stripe, Razorpay, and creator earnings. DNA mutation stays preview-only.
              </p>
            </div>
          </div>
        </Card>

        {packets.length === 0 ? (
          <Card className="bg-[#10101a]/90 border-white/[0.08] p-10 text-center">
            <PackageCheck className="w-10 h-10 mx-auto text-zinc-600 mb-3" />
            <p className="text-zinc-400">No knowledge packets have been submitted yet.</p>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-[minmax(0,1fr)_420px] gap-5">
            <div className="grid gap-4">
              {packets.map((packet: any) => {
                const packetBlockers = blockers(packet);
                const packetWarnings = warnings(packet);
                const preview = previewById[packet.id] || {};
                const canAccept = packetBlockers.length === 0 && !["accepted", "rejected"].includes(packet.reviewStatus);

                return (
                  <Card key={packet.id} className="bg-[#10101a]/90 border-white/[0.08] p-5">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-semibold">{packet.title}</h2>
                          <Badge className={statusClass(packet.status)}>{packet.status}</Badge>
                          <Badge className={statusClass(packet.reviewStatus)}>{packet.reviewStatus}</Badge>
                          <Badge className="bg-white/[0.05] text-zinc-300 border-white/[0.08]">{packet.vaultType}/{packet.sensitivity}</Badge>
                        </div>
                        <p className="text-sm text-zinc-400 line-clamp-2">{packet.summary}</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
                            <p className="text-xs text-zinc-500">Weighted Acceptance</p>
                            <p className="text-lg font-semibold text-cyan-300">{score(packet.weightedAcceptance)}</p>
                          </div>
                          <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
                            <p className="text-xs text-zinc-500">Gluon</p>
                            <p className="text-lg font-semibold text-violet-300">{score(packet.gluonEarned)}</p>
                          </div>
                          <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
                            <p className="text-xs text-zinc-500">Risk</p>
                            <p className="text-lg font-semibold text-yellow-300">{score(packet.riskScore)}</p>
                          </div>
                          <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
                            <p className="text-xs text-zinc-500">Compliance</p>
                            <p className="text-lg font-semibold text-emerald-300">{score(packet.complianceScore)}</p>
                          </div>
                        </div>

                        {(packetBlockers.length > 0 || packetWarnings.length > 0) && (
                          <div className="space-y-2">
                            {packetBlockers.map((item: any, index: number) => (
                              <div key={`blocker-${packet.id}-${index}`} className="flex items-start gap-2 text-xs text-red-300">
                                <XCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                                <span>{item.message || item.code}</span>
                              </div>
                            ))}
                            {packetWarnings.map((item: any, index: number) => (
                              <div key={`warning-${packet.id}-${index}`} className="flex items-start gap-2 text-xs text-yellow-300">
                                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                                <span>{item.message || item.code}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {preview.gluon && (
                          <div className="rounded-lg border border-violet-500/20 bg-violet-500/10 p-3 text-sm text-violet-100">
                            Gluon preview: {score(preview.gluon.amount)} · {preview.gluon.reasons?.[0]}
                          </div>
                        )}
                        {preview.dna && (
                          <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 p-3 text-sm text-cyan-100">
                            DNA preview created. Live genome mutated: {String(preview.dna.liveGenomeMutated)}
                          </div>
                        )}
                      </div>

                      <div className="w-full xl:w-72 space-y-3">
                        <Textarea
                          value={noteById[packet.id] || ""}
                          onChange={(event) => setNoteById((prev) => ({ ...prev, [packet.id]: event.target.value }))}
                          placeholder="Review note or challenge reason"
                          className="min-h-20 bg-black/30 border-white/10"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <Button variant="outline" className="border-white/10 bg-white/[0.03]" onClick={() => setSelectedPacketId(packet.id)}>
                            Details
                          </Button>
                          <Button variant="outline" className="border-violet-500/20 bg-violet-500/10 text-violet-200" onClick={() => gluonPreviewMutation.mutate(packet.id)}>
                            <Sparkles className="w-4 h-4" />
                            Gluon
                          </Button>
                          <Button variant="outline" className="border-cyan-500/20 bg-cyan-500/10 text-cyan-200" onClick={() => dnaPreviewMutation.mutate(packet.id)}>
                            <Dna className="w-4 h-4" />
                            DNA
                          </Button>
                          <Button variant="outline" className="border-yellow-500/20 bg-yellow-500/10 text-yellow-200" onClick={() => challengeMutation.mutate(packet.id)}>
                            Challenge
                          </Button>
                          <Button variant="outline" className="border-red-500/20 bg-red-500/10 text-red-200" onClick={() => rejectMutation.mutate(packet.id)}>
                            Reject
                          </Button>
                          <Button className="bg-emerald-600 hover:bg-emerald-500 text-white" disabled={!canAccept} onClick={() => acceptMutation.mutate(packet.id)}>
                            <CheckCircle2 className="w-4 h-4" />
                            Accept
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            <Card className="bg-[#10101a]/90 border-white/[0.08] p-5 h-fit sticky top-20">
              <h2 className="text-lg font-semibold">Selected Packet</h2>
              {!selectedPacketId ? (
                <p className="text-sm text-zinc-500 mt-3">Choose a packet to inspect acceptances, ledger entries, and mutation previews.</p>
              ) : detailQuery.isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-violet-300 mt-4" />
              ) : selected ? (
                <div className="space-y-4 mt-4">
                  <div>
                    <p className="text-xs text-zinc-500">Abstracted content</p>
                    <p className="text-sm text-zinc-300 mt-1 leading-6">{selected.abstractedContent}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3 text-center">
                      <p className="text-xs text-zinc-500">Accepted</p>
                      <p className="text-lg font-semibold text-emerald-300">{selected.acceptedByAgents}</p>
                    </div>
                    <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3 text-center">
                      <p className="text-xs text-zinc-500">Rejected</p>
                      <p className="text-lg font-semibold text-red-300">{selected.rejectedByAgents}</p>
                    </div>
                    <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3 text-center">
                      <p className="text-xs text-zinc-500">Challenged</p>
                      <p className="text-lg font-semibold text-yellow-300">{selected.challengedByAgents}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-2">Acceptances</p>
                    <div className="space-y-2">
                      {(selected.acceptances || []).slice(0, 5).map((item: any) => (
                        <div key={item.id} className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
                          <div className="flex items-center justify-between gap-2">
                            <Badge className={statusClass(item.decision)}>{item.decision}</Badge>
                            <span className="text-xs text-zinc-500">{score(item.weightedAcceptanceContribution)}</span>
                          </div>
                          <p className="text-xs text-zinc-500 mt-2">{item.acceptingAgentType} · {item.acceptingAgentId}</p>
                        </div>
                      ))}
                      {(selected.acceptances || []).length === 0 && <p className="text-sm text-zinc-500">No acceptance records yet.</p>}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-red-300 mt-3">Could not load selected packet.</p>
              )}
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

