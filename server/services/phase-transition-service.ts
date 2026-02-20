import { db } from "../db";
import {
  labsOpportunities, labsApps, labsInstallations, labsReferrals, labsCreatorRankings,
  labsFlywheelAnalytics, personalAgentConversations, personalAgentMessages,
  realityClaims, consensusRecords, superLoopCycles, superLoopMetrics,
  users,
} from "@shared/schema";
import { eq, desc, sql, gte, count, and, gt } from "drizzle-orm";

const AUTONOMY_THRESHOLDS = {
  externalAcquisition: { weight: 0.25, selfSustaining: 30 },
  creatorRepeatRate: { weight: 0.20, selfSustaining: 60 },
  revenueCostRatio: { weight: 0.25, selfSustaining: 200 },
  labsSuccessRate: { weight: 0.15, selfSustaining: 25 },
  appCreationFreq: { weight: 0.15, selfSustaining: 5 },
};

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function pctToward(current: number, target: number): number {
  return clamp((current / Math.max(target, 0.01)) * 100, 0, 100);
}

class PhaseTransitionService {

  async getTransitionIndex() {
    const metrics = await this.computeMetrics();
    const scores = this.scoreMetrics(metrics);
    const autonomyPct = this.computeAutonomyPercentage(scores);
    const phase = this.determinePhase(autonomyPct);
    const trend = await this.computeTrend();

    return {
      autonomyPercentage: Math.round(autonomyPct * 10) / 10,
      phase,
      metrics,
      scores,
      trend,
      selfSustaining: autonomyPct >= 80,
      indicators: this.getGrowthIndicators(metrics, scores),
    };
  }

  async computeMetrics() {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      referralSignups, totalSignups,
      totalCreators, repeatCreators,
      totalRevenue, totalAiCost,
      totalOpportunities, publishedApps,
      weekApps, prevWeekApps,
    ] = await Promise.all([
      db.select({ total: sql<number>`COALESCE(SUM(signups), 0)` })
        .from(labsReferrals).where(gte(labsReferrals.createdAt, monthAgo)),
      db.select({ cnt: count() }).from(users).where(gte(users.createdAt, monthAgo)),
      db.select({ cnt: count() }).from(labsCreatorRankings),
      db.select({ cnt: count() }).from(labsCreatorRankings)
        .where(and(gt(labsCreatorRankings.totalApps, 1), gte(labsCreatorRankings.lastActiveAt, weekAgo))),
      db.select({ total: sql<number>`COALESCE(SUM(total_revenue), 0)` }).from(labsFlywheelAnalytics),
      db.select({ total: sql<number>`COALESCE(SUM(total_installs * 5), 0)` }).from(labsFlywheelAnalytics),
      db.select({ cnt: count() }).from(labsOpportunities).where(gte(labsOpportunities.createdAt, monthAgo)),
      db.select({ cnt: count() }).from(labsApps).where(and(eq(labsApps.status, "published"), gte(labsApps.createdAt, monthAgo))),
      db.select({ cnt: count() }).from(labsApps).where(gte(labsApps.createdAt, weekAgo)),
      db.select({ cnt: count() }).from(labsApps)
        .where(and(gte(labsApps.createdAt, twoWeeksAgo), gte(labsApps.createdAt, twoWeeksAgo))),
    ]);

    const externalAcquisition = totalSignups[0].cnt > 0
      ? (Number(referralSignups[0].total) / totalSignups[0].cnt) * 100
      : 0;

    const creatorRepeatRate = totalCreators[0].cnt > 0
      ? (repeatCreators[0].cnt / totalCreators[0].cnt) * 100
      : 0;

    const aiCostValue = Math.max(Number(totalAiCost[0].total), 1);
    const revenueCostRatio = (Number(totalRevenue[0].total) / aiCostValue) * 100;

    const labsSuccessRate = totalOpportunities[0].cnt > 0
      ? (publishedApps[0].cnt / totalOpportunities[0].cnt) * 100
      : 0;

    const appCreationFreq = weekApps[0].cnt;

