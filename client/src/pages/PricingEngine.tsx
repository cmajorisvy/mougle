import { Layout } from "@/components/layout/Layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Calculator, Cpu, Server, Wifi, HeadphonesIcon, IndianRupee,
  TrendingUp, AlertTriangle, CheckCircle2, XCircle, Sparkles,
  BarChart3, Shield, ArrowRight, Loader2
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

interface CostBreakdown {
  aiCompute: CostItem;
  hosting: CostItem;
  bandwidth: CostItem;
  support: CostItem;
  platformFee: CostItem;
  totalPerUser: number;
  totalMonthly: number;
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
};

const costLabels: Record<string, string> = {
  aiCompute: "AI Compute",
  hosting: "Hosting",
  bandwidth: "Bandwidth",
  support: "Support",
  platformFee: "Platform Fee",
};

const costColors: Record<string, string> = {
  aiCompute: "text-violet-400",
  hosting: "text-blue-400",
  bandwidth: "text-emerald-400",
  support: "text-amber-400",
  platformFee: "text-rose-400",
};

const barColors: Record<string, string> = {
  aiCompute: "bg-violet-500",
  hosting: "bg-blue-500",
  bandwidth: "bg-emerald-500",
  support: "bg-amber-500",
  platformFee: "bg-rose-500",
};

export default function PricingEngine() {
  const [appPrompt, setAppPrompt] = useState("");
  const [appName, setAppName] = useState("");
  const [estimatedUsers, setEstimatedUsers] = useState(100);
  const [pricingModel, setPricingModel] = useState("subscription");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [customPrice, setCustomPrice] = useState("");
  const [validation, setValidation] = useState<ValidationResult | null>(null);

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/pricing-engine/analyze", {
        creatorId: getCurrentUserId() || "anonymous",
        appPrompt,
        appName: appName || undefined,
        estimatedUsers,
        pricingModel,
      });
      return res.json();
    },
    onSuccess: (data: AnalysisResult) => {
      setResult(data);
      setCustomPrice("");
      setValidation(null);
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

  const maxCost = result ? Math.max(
    result.costs.aiCompute.perUser,
    result.costs.hosting.perUser,
    result.costs.bandwidth.perUser,
    result.costs.support.perUser,
    result.costs.platformFee.perUser,
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
            <p className="text-zinc-400 text-sm">Calculate sustainable pricing for your Labs app</p>
          </div>
        </div>

        <Card className="glass-card rounded-xl p-6 space-y-5" data-testid="section-prompt-input">
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
                <p className="text-xs text-zinc-500 mt-1">per user per month</p>
              </Card>

              <Card className="glass-card rounded-xl p-5 border-emerald-500/30 bg-emerald-500/5">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs text-emerald-400 uppercase tracking-wider">Minimum Price</span>
                </div>
                <p className="text-2xl font-bold text-emerald-300" data-testid="text-minimum-price">
                  ₹{result.minimumPrice}
                </p>
                <p className="text-xs text-zinc-500 mt-1">ensures 50% margin</p>
              </Card>

              <Card className="glass-card rounded-xl p-5 border-primary/30 bg-primary/5">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-xs text-primary uppercase tracking-wider">Recommended</span>
                </div>
                <p className="text-2xl font-bold text-primary" data-testid="text-recommended-price">
                  ₹{result.recommendedPrice}
                </p>
                <p className="text-xs text-zinc-500 mt-1">optimal for growth</p>
              </Card>
            </div>

            <Card className="glass-card rounded-xl p-6" data-testid="section-cost-breakdown">
              <div className="flex items-center gap-2 mb-5">
                <BarChart3 className="w-5 h-5 text-zinc-400" />
                <h2 className="text-lg font-semibold">Cost Breakdown</h2>
                <Badge variant="outline" className="ml-auto text-[10px] px-2 py-0.5">
                  {result.estimatedUsers.toLocaleString()} users
                </Badge>
              </div>

              <div className="space-y-4">
                {(["aiCompute", "hosting", "bandwidth", "support", "platformFee"] as const).map((key) => {
                  const item = result.costs[key];
                  const Icon = costIcons[key];
                  const pct = maxCost > 0 ? (item.perUser / maxCost) * 100 : 0;
                  return (
                    <div key={key} className="space-y-1.5" data-testid={`cost-item-${key}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className={cn("w-4 h-4", costColors[key])} />
                          <span className="text-sm font-medium">{costLabels[key]}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-mono font-semibold" data-testid={`cost-per-user-${key}`}>
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
                          style={{ width: `${Math.max(pct, 2)}%` }}
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
              Pricing engine ensures minimum 50% margin after operational costs.
              Creators keep 70% of revenue through Razorpay Route split.
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
