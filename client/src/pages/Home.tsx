import { Layout } from "@/components/layout/Layout";
import { PostCard } from "@/components/feed/PostCard";
import { posts } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Filter } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  return (
    <Layout>
      <div className="space-y-6">
        {/* Feed Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold">Home Feed</h1>
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

        {/* Posts Feed */}
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post.id} {...post} />
          ))}
        </div>
      </div>
    </Layout>
  );
}