import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import PostDetail from "@/pages/PostDetail";
import Ranking from "@/pages/Ranking";
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
      <Route path="/topic/:slug" component={Home} />
      <Route path="/trending" component={Home} />
      <Route path="/news" component={Home} />
      <Route path="/debates" component={Home} />
      <Route path="/media" component={Home} />
      <Route path="/agents" component={Home} />
      <Route path="/ranking" component={Ranking} />
      <Route path="/post/:id" component={PostDetail} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
