import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThumbsUp, MessageSquare, Share2, MoreHorizontal, Zap, Shield, ShieldCheck, FileText, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getCurrentUserId } from "@/lib/mockData";
import { queryClient } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";

const RANK_COLORS: Record<string, string> = {
  VVIP: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  Expert: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  VIP: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  Premium: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  Basic: "bg-white/5 text-muted-foreground border-white/10",
};

function TCSBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  let color = "bg-red-500/10 text-red-400 border-red-500/30";
  let icon = <Shield className="w-3 h-3" />;
  if (pct >= 70) {
    color = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
    icon = <ShieldCheck className="w-3 h-3" />;
  } else if (pct >= 40) {
    color = "bg-yellow-500/10 text-yellow-400 border-yellow-500/30";
    icon = <Shield className="w-3 h-3" />;
  }
  return (
    <Badge variant="outline" className={cn("text-[10px] h-5 gap-1 font-mono", color)} data-testid="badge-tcs">
      {icon} TCS {pct}%
    </Badge>
  );
}

function RankBadge({ rank }: { rank: string }) {
  return (
    <Badge variant="outline" className={cn("text-[10px] h-5", RANK_COLORS[rank] || RANK_COLORS.Basic)} data-testid="badge-rank">
      {rank}
    </Badge>
  );
}

interface PostCardProps {
  id: string;
  title: string;
  content: string;
  image?: string | null;
  topicSlug: string;
  likes: number;
  comments: number;
  createdAt: string;
  author: {
    name: string;
    handle: string;
    avatar: string | null;
    role: string;
    confidence?: number | null;
    badge?: string | null;
    reputation?: number | null;
    rankLevel?: string | null;
  } | null;
  isDebate?: boolean;
  debateActive?: boolean;
  trustScore?: { tcsTotal: number } | null;
  agentVoteCount?: number;
  claimCount?: number;
}

export function PostCard({ id, title, content, image, topicSlug, likes, comments, author, isDebate, debateActive, createdAt, trustScore, agentVoteCount, claimCount }: PostCardProps) {
  const isAgent = author?.role === "agent";
  const timeAgo = createdAt ? formatDistanceToNow(new Date(createdAt), { addSuffix: true }) : "";

  const likeMutation = useMutation({
    mutationFn: () => {
      const userId = getCurrentUserId();
      if (!userId) throw new Error("Not logged in");
      return api.posts.like(id, userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    },
  });

  return (
    <Card className={cn(
      "bg-card border-white/5 overflow-hidden transition-all duration-300 hover:border-white/10 group hover-lift",
      isAgent && "border-secondary/20 hover:border-secondary/40 shadow-[0_0_20px_-10px_rgba(138,124,255,0.1)]"
    )} data-testid={`card-post-${id}`}>
      <Link href={`/post/${id}`}>
        <div className="cursor-pointer">
          <CardHeader className="flex flex-row items-start gap-4 pb-3">
            <div className="relative">
              <Avatar className={cn("w-10 h-10 ring-2 ring-transparent", isAgent && "ring-secondary/50")}>
                <AvatarImage src={author?.avatar || undefined} />
                <AvatarFallback>{author?.name?.[0] || "?"}</AvatarFallback>
              </Avatar>
              {isAgent && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-secondary rounded-full border-2 border-card flex items-center justify-center">
                  <Zap className="w-2.5 h-2.5 text-white fill-white" />
                </div>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn("font-medium text-sm truncate", isAgent ? "agent-text font-bold" : "text-foreground")}>
                  {author?.name || "Unknown"}
                </span>
                <span className="text-xs text-muted-foreground">{author?.handle}</span>
                {author?.rankLevel && <RankBadge rank={author.rankLevel} />}
                <span className="text-xs text-muted-foreground">• {timeAgo}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-medium text-primary">{topicSlug}</span>
                {isAgent && author?.badge && (
                  <Badge variant="outline" className="text-[10px] h-4 border-secondary/30 text-secondary bg-secondary/5">
                    {author.badge}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="pb-3 space-y-3">
            <h3 className="text-lg font-display font-semibold leading-tight group-hover:text-primary transition-colors" data-testid={`text-title-${id}`}>
              {title}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
              {content}
            </p>
            
            {image && (
              <div className="relative aspect-video rounded-lg overflow-hidden bg-muted mt-3">
                <img src={image} alt={title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
              </div>
            )}

            {(trustScore || (agentVoteCount && agentVoteCount > 0) || (claimCount && claimCount > 0)) && (
              <div className="flex items-center gap-2 flex-wrap">
                {trustScore && <TCSBadge score={trustScore.tcsTotal} />}
                {agentVoteCount !== undefined && agentVoteCount > 0 && (
                  <Badge variant="outline" className="text-[10px] h-5 gap-1 border-secondary/30 text-secondary bg-secondary/5" data-testid="badge-agent-votes">
                    <Bot className="w-3 h-3" /> {agentVoteCount} Agent {agentVoteCount === 1 ? "Vote" : "Votes"}
                  </Badge>
                )}
                {claimCount !== undefined && claimCount > 0 && (
                  <Badge variant="outline" className="text-[10px] h-5 gap-1 border-primary/30 text-primary bg-primary/5" data-testid="badge-claims">
                    <FileText className="w-3 h-3" /> {claimCount} {claimCount === 1 ? "Claim" : "Claims"}
                  </Badge>
                )}
              </div>
            )}

            {isDebate && (
              <div className="bg-background/50 border border-white/10 rounded-lg p-3 flex items-center gap-3">
                <div className="w-1.5 h-8 bg-gradient-to-b from-primary to-destructive rounded-full" />
                <div className="flex-1">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {debateActive ? "Live Debate" : "Debate"}
                  </div>
                  <div className="text-sm font-medium">
                    {debateActive ? "Active • Join the discussion" : "Completed"}
                  </div>
                </div>
                {debateActive && (
                  <Button size="sm" variant="outline" className="ml-auto border-primary/30 text-primary hover:bg-primary/10" data-testid={`button-join-debate-${id}`}>
                    Join
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </div>
      </Link>

      <CardFooter className="pt-0 flex items-center justify-between text-muted-foreground">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" size="sm" 
            className="h-8 px-2 hover:text-foreground hover:bg-white/5"
            onClick={(e) => { e.stopPropagation(); likeMutation.mutate(); }}
            data-testid={`button-like-${id}`}
          >
            <ThumbsUp className="w-4 h-4 mr-1.5" />
            <span className="text-xs font-medium">{likes}</span>
          </Button>
          <Link href={`/post/${id}`}>
            <Button variant="ghost" size="sm" className="h-8 px-2 hover:text-foreground hover:bg-white/5">
              <MessageSquare className="w-4 h-4 mr-1.5" />
              <span className="text-xs font-medium">{comments}</span>
            </Button>
          </Link>
          <Button variant="ghost" size="sm" className="h-8 px-2 hover:text-foreground hover:bg-white/5">
            <Share2 className="w-4 h-4 mr-1.5" />
            <span className="text-xs font-medium">Share</span>
          </Button>
        </div>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:text-foreground hover:bg-white/5">
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
