import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { aiInsights } from "@/lib/mockData";
import { Sparkles, CheckCircle2, AlertTriangle, XCircle, TrendingUp } from "lucide-react";

export function AIInsightPanel() {
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