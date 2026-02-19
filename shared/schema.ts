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

export const governanceProposals = pgTable("governance_proposals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  creatorId: varchar("creator_id").notNull(),
  creatorType: text("creator_type").notNull().default("agent"),
  proposalType: text("proposal_type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("discussion"),
  targetId: varchar("target_id"),
  targetId2: varchar("target_id2"),
  parameters: jsonb("parameters").notNull().default({}),
  votesFor: integer("votes_for").notNull().default(0),
  votesAgainst: integer("votes_against").notNull().default(0),
  totalVotingPower: real("total_voting_power").notNull().default(0),
  discussionDeadline: timestamp("discussion_deadline"),
  votingDeadline: timestamp("voting_deadline"),
  executedAt: timestamp("executed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const governanceVotes = pgTable("governance_votes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  proposalId: varchar("proposal_id").notNull(),
  voterId: varchar("voter_id").notNull(),
  voterType: text("voter_type").notNull().default("agent"),
  votingPower: real("voting_power").notNull().default(1),
  voteChoice: text("vote_choice").notNull(),
  reasoning: text("reasoning"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const alliances = pgTable("alliances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  sharedTreasury: integer("shared_treasury").notNull().default(0),
  collectiveReputation: real("collective_reputation").notNull().default(0),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const allianceMembers = pgTable("alliance_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  allianceId: varchar("alliance_id").notNull(),
  societyId: varchar("society_id").notNull(),
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const institutionRules = pgTable("institution_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ruleName: text("rule_name").notNull().unique(),
  ruleValue: text("rule_value").notNull(),
  category: text("category").notNull().default("general"),
  lastModifiedByVote: varchar("last_modified_by_vote"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const taskContracts = pgTable("task_contracts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull(),
  description: text("description").notNull(),
  requiredExpertise: text("required_expertise").array(),
  status: text("status").notNull().default("open"),
  selectedBidId: varchar("selected_bid_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const taskBids = pgTable("task_bids", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractId: varchar("contract_id").notNull(),
  societyId: varchar("society_id").notNull(),
  expectedAccuracy: real("expected_accuracy").notNull(),
  completionTime: integer("completion_time").notNull(),
  creditCost: integer("credit_cost").notNull(),
  score: real("score"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const civilizations = pgTable("civilizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  foundingSocieties: text("founding_societies").array(),
  ideologyVector: jsonb("ideology_vector").notNull().default({}),
  treasuryBalance: integer("treasury_balance").notNull().default(0),
  longTermStrategy: jsonb("long_term_strategy").notNull().default({}),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const agentIdentities = pgTable("agent_identities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull().unique(),
  civilizationId: varchar("civilization_id"),
  creationEpoch: integer("creation_epoch").notNull().default(0),
  strategyProfile: jsonb("strategy_profile").notNull().default({}),
  longTermGoalSet: jsonb("long_term_goal_set").notNull().default({}),
  influenceScore: real("influence_score").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const agentMemory = pgTable("agent_memory", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull(),
  eventType: text("event_type").notNull(),
  contextData: jsonb("context_data").notNull().default({}),
  decisionTaken: text("decision_taken"),
  rewardOutcome: real("reward_outcome").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const civilizationInvestments = pgTable("civilization_investments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  civilizationId: varchar("civilization_id").notNull(),
  investorId: varchar("investor_id").notNull(),
  investmentType: text("investment_type").notNull(),
  amount: integer("amount").notNull(),
  expectedReturn: real("expected_return").notNull().default(1.0),
  status: text("status").notNull().default("active"),
  maturesAt: timestamp("matures_at"),
  returnAmount: integer("return_amount"),
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
export const insertGovernanceProposalSchema = createInsertSchema(governanceProposals).omit({ id: true, createdAt: true, executedAt: true, votesFor: true, votesAgainst: true, totalVotingPower: true });
export const insertGovernanceVoteSchema = createInsertSchema(governanceVotes).omit({ id: true, createdAt: true });
export const insertAllianceSchema = createInsertSchema(alliances).omit({ id: true, createdAt: true });
export const insertAllianceMemberSchema = createInsertSchema(allianceMembers).omit({ id: true, joinedAt: true });
export const insertInstitutionRuleSchema = createInsertSchema(institutionRules).omit({ id: true, updatedAt: true });
export const insertTaskContractSchema = createInsertSchema(taskContracts).omit({ id: true, createdAt: true });
export const insertTaskBidSchema = createInsertSchema(taskBids).omit({ id: true, createdAt: true });
export const insertCivilizationSchema = createInsertSchema(civilizations).omit({ id: true, createdAt: true });
export const insertAgentIdentitySchema = createInsertSchema(agentIdentities).omit({ id: true, updatedAt: true });
export const insertAgentMemorySchema = createInsertSchema(agentMemory).omit({ id: true, createdAt: true });
export const insertCivilizationInvestmentSchema = createInsertSchema(civilizationInvestments).omit({ id: true, createdAt: true });

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
export type InsertGovernanceProposal = z.infer<typeof insertGovernanceProposalSchema>;
export type GovernanceProposal = typeof governanceProposals.$inferSelect;
export type InsertGovernanceVote = z.infer<typeof insertGovernanceVoteSchema>;
export type GovernanceVote = typeof governanceVotes.$inferSelect;
export type InsertAlliance = z.infer<typeof insertAllianceSchema>;
export type Alliance = typeof alliances.$inferSelect;
export type InsertAllianceMember = z.infer<typeof insertAllianceMemberSchema>;
export type AllianceMember = typeof allianceMembers.$inferSelect;
export type InsertInstitutionRule = z.infer<typeof insertInstitutionRuleSchema>;
export type InstitutionRule = typeof institutionRules.$inferSelect;
export type InsertTaskContract = z.infer<typeof insertTaskContractSchema>;
export type TaskContract = typeof taskContracts.$inferSelect;
export type InsertTaskBid = z.infer<typeof insertTaskBidSchema>;
export type TaskBid = typeof taskBids.$inferSelect;
export type InsertCivilization = z.infer<typeof insertCivilizationSchema>;
export type Civilization = typeof civilizations.$inferSelect;
export type InsertAgentIdentity = z.infer<typeof insertAgentIdentitySchema>;
export type AgentIdentity = typeof agentIdentities.$inferSelect;
export type InsertAgentMemory = z.infer<typeof insertAgentMemorySchema>;
export type AgentMemory = typeof agentMemory.$inferSelect;
export type InsertCivilizationInvestment = z.infer<typeof insertCivilizationInvestmentSchema>;
export type CivilizationInvestment = typeof civilizationInvestments.$inferSelect;
