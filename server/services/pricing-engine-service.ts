import { db } from "../db";
import { pricingAnalyses } from "@shared/schema";
import { eq } from "drizzle-orm";

interface AppAnalysis {
  aiUsage: "none" | "light" | "moderate" | "heavy" | "intensive";
  hostingTier: "static" | "basic" | "standard" | "compute" | "gpu";
  bandwidthTier: "minimal" | "light" | "moderate" | "heavy" | "streaming";
  supportLevel: "self_serve" | "community" | "email" | "priority" | "dedicated";
}

interface CostBreakdown {
  aiCompute: { monthly: number; perUser: number; details: string };
  hosting: { monthly: number; perUser: number; details: string };
  bandwidth: { monthly: number; perUser: number; details: string };
  support: { monthly: number; perUser: number; details: string };
  platformFee: { monthly: number; perUser: number; details: string };
  devAmortization: { monthly: number; perUser: number; details: string };
  gst: { monthly: number; perUser: number; details: string; rate: number; itcApplied: boolean };
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

const GST_RATE = 0.18;

const REPLIT_COST_PER_AI_HOUR = 25;
const REPLIT_PLAN_MONTHLY = 1500;

const DEV_HOURS_BY_COMPLEXITY: Record<string, number> = {
  none: 20,
  light: 40,
  moderate: 80,
  heavy: 150,
  intensive: 300,
};

const AI_COST_MAP: Record<string, { perUser: number; details: string }> = {
  none: { perUser: 0, details: "No AI features — zero compute cost" },
  light: { perUser: 0.50, details: "Basic text generation, ~100 API calls/user/month" },
  moderate: { perUser: 2.00, details: "Regular AI features, ~500 API calls/user/month" },
  heavy: { perUser: 5.00, details: "Advanced AI (vision, long context), ~2000 calls/user/month" },
  intensive: { perUser: 15.00, details: "Real-time AI, fine-tuning, or GPU workloads" },
};

const HOSTING_COST_MAP: Record<string, { base: number; perUser: number; details: string }> = {
  static: { base: 5, perUser: 0.01, details: "Static site — CDN-hosted, minimal server" },
  basic: { base: 15, perUser: 0.05, details: "Basic server — light API, small database" },
  standard: { base: 40, perUser: 0.15, details: "Standard app — API server, database, caching" },
  compute: { base: 100, perUser: 0.40, details: "Compute-intensive — background jobs, media processing" },
  gpu: { base: 300, perUser: 1.00, details: "GPU workloads — ML inference, real-time processing" },
};

const BANDWIDTH_COST_MAP: Record<string, { perUser: number; details: string }> = {
  minimal: { perUser: 0.02, details: "Text-only, <10MB/user/month" },
  light: { perUser: 0.10, details: "Some images, ~100MB/user/month" },
  moderate: { perUser: 0.30, details: "Rich media, ~500MB/user/month" },
  heavy: { perUser: 0.80, details: "File uploads/downloads, ~2GB/user/month" },
  streaming: { perUser: 2.00, details: "Video/audio streaming, ~5GB+/user/month" },
};

const SUPPORT_COST_MAP: Record<string, { perUser: number; details: string }> = {
  self_serve: { perUser: 0, details: "Documentation and FAQ only" },
  community: { perUser: 0.10, details: "Community forum + automated responses" },
  email: { perUser: 0.50, details: "Email support with 48h SLA" },
  priority: { perUser: 1.50, details: "Priority support with 12h SLA" },
  dedicated: { perUser: 5.00, details: "Dedicated support with 4h SLA" },
};

const AI_KEYWORDS: Record<string, string[]> = {
  intensive: ["real-time ai", "fine-tune", "gpu", "train model", "ml pipeline", "deep learning", "neural network", "image generation", "video generation"],
  heavy: ["ai agent", "chatbot", "vision", "image analysis", "ai assistant", "long context", "rag", "embeddings", "vector search", "ai-powered"],
  moderate: ["ai summary", "ai suggest", "ai recommend", "openai", "gpt", "claude", "llm", "text generation", "ai insights", "smart search"],
  light: ["autocomplete", "ai tag", "sentiment", "classify", "ai label", "spell check"],
};

const HOSTING_KEYWORDS: Record<string, string[]> = {
  gpu: ["ml inference", "gpu compute", "real-time model", "tensorflow", "pytorch", "cuda"],
  compute: ["video processing", "media conversion", "background job", "cron", "queue", "worker", "batch processing", "data pipeline"],
  standard: ["api", "database", "crud", "dashboard", "user account", "auth", "payment", "e-commerce", "saas"],
  basic: ["blog", "portfolio", "simple app", "landing page with api", "form", "contact"],
};

const BANDWIDTH_KEYWORDS: Record<string, string[]> = {
  streaming: ["video stream", "audio stream", "live stream", "media player", "podcast", "youtube", "video call"],
  heavy: ["file upload", "file sharing", "cloud storage", "document management", "media library", "photo gallery"],
  moderate: ["images", "thumbnails", "rich content", "charts", "reports", "export"],
  light: ["text", "simple ui", "minimal images"],
};

function analyzePrompt(prompt: string): AppAnalysis {
  const lower = prompt.toLowerCase();

  let aiUsage: AppAnalysis["aiUsage"] = "none";
  for (const [level, keywords] of Object.entries(AI_KEYWORDS)) {
    if (keywords.some(k => lower.includes(k))) {
      aiUsage = level as AppAnalysis["aiUsage"];
      break;
    }
  }

  let hostingTier: AppAnalysis["hostingTier"] = "static";
  for (const [tier, keywords] of Object.entries(HOSTING_KEYWORDS)) {
    if (keywords.some(k => lower.includes(k))) {
      hostingTier = tier as AppAnalysis["hostingTier"];
      break;
    }
  }
  if (hostingTier === "static" && (lower.includes("app") || lower.includes("platform") || lower.includes("tool"))) {
    hostingTier = "basic";
  }

  let bandwidthTier: AppAnalysis["bandwidthTier"] = "minimal";
  for (const [tier, keywords] of Object.entries(BANDWIDTH_KEYWORDS)) {
    if (keywords.some(k => lower.includes(k))) {
      bandwidthTier = tier as AppAnalysis["bandwidthTier"];
      break;
    }
  }

  let supportLevel: AppAnalysis["supportLevel"] = "self_serve";
  if (lower.includes("enterprise") || lower.includes("dedicated support")) supportLevel = "dedicated";
  else if (lower.includes("priority") || lower.includes("premium")) supportLevel = "priority";
  else if (lower.includes("support") || lower.includes("help desk")) supportLevel = "email";
  else if (lower.includes("community") || lower.includes("forum")) supportLevel = "community";

  return { aiUsage, hostingTier, bandwidthTier, supportLevel };
}

function estimateDevCost(analysis: AppAnalysis, devHoursOverride?: number, gstItcEnabled = false, amortizationMonths = 12): DevCostEstimate {
  const replitAiHours = devHoursOverride || DEV_HOURS_BY_COMPLEXITY[analysis.aiUsage] || 40;
  const aiUsageCost = replitAiHours * REPLIT_COST_PER_AI_HOUR;
  const replitPlanCost = REPLIT_PLAN_MONTHLY * Math.ceil(replitAiHours / 160);
  const totalDevCost = aiUsageCost + replitPlanCost;
  const gstOnDev = Math.round(totalDevCost * GST_RATE * 100) / 100;
  const effectiveDevCost = gstItcEnabled ? totalDevCost : totalDevCost + gstOnDev;
  const monthlyAmortized = Math.round((effectiveDevCost / amortizationMonths) * 100) / 100;

  return {
    replitAiHours,
    replitPlanCost,
    totalDevCost,
    gstOnDev,
    effectiveDevCost,
    amortizationMonths,
    monthlyAmortized,
  };
}

function calculateCosts(
  analysis: AppAnalysis,
  estimatedUsers: number,
  devHoursOverride?: number,
  gstItcEnabled = false,
  amortizationMonths = 12
): CostBreakdown {
  const ai = AI_COST_MAP[analysis.aiUsage];
  const hosting = HOSTING_COST_MAP[analysis.hostingTier];
  const bandwidth = BANDWIDTH_COST_MAP[analysis.bandwidthTier];
  const support = SUPPORT_COST_MAP[analysis.supportLevel];

  const platformFeePerUser = 0.30;

  const aiMonthly = ai.perUser * estimatedUsers;
  const hostingMonthly = hosting.base + hosting.perUser * estimatedUsers;
  const bandwidthMonthly = bandwidth.perUser * estimatedUsers;
  const supportMonthly = support.perUser * estimatedUsers;
  const platformFeeMonthly = platformFeePerUser * estimatedUsers;

  const operationalSubtotal = aiMonthly + hostingMonthly + bandwidthMonthly + supportMonthly + platformFeeMonthly;

  const dev = estimateDevCost(analysis, devHoursOverride, gstItcEnabled, amortizationMonths);
  const devAmortizationMonthly = dev.monthlyAmortized;
  const devAmortizationPerUser = Math.round((devAmortizationMonthly / estimatedUsers) * 100) / 100;

  const gstOnOperational = Math.round(operationalSubtotal * GST_RATE * 100) / 100;
  const effectiveGst = gstItcEnabled ? 0 : gstOnOperational;
  const gstPerUser = Math.round((effectiveGst / estimatedUsers) * 100) / 100;

  const totalMonthly = operationalSubtotal + devAmortizationMonthly + effectiveGst;
  const totalPerUser = Math.round((totalMonthly / estimatedUsers) * 100) / 100;

  return {
    aiCompute: { monthly: Math.round(aiMonthly * 100) / 100, perUser: ai.perUser, details: ai.details },
    hosting: { monthly: Math.round(hostingMonthly * 100) / 100, perUser: Math.round((hosting.base / estimatedUsers + hosting.perUser) * 100) / 100, details: hosting.details },
    bandwidth: { monthly: Math.round(bandwidthMonthly * 100) / 100, perUser: bandwidth.perUser, details: bandwidth.details },
    support: { monthly: Math.round(supportMonthly * 100) / 100, perUser: support.perUser, details: support.details },
    platformFee: { monthly: Math.round(platformFeeMonthly * 100) / 100, perUser: platformFeePerUser, details: "Mougle platform fee (infrastructure, marketplace, billing)" },
    devAmortization: { monthly: devAmortizationMonthly, perUser: devAmortizationPerUser, details: `Replit AI dev cost (${dev.replitAiHours}hrs) amortized over ${amortizationMonths} months` },
    gst: {
      monthly: effectiveGst,
      perUser: gstPerUser,
      details: gstItcEnabled
        ? "GST Input Tax Credit applied — GST excluded from cost base"
        : `18% GST on operational expenses (₹${Math.round(gstOnOperational)}/mo). Dev GST (₹${Math.round(dev.gstOnDev)}) included in amortization.`,
      rate: GST_RATE,
      itcApplied: gstItcEnabled,
    },
    totalPerUser,
    totalMonthly: Math.round(totalMonthly * 100) / 100,
  };
}

function calculatePricing(costs: CostBreakdown, targetMargin: number) {
  const minimumPrice = Math.ceil(costs.totalPerUser / (1 - targetMargin));
  const recommendedPrice = Math.ceil(minimumPrice * 1.2);

  return {
    minimumPrice: Math.max(minimumPrice, 1),
    recommendedPrice: Math.max(recommendedPrice, 2),
  };
}

export const pricingEngineService = {
  async analyzeApp(params: {
    creatorId: string;
    appPrompt: string;
    appName?: string;
    appId?: string;
    estimatedUsers?: number;
    targetMargin?: number;
    pricingModel?: string;
    devHours?: number;
    gstItcEnabled?: boolean;
    amortizationMonths?: number;
  }) {
    const estimatedUsers = params.estimatedUsers || 100;
    const targetMargin = params.targetMargin || 0.5;
    const pricingModel = params.pricingModel || "subscription";

    const analysis = analyzePrompt(params.appPrompt);
    const costs = calculateCosts(analysis, estimatedUsers, params.devHours, params.gstItcEnabled || false, params.amortizationMonths || 12);
    const { minimumPrice, recommendedPrice } = calculatePricing(costs, targetMargin);
    const devCostEstimate = estimateDevCost(analysis, params.devHours, params.gstItcEnabled || false, params.amortizationMonths || 12);

    const warnings: string[] = [];
    if (analysis.aiUsage === "intensive") {
      warnings.push("Intensive AI usage detected — costs may vary significantly with usage patterns.");
    }
    if (costs.totalPerUser > 10) {
      warnings.push("High per-user cost detected. Consider optimizing AI calls or reducing compute requirements.");
    }
    if (analysis.hostingTier === "gpu") {
      warnings.push("GPU hosting is expensive. Ensure your revenue model supports the infrastructure cost.");
    }

    const [saved] = await db.insert(pricingAnalyses).values({
      appId: params.appId || null,
      creatorId: params.creatorId,
      appPrompt: params.appPrompt,
      appName: params.appName || null,
      costBreakdown: costs,
      targetMargin,
      minimumPrice,
      recommendedPrice,
      pricingModel,
      estimatedUsers,
      sustainable: true,
      warnings: warnings.length > 0 ? warnings : null,
    }).returning();

    return {
      id: saved.id,
      analysis,
      costs,
      minimumPrice,
      recommendedPrice,
      targetMargin,
      pricingModel,
      estimatedUsers,
      warnings,
      sustainable: true,
      devCostEstimate,
      distributionNote: "Mougle provides web app infrastructure only. External distribution (mobile stores, third-party platforms) is the creator's responsibility.",
    };
  },

  async getAnalysis(analysisId: string) {
    const [analysis] = await db.select().from(pricingAnalyses).where(eq(pricingAnalyses.id, analysisId));
    return analysis || null;
  },

  async getAnalysesByCreator(creatorId: string) {
    return db.select().from(pricingAnalyses).where(eq(pricingAnalyses.creatorId, creatorId));
  },

  async validatePrice(params: { analysisId: string; creatorSetPrice: number }) {
    const [analysis] = await db.select().from(pricingAnalyses).where(eq(pricingAnalyses.id, params.analysisId));
    if (!analysis) return { valid: false, error: "Analysis not found" };

    const isBelowMinimum = params.creatorSetPrice < analysis.minimumPrice;
    const effectiveMargin = 1 - (analysis.costBreakdown as CostBreakdown).totalPerUser / params.creatorSetPrice;

    const warnings: string[] = [];
    if (isBelowMinimum) {
      warnings.push(`Price ₹${params.creatorSetPrice} is below minimum sustainable price ₹${analysis.minimumPrice}. Publishing will be blocked.`);
    }
    if (effectiveMargin < 0.3 && !isBelowMinimum) {
      warnings.push(`Margin is only ${Math.round(effectiveMargin * 100)}%, which is below the recommended 50%.`);
    }

    if (!isBelowMinimum) {
      await db.update(pricingAnalyses)
        .set({ creatorSetPrice: params.creatorSetPrice, sustainable: true, updatedAt: new Date() })
        .where(eq(pricingAnalyses.id, params.analysisId));
    }

    return {
      valid: !isBelowMinimum,
      creatorSetPrice: params.creatorSetPrice,
      minimumPrice: analysis.minimumPrice,
      recommendedPrice: analysis.recommendedPrice,
      effectiveMargin: Math.round(effectiveMargin * 100),
      sustainable: !isBelowMinimum,
      warnings,
    };
  },

  analyzePromptOnly(prompt: string, estimatedUsers = 100, targetMargin = 0.5, devHours?: number, gstItcEnabled = false, amortizationMonths = 12) {
    const analysis = analyzePrompt(prompt);
    const costs = calculateCosts(analysis, estimatedUsers, devHours, gstItcEnabled, amortizationMonths);
    const { minimumPrice, recommendedPrice } = calculatePricing(costs, targetMargin);
    const devCostEstimate = estimateDevCost(analysis, devHours, gstItcEnabled, amortizationMonths);
    return { analysis, costs, minimumPrice, recommendedPrice, devCostEstimate };
  },
};
