import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface UseGameSessionProps {
  redirectIfNoUser?: boolean;
}

export function useGameSession({ redirectIfNoUser = true }: UseGameSessionProps = {}) {
  const [userId, setUserId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  useEffect(() => {
    // Check if user is registered by checking for userId in the sessionStorage
    const storedUserId = sessionStorage.getItem('userId');
    
    if (storedUserId) {
      setUserId(parseInt(storedUserId, 10));
    } else if (redirectIfNoUser) {
      toast({
        title: "Registration Required",
        description: "Please register first to play the game.",
        variant: "destructive",
      });
      navigate('/register');
    }
    
    setIsLoading(false);
  }, [navigate, redirectIfNoUser, toast]);
  
  const setUserIdAndStore = (id: number) => {
    sessionStorage.setItem('userId', id.toString());
    setUserId(id);
  };
  
  const clearUserSession = () => {
    sessionStorage.removeItem('userId');
    setUserId(null);
  };
  
  return {
    userId,
    isLoading,
    setUserId: setUserIdAndStore,
    clearUserSession,
  };
}
