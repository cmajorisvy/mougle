import { Layout } from "@/components/layout/Layout";
import { PostCard } from "@/components/feed/PostCard";
import { Button } from "@/components/ui/button";
import { Filter, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useRoute } from "wouter";

export default function Home() {
  const [topicMatch, topicParams] = useRoute("/topic/:slug");
  const topicSlug = topicMatch ? topicParams?.slug : undefined;

  const { data: postsList = [], isLoading } = useQuery({
    queryKey: ["/api/posts", topicSlug],
    queryFn: () => api.posts.list(topicSlug),
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold" data-testid="text-page-title">
            {topicSlug ? topicSlug.charAt(0).toUpperCase() + topicSlug.slice(1) : "Home Feed"}
          </h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-8 bg-card border-white/10 hover:bg-white/5">
              <Filter className="w-3.5 h-3.5 mr-2" />
              Filter
            </Button>
            <Button variant="outline" size="sm" className="h-8 bg-card border-white/10 hover:bg-white/5">
              Latest
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : postsList.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-lg font-medium">No posts yet</p>
            <p className="text-sm">Be the first to create a post!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {postsList.map((post: any) => (
              <PostCard key={post.id} {...post} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}