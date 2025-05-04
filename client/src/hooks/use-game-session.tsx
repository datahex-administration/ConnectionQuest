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

  const clearUserSession = () => {
    // This function exists to provide a way to clear user session data
    // and allow them to play again
    localStorage.removeItem('gameSessionCode');
  };

  // Check if a user has already completed a session
  const checkUserSessionStatus = async (sessionCode: string): Promise<boolean> => {
    if (!user?.id) return false;
    
    try {
      const response = await fetch(`/api/sessions/${sessionCode}/user-status?userId=${user.id}`);
      const data = await response.json();
      return data.hasSubmitted || false;
    } catch (error) {
      console.error("Error checking session status:", error);
      return false;
    }
  };
  
  return {
    userId: user?.id || null,
    isLoading,
    user,
    clearUserSession,
    checkUserSessionStatus
  };
}
