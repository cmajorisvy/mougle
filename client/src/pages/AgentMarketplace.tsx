import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import { Store, Bot, Star, ShoppingCart, Coins, TrendingUp, Users, Tag, Zap, Loader2, Search, ArrowRight, Sparkles, Shield, Crown } from "lucide-react";
import { getCurrentUserId } from "@/lib/mockData";

const CATEGORIES = ["All", "Research", "Writing", "Analysis", "Debate", "Coding", "Translation"];

const GRADIENT_COLORS = [
  "from-purple-500 to-indigo-600",
  "from-blue-500 to-cyan-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-amber-600",
  "from-pink-500 to-rose-600",
  "from-violet-500 to-purple-600",
  "from-cyan-500 to-blue-600",
];

function getGradient(index: number) {
  return GRADIENT_COLORS[index % GRADIENT_COLORS.length];
}

export default function AgentMarketplace() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [purchasingId, setPurchasingId] = useState<string | null>(null);

  const currentUserId = getCurrentUserId();

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ["/api/marketplace/listings", selectedCategory],
    queryFn: () => api.marketplace.listings(selectedCategory === "All" ? undefined : selectedCategory.toLowerCase()),
  });

  const purchaseMutation = useMutation({
    mutationFn: ({ buyerId, listingId }: { buyerId: string; listingId: string }) =>
      api.marketplace.purchase(buyerId, listingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/listings"] });
      setPurchasingId(null);
    },
    onError: () => {
      setPurchasingId(null);
    },
  });

  const handlePurchase = (listingId: string) => {
    const buyerId = currentUserId || prompt("Enter your User ID to purchase:") || "";
    if (!buyerId) return;
    setPurchasingId(listingId);
    purchaseMutation.mutate({ buyerId, listingId });
  };

  const totalListings = listings.length;
  const featuredCount = listings.filter((l: any) => l.featured).length || Math.min(listings.length, 3);
  const totalSales = listings.reduce((sum: number, l: any) => sum + (l.totalSales || 0), 0);

  return (
    <Layout>
      <div className="space-y-8 pb-12" data-testid="page-agent-marketplace">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600/20 via-blue-600/15 to-indigo-600/10 border border-white/[0.06] p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(139,92,246,0.15),transparent_60%)]" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-full blur-3xl" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                <Store className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white" data-testid="text-marketplace-title">Agent Marketplace</h1>
                <p className="text-gray-400 text-sm" data-testid="text-marketplace-subtitle">Discover, purchase, and deploy powerful AI agents</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 mt-6">
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>Curated agents</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <Shield className="w-4 h-4 text-blue-400" />
                <span>Verified creators</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <Coins className="w-4 h-4 text-amber-400" />
                <span>Credit-based pricing</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <Crown className="w-4 h-4 text-yellow-400" />
                <span>70/30 creator split</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2" data-testid="category-filters">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium transition-all",
                selectedCategory === cat
                  ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/20"
                  : "bg-white/[0.04] text-gray-400 border border-white/[0.06] hover:bg-white/[0.08] hover:text-white"
              )}
              data-testid={`button-category-${cat.toLowerCase()}`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4" data-testid="stats-bar">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Tag className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="text-xl font-bold text-white" data-testid="text-total-listings">{totalListings}</div>
              <div className="text-xs text-gray-500">Total Listings</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Star className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="text-xl font-bold text-white" data-testid="text-featured-agents">{featuredCount}</div>
              <div className="text-xs text-gray-500">Featured Agents</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <div className="text-xl font-bold text-white" data-testid="text-total-sales">{totalSales}</div>
              <div className="text-xs text-gray-500">Total Sales</div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
          </div>
        ) : listings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4" data-testid="empty-state">
            <div className="w-16 h-16 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
              <Store className="w-8 h-8 text-gray-500" />
            </div>
            <p className="text-gray-400 text-center">No agents listed yet. Be the first to list yours!</p>
            <Button
              onClick={() => navigate("/agent-builder")}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white"
              data-testid="button-empty-list-agent"
            >
              <Zap className="w-4 h-4 mr-2" />
              List Your Agent
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="listings-grid">
            {listings.map((listing: any, index: number) => {
              const isPurchased = listing.purchased || false;
              const isCurrentlyPurchasing = purchasingId === (listing.id?.toString() || listing.listingId);
              const listingId = listing.id?.toString() || listing.listingId;

              return (
                <div
                  key={listingId || index}
                  className="group relative rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-all overflow-hidden"
                  data-testid={`card-listing-${listingId || index}`}
                >
                  <div className="p-5 space-y-4">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-white flex-shrink-0",
                        getGradient(index)
                      )}>
                        <Bot className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white text-sm truncate" data-testid={`text-agent-name-${listingId || index}`}>
                          {listing.agentName || listing.name || "AI Agent"}
                        </h3>
                        <p className="text-xs text-gray-500" data-testid={`text-seller-name-${listingId || index}`}>
                          by {listing.sellerName || listing.seller || "Creator"}
                        </p>
                      </div>
                      {listing.featured && (
                        <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px]">
                          <Crown className="w-3 h-3 mr-1" /> Featured
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed" data-testid={`text-description-${listingId || index}`}>
                      {listing.description || "A powerful AI agent ready for deployment."}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <Coins className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-sm font-bold text-white" data-testid={`text-price-${listingId || index}`}>
                            {listing.price || listing.priceCredits || 0}
                          </span>
                          <span className="text-xs text-gray-500">credits</span>
                        </div>
                      </div>
                      <Badge
                        className={cn(
                          "text-[10px]",
                          listing.pricingModel === "subscription"
                            ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                            : "bg-green-500/10 text-green-400 border-green-500/20"
                        )}
                        data-testid={`badge-pricing-${listingId || index}`}
                      >
                        {listing.pricingModel === "subscription" ? "Subscription" : "One-time"}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1" data-testid={`text-sales-${listingId || index}`}>
                        <ShoppingCart className="w-3 h-3" />
                        <span>{listing.totalSales || 0} sales</span>
                      </div>
                      <div className="flex items-center gap-1" data-testid={`text-rating-${listingId || index}`}>
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <span>{listing.rating?.toFixed(1) || listing.averageRating?.toFixed(1) || "5.0"}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20 text-[10px]" data-testid={`badge-split-${listingId || index}`}>
                        70/30 Creator Split
                      </Badge>
                    </div>

                    {(listing.skills || listing.capabilities || listing.tags) && (
                      <div className="flex flex-wrap gap-1" data-testid={`tags-skills-${listingId || index}`}>
                        {(listing.skills || listing.capabilities || listing.tags || []).slice(0, 4).map((skill: string, i: number) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-full bg-white/[0.04] text-[10px] text-gray-400 border border-white/[0.06]"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="pt-1">
                      {isPurchased ? (
                        <Badge className="w-full justify-center py-1.5 bg-green-500/10 text-green-400 border-green-500/20" data-testid={`badge-purchased-${listingId || index}`}>
                          <ShoppingCart className="w-3 h-3 mr-1.5" /> Purchased
                        </Badge>
                      ) : (
                        <Button
                          onClick={() => handlePurchase(listingId)}
                          disabled={isCurrentlyPurchasing}
                          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-sm"
                          data-testid={`button-purchase-${listingId || index}`}
                        >
                          {isCurrentlyPurchasing ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Purchasing...</>
                          ) : (
                            <><ShoppingCart className="w-4 h-4 mr-2" /> Purchase</>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-center pt-4">
          <Button
            onClick={() => navigate("/agent-builder")}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white px-8 py-3 text-sm"
            data-testid="button-sell-agent"
          >
            <Zap className="w-4 h-4 mr-2" />
            Sell Your Agent
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </Layout>
  );
}
