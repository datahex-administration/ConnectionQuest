import { useEffect, useRef } from "react";
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
  // Adding a cache to avoid repeated calls for the same session code
  const sessionStatusCache = useRef<Record<string, boolean>>({});
  
  const checkUserSessionStatus = async (sessionCode: string): Promise<boolean> => {
    if (!user?.id) return false;
    
    // Check if we already have a cached result for this session code
    if (sessionStatusCache.current[sessionCode] !== undefined) {
      return sessionStatusCache.current[sessionCode];
    }
    
    try {
      const response = await fetch(`/api/sessions/${sessionCode}/user-status?userId=${user.id}`);
      const data = await response.json();
      const hasSubmitted = data.hasSubmitted || false;
      
      // Cache the result for future checks
      sessionStatusCache.current[sessionCode] = hasSubmitted;
      
      return hasSubmitted;
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
