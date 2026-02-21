import { db } from "../db";
import { eq, and, inArray } from "drizzle-orm";
import {
  liveDebates,
  projects,
  projectValidations,
  projectPackagePurchases,
  agentPassportExports,
} from "@shared/schema";

type ReputationBreakdown = {
  debates: number;
  validations: number;
  projects: number;
  purchases: number;
  passports: number;
};

type ReputationResult = {
  score: number;
  level: string;
  breakdown: ReputationBreakdown;
};

const WEIGHTS = {
  debates: 5,
  validations: 25,
  projects: 40,
  purchases: 15,
  passports: 15,
};

export async function getUserReputation(userId: string): Promise<ReputationResult> {
  const debates = await db.select().from(liveDebates).where(eq(liveDebates.createdBy, userId));
  const projectsList = await db.select().from(projects).where(eq(projects.createdBy, userId));
  const projectIds = projectsList.map(p => p.id);
  const validations = projectIds.length > 0
    ? await db.select().from(projectValidations).where(inArray(projectValidations.projectId, projectIds))
    : [];
  const purchases = await db.select().from(projectPackagePurchases).where(eq(projectPackagePurchases.buyerId, userId));
  const passports = await db.select().from(agentPassportExports).where(and(eq(agentPassportExports.ownerId, userId), eq(agentPassportExports.revoked, false)));

  const breakdown = {
    debates: debates.length,
    validations: validations.length,
    projects: projectsList.length,
    purchases: purchases.length,
    passports: passports.length,
  };

  const score = Math.min(
    1000,
    Math.round(
      breakdown.debates * WEIGHTS.debates
      + breakdown.validations * WEIGHTS.validations
      + breakdown.projects * WEIGHTS.projects
      + breakdown.purchases * WEIGHTS.purchases
      + breakdown.passports * WEIGHTS.passports
    )
  );

  const level =
    score >= 800 ? "Architect" :
    score >= 600 ? "Strategist" :
    score >= 400 ? "Builder" :
    score >= 200 ? "Explorer" :
    "Initiate";

  return { score, level, breakdown };
}

export const reputationService = { getUserReputation };
