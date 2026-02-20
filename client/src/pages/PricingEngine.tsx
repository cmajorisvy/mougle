import { Layout } from "@/components/layout/Layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Calculator, Cpu, Server, Wifi, HeadphonesIcon, IndianRupee,
  TrendingUp, AlertTriangle, CheckCircle2, XCircle, Sparkles,
  BarChart3, Shield, ArrowRight, Loader2, Code, Receipt,
  Globe, Package, FileCheck, ExternalLink, Download
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { getCurrentUserId } from "@/lib/mockData";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface CostItem {
  monthly: number;
  perUser: number;
  details: string;
}

interface GstCostItem extends CostItem {
  rate: number;
  itcApplied: boolean;
}

interface CostBreakdown {
  aiCompute: CostItem;
  hosting: CostItem;
  bandwidth: CostItem;
  support: CostItem;
  platformFee: CostItem;
  devAmortization: CostItem;
  gst: GstCostItem;
  totalPerUser: number;
  totalMonthly: number;
}

interface DevCostEstimate {
  replitAiHours: number;
  replitPlanCost: number;
  totalDevCost: number;
  gstOnDev: number;
  effectiveDevCost: number;
  amortizationMonths: number;
  monthlyAmortized: number;
}

interface AnalysisResult {
  id: string;
  analysis: {
    aiUsage: string;
    hostingTier: string;
    bandwidthTier: string;
    supportLevel: string;
  };
  costs: CostBreakdown;
  minimumPrice: number;
  recommendedPrice: number;
  targetMargin: number;
  pricingModel: string;
  estimatedUsers: number;
  warnings: string[];
  sustainable: boolean;
  devCostEstimate: DevCostEstimate;
  distributionNote: string;
}

interface ExportConfirmResult {
  exportId: string;
  status: string;
  message: string;
}

interface ExportPackageResult {
  exportId: string;
  appName: string;
  status: string;
  package: {
    type: string;
    includes: string[];
    deploymentOptions: { platform: string; guide: string }[];
    note: string;
  };
  legalNotice: string;
}

interface ValidationResult {
  valid: boolean;
  creatorSetPrice: number;
  minimumPrice: number;
  recommendedPrice: number;
  effectiveMargin: number;
  sustainable: boolean;
  warnings: string[];
}

const costIcons: Record<string, typeof Cpu> = {
  aiCompute: Cpu,
  hosting: Server,
  bandwidth: Wifi,
  support: HeadphonesIcon,
  platformFee: Shield,
  devAmortization: Code,
  gst: Receipt,
};

const costLabels: Record<string, string> = {
  aiCompute: "AI Compute",
  hosting: "Hosting",
  bandwidth: "Bandwidth",
  support: "Support",
  platformFee: "Platform Fee",
  devAmortization: "Dev Amortization",
  gst: "GST (18%)",
};

const costColors: Record<string, string> = {
  aiCompute: "text-violet-400",
  hosting: "text-blue-400",
  bandwidth: "text-emerald-400",
  support: "text-amber-400",
  platformFee: "text-rose-400",
  devAmortization: "text-cyan-400",
  gst: "text-orange-400",
};

const barColors: Record<string, string> = {
  aiCompute: "bg-violet-500",
  hosting: "bg-blue-500",
  bandwidth: "bg-emerald-500",
  support: "bg-amber-500",
  platformFee: "bg-rose-500",
  devAmortization: "bg-cyan-500",
  gst: "bg-orange-500",
};


