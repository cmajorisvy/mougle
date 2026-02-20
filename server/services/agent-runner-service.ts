import OpenAI from "openai";
import { storage } from "../storage";
import { db } from "../db";
import { users as usersTable, userAgents as userAgentsTable, agentCostLogs } from "@shared/schema";
import { eq, sql, and, gte } from "drizzle-orm";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const CREDIT_COSTS: Record<string, number> = {
  "gpt-4o": 5,
  "gpt-4o-mini": 2,
  "gpt-5": 8,
  "gpt-5-mini": 3,
  "gpt-5-nano": 1,
  "claude-sonnet": 5,
  "gemini-pro": 4,
  chat: 3,
  training_embed: 10,
  training_process: 15,
  demo: 2,
};

export function estimateCost(model: string, actionType: string): number {
  return CREDIT_COSTS[model] || CREDIT_COSTS[actionType] || 3;
}

export function estimateTrainingCost(sourceCount: number, totalChars: number): { embedCredits: number; processCredits: number; total: number } {
  const embedCredits = Math.max(5, Math.ceil(totalChars / 1000) * 2);
  const processCredits = sourceCount * CREDIT_COSTS.training_process;
  return { embedCredits, processCredits, total: embedCredits + processCredits };
}

interface RunAgentResult {
  response: string;
  creditsCharged: number;
  tokensUsed: number;
}

export async function runAgent(
  agentId: string,
  userMessage: string,
  callerId: string
): Promise<RunAgentResult> {
  const agent = await storage.getUserAgent(agentId);
  if (!agent) throw new Error("Agent not found");

  if (agent.status === "paused") {
    throw new Error("Agent is paused. The agent owner needs to resume it.");
  }

  const costEstimate = estimateCost(agent.model, "chat");

  const result = await db.transaction(async (tx) => {
    const [updatedCaller] = await tx.update(usersTable)
      .set({ creditWallet: sql`COALESCE(${usersTable.creditWallet}, 0) - ${costEstimate}` })
      .where(and(
        eq(usersTable.id, callerId),
        gte(usersTable.creditWallet, costEstimate)
      ))
      .returning({ id: usersTable.id, creditWallet: usersTable.creditWallet });

    if (!updatedCaller) {
      throw new Error("Insufficient credits. Please add credits to your wallet.");
    }

    const messages: OpenAI.ChatCompletionMessageParam[] = [];
    if (agent.systemPrompt) {
      messages.push({ role: "system", content: agent.systemPrompt });
    }
    messages.push({ role: "user", content: userMessage });

    let responseText = "";
    let tokensUsed = 0;

    try {
      const completion = await openai.chat.completions.create({
        model: agent.model === "gpt-4o" ? "gpt-4o" : "gpt-4o-mini",
        messages,
        temperature: agent.temperature,
        max_completion_tokens: 2048,
      });

      responseText = completion.choices[0]?.message?.content || "No response generated.";
      tokensUsed = completion.usage?.total_tokens || 0;
    } catch (err: any) {
      await tx.update(usersTable)
        .set({ creditWallet: sql`COALESCE(${usersTable.creditWallet}, 0) + ${costEstimate}` })
        .where(eq(usersTable.id, callerId));

      await tx.insert(agentCostLogs).values({
        agentId,
        ownerId: callerId,
        actionType: "chat",
        creditsCharged: 0,
        tokensUsed: 0,
        model: agent.model,
        status: "failed",
      });

      throw new Error(`AI call failed: ${err.message}`);
    }

    await tx.insert(agentCostLogs).values({
      agentId,
      ownerId: callerId,
      actionType: "chat",
      creditsCharged: costEstimate,
      tokensUsed,
      model: agent.model,
      status: "completed",
    });

    await tx.update(userAgentsTable)
      .set({ totalUsageCount: sql`${userAgentsTable.totalUsageCount} + 1` })
      .where(eq(userAgentsTable.id, agentId));

    return { response: responseText, creditsCharged: costEstimate, tokensUsed };
  });

  return result;
}

export async function runDemoInteraction(
  agentId: string,
  userMessage: string
): Promise<{ response: string }> {
  const agent = await storage.getUserAgent(agentId);
  if (!agent) throw new Error("Agent not found");

  const messages: OpenAI.ChatCompletionMessageParam[] = [];
  if (agent.systemPrompt) {
    messages.push({ role: "system", content: agent.systemPrompt + "\n\nThis is a demo interaction. Keep responses concise (under 150 words)." });
  } else {
    messages.push({ role: "system", content: `You are ${agent.name}. This is a demo interaction. Keep responses concise (under 150 words).` });
  }
  messages.push({ role: "user", content: userMessage });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: agent.temperature,
      max_completion_tokens: 512,
    });
    return { response: completion.choices[0]?.message?.content || "No response generated." };
  } catch (err: any) {
    return { response: `Demo unavailable: ${err.message}` };
  }
}

export function computeTrustScore(agent: {
  rating: number;
  ratingCount: number;
  totalUsageCount: number;
  totalCreditsEarned: number;
}): number {
  const ratingFactor = Math.min(agent.rating / 5, 1) * 30;
  const usageFactor = Math.min(agent.totalUsageCount / 100, 1) * 25;
  const earningsFactor = Math.min(agent.totalCreditsEarned / 500, 1) * 20;
  const reviewFactor = Math.min(agent.ratingCount / 20, 1) * 15;
  const baseTrust = 10;
  return Math.round(baseTrust + ratingFactor + usageFactor + earningsFactor + reviewFactor);
}

export function computeQualityScore(listing: {
  totalSales: number;
  averageRating: number;
  reviewCount: number;
}): number {
  const salesScore = Math.min(listing.totalSales / 50, 1) * 40;
  const ratingScore = (listing.averageRating / 5) * 35;
  const reviewScore = Math.min(listing.reviewCount / 10, 1) * 25;
  return Math.round(salesScore + ratingScore + reviewScore);
}

export const agentRunnerService = {
  runAgent,
  runDemoInteraction,
  estimateCost,
  estimateTrainingCost,
  computeTrustScore,
  computeQualityScore,
  CREDIT_COSTS,
};
