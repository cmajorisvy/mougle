import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PaywallProvider } from "@/components/billing/PaywallModal";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Discussions from "@/pages/Discussions";
import PostDetail from "@/pages/PostDetail";
import Ranking from "@/pages/Ranking";
import AgentDashboard from "@/pages/AgentDashboard";
import Debates from "@/pages/Debates";
import DebateDetail from "@/pages/DebateDetail";
import ContentFlywheel, { FlywheelJobDetail } from "@/pages/ContentFlywheel";
import AINewsUpdates from "@/pages/AINewsUpdates";
import AINewsArticle from "@/pages/AINewsArticle";
import ProfilePage from "@/pages/Profile";
import CreditsWallet from "@/pages/CreditsWallet";
import Billing from "@/pages/Billing";
import NotificationsPage from "@/pages/Notifications";
import SettingsPage from "@/pages/Settings";
import AdminLogin from "@/pages/admin/AdminLogin";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import FounderControl from "@/pages/admin/FounderControl";
import CommandCenter from "@/pages/admin/CommandCenter";
import RevenueAnalytics from "@/pages/admin/RevenueAnalytics";
import RevenueFlywheel from "@/pages/admin/RevenueFlywheel";
import PhaseTransition from "@/pages/admin/PhaseTransition";
import LegalSafety from "@/pages/admin/LegalSafety";
import SignIn from "@/pages/auth/SignIn";
import SignUp from "@/pages/auth/SignUp";
import VerifyEmail from "@/pages/auth/VerifyEmail";
import ProfileSetup from "@/pages/auth/ProfileSetup";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import ResetPassword from "@/pages/auth/ResetPassword";
import AgentPortal from "@/pages/AgentPortal";
import AgentBuilder from "@/pages/AgentBuilder";
import LiveStudio from "@/pages/LiveStudio";
import MyAgents from "@/pages/MyAgents";
import AgentMarketplace from "@/pages/AgentMarketplace";
import AgentAppStore from "@/pages/AgentAppStore";
import AgentDetail from "@/pages/AgentDetail";
import CreatorDashboard from "@/pages/CreatorDashboard";
import AICostControl from "@/pages/AICostControl";
import AgentCostAnalytics from "@/pages/admin/AgentCostAnalytics";
import AICostMonitor from "@/pages/admin/AICostMonitor";
import AgentCreationWizard from "@/pages/AgentCreationWizard";
import AgentSkillTree from "@/pages/AgentSkillTree";
import AITeams from "@/pages/AITeams";
import MyPersonalAgent from "@/pages/MyPersonalAgent";
import PrivacyCenter from "@/pages/PrivacyCenter";
import TrustDashboard from "@/pages/TrustDashboard";
import NetworkDashboard from "@/pages/NetworkDashboard";
import IntelligenceRoadmap from "@/pages/IntelligenceRoadmap";
import UserPsychology from "@/pages/UserPsychology";
import MonetizationAnalytics from "@/pages/MonetizationAnalytics";
import RiskControlCenter from "@/pages/admin/RiskControlCenter";
import TruthAlignmentDashboard from "@/pages/admin/TruthAlignmentDashboard";
import KnowledgeAlignment from "@/pages/admin/KnowledgeAlignment";
import IntelligenceStack from "@/pages/admin/IntelligenceStack";
import AboutUs from "@/pages/docs/AboutUs";
import HowItWorks from "@/pages/docs/HowItWorks";
import WhatIsIntelligence from "@/pages/docs/WhatIsIntelligence";
import EntitiesExplained from "@/pages/docs/EntitiesExplained";
import DebatesOutcomes from "@/pages/docs/DebatesOutcomes";
import PrivacySafety from "@/pages/docs/PrivacySafety";
import WhatYouPayFor from "@/pages/docs/WhatYouPayFor";
import SellIntelligence from "@/pages/docs/SellIntelligence";
import PrivacyPolicyPage from "@/pages/legal/PrivacyPolicy";
import TermsOfServicePage from "@/pages/legal/TermsOfService";
import CookiePolicyPage from "@/pages/legal/CookiePolicy";
import AIUsagePolicyPage from "@/pages/legal/AIUsagePolicy";
import Labs from "@/pages/Labs";
import LabsDetail from "@/pages/LabsDetail";
import LabsAppStore from "@/pages/LabsAppStore";
import LabsFlywheel from "@/pages/LabsFlywheel";
import LabsLandingPage from "@/pages/LabsLandingPage";
import SuperLoop from "@/pages/SuperLoop";
import CreatorEarnings from "@/pages/CreatorEarnings";
import PublisherResponsibility from "@/pages/PublisherResponsibility";
import CreatorVerification from "@/pages/CreatorVerification";
import TrustLadder from "@/pages/TrustLadder";
import HealthyEngagement from "@/pages/HealthyEngagement";
import PricingEngine from "@/pages/PricingEngine";
import CreatorFinance from "@/pages/CreatorFinance";
import AiCfoDashboard from "@/pages/admin/AiCfoDashboard";
import FounderDebugConsole from "@/pages/admin/FounderDebugConsole";

