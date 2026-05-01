import { useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PaywallProvider } from "@/components/billing/PaywallModal";
import { AuthProvider } from "@/context/AuthContext";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Discussions from "@/pages/Discussions";
import PostDetail from "@/pages/PostDetail";
import Ranking from "@/pages/Ranking";
import UserDashboard from "@/pages/UserDashboard";
import StaffDashboard from "@/pages/StaffDashboard";
import ContentFlywheel, { FlywheelJobDetail } from "@/pages/ContentFlywheel";
import AINewsUpdates from "@/pages/AINewsUpdates";
import AINewsArticle from "@/pages/AINewsArticle";
import Debates from "@/pages/Debates";
import DebateDetail from "@/pages/DebateDetail";
import LiveStudio from "@/pages/LiveStudio";
import Articles from "@/pages/Articles";
import ArticleDetail from "@/pages/ArticleDetail";
import ProfilePage from "@/pages/Profile";
import CreditsWallet from "@/pages/CreditsWallet";
import Billing from "@/pages/Billing";
import NotificationsPage from "@/pages/Notifications";
import SettingsPage from "@/pages/Settings";
import AdminAccessRequest from "@/pages/admin/AdminAccessRequest";
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
import MyAgents from "@/pages/MyAgents";
import AgentMarketplace from "@/pages/AgentMarketplace";
import AgentAppStore from "@/pages/AgentAppStore";
import AgentDetail from "@/pages/AgentDetail";
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
import GlobalCompliance from "@/pages/admin/GlobalCompliance";
import PolicyGovernance from "@/pages/admin/PolicyGovernance";
import Support from "@/pages/Support";
import SupportDashboard from "@/pages/admin/SupportDashboard";
import StaffManagement from "@/pages/admin/StaffManagement";
import SystemAgents from "@/pages/admin/SystemAgents";
import KnowledgeBaseDashboard from "@/pages/admin/KnowledgeBaseDashboard";
import OperationsCenter from "@/pages/admin/OperationsCenter";
import FounderWorkday from "@/pages/admin/FounderWorkday";
import PNRMonitor from "@/pages/admin/PNRMonitor";
import BuildQueueDashboard from "@/pages/admin/BuildQueueDashboard";
import MarketingEngine from "@/pages/admin/MarketingEngine";
import SilentSeoDashboard from "@/pages/admin/SilentSeoDashboard";
import AuthorityFlywheel from "@/pages/admin/AuthorityFlywheel";
import InevitablePlatformMonitor from "@/pages/admin/InevitablePlatformMonitor";
import SocialDistributionHub from "@/pages/admin/SocialDistributionHub";
import GrowthAutopilot from "@/pages/admin/GrowthAutopilot";
import MyBuilds from "@/pages/MyBuilds";
import BondScoreDashboard from "@/pages/BondScoreDashboard";
import BondScoreCreate from "@/pages/BondScoreCreate";
import BondScoreTake from "@/pages/BondScoreTake";
import BondScoreResult from "@/pages/BondScoreResult";
import AIDebates from "@/pages/AIDebates";
import Projects from "@/pages/Projects";
import ProjectDetail from "@/pages/ProjectDetail";
import DeveloperDocs from "@/pages/DeveloperDocs";
import OnboardingInterests from "@/pages/onboarding/OnboardingInterests";
import OnboardingDebate from "@/pages/onboarding/OnboardingDebate";
import { OnboardingGate } from "@/components/onboarding/OnboardingGate";