export default function PricingEngine() {
  const [appPrompt, setAppPrompt] = useState("");
  const [appName, setAppName] = useState("");
  const [estimatedUsers, setEstimatedUsers] = useState(100);
  const [pricingModel, setPricingModel] = useState("subscription");
  const [devHours, setDevHours] = useState(40);
  const [gstItcEnabled, setGstItcEnabled] = useState(false);
  const [amortizationMonths, setAmortizationMonths] = useState(12);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [customPrice, setCustomPrice] = useState("");
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [exportConfirmed, setExportConfirmed] = useState(false);
  const [exportResult, setExportResult] = useState<ExportPackageResult | null>(null);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [disclaimerChecked, setDisclaimerChecked] = useState(false);

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/pricing-engine/analyze", {
        creatorId: getCurrentUserId() || "anonymous",
        appPrompt,
        appName: appName || undefined,
        estimatedUsers,
        pricingModel,
        devHours,
        gstItcEnabled,
        amortizationMonths,
      });
      return res.json();
    },
    onSuccess: (data: AnalysisResult) => {
      setResult(data);
      setCustomPrice("");
      setValidation(null);
      setExportConfirmed(false);
      setExportResult(null);
      setShowDisclaimer(false);
      setDisclaimerChecked(false);
    },
  });

  const validateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/pricing-engine/validate-price", {
        analysisId: result!.id,
        creatorSetPrice: Number(customPrice),
      });
      return res.json();
    },
    onSuccess: (data: ValidationResult) => {
      setValidation(data);
    },
  });

  const exportConfirmMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/app-export/confirm", {
        creatorId: getCurrentUserId() || "anonymous",
        appName: appName || "Untitled App",
        analysisId: result?.id,
        distributionAcknowledged: true,
        legalDisclaimerAccepted: true,
      });
      return res.json();
    },
    onSuccess: async (data: ExportConfirmResult) => {
      setExportConfirmed(true);
      const res = await apiRequest("POST", "/api/app-export/generate", { exportId: data.exportId });
      const pkg = await res.json();
      setExportResult(pkg);
      setShowDisclaimer(false);
    },
  });

  const allCostKeys = ["aiCompute", "hosting", "bandwidth", "support", "platformFee", "devAmortization", "gst"] as const;
  const maxCost = result ? Math.max(
    ...allCostKeys.map(k => (result.costs[k] as CostItem)?.perUser || 0),
    0.01
  ) : 1;

  return (
    <Layout>
      <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <Calculator className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Intelligent Pricing Engine</h1>
            <p className="text-zinc-400 text-sm">Sustainable pricing with India-based operational economics</p>
          </div>
        </div>

        <Card className="glass-card rounded-xl p-6 space-y-5" data-testid="section-prompt-input">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-300">App Name</label>
              <Input
                placeholder="My Awesome App"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                className="bg-zinc-900/60 border-zinc-700"
                data-testid="input-app-name"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-300">Pricing Model</label>
              <Select value={pricingModel} onValueChange={setPricingModel}>
                <SelectTrigger className="bg-zinc-900/60 border-zinc-700" data-testid="select-pricing-model">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="subscription">Monthly Subscription</SelectItem>
                  <SelectItem value="one_time">One-time Purchase</SelectItem>
                  <SelectItem value="usage">Usage-based</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-300">Describe your app</label>
            <Textarea
              placeholder="Describe what your app does, its features, and tech requirements. Example: An AI-powered SaaS dashboard that analyzes customer feedback using GPT, stores data in a database, and generates weekly reports with charts..."
              value={appPrompt}
              onChange={(e) => setAppPrompt(e.target.value)}
              rows={4}
              className="bg-zinc-900/60 border-zinc-700 resize-none"
              data-testid="input-app-prompt"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Estimated Users</label>
              <div className="flex items-center gap-3">
                <Slider
                  value={[estimatedUsers]}
                  onValueChange={([v]) => setEstimatedUsers(v)}
                  min={10}
                  max={10000}
                  step={10}
                  className="flex-1"
                  data-testid="slider-estimated-users"
                />
                <span className="text-sm font-mono text-zinc-300 w-16 text-right" data-testid="text-user-count">{estimatedUsers.toLocaleString()}</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Replit AI Dev Hours</label>
              <div className="flex items-center gap-3">
                <Slider
                  value={[devHours]}
                  onValueChange={([v]) => setDevHours(v)}
                  min={5}
                  max={500}
                  step={5}
                  className="flex-1"
                  data-testid="slider-dev-hours"
                />
                <span className="text-sm font-mono text-zinc-300 w-16 text-right" data-testid="text-dev-hours">{devHours}h</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Amortization Period</label>
              <Select value={String(amortizationMonths)} onValueChange={(v) => setAmortizationMonths(Number(v))}>
                <SelectTrigger className="bg-zinc-900/60 border-zinc-700" data-testid="select-amortization">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">6 months</SelectItem>
                  <SelectItem value="12">12 months</SelectItem>
                  <SelectItem value="18">18 months</SelectItem>
                  <SelectItem value="24">24 months</SelectItem>
                  <SelectItem value="36">36 months</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between bg-zinc-900/60 rounded-lg p-3 border border-zinc-700">
              <div>
                <p className="text-sm font-medium text-zinc-300">GST Input Tax Credit</p>
                <p className="text-xs text-zinc-500">If enabled, 18% GST is excluded from cost base</p>
              </div>
              <Switch
                checked={gstItcEnabled}
                onCheckedChange={setGstItcEnabled}
                data-testid="switch-gst-itc"
              />
            </div>
          </div>

          <Button
            onClick={() => analyzeMutation.mutate()}
            disabled={!appPrompt.trim() || analyzeMutation.isPending}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500"
            data-testid="button-analyze"
          >
            {analyzeMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" /> Analyze & Calculate Price</>
            )}
          </Button>
        </Card>

        {result && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-testid="section-price-summary">
              <Card className="glass-card rounded-xl p-5 border-zinc-700/50">
                <div className="flex items-center gap-2 mb-2">
                  <IndianRupee className="w-4 h-4 text-zinc-400" />
                  <span className="text-xs text-zinc-400 uppercase tracking-wider">Cost / User</span>
                </div>
                <p className="text-2xl font-bold text-zinc-200" data-testid="text-cost-per-user">
                  ₹{result.costs.totalPerUser.toFixed(2)}
                </p>
                <p className="text-xs text-zinc-500 mt-1">per user per month (incl. dev + GST)</p>
              </Card>

              <Card className="glass-card rounded-xl p-5 border-emerald-500/30 bg-emerald-500/5">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs text-emerald-400 uppercase tracking-wider">Minimum Price</span>
                </div>
                <p className="text-2xl font-bold text-emerald-300" data-testid="text-minimum-price">
                  ₹{result.minimumPrice}
                </p>
                <p className="text-xs text-zinc-500 mt-1">ensures 50% margin (Web)</p>
              </Card>

              <Card className="glass-card rounded-xl p-5 border-primary/30 bg-primary/5">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-xs text-primary uppercase tracking-wider">Recommended</span>
                </div>
                <p className="text-2xl font-bold text-primary" data-testid="text-recommended-price">
                  ₹{result.recommendedPrice}
                </p>
                <p className="text-xs text-zinc-500 mt-1">optimal for growth (Web)</p>
              </Card>
            </div>

            <Card className="glass-card rounded-xl p-6" data-testid="section-dev-cost">
              <div className="flex items-center gap-2 mb-4">
                <Code className="w-5 h-5 text-cyan-400" />
                <h2 className="text-lg font-semibold">Replit Development Cost</h2>
                {gstItcEnabled && (
                  <Badge className="bg-emerald-500/20 text-emerald-400 text-[10px] ml-auto">ITC Applied</Badge>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-zinc-900/60 rounded-lg p-3" data-testid="dev-ai-hours">
                  <p className="text-[11px] text-zinc-500 uppercase">AI Dev Hours</p>
                  <p className="text-lg font-bold font-mono">{result.devCostEstimate.replitAiHours}h</p>
                  <p className="text-[10px] text-zinc-600">@ ₹{25}/hr</p>
                </div>
                <div className="bg-zinc-900/60 rounded-lg p-3" data-testid="dev-total-cost">
                  <p className="text-[11px] text-zinc-500 uppercase">Dev Cost</p>
                  <p className="text-lg font-bold font-mono">₹{result.devCostEstimate.totalDevCost.toLocaleString()}</p>
                  <p className="text-[10px] text-zinc-600">AI usage + plan</p>
                </div>
                <div className="bg-zinc-900/60 rounded-lg p-3" data-testid="dev-gst">
                  <p className="text-[11px] text-zinc-500 uppercase">GST (18%)</p>
                  <p className={cn("text-lg font-bold font-mono", gstItcEnabled ? "text-zinc-500 line-through" : "text-orange-400")}>
                    ₹{result.devCostEstimate.gstOnDev.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-zinc-600">{gstItcEnabled ? "ITC credited" : "Added to cost"}</p>
                </div>
                <div className="bg-zinc-900/60 rounded-lg p-3" data-testid="dev-amortized">
                  <p className="text-[11px] text-zinc-500 uppercase">Monthly Amortized</p>
                  <p className="text-lg font-bold font-mono text-cyan-400">₹{result.devCostEstimate.monthlyAmortized.toLocaleString()}</p>
                  <p className="text-[10px] text-zinc-600">over {result.devCostEstimate.amortizationMonths} months</p>
                </div>
              </div>
            </Card>

            <Card className="glass-card rounded-xl p-6" data-testid="section-cost-breakdown">
              <div className="flex items-center gap-2 mb-5">
                <BarChart3 className="w-5 h-5 text-zinc-400" />
                <h2 className="text-lg font-semibold">Full Cost Breakdown</h2>
                <Badge variant="outline" className="ml-auto text-[10px] px-2 py-0.5">
                  {result.estimatedUsers.toLocaleString()} users
                </Badge>
              </div>

              <div className="space-y-4">
                {allCostKeys.map((key) => {
                  const item = result.costs[key] as CostItem;
                  if (!item) return null;
                  const Icon = costIcons[key];
                  const pct = maxCost > 0 ? (item.perUser / maxCost) * 100 : 0;
                  const isGstZero = key === "gst" && gstItcEnabled;
                  return (
                    <div key={key} className={cn("space-y-1.5", isGstZero && "opacity-50")} data-testid={`cost-item-${key}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className={cn("w-4 h-4", costColors[key])} />
                          <span className="text-sm font-medium">{costLabels[key]}</span>
                          {isGstZero && <Badge className="text-[9px] bg-emerald-500/20 text-emerald-400">ITC</Badge>}
                        </div>
                        <div className="text-right">
                          <span className={cn("text-sm font-mono font-semibold", isGstZero && "line-through")} data-testid={`cost-per-user-${key}`}>
                            ₹{item.perUser.toFixed(2)}
                          </span>
                          <span className="text-xs text-zinc-500 ml-1">/user</span>
                          <span className="text-xs text-zinc-600 ml-3">
                            ₹{item.monthly.toFixed(0)}/mo
                          </span>
                        </div>
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all", barColors[key])}
                          style={{ width: `${Math.max(isGstZero ? 0 : pct, 2)}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-zinc-500">{item.details}</p>
                    </div>
                  );
                })}

                <div className="border-t border-zinc-700/50 pt-3 mt-4 flex items-center justify-between">
                  <span className="text-sm font-semibold text-zinc-300">Total Cost / User / Month</span>
                  <span className="text-lg font-bold font-mono" data-testid="text-total-cost">
                    ₹{result.costs.totalPerUser.toFixed(2)}
                  </span>
                </div>
              </div>
            </Card>

            <Card className="glass-card rounded-xl p-6" data-testid="section-distribution">
              <div className="flex items-center gap-2 mb-4">
                <Globe className="w-5 h-5 text-blue-400" />
                <h2 className="text-lg font-semibold">External Distribution Responsibility</h2>
                <Badge className="bg-blue-500/20 text-blue-400 text-[10px] ml-auto">Infrastructure Only</Badge>
              </div>
              <div className="bg-zinc-900/60 rounded-lg p-4 border border-zinc-700/50 mb-4">
                <p className="text-sm text-zinc-300 leading-relaxed">
                  {result.distributionNote || "Dig8opia provides web app infrastructure only. External distribution (mobile stores, third-party platforms) is the creator's responsibility."}
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-zinc-900/40 rounded-lg p-3 border border-zinc-800" data-testid="dist-platform-provided">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-medium text-emerald-300">What Dig8opia Provides</span>
                  </div>
                  <ul className="space-y-1 text-xs text-zinc-400">
                    <li className="flex items-start gap-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" /> Web app hosting and infrastructure</li>
                    <li className="flex items-start gap-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" /> Pricing analysis and sustainability checks</li>
                    <li className="flex items-start gap-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" /> Exportable web app packages</li>
                    <li className="flex items-start gap-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" /> Marketplace listing on Dig8opia</li>
                  </ul>
                </div>
                <div className="bg-zinc-900/40 rounded-lg p-3 border border-zinc-800" data-testid="dist-creator-responsible">
                  <div className="flex items-center gap-2 mb-2">
                    <FileCheck className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-medium text-amber-300">Creator Responsibility</span>
                  </div>
                  <ul className="space-y-1 text-xs text-zinc-400">
                    <li className="flex items-start gap-1.5"><ArrowRight className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" /> Publishing to external platforms (Play Store, App Store, etc.)</li>
                    <li className="flex items-start gap-1.5"><ArrowRight className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" /> Store commissions and developer account fees</li>
                    <li className="flex items-start gap-1.5"><ArrowRight className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" /> Compliance with platform policies and regulations</li>
                    <li className="flex items-start gap-1.5"><ArrowRight className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" /> End-user support and data privacy compliance</li>
                  </ul>
                </div>
              </div>
            </Card>

            <Card className="glass-card rounded-xl p-6" data-testid="section-export">
              <div className="flex items-center gap-2 mb-4">
                <Download className="w-5 h-5 text-cyan-400" />
                <h2 className="text-lg font-semibold">Export Web App Package</h2>
              </div>

              {!exportConfirmed && !showDisclaimer && (
                <div className="space-y-3">
                  <p className="text-sm text-zinc-400">
                    Export your web app package for independent deployment. You must acknowledge the external distribution responsibility before exporting.
                  </p>
                  <Button
                    onClick={() => { setShowDisclaimer(true); setDisclaimerChecked(false); }}
                    className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500"
                    data-testid="button-start-export"
                  >
                    <Package className="w-4 h-4 mr-2" /> Begin Export Process
                  </Button>
                </div>
              )}

              {showDisclaimer && !exportConfirmed && (
                <div className="space-y-4">
                  <div className="bg-zinc-900/80 rounded-lg p-4 border border-amber-500/30 max-h-48 overflow-y-auto text-xs text-zinc-400 leading-relaxed whitespace-pre-line" data-testid="text-disclaimer">
                    {`EXTERNAL DISTRIBUTION RESPONSIBILITY ACKNOWLEDGMENT

By exporting this application from Dig8opia, I ("Creator") acknowledge and agree:

1. INFRASTRUCTURE PROVIDER ONLY: Dig8opia acts solely as an infrastructure and development platform.

2. CREATOR RESPONSIBILITY: I am solely responsible for publishing, distributing, and operating the exported app on any external platform.

3. NO LIABILITY: Dig8opia shall not be liable for any issues arising from external distribution.

4. INDEMNIFICATION: I agree to indemnify and hold Dig8opia harmless from any claims arising from my distribution of the exported application.

5. NO GUARANTEES: Dig8opia makes no guarantees about the exported app's compatibility or acceptance on any external platform.`}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={disclaimerChecked}
                      onCheckedChange={setDisclaimerChecked}
                      data-testid="switch-disclaimer-accept"
                    />
                    <label className="text-sm text-zinc-300">
                      I acknowledge and accept the External Distribution Responsibility terms
                    </label>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => exportConfirmMutation.mutate()}
                      disabled={!disclaimerChecked || exportConfirmMutation.isPending}
                      className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500"
                      data-testid="button-confirm-export"
                    >
                      {exportConfirmMutation.isPending ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                      ) : (
                        <><FileCheck className="w-4 h-4 mr-2" /> Confirm & Export</>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowDisclaimer(false)}
                      className="border-zinc-700"
                      data-testid="button-cancel-export"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {exportResult && (
                <div className="space-y-4" data-testid="section-export-result">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-semibold">Export Package Ready</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {exportResult.package.includes.map((item) => (
                      <div key={item} className="bg-zinc-900/60 rounded-lg p-2 text-xs text-zinc-300 flex items-center gap-2" data-testid={`export-include-${item}`}>
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                        {item.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-zinc-500 uppercase font-medium">Deployment Options</p>
                    {exportResult.package.deploymentOptions.map((opt) => (
                      <div key={opt.platform} className="flex items-center justify-between bg-zinc-900/40 rounded-lg p-2 border border-zinc-800" data-testid={`deploy-option-${opt.platform.toLowerCase()}`}>
                        <div className="flex items-center gap-2">
                          <ExternalLink className="w-3 h-3 text-cyan-400" />
                          <span className="text-sm font-medium">{opt.platform}</span>
                        </div>
                        <span className="text-xs text-zinc-500">{opt.guide}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-zinc-600 bg-zinc-900/40 rounded p-2">
                    {exportResult.package.note}
                  </p>
                </div>
              )}
            </Card>

            <Card className="glass-card rounded-xl p-6 space-y-4" data-testid="section-detected-profile">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Cpu className="w-5 h-5 text-zinc-400" />
                Detected App Profile
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "AI Usage", value: result.analysis.aiUsage, color: "text-violet-400" },
                  { label: "Hosting", value: result.analysis.hostingTier, color: "text-blue-400" },
                  { label: "Bandwidth", value: result.analysis.bandwidthTier, color: "text-emerald-400" },
                  { label: "Support", value: result.analysis.supportLevel.replace("_", " "), color: "text-amber-400" },
                ].map((p) => (
                  <div key={p.label} className="bg-zinc-900/60 rounded-lg p-3 text-center" data-testid={`profile-${p.label.toLowerCase().replace(" ", "-")}`}>
                    <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1">{p.label}</p>
                    <p className={cn("text-sm font-semibold capitalize", p.color)}>{p.value}</p>
                  </div>
                ))}
              </div>
            </Card>

            {result.warnings.length > 0 && (
              <Card className="glass-card rounded-xl p-5 border-amber-500/30 bg-amber-500/5" data-testid="section-warnings">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  <h3 className="font-semibold text-amber-300">Warnings</h3>
                </div>
                <ul className="space-y-2">
                  {result.warnings.map((w, i) => (
                    <li key={i} className="text-sm text-amber-200/80 flex items-start gap-2">
                      <span className="text-amber-500 mt-0.5">•</span>
                      {w}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            <Card className="glass-card rounded-xl p-6 space-y-4" data-testid="section-set-price">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <IndianRupee className="w-5 h-5 text-zinc-400" />
                Set Your Price
              </h2>
              <p className="text-sm text-zinc-400">
                You can set any price at or above the minimum (₹{result.minimumPrice}).
                Prices below minimum will be blocked to ensure sustainability.
              </p>
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">₹</span>
                  <Input
                    type="number"
                    min={1}
                    value={customPrice}
                    onChange={(e) => { setCustomPrice(e.target.value); setValidation(null); }}
                    placeholder={String(result.recommendedPrice)}
                    className="bg-zinc-900/60 border-zinc-700 pl-7"
                    data-testid="input-custom-price"
                  />
                </div>
                <Button
                  onClick={() => validateMutation.mutate()}
                  disabled={!customPrice || validateMutation.isPending}
                  variant="outline"
                  className="border-zinc-700"
                  data-testid="button-validate-price"
                >
                  {validateMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>Validate <ArrowRight className="w-4 h-4 ml-1" /></>
                  )}
                </Button>
              </div>

              {validation && (
                <div className={cn(
                  "rounded-lg p-4 border",
                  validation.valid
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-red-500/30 bg-red-500/5"
                )} data-testid="section-validation-result">
                  <div className="flex items-center gap-2 mb-2">
                    {validation.valid ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-400" />
                    )}
                    <span className={cn("font-semibold", validation.valid ? "text-emerald-300" : "text-red-300")}>
                      {validation.valid ? "Price Approved" : "Price Below Minimum"}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-3">
                    <div className="text-center">
                      <p className="text-[11px] text-zinc-500 uppercase">Your Price</p>
                      <p className="text-lg font-bold" data-testid="text-validated-price">₹{validation.creatorSetPrice}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[11px] text-zinc-500 uppercase">Margin</p>
                      <p className={cn("text-lg font-bold", validation.effectiveMargin >= 50 ? "text-emerald-400" : validation.effectiveMargin >= 30 ? "text-amber-400" : "text-red-400")} data-testid="text-margin">
                        {validation.effectiveMargin}%
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[11px] text-zinc-500 uppercase">Status</p>
                      <Badge className={cn("mt-1", validation.sustainable ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400")} data-testid="badge-sustainability">
                        {validation.sustainable ? "Sustainable" : "Unsustainable"}
                      </Badge>
                    </div>
                  </div>
                  {validation.warnings.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {validation.warnings.map((w, i) => (
                        <p key={i} className="text-xs text-amber-300/80 flex items-start gap-1">
                          <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" /> {w}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>

            <div className="text-center text-xs text-zinc-600 pb-4" data-testid="section-footer">
              Pricing includes Replit AI development cost amortization + 18% Indian GST.
              Dig8opia is an infrastructure provider only. External distribution responsibility lies with the creator.
              Creators keep 70% of revenue through Razorpay Route split.
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
