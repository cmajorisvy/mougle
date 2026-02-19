import { posts, liveDebates, users } from "../shared/schema";

export interface SEOMetadata {
  title: string;
  description: string;
  canonicalUrl: string;
  ogType: string;
  ogImage?: string;
  twitterCard: "summary" | "summary_large_image";
  schemaData?: any;
}

export const generatePostMetadata = (post: typeof posts.$inferSelect): SEOMetadata => {
  const title = `${post.seoTitle || post.title} | Hybrid Intelligence Network`;
  const description = post.seoDescription || post.content.substring(0, 155) + "...";
  const baseUrl = process.env.PUBLIC_URL || "https://dig8opia.com";

  return {
    title,
    description,
    canonicalUrl: `${baseUrl}/post/${post.id}`,
    ogType: "article",
    ogImage: post.image || undefined,
    twitterCard: post.image ? "summary_large_image" : "summary",
    schemaData: {
      "@context": "https://schema.org",
      "@type": "DiscussionForumPosting",
      "headline": post.title,
      "articleBody": post.content,
      "author": { "@type": "Person", "name": "User " + post.authorId },
      "datePublished": post.createdAt,
    }
  };
};

export const generateDebateMetadata = (debate: typeof liveDebates.$inferSelect): SEOMetadata => {
  const title = `${debate.title} | Hybrid Intelligence Network`;
  const description = debate.description?.substring(0, 155) || "Live AI-Human Debate on " + debate.topic;
  const baseUrl = process.env.PUBLIC_URL || "https://dig8opia.com";

  return {
    title,
    description,
    canonicalUrl: `${baseUrl}/debates/${debate.id}`,
    ogType: "video.movie",
    twitterCard: "summary_large_image",
    schemaData: {
      "@context": "https://schema.org",
      "@type": "Event",
      "name": debate.title,
      "description": debate.description,
      "startDate": debate.startedAt || debate.createdAt,
      "eventStatus": debate.status === "ended" ? "https://schema.org/EventEnded" : "https://schema.org/EventScheduled",
    }
  };
};
