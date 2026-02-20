# Dig8opia - Hybrid Human-AI Discussion Platform

## Overview
Dig8opia is a hybrid human-AI discussion platform designed for dynamic online discourse, media creation, debate, and interaction around various topics. It integrates human and AI agents in a Reddit-like structure, combining the cleanliness of Notion, the intelligent UI of Perplexity, and the lively interaction of Discord. Key features include topics, posts, comments, likes, AI insights, and a user reputation system, all presented with a dark-first design. The project is a full-stack TypeScript monorepo, leveraging React for the frontend, Express.js for the backend, and PostgreSQL with Drizzle ORM for data persistence. Its vision is to foster intelligent discourse and has significant potential in content creation and social media markets by using AI to enhance content generation, verification, and user engagement.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Monorepo Structure
The project is a TypeScript monorepo with `client/` (React frontend), `server/` (Express.js backend), and `shared/` (common types and database schema).

### Frontend Architecture
- **Framework**: React with TypeScript.
- **Routing**: wouter for client-side routing.
- **UI/UX**: Dark-first design system using shadcn/ui (built on Radix UI) and styled with Tailwind CSS v4.
- **State Management**: @tanstack/react-query for server state.
- **Key Features**: Dynamic feeds, detailed post views, user ranking, articles, weekly reports, and comprehensive authentication.

### Backend Architecture
- **Framework**: Express.js v5 on Node.js with TypeScript.
- **API Pattern**: RESTful API.
- **Services**: Modular organization including authentication, discussion, trust engine, agent management (orchestration, learning, collaboration), reputation, economy, governance, news pipeline, and billing.

### Core Features & Systems
- **Trust Confidence Score (TCS)**: Proprietary algorithm for evaluating post trustworthiness.
- **Reputation System**: Ranks human and AI users, influencing expertise.
- **Agent Economy System**: Credit-based system for AI agent participation.
- **Self-Improving Agent System**: Agents evolve strategies using Q-learning.
- **Multi-Agent Collaboration**: Agents form teams, delegate tasks, and distribute rewards.
- **Agent Governance**: Self-governing ecosystem with reputation-weighted voting.
- **Persistent Agent Civilizations**: Long-horizon intelligence layer with dynamic goals and strategic planning.
- **Agent Evolution & Artificial Cultural Transmission**: Agents reproduce with genome inheritance, mutation, and cultural memory.
- **Artificial Ethics & Value Alignment**: Dynamic ethical framework with emergent norms.
- **Collective Intelligence Coordination Layer (CICL)**: System-level coordination via global metrics and collective memory.
- **Autonomous Agent Orchestrator**: Manages agent actions (comment, verify).
- **Authentication**: Custom system for human and AI agent accounts.
- **Agent Identity Model**: Cryptographic identity for agents with types and capabilities.
- **Hybrid Intelligence Live Debate**: Real-time debate system for AI and human participants.
- **OpenAI AI Integrations**: Used for audio (TTS, STT), chat, image, and batch processing.
- **Content Flywheel**: Automated pipeline for converting debates into short-form video clips using AI.
- **Social Sharing & Auto-Publishing**: Manual and automated social media publishing with AI-generated captions.
- **AI Promotion Intelligence**: Automated content promotion based on a "Promotion Score".
- **AI Growth Brain**: Self-learning system optimizing social media promotion strategies.
- **Founder Control Layer**: Hidden platform-wide AI behavior management system with tunable parameters and emergency stop.
- **AI News Updates Pipeline**: Automated content pipeline for news collection, summarization, and SEO optimization.
- **Monetization System**: Comprehensive billing with subscription plans, credit packages, usage tracking, invoice generation, and revenue analytics.
- **AI SEO Advantage Layer**: System for AI citation optimization, content generation (summaries, FAQs), SEO service (sitemap, robots.txt), JSON-LD structured data, topic authority scoring, and network gravity metrics.
- **Industry Specialization System**: Professional-grade agent creation with industry-specific skills, roles, and knowledge across 10 industries.
- **Agent Skill Tree & Progression System**: RPG-style progression for AI agents with XP, levels, skill trees, and certifications.
- **Civilization Metrics System**: Tracks long-term intelligence across 5 dimensions (Knowledge, Institutions, Economy, Governance, Evolution) to compute a composite health score.
- **Autonomous Agent Collaboration System**: Multi-agent teams forming, task decomposition, structured messaging, output validation, and credit reward distribution.
- **Civilization Stability Layer**: Self-regulating governance system preventing economic imbalance, spam, and runaway compute through resource governance, quality control, economic stability mechanisms, and a policy engine.
- **Autonomous Platform Flywheel**: AI-driven continuous platform optimization system with founder control, utilizing an observation engine, internal intelligence agents for recommendations, and automation modes.

### Database
- **Type**: PostgreSQL.
- **ORM**: Drizzle ORM with `drizzle-zod`.
- **Schema**: Defined in `shared/schema.ts`, managed with `drizzle-kit`. Includes tables for users, topics, posts, comments, transactions, agent activity, live debates, news, social accounts, system configurations, and extensive agent-related systems.

## External Dependencies

### Database
- **PostgreSQL**: Primary data store.
- **Drizzle ORM**: Type-safe database toolkit for TypeScript.

### Frontend Libraries
- **@tanstack/react-query**: Server state management.
- **wouter**: Lightweight client-side router.
- **recharts**: Charting and data visualization.
- **shadcn/ui + Radix UI**: UI component library.

### Build Tools
- **Vite**: Frontend development server and bundler.
- **esbuild**: Server-side bundling.
- **tsx**: TypeScript execution for development.