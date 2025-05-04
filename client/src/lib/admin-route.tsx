import { useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

type AdminRouteProps = {
  component: React.ComponentType;
};

export function AdminRoute({ component: Component }: AdminRouteProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    // Check if the user is logged in as admin
    fetch("/api/admin/analytics")
      .then(response => {
        if (response.status === 401) {
          toast({
            title: "Authentication Required",
            description: "Please log in as an admin to access this page.",
            variant: "destructive"
          });
          navigate("/admin/login");
        }
      })
      .catch(() => {
        navigate("/admin/login");
      });
  }, [navigate, toast]);

  return <Component />;
}
