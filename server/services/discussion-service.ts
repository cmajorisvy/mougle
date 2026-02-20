import { storage } from "../storage";
import type { InsertPost, InsertComment, InsertTopic, InsertClaim, InsertEvidence } from "@shared/schema";

function formatAuthor(author: any) {
  if (!author) return null;
  return {
    id: author.id,
    name: author.displayName,
    handle: `@${author.username}`,
    avatar: author.avatar,
    role: author.role,
    confidence: author.confidence,
    badge: author.badge,
    reputation: author.reputation,
    rankLevel: author.rankLevel,
  };
}

export class DiscussionService {
  async listTopics() {
    return storage.getTopics();
  }

  async createTopic(data: InsertTopic) {
    return storage.createTopic(data);
  }

  async listPosts(topicSlug?: string) {
    const postsList = topicSlug
      ? await storage.getPostsByTopic(topicSlug)
      : await storage.getPosts();

    return this.enrichPosts(postsList);
  }

  async listPostsPaginated(options: { topic?: string; sort?: string; page?: number; limit?: number }) {
    const { posts: postsList, total } = await storage.getPostsPaginated(options);
    const enriched = await this.enrichPosts(postsList);
    return { posts: enriched, total, page: options.page || 1, limit: options.limit || 15 };
  }

  private async enrichPosts(postsList: any[]) {
    return Promise.all(
      postsList.map(async (post) => {
        const author = await storage.getUser(post.authorId);
        const commentCount = await storage.getCommentCount(post.id);
        const trustScore = await storage.getTrustScore(post.id);
        const voteCount = await storage.getAgentVoteCount(post.id);
        const claimsList = await storage.getClaims(post.id);
        return {
          ...post,
          author: formatAuthor(author),
          comments: commentCount,
          trustScore: trustScore ? {
            tcsTotal: trustScore.tcsTotal,
            evidenceScore: trustScore.evidenceScore,
            consensusScore: trustScore.consensusScore,
          } : null,
          agentVoteCount: voteCount,
          claimCount: claimsList.length,
        };
      })
    );
  }

  async getPost(postId: string) {
    const post = await storage.getPost(postId);
    if (!post) throw { status: 404, message: "Post not found" };

    const author = await storage.getUser(post.authorId);
    const commentCount = await storage.getCommentCount(post.id);
    const trustScore = await storage.getTrustScore(post.id);
    const claimsList = await storage.getClaims(post.id);
    const evidenceList = await storage.getEvidence(post.id);
    const votes = await storage.getAgentVotes(post.id);

    const votesWithAgent = await Promise.all(
      votes.map(async (v) => {
        const agent = await storage.getUser(v.agentId);
        return {
          ...v,
          agentName: agent?.displayName || "Unknown Agent",
          agentAvatar: agent?.avatar || null,
          agentBadge: agent?.badge || null,
        };
      })
    );

    const authorData = author ? {
      ...formatAuthor(author),
      expertiseTags: await storage.getExpertiseTags(author.id),
    } : null;

    return {
      ...post,
      author: authorData,
      comments: commentCount,
      trustScore: trustScore || null,
      claims: claimsList,
      evidence: evidenceList,
      agentVotes: votesWithAgent,
    };
  }

  async createPost(data: InsertPost) {
    return storage.createPost(data);
  }

  async toggleLike(postId: string, userId: string) {
    if (!userId) throw { status: 400, message: "userId required" };

    const already = await storage.hasLiked(postId, userId);
    if (already) {
      const post = await storage.unlikePost(postId, userId);
      return { ...post, liked: false };
    }
    const post = await storage.likePost(postId, userId);
    return { ...post, liked: true };
  }

  async listComments(postId: string) {
    const commentsList = await storage.getComments(postId);

    return Promise.all(
      commentsList.map(async (comment) => {
        const author = await storage.getUser(comment.authorId);
        return { ...comment, author: formatAuthor(author) };
      })
    );
  }

  async createComment(data: InsertComment) {
    return storage.createComment(data);
  }

  async createClaim(data: InsertClaim) {
    return storage.createClaim(data);
  }

  async createEvidence(data: InsertEvidence) {
    return storage.createEvidence(data);
  }

  async getUsers() {
    const usersList = await storage.getUsers();
    return usersList.map(u => ({ ...u, password: undefined, verificationCode: undefined }));
  }

  async getUser(id: string) {
    const user = await storage.getUser(id);
    if (!user) throw { status: 404, message: "User not found" };
    const tags = await storage.getExpertiseTags(user.id);
    return { ...user, password: undefined, verificationCode: undefined, expertiseTags: tags };
  }
}

export const discussionService = new DiscussionService();
