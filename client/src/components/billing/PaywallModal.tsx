import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getCurrentUserId } from "@/lib/mockData";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  Zap, Crown, Wallet, Lock, ArrowRight, Sparkles, Check, Swords, Bot, Video, Megaphone
} from "lucide-react";
import { useState, createContext, useContext, useCallback } from "react";

type PaywallReason = "low_credits" | "debate_create" | "premium_feature" | "trending_boost" | "ai_response" | "video_generation";

interface PaywallContextType {
  showPaywall: (reason: PaywallReason, details?: { actionType?: string; cost?: number }) => void;
  hidePaywall: () => void;
}

const PaywallContext = createContext<PaywallContextType>({
  showPaywall: () => {},
  hidePaywall: () => {},
});

export function usePaywall() {
  return useContext(PaywallContext);
}

const REASON_CONFIG: Record<PaywallReason, { icon: any; title: string; description: string; ctaLabel: string }> = {
  low_credits: {
    icon: Wallet,
    title: "Running Low on Credits",
    description: "You're running low on credits. Top up to keep using AI features, debates, and more.",
    ctaLabel: "Buy Credits",
  },
  debate_create: {
    icon: Swords,
    title: "Credits Required for Debates",
    description: "Creating debates requires credits. Upgrade your plan for discounts or buy a credit pack.",
    ctaLabel: "Get Credits",
  },
  premium_feature: {
    icon: Lock,
    title: "Premium Feature",
    description: "This feature requires a paid plan. Upgrade to unlock advanced capabilities.",
    ctaLabel: "View Plans",
  },
  trending_boost: {
    icon: Megaphone,
    title: "Boost Your Content",
    description: "Spend credits to boost your content's visibility and reach more people.",
    ctaLabel: "Boost Now",
  },
  ai_response: {
    icon: Bot,
    title: "AI Response Credits",
    description: "AI-powered responses use credits. Upgrade for more daily responses or buy credits.",
    ctaLabel: "Get Credits",
  },
  video_generation: {
    icon: Video,
    title: "Video Generation",
    description: "Video generation requires credits. Get a credit pack to create videos.",
    ctaLabel: "Buy Credits",
  },
};

function PaywallContent({ reason, details, onClose }: { reason: PaywallReason; details?: { actionType?: string; cost?: number }; onClose: () => void }) {
  const [, navigate] = useLocation();
  const userId = getCurrentUserId();
  const { toast } = useToast();
  const config = REASON_CONFIG[reason];
  const Icon = config.icon;

  const { data: packages = [] } = useQuery({
    queryKey: ["/api/billing/credit-packages"],
    queryFn: () => api.billing.creditPackages(),
  });

  const { data: summary } = useQuery({
    queryKey: ["/api/billing/summary", userId],
    queryFn: () => userId ? api.billing.summary(userId) : null,
    enabled: !!userId,
  });

  const purchaseMutation = useMutation({
    mutationFn: (packageId: string) => api.billing.purchaseCredits(userId!, packageId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/billing/summary"] });
      toast({ title: "Credits purchased!", description: `${data.purchase.creditsBought} credits added.` });
      onClose();
    },
    onError: (err: Error) => toast({ title: "Purchase failed", description: err.message, variant: "destructive" }),
  });

  const quickPack = packages.find((p: any) => p.popular) || packages[0];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className={cn("p-3 rounded-2xl", reason === "low_credits" ? "bg-amber-500/10" : "bg-primary/10")}>
          <Icon className={cn("w-6 h-6", reason === "low_credits" ? "text-amber-400" : "text-primary")} />
        </div>
        <div>
          <h3 className="text-lg font-display font-bold">{config.title}</h3>
          <p className="text-sm text-muted-foreground">{config.description}</p>
        </div>
      </div>

      {summary && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <Wallet className="w-4 h-4 text-primary" />
          <span className="text-sm">Current Balance:</span>
          <span className="font-bold font-mono text-primary">{summary.balance} credits</span>
          {details?.cost && (
            <>
              <span className="text-muted-foreground mx-1">·</span>
              <span className="text-sm text-muted-foreground">Cost: {details.cost} credits</span>
              {summary.balance < details.cost && (
                <Badge variant="outline" className="text-[9px] border-red-500/20 text-red-400 bg-red-500/5 ml-auto">
                  Insufficient
                </Badge>
              )}
            </>
          )}
        </div>
      )}

      {quickPack && (
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-semibold">{quickPack.name}</p>
                <p className="text-xs text-muted-foreground">
                  {quickPack.credits} credits {quickPack.bonusCredits > 0 ? `+ ${quickPack.bonusCredits} bonus` : ""} for ${(quickPack.priceUsd / 100).toFixed(0)}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              className="h-8 text-xs gap-1"
              onClick={() => purchaseMutation.mutate(quickPack.id)}
              disabled={purchaseMutation.isPending}
              data-testid="button-quick-buy"
            >
              <Zap className="w-3 h-3" /> Quick Buy
            </Button>
          </div>
        </Card>
      )}

      <div className="flex items-center gap-2">
        <Button
          className="flex-1 h-9 text-sm gap-1.5"
          onClick={() => { navigate("/billing"); onClose(); }}
          data-testid="button-view-billing"
        >
          <CreditCard className="w-4 h-4" /> {config.ctaLabel}
        </Button>
        <Button
          variant="outline"
          className="flex-1 h-9 text-sm gap-1.5 border-purple-500/20 text-purple-400 hover:bg-purple-500/10"
          onClick={() => { navigate("/billing"); onClose(); }}
          data-testid="button-view-plans"
        >
          <Crown className="w-4 h-4" /> View Plans
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: Check, label: "No expiry on credits" },
          { icon: Crown, label: "Plan discounts" },
          { icon: Sparkles, label: "Bonus credits" },
        ].map(({ icon: I, label }) => (
          <div key={label} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <I className="w-3 h-3 text-emerald-400" /> {label}
          </div>
        ))}
      </div>
    </div>
  );
}

import { CreditCard } from "lucide-react";

export function PaywallProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState<PaywallReason>("low_credits");
  const [details, setDetails] = useState<{ actionType?: string; cost?: number } | undefined>();

  const showPaywall = useCallback((r: PaywallReason, d?: { actionType?: string; cost?: number }) => {
    setReason(r);
    setDetails(d);
    setIsOpen(true);
  }, []);

  const hidePaywall = useCallback(() => setIsOpen(false), []);

  return (
    <PaywallContext.Provider value={{ showPaywall, hidePaywall }}>
      {children}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-card border-white/[0.08] max-w-md" data-testid="dialog-paywall">
          <PaywallContent reason={reason} details={details} onClose={hidePaywall} />
        </DialogContent>
      </Dialog>
    </PaywallContext.Provider>
  );
}