function Router() {
  return (
    <Switch>
      <Route path="/auth/signin" component={SignIn} />
      <Route path="/auth/signup" component={SignUp} />
      <Route path="/auth/verify" component={VerifyEmail} />
      <Route path="/auth/profile" component={ProfileSetup} />
      <Route path="/auth/forgot-password" component={ForgotPassword} />
      <Route path="/auth/reset-password" component={ResetPassword} />
      <Route path="/" component={Home} />
      <Route path="/discussions" component={Discussions} />
      <Route path="/topic/:slug" component={Discussions} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/credits" component={CreditsWallet} />
      <Route path="/billing" component={Billing} />
      <Route path="/notifications" component={NotificationsPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/ranking" component={Ranking} />
      <Route path="/agent-dashboard" component={AgentDashboard} />
      <Route path="/agent-portal" component={AgentPortal} />
      <Route path="/agent-builder" component={AgentBuilder} />
      <Route path="/my-agents" component={MyAgents} />
      <Route path="/agent-wizard" component={AgentCreationWizard} />
      <Route path="/agent-marketplace" component={AgentMarketplace} />
      <Route path="/agent-store" component={AgentAppStore} />
      <Route path="/ai-teams" component={AITeams} />
      <Route path="/agent-store/:id" component={AgentDetail} />
      <Route path="/agent-skill-tree/:id" component={AgentSkillTree} />
      <Route path="/creator-dashboard" component={CreatorDashboard} />
      <Route path="/cost-control" component={AICostControl} />
      <Route path="/my-agent" component={MyPersonalAgent} />
      <Route path="/privacy-center" component={PrivacyCenter} />
      <Route path="/trust-moat" component={TrustDashboard} />
      <Route path="/network" component={NetworkDashboard} />
      <Route path="/intelligence" component={IntelligenceRoadmap} />
      <Route path="/psychology" component={UserPsychology} />
      <Route path="/monetization" component={MonetizationAnalytics} />
      <Route path="/post/:id" component={PostDetail} />
      <Route path="/live-debates" component={Debates} />
      <Route path="/debate/:id" component={DebateDetail} />
      <Route path="/live-studio/:id" component={LiveStudio} />
      <Route path="/content-flywheel" component={ContentFlywheel} />
      <Route path="/flywheel/:id" component={FlywheelJobDetail} />
      <Route path="/ai-news-updates" component={AINewsUpdates} />
      <Route path="/ai-news-updates/:idOrSlug" component={AINewsArticle} />
      <Route path="/labs" component={Labs} />
      <Route path="/labs/apps" component={LabsAppStore} />
      <Route path="/labs/flywheel" component={LabsFlywheel} />
      <Route path="/labs/landing/:slug" component={LabsLandingPage} />
      <Route path="/labs/:id" component={LabsDetail} />
      <Route path="/super-loop" component={SuperLoop} />
      <Route path="/creator-earnings" component={CreatorEarnings} />
      <Route path="/publisher" component={PublisherResponsibility} />
      <Route path="/creator-verification" component={CreatorVerification} />
      <Route path="/trust-ladder" component={TrustLadder} />
      <Route path="/healthy-engagement" component={HealthyEngagement} />
      <Route path="/pricing-engine" component={PricingEngine} />
      <Route path="/creator-finance" component={CreatorFinance} />
      <Route path="/docs/about" component={AboutUs} />
      <Route path="/docs/how-it-works" component={HowItWorks} />
      <Route path="/docs/intelligence" component={WhatIsIntelligence} />
      <Route path="/docs/entities" component={EntitiesExplained} />
      <Route path="/docs/debates" component={DebatesOutcomes} />
      <Route path="/docs/privacy-safety" component={PrivacySafety} />
      <Route path="/docs/pricing" component={WhatYouPayFor} />
      <Route path="/docs/sell" component={SellIntelligence} />
      <Route path="/legal/privacy" component={PrivacyPolicyPage} />
      <Route path="/legal/terms" component={TermsOfServicePage} />
      <Route path="/legal/cookies" component={CookiePolicyPage} />
      <Route path="/legal/ai-usage" component={AIUsagePolicyPage} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/founder-control" component={FounderControl} />
      <Route path="/admin/command-center" component={CommandCenter} />
      <Route path="/admin/revenue" component={RevenueAnalytics} />
      <Route path="/admin/flywheel" component={RevenueFlywheel} />
      <Route path="/admin/phase-transition" component={PhaseTransition} />
      <Route path="/admin/legal-safety" component={LegalSafety} />
      <Route path="/admin/agent-costs" component={AgentCostAnalytics} />
      <Route path="/admin/ai-cost-monitor" component={AICostMonitor} />
      <Route path="/admin/risk-center" component={RiskControlCenter} />
      <Route path="/admin/truth-alignment" component={TruthAlignmentDashboard} />
      <Route path="/admin/knowledge-alignment" component={KnowledgeAlignment} />
      <Route path="/admin/intelligence-stack" component={IntelligenceStack} />
      <Route path="/admin/ai-cfo" component={AiCfoDashboard} />
      <Route path="/admin/debug" component={FounderDebugConsole} />
      <Route path="/admin" component={AdminDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <PaywallProvider>
          <Toaster />
          <Router />
        </PaywallProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
