import { Layout } from "@/components/layout/Layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useState } from "react";
import {
  DollarSign, TrendingUp, ShoppingCart, CheckCircle2,
  AlertCircle, Wallet, ArrowUpRight, Clock, CreditCard, Zap
} from "lucide-react";

function StatCard({ label, value, icon: Icon, color, suffix = "" }: any) {
  return (
    <Card className="glass-card rounded-xl" data-testid={`stat-${label.toLowerCase().replace(/\s/g, "-")}`}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-2">
          <div className={cn("p-2 rounded-lg", color)}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl font-bold font-mono">{value}{suffix}</div>
        <div className="text-xs text-muted-foreground mt-1">{label}</div>
      </CardContent>
    </Card>
  );
}

function OnboardingForm({ userId, onComplete }: { userId: string; onComplete: () => void }) {
  const [form, setForm] = useState({ businessName: "", email: "", contactName: "", phone: "" });
  const queryClient = useQueryClient();

  const onboard = useMutation({
    mutationFn: () => api.razorpay.onboardCreator({ userId, ...form }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/razorpay/creator-account"] });
      onComplete();
    },
  });

  return (
    <Card className="glass-card rounded-xl max-w-lg mx-auto" data-testid="section-onboarding">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-primary" />
          Connect Payment Account
        </CardTitle>
        <p className="text-sm text-muted-foreground">Set up your Razorpay account to receive 70% of every sale directly.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Business / Creator Name</label>
          <Input
            data-testid="input-business-name"
            placeholder="Your business or brand name"
            value={form.businessName}
            onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Contact Name</label>
          <Input
            data-testid="input-contact-name"
            placeholder="Full name"
            value={form.contactName}
            onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Email</label>
          <Input
            data-testid="input-email"
            type="email"
            placeholder="creator@example.com"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Phone (optional)</label>
          <Input
            data-testid="input-phone"
            placeholder="+91 9876543210"
            value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
          />
        </div>
        <Button
          data-testid="button-connect-razorpay"
          className="w-full"
          onClick={() => onboard.mutate()}
          disabled={onboard.isPending || !form.businessName || !form.email || !form.contactName}
        >
          {onboard.isPending ? "Connecting..." : "Connect Razorpay Account"}
        </Button>
        {onboard.isError && (
          <div className="text-xs text-red-400 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> {(onboard.error as Error).message}
          </div>
        )}
        <div className="text-[10px] text-muted-foreground text-center mt-2">
          No banking details are stored on Dig8opia. All payouts handled by Razorpay Route.
        </div>
      </CardContent>
    </Card>
  );
}

export default function CreatorEarnings() {
  const userId = "current-user";
  const [showOnboarding, setShowOnboarding] = useState(false);

  const { data: accountData, isLoading: accLoading } = useQuery({
    queryKey: ["/api/razorpay/creator-account", userId],
    queryFn: () => api.razorpay.getCreatorAccount(userId),
  });

  const { data: earnings, isLoading: earningsLoading } = useQuery({
    queryKey: ["/api/razorpay/creator-earnings", userId],
    queryFn: () => api.razorpay.getCreatorEarnings(userId),
  });

  const isLoading = accLoading || earningsLoading;
  const account = accountData?.account;
  const isOnboarded = account?.isActive;

  if (isLoading) {
    return (
      <Layout>
        <div className="p-6 space-y-6">
          <Skeleton className="h-10 w-60" />
          <div className="grid grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-28" />)}
          </div>
          <Skeleton className="h-64" />
        </div>
      </Layout>
    );
  }

  if (!isOnboarded && !showOnboarding) {
    return (
      <Layout>
        <div className="p-6 max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-4 py-12">
            <div className="inline-flex p-4 rounded-2xl bg-primary/10 mb-4">
              <Wallet className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-3xl font-bold" data-testid="text-earnings-title">Creator Earnings</h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              Sell your intelligent entities and applications. Receive 70% of every sale directly to your bank account via Razorpay.
            </p>
            <div className="flex flex-wrap justify-center gap-6 py-6 text-sm">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-4 h-4" /> 70% Creator Share
              </div>
              <div className="flex items-center gap-2 text-blue-400">
                <Zap className="w-4 h-4" /> Instant Settlements
              </div>
              <div className="flex items-center gap-2 text-amber-400">
                <CreditCard className="w-4 h-4" /> Razorpay Route
              </div>
            </div>
            <Button
              data-testid="button-start-onboarding"
              size="lg"
              onClick={() => setShowOnboarding(true)}
            >
              Set Up Payments
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  if (showOnboarding && !isOnboarded) {
    return (
      <Layout>
        <div className="p-6 max-w-4xl mx-auto space-y-6">
          <h1 className="text-2xl font-bold">Creator Onboarding</h1>
          <OnboardingForm userId={userId} onComplete={() => setShowOnboarding(false)} />
        </div>
      </Layout>
    );
  }

  const formatAmount = (paisa: number) => `₹${(paisa / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Wallet className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-earnings-title">Creator Earnings</h1>
              <p className="text-sm text-muted-foreground">Your marketplace revenue & payment status</p>
            </div>
          </div>
          <Badge className={cn("px-3 py-1", account?.isActive
            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            : "bg-amber-500/10 text-amber-400 border-amber-500/20"
          )} data-testid="badge-payment-status">
            {account?.isActive ? "Razorpay Connected" : "Setup Pending"}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="section-stats">
          <StatCard
            label="All-Time Earnings"
            value={formatAmount(earnings?.allTime?.earnings || 0)}
            icon={DollarSign}
            color="bg-emerald-500/10 text-emerald-400"
          />
          <StatCard
            label="Monthly Earnings"
            value={formatAmount(earnings?.monthly?.earnings || 0)}
            icon={TrendingUp}
            color="bg-blue-500/10 text-blue-400"
          />
          <StatCard
            label="Total Orders"
            value={earnings?.allTime?.orders || 0}
            icon={ShoppingCart}
            color="bg-violet-500/10 text-violet-400"
          />
          <StatCard
            label="Platform Fees Paid"
            value={formatAmount(earnings?.allTime?.fees || 0)}
            icon={ArrowUpRight}
            color="bg-amber-500/10 text-amber-400"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="glass-card rounded-xl lg:col-span-2" data-testid="section-recent-earnings">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Recent Earnings
              </CardTitle>
            </CardHeader>
            <CardContent>
              {earnings?.recentEarnings?.length > 0 ? (
                <div className="space-y-3">
                  {earnings.recentEarnings.map((earning: any) => (
                    <div key={earning.id} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]" data-testid={`earning-${earning.id}`}>
                      <div>
                        <div className="text-sm font-medium">Sale #{earning.orderId.slice(0, 8)}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {new Date(earning.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-emerald-400">{formatAmount(earning.amount)}</div>
                        <Badge className={cn("text-[10px] px-1.5",
                          earning.status === "settled" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                        )}>
                          {earning.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <ShoppingCart className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No earnings yet. List entities on the marketplace to start earning.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card rounded-xl" data-testid="section-account-info">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" />
                Payment Account
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {[
                  { label: "Status", value: account?.onboardingStatus || "N/A" },
                  { label: "Business", value: account?.businessName || "N/A" },
                  { label: "Email", value: account?.email || "N/A" },
                  { label: "Provider", value: "Razorpay Route" },
                  { label: "Revenue Split", value: "70% Creator / 30% Platform" },
                ].map((item, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
              <div className="pt-3 border-t border-white/[0.06]">
                <div className="text-[10px] text-muted-foreground text-center">
                  Payments processed securely by Razorpay. No banking details stored on Dig8opia.
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
