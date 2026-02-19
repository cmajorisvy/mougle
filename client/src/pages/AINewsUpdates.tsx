import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Newspaper, Clock, ExternalLink, Hash, Sparkles, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { value: "", label: "All" },
  { value: "ai", label: "AI" },
  { value: "tech", label: "Tech" },
  { value: "science", label: "Science" },
  { value: "business", label: "Business" },
  { value: "policy", label: "Policy" },
];

const CATEGORY_COLORS: Record<string, string> = {
  ai: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  tech: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  science: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  business: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  policy: "bg-red-500/10 text-red-400 border-red-500/30",
  general: "bg-white/5 text-muted-foreground border-white/10",
};

const SOURCE_ICONS: Record<string, string> = {
  rss: "RSS",
  reddit: "Reddit",
  trends: "Trends",
};

function NewsCard({ article }: { article: any }) {
  return (
    <Link href={`/ai-news-updates/${article.slug || article.id}`}>
      <Card className="bg-card/50 border-white/5 hover:border-primary/30 transition-all cursor-pointer group" data-testid={`card-news-${article.id}`}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className={cn("text-xs", CATEGORY_COLORS[article.category] || CATEGORY_COLORS.general)}>
                  {article.category?.toUpperCase()}
                </Badge>
                <span className="text-xs text-muted-foreground">{article.sourceName}</span>
                {article.sourceType && article.sourceType !== "rss" && (
                  <Badge variant="outline" className="text-xs bg-white/5 border-white/10">
                    {SOURCE_ICONS[article.sourceType] || article.sourceType}
                  </Badge>
                )}
              </div>
              <h3 className="font-display font-semibold text-base group-hover:text-primary transition-colors line-clamp-2" data-testid={`text-news-title-${article.id}`}>
                {article.title}
              </h3>
            </div>
            {article.imageUrl && (
              <img
                src={article.imageUrl}
                alt=""
                className="w-20 h-20 rounded-lg object-cover flex-shrink-0 bg-white/5"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            )}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {article.summary}
          </p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {article.publishedAt ? formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true }) : "Recently"}
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              {article.hashtags?.slice(0, 3).map((tag: string) => (
                <span key={tag} className="text-xs text-primary/70">
                  <Hash className="w-3 h-3 inline" />{tag}
                </span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function AINewsUpdates() {
  const [selectedCategory, setSelectedCategory] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const { data, isLoading } = useQuery({
    queryKey: ["/api/news", selectedCategory, page],
    queryFn: () => api.news.list(page, pageSize, selectedCategory || undefined),
    refetchInterval: 60000,
  });

  const articles = data?.articles || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 };

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    setPage(1);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold" data-testid="text-page-title">AI News Updates</h1>
            <p className="text-sm text-muted-foreground">Latest AI news, automatically collected and processed from multiple sources</p>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          {CATEGORIES.map((cat) => (
            <Button
              key={cat.value}
              variant={selectedCategory === cat.value ? "default" : "outline"}
              size="sm"
              className={cn(
                "h-8 text-xs whitespace-nowrap",
                selectedCategory === cat.value
                  ? "bg-primary text-white"
                  : "bg-card border-white/10 hover:bg-white/5"
              )}
              onClick={() => handleCategoryChange(cat.value)}
              data-testid={`button-category-${cat.value || "all"}`}
            >
              {cat.label}
            </Button>
          ))}
          {pagination.total > 0 && (
            <span className="text-xs text-muted-foreground ml-auto whitespace-nowrap" data-testid="text-total-count">
              {pagination.total} articles
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Newspaper className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No news articles yet</p>
            <p className="text-sm">The pipeline is collecting and processing news. Check back shortly.</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {articles.map((article: any) => (
                <NewsCard key={article.id} article={article} />
              ))}
            </div>

            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4" data-testid="pagination-controls">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-card border-white/10 hover:bg-white/5"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  data-testid="button-prev-page"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                </Button>
                <span className="text-sm text-muted-foreground px-3" data-testid="text-page-info">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-card border-white/10 hover:bg-white/5"
                  onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                  disabled={page >= pagination.totalPages}
                  data-testid="button-next-page"
                >
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