    return {
      externalAcquisition: Math.round(externalAcquisition * 10) / 10,
      creatorRepeatRate: Math.round(creatorRepeatRate * 10) / 10,
      revenueCostRatio: Math.round(revenueCostRatio * 10) / 10,
      labsSuccessRate: Math.round(labsSuccessRate * 10) / 10,
      appCreationFreq,
      raw: {
        referralSignups: Number(referralSignups[0].total),
        totalSignups: totalSignups[0].cnt,
        totalCreators: totalCreators[0].cnt,
        repeatCreators: repeatCreators[0].cnt,
        totalRevenue: Number(totalRevenue[0].total),
        estimatedAiCost: Number(totalAiCost[0].total),
        totalOpportunities: totalOpportunities[0].cnt,
        publishedApps: publishedApps[0].cnt,
        appsThisWeek: weekApps[0].cnt,
      },
    };
  }

  scoreMetrics(metrics: Awaited<ReturnType<typeof this.computeMetrics>>) {
    return {
      externalAcquisition: pctToward(metrics.externalAcquisition, AUTONOMY_THRESHOLDS.externalAcquisition.selfSustaining),
      creatorRepeatRate: pctToward(metrics.creatorRepeatRate, AUTONOMY_THRESHOLDS.creatorRepeatRate.selfSustaining),
      revenueCostRatio: pctToward(metrics.revenueCostRatio, AUTONOMY_THRESHOLDS.revenueCostRatio.selfSustaining),
      labsSuccessRate: pctToward(metrics.labsSuccessRate, AUTONOMY_THRESHOLDS.labsSuccessRate.selfSustaining),
      appCreationFreq: pctToward(metrics.appCreationFreq, AUTONOMY_THRESHOLDS.appCreationFreq.selfSustaining),
    };
  }

  computeAutonomyPercentage(scores: ReturnType<typeof this.scoreMetrics>): number {
    return (
      scores.externalAcquisition * AUTONOMY_THRESHOLDS.externalAcquisition.weight +
      scores.creatorRepeatRate * AUTONOMY_THRESHOLDS.creatorRepeatRate.weight +
      scores.revenueCostRatio * AUTONOMY_THRESHOLDS.revenueCostRatio.weight +
      scores.labsSuccessRate * AUTONOMY_THRESHOLDS.labsSuccessRate.weight +
      scores.appCreationFreq * AUTONOMY_THRESHOLDS.appCreationFreq.weight
    );
  }

  determinePhase(autonomyPct: number): { id: number; label: string; description: string } {
    if (autonomyPct >= 80) return { id: 4, label: "Autonomous Growth", description: "System is self-sustaining and profitable" };
    if (autonomyPct >= 50) return { id: 3, label: "Flywheel Ignition", description: "Growth begins to accelerate organically" };
    if (autonomyPct >= 25) return { id: 2, label: "Engagement Lock", description: "Users consistently returning and creating" };
    return { id: 1, label: "Engine Building", description: "Establishing core content and user loops" };
  }

  async computeTrend(): Promise<{ direction: string; delta: number }> {
    const metrics = await db.select().from(superLoopMetrics)
      .orderBy(desc(superLoopMetrics.date)).limit(2);

    if (metrics.length < 2) return { direction: "stable", delta: 0 };

    const recent = metrics[0].reinforcementScore || 0;
    const prev = metrics[1].reinforcementScore || 0;
    const delta = Math.round((recent - prev) * 100);

    if (delta > 2) return { direction: "improving", delta };
    if (delta < -2) return { direction: "declining", delta };
    return { direction: "stable", delta };
  }

  getGrowthIndicators(
    metrics: Awaited<ReturnType<typeof this.computeMetrics>>,
    scores: ReturnType<typeof this.scoreMetrics>
  ) {
    const indicators: { label: string; status: string; detail: string }[] = [];

    if (scores.externalAcquisition >= 80) {
      indicators.push({ label: "User Acquisition Self-Sustaining", status: "achieved", detail: `${metrics.externalAcquisition}% from referrals` });
    } else if (scores.externalAcquisition >= 40) {
      indicators.push({ label: "User Acquisition Growing", status: "progressing", detail: `${metrics.externalAcquisition}% from referrals (need ${AUTONOMY_THRESHOLDS.externalAcquisition.selfSustaining}%)` });
    } else {
      indicators.push({ label: "User Acquisition Dependent", status: "early", detail: "Most users from direct acquisition" });
    }

    if (scores.creatorRepeatRate >= 80) {
      indicators.push({ label: "Creator Loyalty Established", status: "achieved", detail: `${metrics.creatorRepeatRate}% repeat rate` });
    } else if (scores.creatorRepeatRate >= 40) {
      indicators.push({ label: "Creator Retention Building", status: "progressing", detail: `${metrics.creatorRepeatRate}% repeat rate` });
    } else {
      indicators.push({ label: "Creator Retention Low", status: "early", detail: "Creators not consistently active" });
    }

    if (scores.revenueCostRatio >= 80) {
      indicators.push({ label: "Revenue Exceeds AI Costs", status: "achieved", detail: `${metrics.revenueCostRatio}% ratio` });
    } else if (scores.revenueCostRatio >= 40) {
      indicators.push({ label: "Revenue Approaching Break-Even", status: "progressing", detail: `${metrics.revenueCostRatio}% of cost covered` });
    } else {
      indicators.push({ label: "Revenue Below AI Costs", status: "early", detail: "Need revenue growth to cover AI operations" });
    }

    if (scores.labsSuccessRate >= 80) {
      indicators.push({ label: "Labs Pipeline Efficient", status: "achieved", detail: `${metrics.labsSuccessRate}% opportunity-to-app rate` });
    } else if (scores.labsSuccessRate >= 40) {
      indicators.push({ label: "Labs Pipeline Active", status: "progressing", detail: `${metrics.labsSuccessRate}% conversion` });
    } else {
      indicators.push({ label: "Labs Pipeline Building", status: "early", detail: "Low opportunity conversion rate" });
    }

    if (scores.appCreationFreq >= 80) {
      indicators.push({ label: "App Creation Self-Sustaining", status: "achieved", detail: `${metrics.appCreationFreq} apps/week` });
    } else if (scores.appCreationFreq >= 40) {
      indicators.push({ label: "App Creation Growing", status: "progressing", detail: `${metrics.appCreationFreq} apps/week (need ${AUTONOMY_THRESHOLDS.appCreationFreq.selfSustaining})` });
    } else {
      indicators.push({ label: "App Creation Starting", status: "early", detail: `${metrics.appCreationFreq} apps this week` });
    }

    return indicators;
  }
}

export const phaseTransitionService = new PhaseTransitionService();
