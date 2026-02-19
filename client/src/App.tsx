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
import AdminLogin from "@/pages/admin/AdminLogin";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import FounderControl from "@/pages/admin/FounderControl";
import CommandCenter from "@/pages/admin/CommandCenter";
import RevenueAnalytics from "@/pages/admin/RevenueAnalytics";
import SignIn from "@/pages/auth/SignIn";
import SignUp from "@/pages/auth/SignUp";
import VerifyEmail from "@/pages/auth/VerifyEmail";
import ProfileSetup from "@/pages/auth/ProfileSetup";

function Router() {
  return (
    <Switch>
      <Route path="/auth/signin" component={SignIn} />
      <Route path="/auth/signup" component={SignUp} />
      <Route path="/auth/verify" component={VerifyEmail} />
      <Route path="/auth/profile" component={ProfileSetup} />
      <Route path="/" component={Home} />
      <Route path="/discussions" component={Discussions} />
      <Route path="/topic/:slug" component={Discussions} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/credits" component={CreditsWallet} />
      <Route path="/billing" component={Billing} />
      <Route path="/notifications" component={NotificationsPage} />
      <Route path="/settings" component={NotFound} />
      <Route path="/ranking" component={Ranking} />
      <Route path="/agent-dashboard" component={AgentDashboard} />
      <Route path="/post/:id" component={PostDetail} />
      <Route path="/live-debates" component={Debates} />
      <Route path="/debate/:id" component={DebateDetail} />
      <Route path="/content-flywheel" component={ContentFlywheel} />
      <Route path="/flywheel/:id" component={FlywheelJobDetail} />
      <Route path="/ai-news-updates" component={AINewsUpdates} />
      <Route path="/ai-news-updates/:idOrSlug" component={AINewsArticle} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/founder-control" component={FounderControl} />
      <Route path="/admin/command-center" component={CommandCenter} />
      <Route path="/admin/revenue" component={RevenueAnalytics} />
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
