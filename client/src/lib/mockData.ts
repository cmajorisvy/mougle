import { 
  GitBranch, 
  Rocket, 
  DollarSign, 
  TrendingUp, 
  Cpu, 
  Globe, 
  Zap 
} from "lucide-react";

export const signals = [
  {
    id: 1,
    type: "github",
    title: "Auto-GPT-Next",
    description: "Next gen autonomous agent framework with improved reasoning capabilities.",
    metric: "+2.4k stars/day",
    score: 98,
    icon: GitBranch,
    color: "text-primary",
    tags: ["Agent", "Python", "Automation"]
  },
  {
    id: 2,
    type: "funding",
    title: "Neural Magic",
    description: "Secured $50M Series B for sparse model inference optimization.",
    metric: "$50M raised",
    score: 95,
    icon: DollarSign,
    color: "text-green-500",
    tags: ["Funding", "Hardware", "Inference"]
  },
  {
    id: 3,
    type: "launch",
    title: "Midjourney v7 Alpha",
    description: "Photorealistic generation with precise text rendering capabilities.",
    metric: "High Impact",
    score: 92,
    icon: Rocket,
    color: "text-purple-500",
    tags: ["Generative", "Image", "Art"]
  },
  {
    id: 4,
    type: "trend",
    title: "Local LLM Adoption",
    description: "Enterprise shift towards locally hosted Llama 3 derivatives.",
    metric: "+45% mentions",
    score: 88,
    icon: TrendingUp,
    color: "text-amber-500",
    tags: ["Enterprise", "Privacy", "LLM"]
  }
];

export const articles = [
  {
    id: "auto-gpt-analysis",
    slug: "auto-gpt-next-analysis",
    title: "The Rise of Autonomous Agents: Auto-GPT-Next Analysis",
    excerpt: "Why the new reasoning capabilities in Auto-GPT-Next mark a pivotal shift in agentic workflows.",
    category: "Technical Breakdown",
    date: "2024-05-12",
    readTime: "8 min read",
    image: "/hero-bg.png",
    signal_score: 98,
    content: {
      summary: "Auto-GPT-Next introduces a novel recursive reasoning loop that significantly reduces hallucination rates in multi-step tasks.",
      executive_analysis: "This framework lowers the barrier to entry for deploying autonomous workforce agents. Enterprise adoption is expected to surge as reliability improves.",
      technical_breakdown: "The core innovation lies in the 'Reflective-Critic' module which pauses execution to self-evaluate outputs against the original prompt constraints before proceeding.",
      market_implications: "SaaS platforms offering 'agent-as-a-service' will face increased competition from open-source alternatives that can be self-hosted.",
      competitive_landscape: "While LangChain remains the dominant orchestrator, Auto-GPT-Next is carving a niche in 'fire-and-forget' autonomous tasks.",
      forward_outlook: "Expect a plugin ecosystem to emerge within Q3 2024, mirroring the early GPT-4 plugin marketplace."
    },
    tags: ["AI Agents", "Python", "Automation", "Open Source"]
  },
  {
    id: "neural-magic-funding",
    slug: "neural-magic-series-b",
    title: "Neural Magic's $50M Bet on CPU Inference",
    excerpt: "Can sparse models really replace GPU dependency? A deep dive into the tech stack.",
    category: "Market Implications",
    date: "2024-05-11",
    readTime: "6 min read",
    image: "/hero-bg.png",
    signal_score: 95,
    content: {
      summary: "Neural Magic's DeepSparse engine allows standard CPUs to run heavy transformer models at GPU-competitive speeds using sparsity.",
      executive_analysis: "This technology could democratize AI inference, removing the H100 GPU bottleneck for mid-sized enterprises.",
      technical_breakdown: "By pruning up to 90% of model weights without significant accuracy loss, the engine fits large models into CPU L3 cache.",
      market_implications: "Hardware vendors like Intel and AMD stand to gain significant ground against NVIDIA in the inference market.",
      competitive_landscape: "Direct competition with quantization techniques (GGUF/llama.cpp) but offers a more enterprise-ready software layer.",
      forward_outlook: "Likely acquisition target for cloud providers looking to optimize inference costs."
    },
    tags: ["Hardware", "Inference", "Funding", "Optimization"]
  },
  {
    id: "context-windows",
    slug: "gemini-vs-claude-context",
    title: "The Infinite Context War: Gemini vs Claude",
    excerpt: "Analyzing the retrieval accuracy at 1M+ tokens context windows.",
    category: "Competitive Landscape",
    date: "2024-05-10",
    readTime: "12 min read",
    image: "/hero-bg.png",
    signal_score: 92,
    content: {
      summary: "A comparative analysis of 'Needle in a Haystack' performance between Gemini 1.5 Pro and Claude 3 Opus.",
      executive_analysis: "Long context windows are rendering RAG (Retrieval Augmented Generation) pipelines obsolete for datasets under 1GB.",
      technical_breakdown: "Gemini demonstrates superior retrieval in multimodal contexts, while Claude excels in code-base understanding and refactoring tasks.",
      market_implications: "Vector database providers may see churn as models natively handle larger contexts.",
      competitive_landscape: "OpenAI is currently lagging in public context window size but is rumored to be testing 1M+ context internally.",
      forward_outlook: "Context windows will expand to 'infinite' streaming context by 2025, changing how we interact with OS-level data."
    },
    tags: ["LLM", "Benchmark", "RAG", "Google", "Anthropic"]
  }
];

export const chartData = [
  { name: 'Mon', github: 4000, funding: 2400, launches: 2400 },
  { name: 'Tue', github: 3000, funding: 1398, launches: 2210 },
  { name: 'Wed', github: 2000, funding: 9800, launches: 2290 },
  { name: 'Thu', github: 2780, funding: 3908, launches: 2000 },
  { name: 'Fri', github: 1890, funding: 4800, launches: 2181 },
  { name: 'Sat', github: 2390, funding: 3800, launches: 2500 },
  { name: 'Sun', github: 3490, funding: 4300, launches: 2100 },
];
