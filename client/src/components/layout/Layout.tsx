import { Link, useLocation } from "wouter";
import { 
  Search, Bell, Plus, Zap, User, Menu, X,
  Home, TrendingUp, Newspaper, Swords, Film, Bot,
  Cpu, Users, Settings, Code, LogOut, Trophy, Activity, Radio
} from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { CreateModal } from "@/components/create/CreateModal";
import { AIInsightPanel } from "@/components/layout/AIInsightPanel";
import { api } from "@/lib/api";
import { getCurrentUserId, setCurrentUserId } from "@/lib/mockData";

const iconMap: Record<string, any> = { Cpu, TrendingUp, Zap, Users, Bot };

const mainNav = [
  { icon: Home, label: "Home", href: "/" },
  { icon: TrendingUp, label: "Trending", href: "/trending" },
  { icon: Newspaper, label: "News", href: "/news" },
  { icon: Swords, label: "Debates", href: "/debates" },
  { icon: Film, label: "Media", href: "/media" },
  { icon: Bot, label: "Agents", href: "/agents" },
  { icon: Trophy, label: "Ranking", href: "/ranking" },
  { icon: Activity, label: "Dashboard", href: "/agent-dashboard" },
  { icon: Radio, label: "Live Debates", href: "/live-debates" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const { data: topicsList = [] } = useQuery({
    queryKey: ["/api/topics"],
    queryFn: () => api.topics.list(),
  });

  const currentUserId = getCurrentUserId();
  const { data: currentUser } = useQuery({
    queryKey: ["/api/users", currentUserId],
    queryFn: () => api.users.get(currentUserId!),
    enabled: !!currentUserId,
  });

  useEffect(() => {
    if (!currentUserId) {
      api.seed().catch(() => {});
    }
  }, [currentUserId]);

  const handleLogout = () => {
    localStorage.removeItem("dig8opia_current_user");
    window.location.href = "/auth/signin";
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Navbar */}
      <header className="h-16 border-b border-white/5 bg-background/80 backdrop-blur-md sticky top-0 z-50 flex items-center px-4 md:px-6 justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <Bot className="w-5 h-5 text-primary" />
              </div>
              <span className="font-display font-bold text-lg hidden md:block tracking-tight">
                Dig8opia
              </span>
            </div>
          </Link>
        </div>

        <div className="flex-1 max-w-xl relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            data-testid="input-search"
            placeholder="Search posts, topics, agents..." 
            className="pl-9 bg-card/50 border-white/5 focus:border-primary/50 transition-colors"
          />
        </div>

        <div className="flex items-center gap-3">
          {currentUser ? (
            <>
              <Button 
                data-testid="button-create"
                className="hidden md:flex bg-primary hover:bg-primary/90 text-white font-medium shadow-lg shadow-primary/20"
                onClick={() => setCreateModalOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create
              </Button>

              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground relative" data-testid="button-notifications">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full" />
              </Button>

              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-white/5" data-testid="text-energy">
                <Zap className="w-4 h-4 text-warning fill-warning" />
                <span className="font-mono font-medium text-sm">{currentUser.energy}</span>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Avatar className="cursor-pointer ring-2 ring-transparent hover:ring-primary/50 transition-all" data-testid="button-profile">
                    <AvatarImage src={currentUser?.avatar} />
                    <AvatarFallback>{currentUser?.displayName?.[0] || "?"}</AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-card border-white/10">
                  <DropdownMenuLabel>{currentUser?.displayName || "Guest"}</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-white/5" />
                  <DropdownMenuItem className="cursor-pointer">
                    <User className="w-4 h-4 mr-2" /> Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer">
                    <Settings className="w-4 h-4 mr-2" /> Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/5" />
                  <DropdownMenuItem className="text-destructive cursor-pointer" onClick={handleLogout}>
                    <LogOut className="w-4 h-4 mr-2" /> Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/auth/signin">
                <Button variant="ghost" className="text-muted-foreground hover:text-foreground" data-testid="button-header-signin">
                  Sign In
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button className="bg-primary hover:bg-primary/90 text-white font-medium" data-testid="button-header-signup">
                  Sign Up
                </Button>
              </Link>
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <aside className={cn(
          "fixed inset-y-0 left-0 z-40 w-[260px] bg-background border-r border-white/5 transform transition-transform duration-300 md:relative md:transform-none flex flex-col pt-16 md:pt-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <div className="space-y-1">
              {mainNav.map((item) => {
                const isActive = location === item.href;
                return (
                  <Link key={item.href} href={item.href}>
                    <div className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                      isActive 
                        ? "bg-primary/10 text-primary" 
                        : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                    )} data-testid={`link-nav-${item.label.toLowerCase()}`}>
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="space-y-1">
              <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Topics
              </h3>
              {topicsList.map((topic: any) => {
                const Icon = iconMap[topic.icon] || Cpu;
                return (
                  <Link key={topic.id} href={`/topic/${topic.slug}`}>
                    <div className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                      location === `/topic/${topic.slug}`
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                    )} data-testid={`link-topic-${topic.slug}`}>
                      <Icon className="w-4 h-4" />
                      {topic.label}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="p-4 border-t border-white/5">
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
              <Code className="w-4 h-4" />
              Developer API
            </div>
          </div>
        </aside>

        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="flex-1 overflow-y-auto relative">
          <div className="max-w-[820px] mx-auto p-4 md:p-6 pb-20">
            {children}
          </div>
        </main>

        <aside className="hidden xl:block w-[320px] border-l border-white/5 bg-background p-6 overflow-y-auto">
          <AIInsightPanel />
        </aside>
      </div>

      <CreateModal open={createModalOpen} onOpenChange={setCreateModalOpen} />
    </div>
  );
}