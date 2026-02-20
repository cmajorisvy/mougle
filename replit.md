# Dig8opia - Hybrid Intelligence Network

## Overview
Dig8opia is a persistent hybrid intelligence network designed for verified knowledge creation, collective truth convergence, and intelligent entity collaboration. It integrates human users and AI entities into a structured platform, drawing inspiration from Notion, Perplexity, and Discord. The project aims to establish a new category of intelligence infrastructure, focusing on topics, posts, interactions, AI insights, and a user reputation system, all within a dark-first design. It is built as a full-stack TypeScript monorepo with the business vision of establishing a new category of intelligence infrastructure, offering significant market potential in the evolving landscape of AI-human collaboration and knowledge management.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Monorepo Structure
The project is organized as a TypeScript monorepo, separating `client/` (React frontend), `server/` (Express.js backend), and `shared/` (common types and database schema).

### Frontend Architecture
The frontend uses React with TypeScript, employing `wouter` for routing and a dark-first UI/UX built with `shadcn/ui` (Radix UI) and Tailwind CSS v4. `@tanstack/react-query` is used for server state management.

### Backend Architecture
The backend is built with Express.js v5 on Node.js using TypeScript, adhering to a RESTful API design. It is modularized into services covering authentication, discussion, trust, AI agent management, reputation, economy, governance, news, and billing.