function RedirectTo({ to }: { to: string }) {
  const [, navigate] = useLocation();

  useEffect(() => {
    navigate(to, { replace: true });
  }, [navigate, to]);

  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/auth/signin" component={SignIn} />
      <Route path="/auth" component={SignIn} />
      <Route path="/auth/signup" component={SignUp} />
      <Route path="/auth/verify" component={VerifyEmail} />
      <Route path="/auth/profile" component={ProfileSetup} />
      <Route path="/auth/forgot-password" component={ForgotPassword} />
      <Route path="/auth/reset-password" component={ResetPassword} />
      <Route path="/onboarding/interests" component={OnboardingInterests} />
      <Route path="/onboarding/debate" component={OnboardingDebate} />
      <Route path="/" component={Home} />
      <Route path="/discussions" component={Discussions} />
      <Route path="/topic/:slug" component={Discussions} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/credits" component={CreditsWallet} />
      <Route path="/billing" component={Billing} />
      <Route path="/notifications" component={NotificationsPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/ranking" component={Ranking} />
      <Route path="/dashboard" component={UserDashboard} />
      <Route path="/agent-dashboard" component={() => <RedirectTo to="/dashboard" />} />
      <Route path="/agent-portal" component={AgentPortal} />
      <Route path="/agent-builder" component={AgentBuilder} />
      <Route path="/my-agents" component={MyAgents} />
      <Route path="/agent-wizard" component={AgentCreationWizard} />
      <Route path="/agent-marketplace" component={AgentMarketplace} />
      <Route path="/agent-store" component={AgentAppStore} />
      <Route path="/ai-teams" component={AITeams} />
      <Route path="/agent-store/:id" component={AgentDetail} />
      <Route path="/agent-skill-tree/:id" component={AgentSkillTree} />
      <Route path="/creator-dashboard" component={() => <RedirectTo to="/dashboard" />} />
      <Route path="/cost-control" component={AICostControl} />
      <Route path="/my-agent" component={MyPersonalAgent} />
      <Route path="/privacy-center" component={PrivacyCenter} />
      <Route path="/trust-moat" component={TrustDashboard} />
      <Route path="/network" component={NetworkDashboard} />
      <Route path="/intelligence" component={IntelligenceRoadmap} />
      <Route path="/intelligence-dashboard" component={() => <RedirectTo to="/dashboard" />} />
      <Route path="/psychology" component={UserPsychology} />
      <Route path="/monetization" component={MonetizationAnalytics} />
      <Route path="/post/:id" component={PostDetail} />
      <Route path="/content-flywheel" component={ContentFlywheel} />
      <Route path="/flywheel/:id" component={FlywheelJobDetail} />
      <Route path="/ai-debates" component={AIDebates} />
      <Route path="/live-debates" component={Debates} />
      <Route path="/debates" component={Debates} />
      <Route path="/debate/:id" component={DebateDetail} />
      <Route path="/live-studio/:id" component={LiveStudio} />
      <Route path="/developers" component={DeveloperDocs} />
      <Route path="/projects" component={Projects} />
      <Route path="/projects/:id" component={ProjectDetail} />
      <Route path="/ai-news-updates" component={AINewsUpdates} />
      <Route path="/ai-news-updates/:idOrSlug" component={AINewsArticle} />
      <Route path="/ai-news/:idOrSlug" component={AINewsArticle} />
      <Route path="/articles" component={Articles} />
      <Route path="/articles/:slug" component={ArticleDetail} />
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
      <Route path="/docs/privacy-safety" component={PrivacySafety} />
      <Route path="/docs/pricing" component={WhatYouPayFor} />
      <Route path="/docs/sell" component={SellIntelligence} />
      <Route path="/legal/privacy" component={PrivacyPolicyPage} />
      <Route path="/legal/terms" component={TermsOfServicePage} />
      <Route path="/legal/cookies" component={CookiePolicyPage} />
      <Route path="/legal/ai-usage" component={AIUsagePolicyPage} />
      <Route path="/admin/request-access" component={AdminAccessRequest} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/staff/dashboard" component={StaffDashboard} />
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
      <Route path="/admin/compliance" component={GlobalCompliance} />
      <Route path="/admin/policy-governance" component={PolicyGovernance} />
      <Route path="/admin/support" component={SupportDashboard} />
      <Route path="/admin/staff" component={StaffManagement} />
      <Route path="/admin/system-agents" component={SystemAgents} />
      <Route path="/admin/knowledge-base" component={KnowledgeBaseDashboard} />
      <Route path="/admin/operations" component={OperationsCenter} />
      <Route path="/admin/workday" component={FounderWorkday} />
      <Route path="/admin/pnr-monitor" component={PNRMonitor} />
      <Route path="/admin/build-queue" component={BuildQueueDashboard} />
      <Route path="/admin/marketing" component={MarketingEngine} />
      <Route path="/admin/seo" component={SilentSeoDashboard} />
      <Route path="/admin/authority-flywheel" component={AuthorityFlywheel} />
      <Route path="/admin/inevitable-platform" component={InevitablePlatformMonitor} />
      <Route path="/admin/social-hub" component={SocialDistributionHub} />
      <Route path="/admin/growth-autopilot" component={GrowthAutopilot} />
      <Route path="/bondscore" component={BondScoreDashboard} />
      <Route path="/bondscore/create" component={BondScoreCreate} />
      <Route path="/bondscore/result/:shareId" component={BondScoreResult} />
      <Route path="/bondscore/:slug" component={BondScoreTake} />
      <Route path="/my-builds" component={MyBuilds} />
      <Route path="/support" component={Support} />
      <Route path="/admin" component={() => <RedirectTo to="/admin/dashboard" />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <PaywallProvider>
            <Toaster />
            <OnboardingGate>
              <Router />
            </OnboardingGate>
          </PaywallProvider>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
