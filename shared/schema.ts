import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name").notNull(),
  avatar: text("avatar"),
  role: text("role").notNull().default("human"),
  energy: integer("energy").notNull().default(500),
  reputation: integer("reputation").notNull().default(0),
  rankLevel: text("rank_level").notNull().default("Basic"),
  badge: text("badge"),
  confidence: integer("confidence"),
  bio: text("bio"),
  industryTags: text("industry_tags").array(),
  emailVerified: boolean("email_verified").notNull().default(false),
  verificationCode: text("verification_code"),
  profileCompleted: boolean("profile_completed").notNull().default(false),
  agentModel: text("agent_model"),
  agentApiEndpoint: text("agent_api_endpoint"),
  agentDescription: text("agent_description"),
  agentType: text("agent_type"),
  publicKey: text("public_key"),
  callbackUrl: text("callback_url"),
  capabilities: text("capabilities").array(),
  apiToken: text("api_token"),
  rateLimitPerMin: integer("rate_limit_per_min").default(60),
  creditWallet: integer("credit_wallet").default(0),
  verificationWeight: real("verification_weight").default(1.0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const topics = pgTable("topics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").notNull().unique(),
  label: text("label").notNull(),
  icon: text("icon").notNull().default("Cpu"),
});

export const posts = pgTable("posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  content: text("content").notNull(),
  image: text("image"),
  topicSlug: text("topic_slug").notNull(),
  authorId: varchar("author_id").notNull(),
  isDebate: boolean("is_debate").notNull().default(false),
  debateActive: boolean("debate_active").notNull().default(false),
  likes: integer("likes").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const comments = pgTable("comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull(),
  authorId: varchar("author_id").notNull(),
  parentId: varchar("parent_id"),
  content: text("content").notNull(),
  reasoningType: text("reasoning_type"),
  confidence: integer("confidence"),
  sources: text("sources").array(),
  likes: integer("likes").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const postLikes = pgTable("post_likes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull(),
  userId: varchar("user_id").notNull(),
});

export const claims = pgTable("claims", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull(),
  subject: text("subject").notNull(),
  statement: text("statement").notNull(),
  metric: text("metric"),
  timeReference: text("time_reference"),
  evidenceLinks: text("evidence_links").array(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const evidence = pgTable("evidence", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull(),
  claimId: varchar("claim_id"),
  url: text("url").notNull(),
  label: text("label").notNull(),
  evidenceType: text("evidence_type").notNull().default("news"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const trustScores = pgTable("trust_scores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull(),
  evidenceScore: real("evidence_score").notNull().default(0),
  consensusScore: real("consensus_score").notNull().default(0),
  historicalReliability: real("historical_reliability").notNull().default(0),
  reasoningScore: real("reasoning_score").notNull().default(0),
  sourceCredibility: real("source_credibility").notNull().default(0),
  tcsTotal: real("tcs_total").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const agentVotes = pgTable("agent_votes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull(),
  agentId: varchar("agent_id").notNull(),
  score: real("score").notNull(),
  rationale: text("rationale"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const reputationHistory = pgTable("reputation_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  delta: integer("delta").notNull(),
  reason: text("reason").notNull(),
  sourcePostId: varchar("source_post_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const expertiseTags = pgTable("expertise_tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  topicSlug: text("topic_slug").notNull(),
  tag: text("tag").notNull(),
  accuracyScore: real("accuracy_score").notNull().default(0),
});

export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id"),
  receiverId: varchar("receiver_id").notNull(),
  amount: integer("amount").notNull(),
  transactionType: text("transaction_type").notNull(),
  referenceId: varchar("reference_id"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const agentLearningProfiles = pgTable("agent_learning_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull().unique(),
  qValues: jsonb("q_values").notNull().default({}),
  expertiseWeights: jsonb("expertise_weights").notNull().default({}),
  strategyParameters: jsonb("strategy_parameters").notNull().default({}),
  explorationRate: real("exploration_rate").notNull().default(0.3),
  successRate: real("success_rate").notNull().default(0.5),
  specializationScores: jsonb("specialization_scores").notNull().default({}),
  rewardHistory: jsonb("reward_history").notNull().default([]),
  totalReward: real("total_reward").notNull().default(0),
  learningCycles: integer("learning_cycles").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const agentSocieties = pgTable("agent_societies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  specializationDomain: text("specialization_domain").notNull(),
  reputationScore: real("reputation_score").notNull().default(0),
  treasuryBalance: integer("treasury_balance").notNull().default(0),
  totalCollaborations: integer("total_collaborations").notNull().default(0),
  avgTcsOutcome: real("avg_tcs_outcome").notNull().default(0),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const societyMembers = pgTable("society_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  societyId: varchar("society_id").notNull(),
  agentId: varchar("agent_id").notNull(),
  role: text("role").notNull().default("researcher"),
  contributionScore: real("contribution_score").notNull().default(0),
  tasksCompleted: integer("tasks_completed").notNull().default(0),
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const delegatedTasks = pgTable("delegated_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  societyId: varchar("society_id").notNull(),
  postId: varchar("post_id").notNull(),
  assignedAgent: varchar("assigned_agent"),
  taskType: text("task_type").notNull(),
  status: text("status").notNull().default("pending"),
  rewardValue: integer("reward_value").notNull().default(0),
  result: text("result"),
  confidence: real("confidence"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const agentMessages = pgTable("agent_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id"),
  societyId: varchar("society_id"),
  senderId: varchar("sender_id").notNull(),
  intent: text("intent").notNull(),
  dataReference: text("data_reference"),
  confidenceLevel: real("confidence_level"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const agentActivityLog = pgTable("agent_activity_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull(),
  postId: varchar("post_id"),
  actionType: text("action_type").notNull(),
  details: text("details"),
  relevanceScore: real("relevance_score"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertTopicSchema = createInsertSchema(topics).omit({ id: true });
export const insertPostSchema = createInsertSchema(posts).omit({ id: true, likes: true, createdAt: true });
export const insertCommentSchema = createInsertSchema(comments).omit({ id: true, likes: true, createdAt: true });
export const insertClaimSchema = createInsertSchema(claims).omit({ id: true, createdAt: true });
export const insertEvidenceSchema = createInsertSchema(evidence).omit({ id: true, createdAt: true });
export const insertTrustScoreSchema = createInsertSchema(trustScores).omit({ id: true, updatedAt: true });
export const insertAgentVoteSchema = createInsertSchema(agentVotes).omit({ id: true, createdAt: true });
export const insertReputationHistorySchema = createInsertSchema(reputationHistory).omit({ id: true, createdAt: true });
export const insertExpertiseTagSchema = createInsertSchema(expertiseTags).omit({ id: true });
export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true, createdAt: true });
export const insertAgentLearningProfileSchema = createInsertSchema(agentLearningProfiles).omit({ id: true, updatedAt: true });
export const insertAgentActivityLogSchema = createInsertSchema(agentActivityLog).omit({ id: true, createdAt: true });
export const insertAgentSocietySchema = createInsertSchema(agentSocieties).omit({ id: true, createdAt: true });
export const insertSocietyMemberSchema = createInsertSchema(societyMembers).omit({ id: true, joinedAt: true });
export const insertDelegatedTaskSchema = createInsertSchema(delegatedTasks).omit({ id: true, createdAt: true, completedAt: true });
export const insertAgentMessageSchema = createInsertSchema(agentMessages).omit({ id: true, createdAt: true });

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertTopic = z.infer<typeof insertTopicSchema>;
export type Topic = typeof topics.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;
export type Post = typeof posts.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;
export type InsertClaim = z.infer<typeof insertClaimSchema>;
export type Claim = typeof claims.$inferSelect;
export type InsertEvidence = z.infer<typeof insertEvidenceSchema>;
export type Evidence = typeof evidence.$inferSelect;
export type InsertTrustScore = z.infer<typeof insertTrustScoreSchema>;
export type TrustScore = typeof trustScores.$inferSelect;
export type InsertAgentVote = z.infer<typeof insertAgentVoteSchema>;
export type AgentVote = typeof agentVotes.$inferSelect;
export type InsertReputationHistory = z.infer<typeof insertReputationHistorySchema>;
export type ReputationHistory = typeof reputationHistory.$inferSelect;
export type InsertExpertiseTag = z.infer<typeof insertExpertiseTagSchema>;
export type ExpertiseTag = typeof expertiseTags.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertAgentLearningProfile = z.infer<typeof insertAgentLearningProfileSchema>;
export type AgentLearningProfile = typeof agentLearningProfiles.$inferSelect;
export type InsertAgentActivityLog = z.infer<typeof insertAgentActivityLogSchema>;
export type AgentActivityLog = typeof agentActivityLog.$inferSelect;
export type InsertAgentSociety = z.infer<typeof insertAgentSocietySchema>;
export type AgentSociety = typeof agentSocieties.$inferSelect;
export type InsertSocietyMember = z.infer<typeof insertSocietyMemberSchema>;
export type SocietyMember = typeof societyMembers.$inferSelect;
export type InsertDelegatedTask = z.infer<typeof insertDelegatedTaskSchema>;
export type DelegatedTask = typeof delegatedTasks.$inferSelect;
export type InsertAgentMessage = z.infer<typeof insertAgentMessageSchema>;
export type AgentMessage = typeof agentMessages.$inferSelect;
