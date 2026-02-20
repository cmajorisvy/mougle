import { Layout } from "@/components/layout/Layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Store, Search, Star, Download, Heart, ExternalLink,
  ArrowLeft, Smartphone, Globe, Crown,
  CheckCircle2, Beaker, Sparkles
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getCurrentUserId } from "@/lib/mockData";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { LabsApp } from "@shared/schema";

const pricingBadgeColors: Record<string, string> = {
  free: "bg-emerald-500/20 text-emerald-400 border-emerald-500/20",
  subscription: "bg-blue-500/20 text-blue-400 border-blue-500/20",
  "one-time": "bg-amber-500/20 text-amber-400 border-amber-500/20",
};

const pricingLabels: Record<string, string> = {
  free: "Free",
  subscription: "Subscription",
  "one-time": "One-time Purchase",
};

function AppCard({ app, isInstalled, isFavorited, onInstall, onFavorite }: {
  app: LabsApp;
  isInstalled: boolean;
  isFavorited: boolean;
  onInstall: () => void;
  onFavorite: () => void;
}) {
  return (
    <Card className="glass-card rounded-xl p-5 hover:bg-white/[0.06] transition-all group" data-testid={`card-app-${app.id}`}>
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-violet-500/20 flex items-center justify-center shrink-0">
          <Sparkles className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-sm group-hover:text-primary transition-colors" data-testid={`text-app-name-${app.id}`}>
                {app.name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">{app.industry}</Badge>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">{app.category}</Badge>
              </div>
            </div>
            <button onClick={onFavorite} className="text-muted-foreground hover:text-red-400 transition-colors" data-testid={`button-favorite-app-${app.id}`}>
              <Heart className={cn("w-4 h-4", isFavorited && "fill-red-400 text-red-400")} />
            </button>
          </div>

          <p className="text-xs text-muted-foreground mt-2 line-clamp-2" data-testid={`text-app-desc-${app.id}`}>
            {app.description}
          </p>

          <div className="flex items-center gap-3 mt-3">
            <Badge variant="outline" className={cn("text-[10px] px-2 py-0.5", pricingBadgeColors[app.pricingModel])}>
              {pricingLabels[app.pricingModel]}
              {app.price && app.price > 0 ? ` $${(app.price / 100).toFixed(2)}` : ""}
              {app.subscriptionInterval ? `/${app.subscriptionInterval}` : ""}
            </Badge>
            {app.rating && app.rating > 0 ? (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" /> {app.rating.toFixed(1)}
              </span>
            ) : null}
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Download className="w-3 h-3" /> {app.installCount}
            </span>
            {app.pwaEnabled && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-cyan-500/10 text-cyan-400 border-cyan-500/20">
                <Smartphone className="w-3 h-3 mr-0.5" /> PWA
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2 mt-3">
            {isInstalled ? (
              <Button size="sm" variant="outline" className="text-xs text-emerald-400 border-emerald-500/20" disabled data-testid={`button-installed-${app.id}`}>
                <CheckCircle2 className="w-3 h-3 mr-1" /> Installed
              </Button>
            ) : (
              <Button size="sm" onClick={onInstall} className="text-xs bg-primary hover:bg-primary/90" data-testid={`button-install-${app.id}`}>
                <Download className="w-3 h-3 mr-1" /> Install
              </Button>
            )}
            {app.liveUrl && (
              <a href={app.liveUrl} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline" className="text-xs" data-testid={`button-visit-${app.id}`}>
                  <ExternalLink className="w-3 h-3 mr-1" /> Visit
                </Button>
              </a>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function AppSkeleton() {
  return (
    <Card className="glass-card rounded-xl p-5">
      <div className="flex items-start gap-4">
        <Skeleton className="w-12 h-12 rounded-xl" />
        <div className="flex-1">
          <Skeleton className="w-32 h-4 mb-2" />
          <Skeleton className="w-full h-3 mb-3" />
          <div className="flex gap-2">
            <Skeleton className="w-16 h-5 rounded" />
            <Skeleton className="w-12 h-5 rounded" />
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function LabsAppStore() {
  const [searchQuery, setSearchQuery] = useState("");
  const [pricingFilter, setPricingFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("discover");
  const queryClient = useQueryClient();
  const userId = getCurrentUserId();
  const { toast } = useToast();

  const { data: apps, isLoading } = useQuery<LabsApp[]>({
    queryKey: ["labs-apps"],
    queryFn: () => api.labs.apps(),
  });

  const { data: installations } = useQuery({
    queryKey: ["labs-installations", userId],
    queryFn: () => api.labs.installations(userId!),
    enabled: !!userId,
  });

  const { data: favorites } = useQuery({
    queryKey: ["labs-favorites", userId],
    queryFn: () => api.labs.favorites(userId!),
    enabled: !!userId,
  });

  const { data: myApps } = useQuery<LabsApp[]>({
    queryKey: ["labs-user-apps", userId],
    queryFn: () => api.labs.userApps(userId!),
    enabled: !!userId,
  });

  const installMutation = useMutation({
    mutationFn: (appId: string) => api.labs.install(appId, userId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labs-installations"] });
      queryClient.invalidateQueries({ queryKey: ["labs-apps"] });
      toast({ title: "App installed!" });
    },
  });

  const favoriteMutation = useMutation({
    mutationFn: (data: { itemId: string; itemType: string }) =>
      api.labs.toggleFavorite(userId!, data.itemId, data.itemType),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["labs-favorites"] }),
  });

  const installedIds = new Set((installations || []).map((i: any) => i.appId));
  const favoriteIds = new Set((favorites || []).map((f: any) => f.itemId));

  const filtered = (apps || []).filter(app => {
    if (pricingFilter !== "all" && app.pricingModel !== pricingFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return app.name.toLowerCase().includes(q) || app.description.toLowerCase().includes(q);
    }
    return true;
  });

  const installedApps = (apps || []).filter(app => installedIds.has(app.id));
  const favoritedApps = (apps || []).filter(app => favoriteIds.has(app.id));

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/labs">
              <Button variant="ghost" size="sm" data-testid="button-back-to-labs">
                <ArrowLeft className="w-4 h-4 mr-1" /> Labs
              </Button>
            </Link>
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20">
              <Store className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold tracking-tight" data-testid="text-appstore-title">Labs App Store</h1>
              <p className="text-sm text-muted-foreground">Discover and install apps built by the community</p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white/[0.04]">
            <TabsTrigger value="discover" data-testid="tab-discover">
              <Globe className="w-4 h-4 mr-1" /> Discover
            </TabsTrigger>
            <TabsTrigger value="installed" data-testid="tab-installed">
              <Download className="w-4 h-4 mr-1" /> Installed ({installedApps.length})
            </TabsTrigger>
            <TabsTrigger value="favorites" data-testid="tab-favorites">
              <Heart className="w-4 h-4 mr-1" /> Favorites ({favoritedApps.length})
            </TabsTrigger>
            <TabsTrigger value="my-apps" data-testid="tab-my-apps">
              <Crown className="w-4 h-4 mr-1" /> My Apps ({myApps?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="discover" className="space-y-4 mt-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search apps..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-white/[0.04] border-white/[0.08]"
                  data-testid="input-search-apps"
                />
              </div>
              <Select value={pricingFilter} onValueChange={setPricingFilter}>
                <SelectTrigger className="w-[150px] bg-white/[0.04] border-white/[0.08]" data-testid="select-pricing">
                  <SelectValue placeholder="Pricing" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Pricing</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="subscription">Subscription</SelectItem>
                  <SelectItem value="one-time">One-time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, i) => <AppSkeleton key={i} />)}
              </div>
            ) : filtered.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="grid-apps">
                {filtered.map((app) => (
                  <AppCard
                    key={app.id}
                    app={app}
                    isInstalled={installedIds.has(app.id)}
                    isFavorited={favoriteIds.has(app.id)}
                    onInstall={() => installMutation.mutate(app.id)}
                    onFavorite={() => favoriteMutation.mutate({ itemId: app.id, itemType: "app" })}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16" data-testid="text-no-apps">
                <Store className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No apps yet</h3>
                <p className="text-sm text-muted-foreground mb-4">Be the first to build and publish an app from Labs!</p>
                <Link href="/labs">
                  <Button data-testid="button-browse-opportunities">
                    <Beaker className="w-4 h-4 mr-2" /> Browse Opportunities
                  </Button>
                </Link>
              </div>
            )}
          </TabsContent>

          <TabsContent value="installed" className="mt-4">
            {installedApps.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="grid-installed">
                {installedApps.map((app) => (
                  <AppCard
                    key={app.id}
                    app={app}
                    isInstalled={true}
                    isFavorited={favoriteIds.has(app.id)}
                    onInstall={() => {}}
                    onFavorite={() => favoriteMutation.mutate({ itemId: app.id, itemType: "app" })}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16" data-testid="text-no-installed">
                <Download className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No installed apps</h3>
                <p className="text-sm text-muted-foreground">Discover and install apps from the store</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="favorites" className="mt-4">
            {favoritedApps.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="grid-favorites">
                {favoritedApps.map((app) => (
                  <AppCard
                    key={app.id}
                    app={app}
                    isInstalled={installedIds.has(app.id)}
                    isFavorited={true}
                    onInstall={() => installMutation.mutate(app.id)}
                    onFavorite={() => favoriteMutation.mutate({ itemId: app.id, itemType: "app" })}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16" data-testid="text-no-favorites">
                <Heart className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No favorites yet</h3>
                <p className="text-sm text-muted-foreground">Heart apps to add them to your favorites</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="my-apps" className="mt-4">
            {(myApps || []).length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="grid-my-apps">
                {(myApps || []).map((app) => (
                  <AppCard
                    key={app.id}
                    app={app}
                    isInstalled={false}
                    isFavorited={false}
                    onInstall={() => {}}
                    onFavorite={() => {}}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16" data-testid="text-no-my-apps">
                <Crown className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No published apps</h3>
                <p className="text-sm text-muted-foreground mb-4">Build an app from Labs opportunities and publish it here</p>
                <Link href="/labs">
                  <Button data-testid="button-start-building">
                    <Beaker className="w-4 h-4 mr-2" /> Start Building
                  </Button>
                </Link>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
