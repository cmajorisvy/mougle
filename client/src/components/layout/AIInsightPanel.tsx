import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { aiInsights } from "@/lib/mockData";
import { Sparkles, CheckCircle2, AlertTriangle, XCircle, TrendingUp, Newspaper, Clock, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";

const CATEGORY_COLORS: Record<string, string> = {
  ai: "text-purple-400",
  tech: "text-blue-400",
  science: "text-emerald-400",
  business: "text-amber-400",
  policy: "text-red-400",
};

export function AIInsightPanel() {
  const { data: latestNews = [] } = useQuery({
    queryKey: ["/api/news/latest"],
    queryFn: () => api.news.latest(5),
    refetchInterval: 120000,
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "verified": return <CheckCircle2 className="w-4 h-4 text-success" />;
      case "uncertain": return <AlertTriangle className="w-4 h-4 text-warning" />;
      case "disputed": return <XCircle className="w-4 h-4 text-destructive" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6 sticky top-24">
      <Card className="bg-card/50 border-white/5 backdrop-blur-sm" data-testid="sidebar-news-widget">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-primary uppercase tracking-wider flex items-center gap-2">
              <Newspaper className="w-4 h-4" /> AI News Updates
            </CardTitle>
            <Link href="/ai-news">
              <span className="text-xs text-primary hover:text-primary/80 cursor-pointer flex items-center gap-1" data-testid="link-view-all-news">
                View All <ArrowRight className="w-3 h-3" />
              </span>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {latestNews.length === 0 ? (
            <p className="text-xs text-muted-foreground">No news articles yet. The pipeline will collect news shortly.</p>
          ) : (
            latestNews.map((article: any) => (
              <Link key={article.id} href={`/ai-news/${article.id}`}>
                <div className="group cursor-pointer p-2 -mx-2 rounded-lg hover:bg-white/5 transition-colors" data-testid={`sidebar-news-${article.id}`}>
                  <h4 className="text-xs font-medium text-foreground/90 group-hover:text-primary transition-colors line-clamp-2 mb-1">
                    {article.title}
                  </h4>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span className={CATEGORY_COLORS[article.category] || "text-muted-foreground"}>
                      {article.category?.toUpperCase()}
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      {article.publishedAt ? formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true }) : "Recently"}
                    </span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 text-primary font-display font-bold">
        <Sparkles className="w-5 h-5" />
        <h3>AI Insights</h3>
      </div>

      <Card className="bg-card/50 border-white/5 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Live Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-foreground/90">
            {aiInsights.summary}
          </p>
        </CardContent>
      </Card>

      <Card className="bg-card/50 border-white/5 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Fact Check
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            {getStatusIcon(aiInsights.factCheck.status)}
            <span className="font-medium text-sm">{aiInsights.factCheck.label}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {aiInsights.factCheck.details}
          </p>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <TrendingUp className="w-4 h-4" /> Related Topics
        </h4>
        <div className="flex flex-wrap gap-2">
          {aiInsights.relatedTopics.map((topic) => (
            <Badge 
              key={topic} 
              variant="outline" 
              className="bg-background hover:bg-white/5 border-white/10 cursor-pointer transition-colors"
            >
              {topic}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}