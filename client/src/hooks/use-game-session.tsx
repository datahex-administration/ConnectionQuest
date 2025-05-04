import { useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface UseGameSessionProps {
  redirectIfNoUser?: boolean;
}

export function useGameSession({ redirectIfNoUser = true }: UseGameSessionProps = {}) {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  useEffect(() => {
    // Check if user is authenticated using the auth hook
    if (!isLoading && !user && redirectIfNoUser) {
      toast({
        title: "Registration Required",
        description: "Please register first to play the game.",
        variant: "destructive",
      });
      navigate('/register');
    }
  }, [user, isLoading, navigate, redirectIfNoUser, toast]);
  
  return {
    userId: user?.id || null,
    isLoading,
    user
  };
}
