import { useEffect } from "react";
import { useLocation } from "wouter";
import {
  ArrowRight,
  Bot,
  BriefcaseBusiness,
  ClipboardList,
  FileText,
  Headphones,
  Loader2,
  LogOut,
  Receipt,
  ShieldAlert,
  Users,
} from "lucide-react";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type StaffWorkArea = {
  title: string;
  description: string;
  href: string;
  permissions: string[];
  icon: any;
};

const STAFF_WORK_AREAS: StaffWorkArea[] = [
  {
    title: "Support Center",
    description: "Review support queues, customer issues, and internal support activity.",
    href: "/admin/support",
    permissions: ["support:view", "support:manage"],
    icon: Headphones,
  },
  {
    title: "Knowledge Base",
    description: "Maintain internal support knowledge and customer-help resources.",
    href: "/admin/knowledge-base",
    permissions: ["support:manage", "knowledge:manage", "content:manage"],
    icon: FileText,
  },
  {
    title: "Content / News",
    description: "Monitor content operations, news workflows, and distribution surfaces.",
    href: "/admin/marketing",
    permissions: ["content:manage", "news:manage", "marketing:manage"],
    icon: ClipboardList,
  },
  {
    title: "AI Operations",
    description: "Inspect AI usage, operational cost signals, and platform health indicators.",
    href: "/admin/ai-cost-monitor",
    permissions: ["ai:ops", "ai:manage", "costs:view"],
    icon: Bot,
  },
  {
    title: "Billing / Revenue",
    description: "View revenue and billing operations without exposing secrets or tokens.",
    href: "/admin/revenue",
    permissions: ["billing:view", "revenue:view"],
    icon: Receipt,
  },
  {
    title: "Audit / Risk",
    description: "Review risk, compliance, and audit surfaces assigned to your role.",
    href: "/admin/risk-center",
    permissions: ["audit:view", "risk:manage", "compliance:manage"],
    icon: ShieldAlert,
  },
  {
    title: "Operations Center",
    description: "Track platform operations, work queues, and internal build flow.",
    href: "/admin/operations",
    permissions: ["operations:view", "operations:manage", "build:manage"],
    icon: BriefcaseBusiness,
  },
  {
    title: "Staff Management",
    description: "Manage internal employee access when this permission is assigned.",
    href: "/admin/staff",
    permissions: ["staff:manage"],
    icon: Users,
  },
];

function canOpenArea(userPermissions: string[], areaPermissions: string[]) {
  return userPermissions.includes("*") || areaPermissions.some((permission) => userPermissions.includes(permission));
}

export default function StaffDashboard() {
  const [, navigate] = useLocation();
  const { admin, isLoading, isAuthenticated, permissions } = useAdminAuth();
  const isStaffActor = admin?.actor?.type === "staff";

  useEffect(() => {
    if (!isLoading && isAuthenticated && !isStaffActor) {
      navigate("/admin/dashboard", { replace: true });
    }
  }, [isAuthenticated, isLoading, isStaffActor, navigate]);

  const handleLogout = async () => {
    await api.admin.logout().catch(() => {});
    queryClient.invalidateQueries({ queryKey: ["admin-verify"] });
    navigate("/admin/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#060611] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  if (!isAuthenticated || !isStaffActor) return null;

  const availableAreas = STAFF_WORK_AREAS.filter((area) => canOpenArea(permissions, area.permissions));

  return (
    <div className="min-h-screen bg-[#060611] text-white">
      <div className="border-b border-white/5 bg-gray-950/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-purple-300/70">Mougle Staff</p>
            <h1 className="text-lg font-semibold">Staff Dashboard</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-gray-300 hover:text-white">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <section className="rounded-lg border border-white/10 bg-gray-900/60 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold">Assigned Work Areas</h2>
              <p className="text-sm text-gray-400 mt-1">Your tools are limited to the permissions assigned to this staff account.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(permissions.length ? permissions : ["No scoped permissions"]).map((permission) => (
                <span key={permission} className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-gray-300">
                  {permission}
                </span>
              ))}
            </div>
          </div>
        </section>

        {availableAreas.length === 0 ? (
          <Card className="bg-gray-900/70 border-gray-800/70 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-white">No staff tools assigned</h3>
            <p className="text-sm text-gray-400 mt-2">
              This account is active, but it does not have scoped work permissions yet.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {availableAreas.map((area) => {
              const Icon = area.icon;
              return (
                <Card key={area.href} className="bg-gray-900/70 border-gray-800/70 p-4 rounded-lg hover:border-purple-500/30 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-300 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-white">{area.title}</h3>
                  <p className="text-sm text-gray-400 mt-2 min-h-[60px]">{area.description}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-4 px-0 text-purple-300 hover:text-white hover:bg-transparent"
                    onClick={() => navigate(area.href)}
                  >
                    Open
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
