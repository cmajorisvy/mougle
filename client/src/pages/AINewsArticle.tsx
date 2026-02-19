import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Clock, ExternalLink, Hash, Newspaper, FileText, Video, BookOpen } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useRoute, Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const CATEGORY_COLORS: Record<string, string> = {
  ai: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  tech: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  science: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  business: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  policy: "bg-red-500/10 text-red-400 border-red-500/30",
  general: "bg-white/5 text-muted-foreground border-white/10",
};

export default function AINewsArticle() {
  const [, params] = useRoute("/ai-news-updates/:idOrSlug");
  const idOrSlug = params?.idOrSlug || "";
  const isNumericId = /^\d+$/.test(idOrSlug);

  const { data: article, isLoading } = useQuery({
    queryKey: ["/api/news", idOrSlug],
    queryFn: () => isNumericId ? api.news.get(parseInt(idOrSlug)) : api.news.getBySlug(idOrSlug),
    enabled: !!idOrSlug,
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

  if (!article) {
    return (
      <Layout>
        <div className="text-center py-20 text-muted-foreground">
          <Newspaper className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">Article not found</p>
          <Link href="/ai-news-updates">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to News
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <Link href="/ai-news-updates">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" data-testid="button-back-news">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to AI News
          </Button>
        </Link>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="outline" className={cn("text-xs", CATEGORY_COLORS[article.category] || CATEGORY_COLORS.general)}>
              {article.category?.toUpperCase()}
            </Badge>
            <span className="text-xs text-muted-foreground">{article.sourceName}</span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {article.publishedAt ? formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true }) : "Recently"}
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-display font-bold mb-4" data-testid="text-article-title">
            {article.title}
          </h1>

          {article.imageUrl && (
            <img
              src={article.imageUrl}
              alt={article.title}
              className="w-full h-48 md:h-64 object-cover rounded-xl mb-4 bg-white/5"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}

          {article.summary && (
            <Card className="bg-primary/5 border-primary/20 mb-6">
              <CardContent className="p-4">
                <p className="text-sm font-medium text-primary/90 leading-relaxed" data-testid="text-article-summary">
                  {article.summary}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <Tabs defaultValue="article" className="w-full">
          <TabsList className="bg-card border border-white/10 w-full grid grid-cols-3">
            <TabsTrigger value="article" className="text-xs" data-testid="tab-article">
              <FileText className="w-3.5 h-3.5 mr-1" /> Article
            </TabsTrigger>
            <TabsTrigger value="seo" className="text-xs" data-testid="tab-seo">
              <BookOpen className="w-3.5 h-3.5 mr-1" /> SEO Blog
            </TabsTrigger>
            <TabsTrigger value="script" className="text-xs" data-testid="tab-script">
              <Video className="w-3.5 h-3.5 mr-1" /> Video Script
            </TabsTrigger>
          </TabsList>

          <TabsContent value="article">
            <Card className="bg-card/50 border-white/5">
              <CardContent className="p-6">
                <div className="prose prose-invert prose-sm max-w-none">
                  {article.content?.split("\n").map((para: string, i: number) => (
                    para.trim() ? <p key={i} className="text-foreground/90 leading-relaxed mb-4">{para}</p> : null
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="seo">
            <Card className="bg-card/50 border-white/5">
              <CardContent className="p-6">
                <div className="prose prose-invert prose-sm max-w-none">
                  {article.seoBlog?.split("\n").map((para: string, i: number) => {
                    if (para.startsWith("**") && para.endsWith("**")) {
                      return <h3 key={i} className="text-lg font-display font-semibold text-primary mt-4 mb-2">{para.replace(/\*\*/g, "")}</h3>;
                    }
                    return para.trim() ? <p key={i} className="text-foreground/90 leading-relaxed mb-4">{para}</p> : null;
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="script">
            <Card className="bg-card/50 border-white/5">
              <CardContent className="p-6">
                <div className="bg-background/50 rounded-lg p-4 border border-white/5">
                  <div className="flex items-center gap-2 mb-3">
                    <Video className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-primary">60-Second Video Script</span>
                  </div>
                  <p className="text-foreground/90 leading-relaxed italic" data-testid="text-video-script">
                    {article.script || "No script generated yet."}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 flex-wrap">
            {article.hashtags?.map((tag: string) => (
              <Badge key={tag} variant="outline" className="text-xs bg-background border-white/10">
                <Hash className="w-3 h-3 mr-0.5" />{tag}
              </Badge>
            ))}
          </div>

          <a href={article.sourceUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="text-xs bg-card border-white/10 hover:bg-white/5" data-testid="link-original-source">
              <ExternalLink className="w-3 h-3 mr-1" /> Original Source
            </Button>
          </a>
        </div>
      </div>
    </Layout>
  );
}
