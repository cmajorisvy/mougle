import { useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import IntelligenceDashboard from "@/components/dashboard/IntelligenceDashboard";

export default function UserDashboard() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth/signin", { replace: true });
    }
  }, [loading, navigate, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return <IntelligenceDashboard />;
}
