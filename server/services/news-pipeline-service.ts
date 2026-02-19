import { storage } from "../storage";
import OpenAI from "openai";

function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  if (!apiKey) {
    console.log("[NewsPipeline] OpenAI API key not configured, skipping AI processing");
    return null;
  }
  return new OpenAI({ apiKey, baseURL });
}

const RSS_FEEDS = [
  { url: "https://feeds.arstechnica.com/arstechnica/technology-lab", name: "Ars Technica", category: "ai" },
  { url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml", name: "The Verge AI", category: "ai" },
  { url: "https://techcrunch.com/category/artificial-intelligence/feed/", name: "TechCrunch AI", category: "ai" },
  { url: "https://feeds.feedburner.com/venturebeat/SZYF", name: "VentureBeat", category: "ai" },
  { url: "https://www.wired.com/feed/tag/ai/latest/rss", name: "Wired AI", category: "ai" },
  { url: "https://news.google.com/rss/search?q=artificial+intelligence&hl=en-US&gl=US&ceid=US:en", name: "Google News AI", category: "ai" },
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml", name: "NYT Tech", category: "tech" },
  { url: "https://news.google.com/rss/search?q=machine+learning+deep+learning&hl=en-US&gl=US&ceid=US:en", name: "Google News ML", category: "ai" },
];

interface RSSItem {
  title: string;
  link: string;
  description: string;
  pubDate?: string;
  imageUrl?: string;
}

function extractImageFromDescription(description: string): string | null {
  const imgMatch = description.match(/<img[^>]+src=["']([^"']+)["']/i);
  return imgMatch ? imgMatch[1] : null;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").trim();
}

function parseRSSXml(xml: string): RSSItem[] {
  const items: RSSItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];

    const titleMatch = itemXml.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/);
    const linkMatch = itemXml.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/);
    const descMatch = itemXml.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/);
    const dateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
    const mediaMatch = itemXml.match(/<media:content[^>]+url=["']([^"']+)["']/);
    const enclosureMatch = itemXml.match(/<enclosure[^>]+url=["']([^"']+)["']/);

    const title = titleMatch ? stripHtml(titleMatch[1]) : "";
    const link = linkMatch ? stripHtml(linkMatch[1]) : "";
    const description = descMatch ? stripHtml(descMatch[1]) : "";
    const imageUrl = mediaMatch?.[1] || enclosureMatch?.[1] || (descMatch ? extractImageFromDescription(descMatch[1]) : null);

    if (title && link) {
      items.push({
        title,
        link,
        description: description.substring(0, 1000),
        pubDate: dateMatch ? dateMatch[1] : undefined,
        imageUrl: imageUrl || undefined,
      });
    }
  }

  return items;
}

async function fetchRSSFeed(feedUrl: string): Promise<RSSItem[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(feedUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "Dig8opia-NewsBot/1.0" },
    });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRSSXml(xml);
  } catch {
    return [];
  }
}

async function collectFromRSS(): Promise<number> {
  let collected = 0;

  for (const feed of RSS_FEEDS) {
    try {
      const items = await fetchRSSFeed(feed.url);

      for (const item of items.slice(0, 5)) {
        const existing = await storage.getNewsArticleByUrl(item.link);
        if (existing) continue;

        await storage.createNewsArticle({
          sourceUrl: item.link,
          sourceName: feed.name,
          sourceType: "rss",
          originalTitle: item.title,
          originalContent: item.description,
          title: item.title,
          category: feed.category,
          imageUrl: item.imageUrl || null,
          status: "raw",
          publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
        });
        collected++;
      }
    } catch (err) {
      console.log(`[NewsPipeline] Error fetching ${feed.name}:`, (err as Error).message);
    }
  }

  return collected;
}

async function processArticle(articleId: number): Promise<boolean> {
  const article = await storage.getNewsArticle(articleId);
  if (!article || article.status === "processed") return false;

  const openai = getOpenAIClient();
  if (!openai) return false;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a professional AI news editor. Given a news article title and description, produce a JSON object with these fields:
- "title": A clear, engaging headline (max 80 chars)
- "summary": A concise 2-3 sentence summary of the key points
- "content": A well-formatted article (3-5 paragraphs) expanding on the news with context and analysis
- "seoBlog": An SEO-optimized blog version (4-6 paragraphs) with subheadings marked by **bold**
- "script": A short video script narration (30-60 seconds read time) summarizing the news engagingly
- "hashtags": An array of 5-8 relevant hashtags (without # prefix)
- "category": One of: "ai", "tech", "science", "business", "policy"

Return ONLY valid JSON, no markdown fencing.`
        },
        {
          role: "user",
          content: `Title: ${article.originalTitle}\n\nDescription: ${article.originalContent || "No description available"}`
        }
      ],
      max_completion_tokens: 1500,
    });

    const responseText = completion.choices[0]?.message?.content?.trim();
    if (!responseText) return false;

    const cleanJson = responseText.replace(/^```json?\s*/, "").replace(/\s*```$/, "");
    const parsed = JSON.parse(cleanJson);

    await storage.updateNewsArticle(articleId, {
      title: parsed.title || article.title,
      summary: parsed.summary || null,
      content: parsed.content || null,
      seoBlog: parsed.seoBlog || null,
      script: parsed.script || null,
      hashtags: parsed.hashtags || [],
      category: parsed.category || article.category,
      status: "processed",
      processedAt: new Date(),
    });

    return true;
  } catch (err) {
    console.log(`[NewsPipeline] AI processing failed for article ${articleId}:`, (err as Error).message);
    return false;
  }
}

export const newsPipelineService = {
  async runPipeline(): Promise<{ collected: number; processed: number }> {
    console.log("[NewsPipeline] Starting news collection...");
    const collected = await collectFromRSS();
    console.log(`[NewsPipeline] Collected ${collected} new articles`);

    const unprocessed = await storage.getUnprocessedNews(10);
    let processed = 0;

    for (const article of unprocessed) {
      const success = await processArticle(article.id);
      if (success) processed++;
      await new Promise(r => setTimeout(r, 500));
    }

    console.log(`[NewsPipeline] Processed ${processed}/${unprocessed.length} articles`);
    return { collected, processed };
  },

  async getArticles(limit = 20, category?: string) {
    return storage.getNewsArticles(limit, category);
  },

  async getArticle(id: number) {
    return storage.getNewsArticle(id);
  },

  async getLatestNews(limit = 5) {
    return storage.getLatestNews(limit);
  },

  startAutoPipeline(intervalMinutes = 30) {
    console.log(`[NewsPipeline] Auto-pipeline started (every ${intervalMinutes} min)`);
    this.runPipeline().catch(err => console.error("[NewsPipeline] Initial run error:", err.message));

    setInterval(() => {
      this.runPipeline().catch(err => console.error("[NewsPipeline] Auto-run error:", err.message));
    }, intervalMinutes * 60 * 1000);
  },
};
