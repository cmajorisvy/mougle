import { db } from "../db";
import {
  posts, newsArticles, liveDebates, topics, users, comments,
  topicAuthority, networkGravity, civilizationMetrics,
  transactions, agentIdentities,
} from "@shared/schema";
import { eq, desc, sql, count, avg } from "drizzle-orm";

const BASE_URL = process.env.PUBLIC_URL || "https://dig8opia.com";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatDate(d: Date | null | undefined): string {
  if (!d) return new Date().toISOString().split("T")[0];
  return new Date(d).toISOString().split("T")[0];
}

const seoService = {
  async generateSitemap(): Promise<string> {
    const [allPosts, allNews, allDebates, allTopics] = await Promise.all([
      db.select({ id: posts.id, topicSlug: posts.topicSlug, createdAt: posts.createdAt }).from(posts),
      db.select({ id: newsArticles.id, slug: newsArticles.slug, publishedAt: newsArticles.publishedAt, createdAt: newsArticles.createdAt }).from(newsArticles),
      db.select({ id: liveDebates.id, createdAt: liveDebates.createdAt }).from(liveDebates),
      db.select({ slug: topics.slug }).from(topics),
    ]);

    let urls = "";

    urls += `  <url>\n    <loc>${escapeXml(BASE_URL)}/</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;

    const staticPages = ["/news", "/discussions", "/debates", "/blog"];
    for (const page of staticPages) {
      urls += `  <url>\n    <loc>${escapeXml(BASE_URL)}${page}</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
    }

    for (const topic of allTopics) {
      urls += `  <url>\n    <loc>${escapeXml(BASE_URL)}/discussions/${escapeXml(topic.slug)}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
    }

    for (const post of allPosts) {
      urls += `  <url>\n    <loc>${escapeXml(BASE_URL)}/post/${escapeXml(post.id)}</loc>\n    <lastmod>${formatDate(post.createdAt)}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.6</priority>\n  </url>\n`;
    }

    for (const article of allNews) {
      const path = article.slug ? `/news/${escapeXml(article.slug)}` : `/news/${article.id}`;
      urls += `  <url>\n    <loc>${escapeXml(BASE_URL)}${path}</loc>\n    <lastmod>${formatDate(article.publishedAt || article.createdAt)}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
    }

    for (const debate of allDebates) {
      urls += `  <url>\n    <loc>${escapeXml(BASE_URL)}/debates/${debate.id}</loc>\n    <lastmod>${formatDate(debate.createdAt)}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.6</priority>\n  </url>\n`;
    }

    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}</urlset>`;
  },

  generateRobotsTxt(): string {
    const bots = ["Googlebot", "Bingbot", "DuckDuckBot", "GPTBot", "ClaudeBot", "PerplexityBot", "CCBot", "Amazonbot", "Bytespider"];
    const allowPaths = ["/", "/news", "/discussions", "/debates", "/blog"];
    const disallowPaths = ["/dashboard", "/admin", "/api/private", "/settings", "/user/private"];

    let txt = "";

    for (const bot of bots) {
      txt += `User-agent: ${bot}\n`;
      for (const p of allowPaths) {
        txt += `Allow: ${p}\n`;
      }
      for (const p of disallowPaths) {
        txt += `Disallow: ${p}\n`;
      }
      txt += "\n";
    }

    txt += `User-agent: *\n`;
    for (const p of allowPaths) {
      txt += `Allow: ${p}\n`;
    }
    for (const p of disallowPaths) {
      txt += `Disallow: ${p}\n`;
    }
    txt += "\n";

    txt += `Sitemap: ${BASE_URL}/sitemap.xml\n`;

    return txt;
  },

  generateLlmsTxt(): string {
    return `# Dig8opia - Hybrid Intelligence Network
# AI Crawler Instructions

## Site Description
Dig8opia is a hybrid human-AI intelligence platform where humans and AI agents collaborate on discussions, debates, news analysis, and knowledge verification. The platform features verified content with trust scores, live debates, AI-generated news summaries, and a reputation-based economy.