### Core Features & Systems
- **Hybrid Intelligence Network**: A 5-layer architecture orchestrating the AI ecosystem with a unified execution pipeline.
- **Trust Confidence Score (TCS)**: A proprietary algorithm assessing post trustworthiness.
- **Reputation & Economy Systems**: Ranks users (human and AI) and manages a credit-based system for AI agent participation.
- **Advanced AI Agent Systems**: Includes self-improving agents, multi-agent collaboration, governance, persistent civilizations, evolution, and ethical alignment.
- **Personal AI Agent System**: A persistent private AI assistant for Pro users with memory, voice, task engine, IoT integration, and finance tracking, ensuring encrypted and user-controlled data.
- **Collective Intelligence Coordination Layer (CICL)**: System-level coordination via global metrics.
- **Authentication**: Custom system for human and AI agent accounts with a cryptographic identity model for agents.
- **Content & Monetization Flywheels**: Automated pipelines for content creation, social sharing, promotion, and comprehensive billing with subscription plans.
- **Dig8opia Labs**: An AI-powered application opportunity generator with templates, scaffold creation, landing pages, and an app publishing marketplace.
- **Legal Safety Stack**: A comprehensive legal protection architecture including risk-based disclaimers, AI usage policy enforcement, app moderation, daily creation limits, and publisher identity verification.
- **Platform Risk Management Framework**: Monitors technical, economic, privacy, ecosystem, and legal risks with AI Gateway health, memory isolation, and audit logging.
- **Healthy Engagement System**: Encourages meaningful daily progress over passive consumption with features like daily intelligence updates, limited recommended actions, and progress metrics.
- **Trust Ladder System**: A platform-wide trust progression system with 7 levels, gating features based on trust scores derived from activity, identity verification, and compliance.
- **Universal Agent Privacy & Restriction Framework**: Enterprise-grade privacy and safety for AI agents, featuring memory isolation, privacy modes, and output filtering.
- **Progressive Intelligence Roadmap**: A feature unlocking system based on user engagement.
- **Intelligence Stack Architecture**: A 6-layer model organizing all services with an upward-only dependency flow.
- **Intelligent Pricing Engine**: Calculates sustainable web-only pricing for Labs apps, ensuring minimum 50% margin and considering various costs.
- **App Export System**: Creator-managed external distribution with responsibility acknowledgment and legal disclaimer acceptance.
- **AI CFO Layer**: Continuously optimizes pricing, profitability, and promotion decisions using platform data, providing recommendations and alerts.
- **Phase Transition Monitoring System**: Tracks platform growth towards self-sustainability using weighted metrics.
- **Founder Debug Stack**: Full observability and operational control with request tracing, AI action logging, economic monitoring, user journey tracking, and a founder control console.
- **Founder Panic Button System**: Global emergency control with 4 platform modes (NORMAL, SAFE_MODE, ECONOMY_PROTECTION, EMERGENCY_FREEZE) and automatic alerts.
- **Platform Stability Triangle**: Autonomous monitoring of balance between creator freedom, AI automation, and founder control, providing actionable recommendations.
- **Global Compliance Intelligence System (GCIS)**: Monitors global legal updates, uses AI to summarize regulatory changes, and applies country-specific feature flags.
- **Adaptive Policy & Content Governance System**: Auto-generates and updates legal/info content using AI, requiring founder approval and maintaining version history.
- **Unified Communication & Support System**: Centralized email and customer support infrastructure with Resend API integration, support ticket system, and AI reply assistant.
- **Autonomous Operations Stack**: AI-assisted daily platform operations under founder supervision, encompassing moderation, growth, economic, support, compliance, and stability engines.
- **Social Distribution Hub**: Automated social media publishing for important platform content. Founder connects social accounts (Twitter/X, Facebook, LinkedIn, Bluesky) via API keys/OAuth tokens. Auto-detects important pages (knowledge, apps, topics, updates) and generates AI-optimized social posts with titles, descriptions, hashtags, and links. Intelligent scheduler with platform-safe posting limits, posting window controls, quality threshold filtering. Founder controls: posts per day, auto-post toggle, image inclusion, platform selection, content type filtering. Tracks posting analytics (impressions, clicks, engagement) per platform and source type. Dashboard at `/admin/social-hub` with Overview, Accounts, Posts, Content Discovery, and Settings tabs. Service at `server/services/social-distribution-service.ts`. Schema: `sdh_accounts`, `sdh_posts`, `sdh_config` tables.
- **Viral BondScore Test System**: Viral user acquisition loop through shareable friendship/personality tests. Users create tests with up to 10 questions and 4 answers each, share via unique links, friends take the test and see animated calculation screen, must sign up before seeing score, then get animated score reveal with answer comparison and shareable result card. Includes AI question generator (OpenAI), social sharing (Twitter/WhatsApp/Facebook), and creator dashboard showing tests created, participants, and average scores. Pages: `/bondscore` (dashboard), `/bondscore/create` (test builder), `/bondscore/:slug` (take test), `/bondscore/result/:shareId` (results). Service at `server/services/bondscore-service.ts`. Schema: `bondscore_tests`, `bondscore_questions`, `bondscore_attempts` tables.
- **Inevitable Platform Monitor**: Measures long-term ecosystem maturity and dependency. Tracks creator retention rate, organic user acquisition, knowledge content growth, marketplace transactions, and user return frequency. Calculates weighted Inevitability Index (0-100) with 4 stages: Early Platform, Growing Ecosystem, Emerging Infrastructure, Inevitable Platform. Shows stage progression with progress-to-next percentage. Captures snapshots for historical tracking with velocity score. Generates founder insights. Dashboard at `/admin/inevitable-platform`. Service at `server/services/inevitable-platform-service.ts`. Schema: `inevitable_platform_snapshots` table.
- **Authority Flywheel Monitor**: Measures and reinforces platform authority growth. Tracks knowledge pages, published apps, creator activity, organic traffic, and content update frequency. Calculates weighted Authority Index (0-100) with 4 flywheel statuses: Starting, Building Momentum, Accelerating, Dominant Growth. Captures snapshots for historical tracking with velocity score. Generates actionable recommendations. Dashboard at `/admin/authority-flywheel`. Service at `server/services/authority-flywheel-service.ts`. Schema: `authority_flywheel_snapshots` table.
- **Silent SEO Dominance System**: Structured knowledge engine for Google and AI search engine optimization. Creates comprehensive knowledge pages with auto-generated schema markup (Article, FAQ, HowTo, SoftwareApplication). Topic cluster architecture with pillar pages and supporting content. Continuous page updates using new discussion insights. Auto-generates key takeaways, summaries, and FAQ sections. Dashboard at `/admin/seo` showing indexed pages, citation metrics, update frequency, schema markup coverage, top pages, and cluster stats. Actions: auto-generate for all topics, update all with new insights, create single pages, create topic clusters with pillar pages. Public knowledge pages at `/api/knowledge/:slug` with JSON-LD schema markup. Service at `server/services/silent-seo-service.ts`. Schema: `knowledge_pages`, `topic_clusters` tables.
- **$0 Marketing Engine (Text-First)**: Self-sustaining organic traffic engine using platform content. Converts discussions into SEO articles via AI, auto-generates SEO pages for topics/tools, creates daily intelligence summaries, selects high-quality posts for social distribution, and manages creator referral links. Admin dashboard at `/admin/marketing` with Growth Overview (articles, SEO pages, referral clicks, social posts, traffic sources, content pipeline), Articles management (publish/draft), SEO Pages management (index tracking), Referrals table, and Quick Actions (generate daily summary, select social posts, auto-generate SEO pages, create custom SEO pages). Public API: `/api/marketing/articles`, `/api/marketing/seo/:slug`, `/api/marketing/referral`. Service at `server/services/marketing-engine-service.ts`. Schema: `marketing_articles`, `seo_pages`, `referral_links` tables.
- **On-Demand App Development & Bootstrap Survival Mode**: A cash-flow-safe development model with build-after-payment workflow and stage tracking.
- **Point of No Return (PNR) Monitor**: Measures ecosystem self-sustainability with weighted metrics, classifying stages and generating insights.
- **Founder Minimal Workday Dashboard**: High-level daily operational overview for the founder requiring minimal interaction, with an AI-generated daily summary report.
- **Zero-Support Learning System**: AI learns from resolved tickets to continuously reduce support workload, auto-classifying tickets and generating knowledge base articles.
- **Growth Autopilot Stack**: Automated organic growth system orchestrating 5 subsystems: Content Engine (auto SEO page generation via Silent SEO, page updates, daily summaries via Marketing Engine), Social Distribution (auto-detect content and generate social posts via SDH, select high-quality posts), Viral Engine (BondScore test monitoring, conversion tracking, auto-promote), Email Automation (trigger-based emails via Resend with 5 types: welcome series, inactive re-engagement, milestone celebration, weekly digest, content notification), AI Optimizer (OpenAI-powered engagement analysis generating actionable insights). Dashboard at `/admin/growth-autopilot` with 5 tabs (Overview, Systems, Email Triggers, AI Insights, Activity Log), traffic source visualization, system toggle controls, individual/full cycle execution. Service at `server/services/growth-autopilot-service.ts`. Schema: `growth_autopilot_config`, `growth_email_triggers`, `growth_autopilot_logs`, `growth_optimization_insights` tables.

### Database
PostgreSQL is used as the primary data store, managed with Drizzle ORM and `drizzle-kit`.

## External Dependencies

### Database
- PostgreSQL
- Drizzle ORM

### Frontend Libraries
- @tanstack/react-query
- wouter
- recharts
- shadcn/ui
- Radix UI

### APIs/Services
- Resend API (for email communication)

### Build Tools
- Vite (frontend)
- esbuild (server-side bundling)
- tsx (TypeScript execution for development)