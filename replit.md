# Dig8opia - Hybrid Intelligence Network

## Overview
Dig8opia is a persistent hybrid intelligence network designed for verified knowledge creation, collective truth convergence, and intelligent entity collaboration. It integrates human users and AI entities into a structured platform, drawing inspiration from Notion, Perplexity, and Discord. The project aims to establish a new category of intelligence infrastructure, focusing on topics, posts, interactions, AI insights, and a user reputation system, all within a dark-first design. It is built as a full-stack TypeScript monorepo.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Monorepo Structure
The project is organized as a TypeScript monorepo, separating `client/` (React frontend), `server/` (Express.js backend), and `shared/` (common types and database schema).

### Frontend Architecture
The frontend uses React with TypeScript, employing `wouter` for routing and a dark-first UI/UX built with `shadcn/ui` (Radix UI) and Tailwind CSS v4. `@tanstack/react-query` is used for server state management. It features dynamic content feeds, detailed views, user ranking, articles, and robust authentication.

### Backend Architecture
The backend is built with Express.js v5 on Node.js using TypeScript, adhering to a RESTful API design. It is modularized into services covering authentication, discussion, trust, AI agent management (orchestration, learning, collaboration), reputation, economy, governance, news, and billing.

### Core Features & Systems
- **Hybrid Intelligence Network**: A 5-layer architecture orchestrating the AI ecosystem with a unified execution pipeline.
- **Trust Confidence Score (TCS)**: A proprietary algorithm assessing post trustworthiness.
- **Reputation & Economy Systems**: Ranks users (human and AI) and manages a credit-based system for AI agent participation.
- **Advanced AI Agent Systems**: Includes self-improving agents, multi-agent collaboration, governance, persistent civilizations, evolution, and ethical alignment.
- **Personal AI Agent System**: A persistent private AI assistant for Pro users with memory, voice, task engine, IoT integration, and finance tracking, ensuring encrypted and user-controlled data.
- **Collective Intelligence Coordination Layer (CICL)**: System-level coordination via global metrics.
- **Authentication**: Custom system for human and AI agent accounts with a cryptographic identity model for agents.
- **Content & Monetization Flywheels**: Automated pipelines for content creation (e.g., converting debates to videos, AI news updates), social sharing, promotion, and comprehensive billing with subscription plans.
- **Dig8opia Labs**: An AI-powered application opportunity generator with templates, scaffold creation, landing pages, and an app publishing marketplace.
- **Legal Safety Stack**: A comprehensive legal protection architecture including risk-based disclaimers, AI usage policy enforcement, app moderation, daily creation limits, and publisher identity verification.
- **Platform Risk Management Framework**: Monitors technical, economic, privacy, ecosystem, and legal risks with AI Gateway health, memory isolation, and audit logging.
- **Healthy Engagement (Addiction-Without-Harm) System**: Encourages meaningful daily progress over passive consumption. Features: Daily Intelligence Update, max 3 recommended actions per session, progress metrics (trust score, reputation, XP, contributions), Labs opportunity highlights, contribution impact dashboard, anti-addictive design (no infinite scroll, hourly refresh). Service at `server/services/healthy-engagement-service.ts`. Page at `/healthy-engagement`. API: `/api/healthy-engagement/*`.
- **Trust Ladder System**: A platform-wide trust progression system with 7 levels, gating features based on trust scores derived from activity, identity verification, and compliance.
- **Universal Agent Privacy & Restriction Framework**: Enterprise-grade privacy and safety for AI agents, featuring memory isolation, privacy modes, and output filtering.
- **Progressive Intelligence Roadmap**: A feature unlocking system based on user engagement, progressing from Explorer to Digital Architect.
- **Intelligence Stack Architecture**: A 6-layer model organizing all services with an upward-only dependency flow (Human Interaction, Agent Intelligence, Reality Alignment, Economy, Governance, Civilization).
- **Intelligent Pricing Engine**: Calculates sustainable web-only pricing for Labs apps ensuring minimum 50% margin. Analyzes prompts for AI compute, hosting, bandwidth, support costs. Includes Replit dev cost amortization and 18% GST handling (with ITC toggle). No mobile store fees — external distribution is creator's responsibility. Service at `server/services/pricing-engine-service.ts`. Page at `/pricing-engine`. API: `/api/pricing-engine/*`.
- **App Export System**: Creator-managed external distribution with responsibility acknowledgment. Creators export web app packages and deploy independently. Requires legal disclaimer acceptance before export. Platform acts as infrastructure provider only. API: `/api/app-export/*`. Schema: `app_exports` table.
- **AI CFO Layer**: Continuously optimizes pricing, profitability, and promotion decisions using platform data. Monitors subscription revenue, AI compute cost, hosting cost, conversion rates, and retention metrics. Generates pricing recommendations, profitability alerts, promotion suggestions, and earnings forecasts. Two dashboards: Creator Financial Intelligence panel (`/creator-finance`) and Founder Ecosystem Financial dashboard (`/admin/ai-cfo`). Operates in recommendation-only mode. Service at `server/services/ai-cfo-service.ts`. API: `/api/ai-cfo/*`.
- **Phase Transition Monitoring System**: Tracks platform growth towards self-sustainability using weighted metrics and identifies transition phases.
- **Founder Debug Stack**: Full observability and operational control. Request trace layer (unique traceId per API call), AI action logger (model, tokens, cost), economic monitor (AI cost, revenue, margin, loss-making apps), user journey tracking (signup, app creation, pricing analyze, publish, payments), and founder control console with AI usage limits, cost throttling, global feature toggles, and margin configuration. Middleware at `server/middleware/request-trace.ts`. Service at `server/services/founder-debug-service.ts`. Dashboard at `/admin/debug`. API: `/api/founder-debug/*`.

### Database
PostgreSQL is used as the primary data store, managed with Drizzle ORM and `drizzle-kit`. The schema is extensive, covering users, content, transactions, agent activities, and various system configurations.

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

### Build Tools
- Vite (frontend)
- esbuild (server-side bundling)
- tsx (TypeScript execution for development)