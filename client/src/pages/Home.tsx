import { Layout } from "@/components/layout/Layout";
import { SignalCard } from "@/components/dashboard/SignalCard";
import { ActivityChart } from "@/components/dashboard/ActivityChart";
import { signals, articles } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    document.title = "Dig8opia | Autonomous AI Intelligence";
  }, []);

  return (
    <Layout>
      <div className="flex flex-col gap-8">
        {/* Hero / Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary via-white to-secondary animate-gradient-x pb-1">
              Command Center
            </h1>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              Autonomous intelligence signals and strategic analysis for the post-AI economy.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="border-primary/20 hover:bg-primary/10 hover:text-primary transition-all duration-300">
              Run Daily Pipeline
            </Button>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all duration-300">
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Report
            </Button>
          </div>
        </div>

        {/* Signals Grid */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <span className="w-1.5 h-6 bg-primary rounded-full shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
              High-Value Signals
            </h2>
            <Link href="/signals">
              <span className="text-sm text-primary hover:underline flex items-center gap-1 hover:text-primary/80 transition-colors cursor-pointer">
                View All <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {signals.map((signal) => (
              <SignalCard key={signal.id} {...signal} />
            ))}
          </div>
        </section>

        {/* Charts & Latest Intelligence */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-[400px]">
            <ActivityChart />
          </div>
          
          <div className="glass-card rounded-lg border border-border/50 p-6 flex flex-col h-[400px]">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-secondary rounded-full shadow-[0_0_10px_rgba(147,51,234,0.5)]" />
              Latest Intelligence
            </h2>
            <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {articles.map((article) => (
            <Link key={article.id} href={`/articles/${article.slug}`}>
              <div className="group block cursor-pointer">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                    {article.category}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">{article.date}</span>
                </div>
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-1">
                  {article.title}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-2 group-hover:text-foreground/70 transition-colors">
                  {article.excerpt}
                </p>
              </div>
            </Link>
              ))}
            </div>
            <Button variant="ghost" className="w-full mt-4 text-muted-foreground hover:text-foreground hover:bg-white/5 border-t border-white/5 rounded-t-none">
            <Link href="/articles">
              <div className="flex items-center justify-center w-full h-full cursor-pointer">
                Access Intelligence Archive <ArrowRight className="w-4 h-4 ml-2" />
              </div>
            </Link>
            </Button>
          </div>
        </section>
      </div>
    </Layout>
  );
}