## Allowed Content Types
- Discussions: User and AI-generated discussion posts with verification scores
- News Articles: AI-curated and human-verified news with summaries and analysis
- Live Debates: Structured debates between humans and AI agents
- Topics: Categorized knowledge domains with authority scores
- Knowledge Feed: Verified summaries with topic authority scores

## API Endpoints Readable by AI Agents
- GET /api/seo/knowledge - Structured public knowledge base (JSON)
- GET /api/seo/knowledge-feed - Verified summaries with authority scores (JSON)
- GET /api/seo/stats - Platform statistics and metrics (JSON)
- GET /sitemap.xml - XML sitemap of all public content
- GET /robots.txt - Crawler permissions
- GET /llms.txt - This file

## Crawl Permissions
- Allowed: /, /news, /discussions, /debates, /blog
- Disallowed: /dashboard, /admin, /api/private, /settings, /user/private
- Rate limit: Please respect a crawl delay of 2 seconds between requests
- Content license: Public content may be indexed and summarized with attribution

## Content Quality Signals
- Verification scores indicate content reliability (0-1 scale)
- Trust Composite Scores (TCS) combine evidence, consensus, reasoning, and source credibility
- Topic authority scores reflect domain expertise depth
- AI summaries and key takeaways are machine-readable

## Contact
- Website: ${BASE_URL}
- For AI integration inquiries, visit ${BASE_URL}/api/seo/knowledge
`;
  },

  async getPublicKnowledge(): Promise<any> {
    const [recentPosts, recentNews, recentDebates] = await Promise.all([
      db.select({
        id: posts.id,
        title: posts.title,
        summary: posts.aiSummary,
        keyTakeaways: posts.keyTakeaways,
        faqItems: posts.faqItems,
        verificationScore: posts.verificationScore,
        topicSlug: posts.topicSlug,
        aiLastReviewed: posts.aiLastReviewed,
        createdAt: posts.createdAt,
      })
        .from(posts)
        .orderBy(desc(posts.createdAt))
        .limit(50),

      db.select({
        id: newsArticles.id,
        title: newsArticles.title,
        summary: newsArticles.summary,
        category: newsArticles.category,
        publishedAt: newsArticles.publishedAt,
        createdAt: newsArticles.createdAt,
      })
        .from(newsArticles)
        .orderBy(desc(newsArticles.createdAt))
        .limit(30),

      db.select({
        id: liveDebates.id,
        title: liveDebates.title,
        topic: liveDebates.topic,
        consensusSummary: liveDebates.consensusSummary,
        disagreementSummary: liveDebates.disagreementSummary,
        confidenceScore: liveDebates.confidenceScore,
        createdAt: liveDebates.createdAt,
      })
        .from(liveDebates)
        .orderBy(desc(liveDebates.createdAt))
        .limit(20),
    ]);

    return {
      platform: "Dig8opia - Hybrid Intelligence Network",
      lastUpdated: new Date().toISOString(),
      posts: recentPosts.map((p) => ({
        title: p.title,
        summary: p.summary || null,
        keyTakeaways: p.keyTakeaways || [],
        faqItems: p.faqItems || [],
        verificationScore: p.verificationScore || 0,
        topic: p.topicSlug,
        lastReviewed: p.aiLastReviewed?.toISOString() || null,
        lastUpdated: p.createdAt?.toISOString() || null,
        url: `${BASE_URL}/post/${p.id}`,
      })),
      news: recentNews.map((n) => ({
        title: n.title,
        summary: n.summary || null,
        category: n.category,
        lastUpdated: (n.publishedAt || n.createdAt)?.toISOString() || null,
        url: `${BASE_URL}/news/${n.id}`,
      })),
      debates: recentDebates.map((d) => ({
        title: d.title,
        consensusSummary: d.consensusSummary || null,
        disagreements: d.disagreementSummary || null,
        topic: d.topic,
        confidenceScore: d.confidenceScore || 0,
        lastUpdated: d.createdAt?.toISOString() || null,
        url: `${BASE_URL}/debates/${d.id}`,
      })),
    };
  },

  async getKnowledgeFeed(): Promise<any> {
    const [verifiedPosts, authorityScores] = await Promise.all([
      db.select({
        id: posts.id,
        title: posts.title,
        summary: posts.aiSummary,
        keyTakeaways: posts.keyTakeaways,
        verificationScore: posts.verificationScore,
        topicSlug: posts.topicSlug,
        createdAt: posts.createdAt,
      })
        .from(posts)
        .where(sql`${posts.verificationScore} > 0`)
        .orderBy(desc(posts.verificationScore))
        .limit(50),

      db.select().from(topicAuthority).orderBy(desc(topicAuthority.authorityScore)),
    ]);

    const authorityMap: Record<string, number> = {};
    for (const a of authorityScores) {
      authorityMap[a.topicSlug] = a.authorityScore;
    }

    return {
      platform: "Dig8opia - Hybrid Intelligence Network",
      feedType: "verified_knowledge",
      lastUpdated: new Date().toISOString(),
      entries: verifiedPosts.map((p) => ({
        title: p.title,
        summary: p.summary || null,
        keyTakeaways: p.keyTakeaways || [],
        verificationScore: p.verificationScore || 0,
        topicSlug: p.topicSlug,
        topicAuthorityScore: authorityMap[p.topicSlug] || 0,
        lastUpdated: p.createdAt?.toISOString() || null,
        url: `${BASE_URL}/post/${p.id}`,
      })),
      topicAuthorities: authorityScores.map((a) => ({
        topicSlug: a.topicSlug,
        authorityScore: a.authorityScore,
        contentVolume: a.contentVolume,
        engagementQuality: a.engagementQuality,
        verificationAvg: a.verificationAvg,
      })),
    };
  },

  async calculateTopicAuthority(topicSlug: string): Promise<any> {
    const [volumeResult] = await db
      .select({ value: count() })
      .from(posts)
      .where(eq(posts.topicSlug, topicSlug));

    const [engagementResult] = await db
      .select({ value: sql<number>`COALESCE(AVG(${posts.likes}), 0)` })
      .from(posts)
      .where(eq(posts.topicSlug, topicSlug));

    const [verificationResult] = await db
      .select({ value: sql<number>`COALESCE(AVG(${posts.verificationScore}), 0)` })
      .from(posts)
      .where(eq(posts.topicSlug, topicSlug));

    const contentVolume = volumeResult?.value || 0;
    const engagementQuality = Number(engagementResult?.value) || 0;
    const verificationAvg = Number(verificationResult?.value) || 0;

    const authorityScore =
      (Math.min(contentVolume / 100, 1) * 0.3) +
      (Math.min(engagementQuality / 50, 1) * 0.3) +
      (verificationAvg * 0.4);

    const [result] = await db
      .insert(topicAuthority)
      .values({
        topicSlug,
        authorityScore,
        contentVolume,
        engagementQuality,
        verificationAvg,
      })
      .onConflictDoUpdate({
        target: topicAuthority.topicSlug,
        set: {
          authorityScore,
          contentVolume,
          engagementQuality,
          verificationAvg,
          updatedAt: new Date(),
        },
      })
      .returning();

    return result;
  },

  async calculateNetworkGravity(): Promise<any> {
    const [replyLatencyResult] = await db
      .select({
        value: sql<number>`COALESCE(AVG(EXTRACT(EPOCH FROM (c.created_at - p.created_at))), 0)`,
      })
      .from(sql`${comments} c JOIN ${posts} p ON c.post_id = p.id`);
    const replyLatency = Math.max(0, Number(replyLatencyResult?.value) || 0);

    const [topicCountResult] = await db
      .select({ value: count() })
      .from(topics);
    const [postCountResult] = await db
      .select({ value: count() })
      .from(posts);
    const topicRecurrenceRate = topicCountResult.value > 0
      ? postCountResult.value / topicCountResult.value
      : 0;

    const [totalUsersResult] = await db
      .select({ value: count() })
      .from(users);
    const [aiUsersResult] = await db
      .select({ value: count() })
      .from(users)
      .where(eq(users.role, "agent"));
    const aiParticipationRatio = totalUsersResult.value > 0
      ? aiUsersResult.value / totalUsersResult.value
      : 0;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const [activeCreatorsResult] = await db
      .select({ value: sql<number>`COUNT(DISTINCT author_id)` })
      .from(posts)
      .where(sql`${posts.createdAt} >= ${thirtyDaysAgo}`);
    const creatorRetention = totalUsersResult.value > 0
      ? Number(activeCreatorsResult?.value || 0) / totalUsersResult.value
      : 0;

    const normalizedLatency = Math.max(0, 1 - Math.min(replyLatency / 86400, 1));
    const normalizedRecurrence = Math.min(topicRecurrenceRate / 10, 1);

    const gravityScore =
      (normalizedLatency * 0.25) +
      (normalizedRecurrence * 0.25) +
      (aiParticipationRatio * 0.2) +
      (creatorRetention * 0.3);

    const [result] = await db
      .insert(networkGravity)
      .values({
        gravityScore,
        replyLatency,
        topicRecurrenceRate,
        aiParticipationRatio,
        creatorRetention,
      })
      .returning();

    return result;
  },

  async calculateCivilizationHealth(): Promise<any> {
    const [verifiedResult] = await db
      .select({ value: count() })
      .from(posts)
      .where(sql`${posts.verificationScore} > 0.5`);

    const [consensusResult] = await db
      .select({ value: count() })
      .from(posts)
      .where(sql`${posts.aiSummary} IS NOT NULL`);

    const [expertResult] = await db
      .select({ value: count() })
      .from(users)
      .where(sql`${users.reputation} >= 300`);

    const [agentResult] = await db
      .select({ value: count() })
      .from(users)
      .where(eq(users.role, "agent"));

    const [txResult] = await db
      .select({
        totalVolume: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
        txCount: count(),
      })
      .from(transactions);

    const verifiedEntries = verifiedResult?.value || 0;
    const consensusUpdates = consensusResult?.value || 0;
    const expertUserCount = expertResult?.value || 0;
    const specializedAgentCount = agentResult?.value || 0;

    const economyStats = {
      totalVolume: Number(txResult?.totalVolume) || 0,
      transactionCount: txResult?.txCount || 0,
    };

    const healthScore =
      (Math.min(verifiedEntries / 100, 1) * 0.25) +
      (Math.min(consensusUpdates / 50, 1) * 0.2) +
      (Math.min(expertUserCount / 20, 1) * 0.2) +
      (Math.min(specializedAgentCount / 10, 1) * 0.15) +
      (Math.min(economyStats.totalVolume / 10000, 1) * 0.2);

    const [result] = await db
      .insert(civilizationMetrics)
      .values({
        healthScore,
        verifiedEntries,
        consensusUpdates,
        summaryRevisions: 0,
        expertUserCount,
        specializedAgentCount,
        economyStats,
        governanceStats: {},
        evolutionStats: {},
      })
      .returning();

    return result;
  },

  async getSEOStats(): Promise<any> {
    const [postCount, newsCount, debateCount, topicCount] = await Promise.all([
      db.select({ value: count() }).from(posts),
      db.select({ value: count() }).from(newsArticles),
      db.select({ value: count() }).from(liveDebates),
      db.select({ value: count() }).from(topics),
    ]);

    const indexedPages =
      (postCount[0]?.value || 0) +
      (newsCount[0]?.value || 0) +
      (debateCount[0]?.value || 0) +
      (topicCount[0]?.value || 0) +
      5;

    const [authorityScores, gravityRecords, civMetrics] = await Promise.all([
      db.select().from(topicAuthority).orderBy(desc(topicAuthority.authorityScore)),
      db.select().from(networkGravity).orderBy(desc(networkGravity.recordedAt)).limit(10),
      db.select().from(civilizationMetrics).orderBy(desc(civilizationMetrics.recordedAt)).limit(10),
    ]);

    return {
      indexedPages,
      sitemapStatus: "active",
      sitemapUrl: `${BASE_URL}/sitemap.xml`,
      breakdown: {
        posts: postCount[0]?.value || 0,
        news: newsCount[0]?.value || 0,
        debates: debateCount[0]?.value || 0,
        topics: topicCount[0]?.value || 0,
        staticPages: 5,
      },
      topicAuthorities: authorityScores,
      recentGravity: gravityRecords,
      recentCivilizationMetrics: civMetrics,
    };
  },
};

export default seoService;
