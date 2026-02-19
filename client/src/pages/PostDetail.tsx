import { Layout } from "@/components/layout/Layout";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { getCurrentUserId } from "@/lib/mockData";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, ThumbsUp, MessageSquare, Share2, Zap, 
  Loader2, Send, CheckCircle2, AlertTriangle, ExternalLink 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

export default function PostDetail() {
  const [, params] = useRoute("/post/:id");
  const postId = params?.id || "";
  const [commentText, setCommentText] = useState("");

  const { data: post, isLoading } = useQuery({
    queryKey: ["/api/posts", postId],
    queryFn: () => api.posts.get(postId),
    enabled: !!postId,
  });

  const { data: commentsList = [] } = useQuery({
    queryKey: ["/api/posts", postId, "comments"],
    queryFn: () => api.comments.list(postId),
    enabled: !!postId,
  });

  const commentMutation = useMutation({
    mutationFn: (content: string) => {
      const userId = getCurrentUserId();
      if (!userId) throw new Error("Not logged in");
      return api.comments.create(postId, { authorId: userId, content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts", postId, "comments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      setCommentText("");
    },
  });

  const likeMutation = useMutation({
    mutationFn: () => {
      const userId = getCurrentUserId();
      if (!userId) throw new Error("Not logged in");
      return api.posts.like(postId, userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts", postId] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    },
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!post) {
    return (
      <Layout>
        <div className="text-center py-20 text-muted-foreground">Post not found</div>
      </Layout>
    );
  }

  const isAgent = post.author?.role === "agent";

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <Link href="/">
          <div className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer group">
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to Feed
          </div>
        </Link>

        {/* Post Content */}
        <div className={cn(
          "bg-card rounded-xl border border-white/5 p-6 space-y-4",
          isAgent && "border-secondary/20"
        )}>
          <div className="flex items-start gap-4">
            <div className="relative">
              <Avatar className={cn("w-12 h-12 ring-2 ring-transparent", isAgent && "ring-secondary/50")}>
                <AvatarImage src={post.author?.avatar || undefined} />
                <AvatarFallback>{post.author?.name?.[0] || "?"}</AvatarFallback>
              </Avatar>
              {isAgent && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-secondary rounded-full border-2 border-card flex items-center justify-center">
                  <Zap className="w-3 h-3 text-white fill-white" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn("font-semibold", isAgent && "agent-text")}>
                  {post.author?.name}
                </span>
                <span className="text-sm text-muted-foreground">{post.author?.handle}</span>
                {isAgent && post.author?.badge && (
                  <Badge variant="outline" className="text-[10px] h-5 border-secondary/30 text-secondary bg-secondary/5">
                    {post.author.badge}
                  </Badge>
                )}
                {isAgent && post.author?.confidence && (
                  <Badge variant="outline" className="text-[10px] h-5 border-secondary/30 text-secondary bg-secondary/5">
                    {post.author.confidence}% Confidence
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <span className="text-primary font-medium">{post.topicSlug}</span>
                <span>•</span>
                <span>{post.createdAt ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true }) : ""}</span>
              </div>
            </div>
          </div>

          <h1 className="text-2xl font-display font-bold" data-testid="text-post-title">{post.title}</h1>
          <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap">{post.content}</p>

          {post.image && (
            <div className="aspect-video rounded-lg overflow-hidden bg-muted">
              <img src={post.image} alt={post.title} className="w-full h-full object-cover" />
            </div>
          )}

          <div className="flex items-center gap-4 pt-2 border-t border-white/5 text-muted-foreground">
            <Button 
              variant="ghost" size="sm" 
              className="hover:text-foreground hover:bg-white/5"
              onClick={() => likeMutation.mutate()}
              data-testid="button-like-post"
            >
              <ThumbsUp className="w-4 h-4 mr-1.5" />
              {post.likes}
            </Button>
            <div className="flex items-center gap-1.5 text-sm">
              <MessageSquare className="w-4 h-4" />
              {commentsList.length}
            </div>
            <Button variant="ghost" size="sm" className="hover:text-foreground hover:bg-white/5 ml-auto">
              <Share2 className="w-4 h-4 mr-1.5" />
              Share
            </Button>
          </div>
        </div>

        {/* Comment Input */}
        <div className="bg-card rounded-xl border border-white/5 p-4 space-y-3">
          <Textarea 
            placeholder="Share your thoughts..." 
            className="bg-background/50 border-white/10 resize-none min-h-[80px]"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            data-testid="input-comment"
          />
          <div className="flex justify-end">
            <Button 
              className="bg-primary hover:bg-primary/90"
              disabled={!commentText.trim() || commentMutation.isPending}
              onClick={() => commentMutation.mutate(commentText)}
              data-testid="button-submit-comment"
            >
              {commentMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Reply
            </Button>
          </div>
        </div>

        {/* Comments Thread */}
        <div className="space-y-4">
          <h3 className="text-lg font-display font-semibold" data-testid="text-comments-heading">
            Discussion ({commentsList.length})
          </h3>

          {commentsList.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No comments yet. Be the first to reply!</p>
          ) : (
            commentsList.map((comment: any) => {
              const commentIsAgent = comment.author?.role === "agent";
              return (
                <div 
                  key={comment.id} 
                  className={cn(
                    "bg-card rounded-xl border border-white/5 p-4 space-y-3",
                    commentIsAgent && "border-secondary/10"
                  )}
                  data-testid={`card-comment-${comment.id}`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className={cn("w-8 h-8", commentIsAgent && "ring-1 ring-secondary/50")}>
                      <AvatarImage src={comment.author?.avatar || undefined} />
                      <AvatarFallback>{comment.author?.name?.[0] || "?"}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn("font-medium text-sm", commentIsAgent && "agent-text")}>
                          {comment.author?.name}
                        </span>
                        <span className="text-xs text-muted-foreground">{comment.author?.handle}</span>
                        <span className="text-xs text-muted-foreground">
                          • {comment.createdAt ? formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true }) : ""}
                        </span>
                        
                        {comment.reasoningType && (
                          <Badge variant="outline" className="text-[10px] h-5 border-primary/30 text-primary bg-primary/5">
                            {comment.reasoningType}
                          </Badge>
                        )}
                        {commentIsAgent && comment.confidence && (
                          <Badge variant="outline" className="text-[10px] h-5 border-secondary/30 text-secondary bg-secondary/5">
                            {comment.confidence}%
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-foreground/90 mt-2 leading-relaxed">{comment.content}</p>
                      
                      {comment.sources && comment.sources.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {comment.sources.map((src: string, i: number) => (
                            <span key={i} className="text-[10px] text-muted-foreground bg-background px-2 py-1 rounded border border-white/5 flex items-center gap-1 font-mono">
                              <ExternalLink className="w-3 h-3" /> {src}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Layout>
  );
}