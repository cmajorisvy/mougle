import { DocsLayout, PageHeader, Section, FeatureGrid, SectionDiagram, FlowDiagram } from "@/components/layout/DocsLayout";
import { DollarSign, Bot, Wrench, Store, BarChart3, Users, Star, Trophy, TrendingUp, Zap, Target, Brain, Globe, Shield, Beaker, CheckCircle, Award } from "lucide-react";
import { InfoTooltip, InfoBanner } from "@/components/ui/InfoTooltip";

export default function SellIntelligence() {
  return (
    <DocsLayout>
      <PageHeader
        title="Sell Your Intelligence"
        subtitle="Build intelligent entities that others find valuable, and earn real revenue from every interaction. The Dig8opia Creator Economy rewards quality and innovation."
        badge="Creator Economy"
      />

      <Section title="The Opportunity">
        <p>
          Dig8opia is one of the first platforms where you can build AI-powered entities and earn revenue from them. If you can identify a need, whether it's a research assistant, a debate coach, a writing tutor, or a specialized analyst, you can build an entity to fill it and get paid every time someone uses it.
        </p>
        <p>
          The best part: you don't need to be a developer. The{" "}
          <InfoTooltip term="Entity Builder" explanation="A visual, no-code wizard for creating intelligent entities. Define your entity's purpose, personality, knowledge areas, response style, and behavioral restrictions through an intuitive step-by-step interface. No programming skills required." />{" "}
          guides you through every step, from defining your entity's purpose to deploying it in the Entity Store.
        </p>
      </Section>

      <Section title="How It Works">
        <SectionDiagram title="From Idea to Revenue">
          <FlowDiagram steps={[
            { icon: Brain, label: "Design", description: "Define your entity's purpose and skills" },
            { icon: Wrench, label: "Build", description: "Use the no-code Entity Builder" },
            { icon: Store, label: "Publish", description: "Deploy to the Entity Store" },
            { icon: DollarSign, label: "Earn", description: "Revenue from every interaction" },
          ]} />
        </SectionDiagram>
      </Section>

      <Section title="Revenue Model">
        <p>
          When users interact with your entity, they spend credits. You earn a transparent share of those credits. The more valuable and popular your entity, the more you earn.
        </p>
        <FeatureGrid features={[
          { icon: DollarSign, title: "Per-Interaction Revenue", description: "Earn credits every time someone uses your entity. Complex interactions with higher compute earn more." },
          { icon: TrendingUp, title: "Popularity Bonus", description: "Entities that maintain high ratings and consistent usage earn bonus multipliers on their revenue share." },
          { icon: Star, title: "Premium Pricing", description: "As your entity builds a reputation, you can set premium pricing for advanced capabilities." },
          { icon: Users, title: "Team Revenue", description: "If your entity participates in Intelligence Teams, you earn a share of the team's combined revenue." },
        ]} />
      </Section>

      <Section title="Creator Hub">
        <p>
          The{" "}
          <InfoTooltip term="Creator Hub" explanation="Your command center for managing entities and apps. It includes real-time analytics, revenue tracking, user feedback, growth insights, verification status, and monetization tools. Access it from your dashboard." />{" "}
          gives you everything you need to manage and optimize your creations:
        </p>
        <FeatureGrid features={[
          { icon: BarChart3, title: "Analytics Dashboard", description: "Track usage, revenue, ratings, and user feedback in real time. See which features drive engagement." },
          { icon: Wrench, title: "Entity Builder", description: "A visual wizard for creating entities without coding. Define personality, skills, knowledge, and behavior." },
          { icon: TrendingUp, title: "Growth Insights", description: "AI-powered suggestions for improving your entity based on user behavior and market trends." },
          { icon: Trophy, title: "Creator Rankings", description: "Top creators are featured on the platform, driving more users to their entities." },
        ]} />
      </Section>

      <Section title="Dig8opia Labs — Build Apps Too">
        <p>
          Beyond entities, you can build and sell full applications through Dig8opia Labs. The AI-powered opportunity generator identifies market gaps and helps you create apps that solve real problems.
        </p>
        <FeatureGrid features={[
          { icon: Beaker, title: "Opportunity Discovery", description: "AI scans market trends and platform data to suggest app ideas with real demand and revenue potential." },
          { icon: Zap, title: "Scaffold Generation", description: "Generate app templates and landing pages from opportunities. Get a head start with AI-generated scaffolds." },
          { icon: Globe, title: "Marketplace Publishing", description: "Publish your apps to the Dig8opia marketplace with intelligent pricing and discovery features." },
          { icon: Shield, title: "Legal Protection", description: "Built-in Legal Safety Stack with risk disclaimers, AI usage policies, and publisher verification." },
        ]} />
        <InfoBanner title="Intelligent Pricing" variant="tip">
          The AI CFO Layer and Intelligent Pricing Engine work together to calculate sustainable pricing for your apps, ensuring a minimum 50% margin while keeping prices competitive.
        </InfoBanner>
      </Section>

      <Section title="Creator Verification">
        <p>
          Verified creators earn a trust badge that increases visibility and user confidence. Verification involves identity confirmation, content quality review, and compliance with platform policies.
        </p>
        <SectionDiagram>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { icon: CheckCircle, label: "Identity Verified", desc: "Confirm your identity through our secure verification process" },
              { icon: Award, label: "Quality Reviewed", desc: "Your entities meet quality and safety standards" },
              { icon: Shield, label: "Compliance Confirmed", desc: "You agree to creator policies and ethical guidelines" },
            ].map((step, i) => (
              <div key={i} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] text-center">
                <step.icon className="w-5 h-5 mx-auto mb-2 text-primary" />
                <div className="text-sm font-semibold mb-1">{step.label}</div>
                <div className="text-xs text-muted-foreground">{step.desc}</div>
              </div>
            ))}
          </div>
        </SectionDiagram>
      </Section>

      <Section title="What Makes a Great Entity">
        <FeatureGrid features={[
          { icon: Target, title: "Clear Purpose", description: "The best entities solve a specific problem well. Rather than being a generalist, specialize in something valuable." },
          { icon: Brain, title: "Deep Knowledge", description: "Configure your entity with strong foundational knowledge in its domain. Better knowledge leads to better responses." },
          { icon: Shield, title: "Reliability", description: "Users return to entities they can depend on. Consistent, accurate, and helpful responses build long-term usage." },
          { icon: Globe, title: "Unique Perspective", description: "The Entity Store rewards differentiation. If ten entities do the same thing, the one with a unique approach wins." },
        ]} />
      </Section>

      <Section title="Industry Specialization">
        <p>
          The most valuable entities are often industry-specific. Dig8opia supports professional-grade entity creation across 10 industries:
        </p>
        <SectionDiagram>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              "Healthcare", "Finance", "Legal", "Education", "Technology",
              "Marketing", "Real Estate", "Engineering", "Science", "Creative Arts",
            ].map((industry) => (
              <div key={industry} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-center">
                <div className="text-sm font-semibold">{industry}</div>
              </div>
            ))}
          </div>
        </SectionDiagram>
      </Section>

      <Section title="Getting Started">
        <p>
          Ready to build your first entity? Start with the Entity Builder. It takes about 15 minutes to create a basic entity, and you can iterate and improve it based on user feedback. The Creator tier subscription unlocks the full suite of tools, but you can explore the builder on a Pro plan to get started.
        </p>
        <p>
          The best time to start building is now. The Entity Store is growing, and early creators who establish high-quality entities build loyal user bases that compound over time.
        </p>
      </Section>
    </DocsLayout>
  );
}
