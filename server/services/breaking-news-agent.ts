import { storage } from "../storage";
import OpenAI from "openai";
import type { NewsArticle } from "@shared/schema";

function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  if (!apiKey) return null;
  return new OpenAI({ apiKey, baseURL });
}

async function evaluateImpact(article: NewsArticle): Promise<number> {
  const openai = getOpenAIClient();
  if (!openai) return 0;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a news impact analyst. Evaluate the given news article and return a JSON object with a single field "impact_score" (integer 0-100).

Scoring criteria:
- 90-100: World-changing events (major policy shifts, paradigm-breaking tech, global crises)
- 70-89: Major industry news (large acquisitions, significant regulatory changes, major product launches)
- 50-69: Notable developments (funding rounds, partnerships, research breakthroughs)
- 30-49: Standard news (product updates, company news, market analysis)
- 0-29: Minor updates (opinion pieces, routine announcements, listicles)

Return ONLY valid JSON: {"impact_score": <number>}`
        },
        {
          role: "user",
          content: `Title: ${article.title}\nSummary: ${article.summary || ""}\nCategory: ${article.category}`
        }
      ],
      max_completion_tokens: 100,
    });

    const text = completion.choices[0]?.message?.content?.trim() || "";
    const cleanJson = text.replace(/^```json?\s*/, "").replace(/\s*```$/, "");
    const parsed = JSON.parse(cleanJson);
    return Math.min(100, Math.max(0, parseInt(parsed.impact_score) || 0));
  } catch (err) {
    console.log(`[BreakingNews] Impact eval failed for article ${article.id}:`, (err as Error).message);
    return 0;
  }
}

async function selectTopAgents(count: number = 5): Promise<string[]> {
  const agents = await storage.getUsers();
  const aiAgents = agents
    .filter(u => u.role === "agent" && u.reputation > 0)
    .sort((a, b) => b.reputation - a.reputation)
    .slice(0, count);
  return aiAgents.map(a => a.id);
}

async function createBreakingDebate(article: NewsArticle): Promise<number | null> {
  try {
    const allUsers = await storage.getUsers();
    const creatorUser = allUsers.find(u => u.username === "admin")
      || allUsers.find(u => u.role === "agent" && u.reputation > 500)
      || allUsers.find(u => u.role === "agent")
      || allUsers[0];
    if (!creatorUser) {
      console.log("[BreakingNews] No user found to create debate");
      return null;
    }

    const debate = await storage.createLiveDebate({
      title: `Breaking News Debate: ${article.title}`,
      topic: article.category || "ai",
      description: `Auto-generated debate for breaking news: ${article.summary || article.title}`,
      status: "scheduled",
      format: "structured",
      maxAgents: 10,
      maxHumans: 5,
      turnDurationSeconds: 60,
      totalRounds: 5,
      currentRound: 0,
      createdBy: creatorUser.id,
    });

    const topAgentIds = await selectTopAgents(5);
    const voices = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];

    for (let i = 0; i < topAgentIds.length; i++) {
      try {
        await storage.addDebateParticipant({
          debateId: debate.id,
          userId: topAgentIds[i],
          role: "debater",
          participantType: "ai",
          position: i % 2 === 0 ? "pro" : "con",
          ttsVoice: voices[i % voices.length],
          speakingOrder: i + 1,
        });
      } catch {}
    }

    console.log(`[BreakingNews] Created debate #${debate.id} for article "${article.title}" with ${topAgentIds.length} agents`);
    return debate.id;
  } catch (err) {
    console.log(`[BreakingNews] Debate creation failed:`, (err as Error).message);
    return null;
  }
}

async function postAgentComments(article: NewsArticle): Promise<void> {
  const openai = getOpenAIClient();
  if (!openai) return;

  const agents = await storage.getUsers();
  const aiAgents = agents.filter(u => u.role === "agent" && u.reputation > 0);
  if (aiAgents.length === 0) return;

  const commentRoles = [
    { type: "verification", prompt: "As a verification specialist, analyze the factual claims in this article. Assess credibility, identify what can be verified, and rate the reliability of the sources. Be specific and analytical.", agentIndex: 0 },
    { type: "expert", prompt: "As a domain expert, explain the broader implications of this news. What does this mean for the industry? What are the potential second-order effects? Provide expert-level analysis.", agentIndex: 1 },
    { type: "critic", prompt: "As a critical analyst, provide a balanced counterpoint or alternative perspective on this news. What are the potential risks, downsides, or overlooked aspects? Be constructive but thorough.", agentIndex: 2 },
  ];

  for (const role of commentRoles) {
    const agent = aiAgents[role.agentIndex % aiAgents.length];
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: `${role.prompt}\n\nYou are ${agent.displayName}. Keep your response to 2-3 paragraphs, insightful and specific to this article.` },
          { role: "user", content: `Article: ${article.title}\n\n${article.summary || ""}\n\n${article.content?.substring(0, 500) || ""}` }
        ],
        max_completion_tokens: 400,
      });

      const commentContent = completion.choices[0]?.message?.content?.trim();
      if (commentContent) {
        await storage.createNewsComment({
          articleId: article.id,
          authorId: agent.id,
          content: commentContent,
          commentType: role.type,
        });
        console.log(`[BreakingNews] ${role.type} comment by ${agent.displayName} on article ${article.id}`);
      }
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      console.log(`[BreakingNews] Agent comment failed:`, (err as Error).message);
    }
  }
}

export const breakingNewsAgent = {
  async evaluateAndProcess(articleId: number): Promise<void> {
    const article = await storage.getNewsArticle(articleId);
    if (!article || article.status !== "processed") return;
    if (article.impactScore !== null && article.impactScore !== undefined) return;

    const impactScore = await evaluateImpact(article);
    const isBreaking = impactScore > 80;

    const updateData: any = { impactScore };

    if (isBreaking) {
      updateData.isBreakingNews = true;
      console.log(`[BreakingNews] BREAKING NEWS detected (score=${impactScore}): ${article.title}`);

      const debateId = await createBreakingDebate(article);
      if (debateId) {
        updateData.debateId = debateId;
      }
    }

    await storage.updateNewsArticle(articleId, updateData);

    await postAgentComments(article);

    try {
      const { socialPublisherService } = await import("./social-publisher-service");
      if (isBreaking) {
        await socialPublisherService.enqueueForContent("breaking", String(articleId), "breaking_news_detected");
      } else {
        await socialPublisherService.enqueueForContent("news", String(articleId), "news_published");
      }
    } catch (err) {
      console.log("[BreakingNews] Social publish enqueue failed:", (err as Error).message);
    }
  },

  async fixMissingDebates(): Promise<number> {
    const breakingArticles = await storage.getBreakingNews();
    let fixed = 0;
    for (const article of breakingArticles) {
      if (article.debateId) continue;
      const debateId = await createBreakingDebate(article);
      if (debateId) {
        await storage.updateNewsArticle(article.id, { debateId });
        fixed++;
        console.log(`[BreakingNews] Fixed debate for article ${article.id}: debate #${debateId}`);
      }
    }
    return fixed;
  },

  async processRecentArticles(): Promise<number> {
    const articles = await storage.getNewsArticles(20);
    let processed = 0;

    for (const article of articles) {
      if (article.impactScore !== null && article.impactScore !== undefined) continue;
      await this.evaluateAndProcess(article.id);
      processed++;
      await new Promise(r => setTimeout(r, 1000));
    }

    return processed;
  },
};
