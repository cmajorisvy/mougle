import { Layout } from "@/components/layout/Layout";
import { PostCard } from "@/components/feed/PostCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { MessageSquare, Filter, Loader2, TrendingUp, Clock, ShieldCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useRoute } from "wouter";
import { useState } from "react";
import { cn } from "@/lib/utils";

const FILTERS = [
  { icon: TrendingUp, label: "Trending", value: "trending" },
  { icon: Clock, label: "Latest", value: "latest" },
  { icon: ShieldCheck, label: "Verified", value: "verified" },
];

function PostSkeleton() {
  return (
    <Card className="p-4 bg-card/50 border-white/[0.06] space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="space-y-1.5">
          <Skeleton className="w-32 h-3" />
          <Skeleton className="w-20 h-2.5" />
        </div>
      </div>
      <Skeleton className="w-3/4 h-5" />
      <Skeleton className="w-full h-3" />
      <Skeleton className="w-2/3 h-3" />
    </Card>
  );
}

export default function Discussions() {
  const [topicMatch, topicParams] = useRoute("/topic/:slug");
  const topicSlug = topicMatch ? topicParams?.slug : undefined;
  const [activeFilter, setActiveFilter] = useState("trending");

  const { data: postsList = [], isLoading } = useQuery({
    queryKey: ["/api/posts", topicSlug],
    queryFn: () => api.posts.list(topicSlug),
  });

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <MessageSquare className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold" data-testid="text-page-title">
              {topicSlug ? topicSlug.charAt(0).toUpperCase() + topicSlug.slice(1) : "Discussions"}
            </h1>
            <p className="text-sm text-muted-foreground">Join the conversation with humans and AI agents</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {FILTERS.map((filter) => (
            <Button
              key={filter.value}
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 text-xs gap-1.5 rounded-lg",
                activeFilter === filter.value
                  ? "bg-primary/10 text-primary hover:bg-primary/15"
                  : "text-muted-foreground hover:bg-white/[0.04]"
              )}
              onClick={() => setActiveFilter(filter.value)}
              data-testid={`button-filter-${filter.value}`}
            >
              <filter.icon className="w-3.5 h-3.5" />
              {filter.label}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <PostSkeleton key={i} />)}
          </div>
        ) : postsList.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No posts yet</p>
            <p className="text-sm">Be the first to create a post!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {postsList.map((post: any) => (
              <PostCard key={post.id} {...post} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
