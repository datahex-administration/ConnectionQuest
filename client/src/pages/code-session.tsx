import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useGameSession } from "@/hooks/use-game-session";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Heart, Loader2 } from "lucide-react";

export default function CodeSession() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [partnerCode, setPartnerCode] = useState("");
  const [partnerJoined, setPartnerJoined] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user, isLoading, logoutMutation } = useAuth();
  const { checkUserSessionStatus } = useGameSession();
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [partnerCheckAttempts, setPartnerCheckAttempts] = useState(0);
  const [lastPollingTime, setLastPollingTime] = useState(0);

  // Poll for partner status if we have a session code
  useEffect(() => {
    if (!sessionCode) return;

    const checkPartnerStatus = async () => {
      // Implement rate limiting - only check if enough time has passed since last check
      const now = Date.now();
      if (now - lastPollingTime < 5000 && partnerCheckAttempts > 0) {
        return; // Don't check if it's been less than 5 seconds since last check
      }
      
      setLastPollingTime(now);
      
      try {
        const response = await apiRequest("GET", `/api/sessions/${sessionCode}/status`);
        const data = await response.json();
        if (data.ready) {
          setPartnerJoined(true);
          // Reset attempts counter once partner joined
          setPartnerCheckAttempts(0);
        } else {
          // Increment the check attempts counter
          setPartnerCheckAttempts(prev => prev + 1);
        }
      } catch (error) {
        console.error("Error checking partner status:", error);
        // Don't show errors to the user for polling operations
        // But increment attempt counter to track failures
        setPartnerCheckAttempts(prev => prev + 1);
      }
    };

    // Initial check
    checkPartnerStatus();

    // Set up polling interval with longer delay to reduce load
    // Use a longer interval if we've been checking for a while
    const interval = partnerCheckAttempts > 10 ? 10000 : 8000;
    const intervalId = setInterval(checkPartnerStatus, interval);
    
    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, [sessionCode, partnerCheckAttempts, lastPollingTime]);

  const generateCode = async () => {
    if (!user) {
      toast({
        title: "Registration Required",
        description: "Please register first to generate a code.",
        variant: "destructive",
      });
      navigate("/register");
      return;
    }

    setIsGenerating(true);
    
    try {
      // Don't need to send userId, it's handled by session in the backend
      const response = await apiRequest("POST", "/api/sessions/create", {});
      const data = await response.json();
      
      if (data.sessionCode) {
        setSessionCode(data.sessionCode);
        toast({
          title: "Code Generated",
          description: "Share this code with your partner to start the game.",
        });
      } else {
        throw new Error("Failed to generate session code");
      }
    } catch (error) {
      console.error("Error generating code:", error);
      toast({
        title: "Code Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate a session code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const joinSession = async () => {
    if (!user) {
      toast({
        title: "Registration Required",
        description: "Please register first to join a session.",
        variant: "destructive",
      });
      navigate("/register");
      return;
    }

    if (!partnerCode.trim()) {
      toast({
        title: "Code Required",
        description: "Please enter your partner's code to join the session.",
        variant: "destructive",
      });
      return;
    }

    setIsJoining(true);
    
    try {
      // First, check if the user has already submitted answers for this session
      try {
        const hasSubmitted = await checkUserSessionStatus(partnerCode);
        if (hasSubmitted) {
          // If user has already submitted answers, redirect to results page
          toast({
            title: "Already Submitted",
            description: "You've already submitted answers for this session. Redirecting to results.",
          });
          navigate(`/results/${partnerCode}`);
          return;
        }
      } catch (statusError) {
        console.error("Error checking submission status:", statusError);
        // Continue with join attempt even if status check fails
      }
      
      // Ensure auth token is available before joining
      const authToken = localStorage.getItem('mawadha_auth_token');
      if (!authToken) {
        // Try to fetch a new token via registration API as a fallback
        try {
          await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        } catch (e) {
          console.log("Failed to refresh token, but continuing with join attempt");
        }
      }
      
      const response = await apiRequest("POST", "/api/sessions/join", { 
        sessionCode: partnerCode
        // Don't need to send userId, it's handled by session in the backend
      });
      const result = await response.json();
      
      if (result.success) {
        // If response includes user data with token, update localStorage
        if (result.user && result.user.token) {
          localStorage.setItem('mawadha_auth_token', result.user.token);
        }
        
        // Refresh user data to ensure session is up to date
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        
        setSessionCode(partnerCode);
        setPartnerJoined(true);
        toast({
          title: "Session Joined",
          description: "You've successfully joined your partner's session.",
        });
      } else {
        throw new Error(result.message || "Could not join the session");
      }
    } catch (error) {
      console.error("Error joining session:", error);
      toast({
        title: "Failed to Join",
        description: error instanceof Error ? error.message : "Failed to join the session. Please check the code and try again.",
        variant: "destructive",
      });
    } finally {
      setIsJoining(false);
    }
  };

  const startGame = async () => {
    // Ensure we have both a session code and a logged-in user before starting
    if (sessionCode && user) {
      setCheckingStatus(true);
      try {
        // Check if the user has already submitted answers for this session
        const hasSubmitted = await checkUserSessionStatus(sessionCode);
        
        if (hasSubmitted) {
          // If user has already submitted answers, redirect to results page
          toast({
            title: "Already Submitted",
            description: "You've already submitted answers for this session. Redirecting to results.",
          });
          navigate(`/results/${sessionCode}`);
          return;
        }
        
        // Before navigating, ensure authentication is valid
        const authToken = localStorage.getItem('mawadha_auth_token');
        if (!authToken) {
          // Try to refresh authentication
          queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        }
        navigate(`/game/${sessionCode}`);
      } catch (error) {
        console.error("Error checking submission status:", error);
        // If there's an error checking status, proceed to game anyway
        navigate(`/game/${sessionCode}`);
      } finally {
        setCheckingStatus(false);
      }
    } else if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please login again before starting the game.",
        variant: "destructive",
      });
      navigate('/register');
    }
  };

  // Show loading state while checking auth status
  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <Header />
        
        <div className="max-w-md mx-auto flex items-center justify-center min-h-[300px]">
          <div className="text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
            <p className="text-gray-600">Loading your profile...</p>
          </div>
        </div>
        
        <Footer />
      </div>
    );
  }
  
  // Testing function to logout
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div className="animate-fade-in">
      <Header />
      
      {/* Temporary logout button for testing */}
      <div className="flex justify-end mb-4">
        <Button 
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="text-gray-500"
        >
          Log Out (Test)
        </Button>
      </div>
      
      <div className="max-w-md mx-auto">
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-2xl font-bold text-primary text-center mb-6">Game Session</h2>
            
            {!sessionCode ? (
              <div>
                <p className="text-center text-gray-600 mb-6">
                  Generate a unique code or enter your partner's code to start the compatibility challenge!
                </p>
                
                <div className="flex flex-col space-y-4">
                  <Button 
                    onClick={generateCode} 
                    className="bg-[#8e2c8e] hover:bg-[#742374] text-white font-semibold py-3 px-8 rounded-full shadow-lg mx-auto"
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : "Generate New Code"}
                  </Button>
                  
                  <div className="text-center my-4">
                    <p className="text-gray-500">- OR -</p>
                  </div>
                  
                  <div>
                    <label htmlFor="partner-code" className="block text-sm font-medium text-gray-700 mb-1">
                      Enter Partner's Code
                    </label>
                    <Input 
                      id="partner-code"
                      value={partnerCode}
                      onChange={(e) => setPartnerCode(e.target.value)}
                      placeholder="Enter 6-digit code"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  
                  <Button 
                    onClick={joinSession}
                    className="bg-[#8e2c8e] hover:bg-[#742374] text-white font-semibold py-3 px-8 rounded-full shadow-lg transition-all mx-auto"
                    disabled={isJoining || !partnerCode.trim()}
                  >
                    {isJoining ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Joining...
                      </>
                    ) : "Join Partner"}
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <div className="text-center mb-6">
                  <p className="text-gray-600 mb-2">Your session code is:</p>
                  <div className="session-code text-primary mb-4">{sessionCode}</div>
                  <p className="text-sm text-gray-500">Share this code with your partner to join the same session</p>
                </div>
                
                {!partnerJoined ? (
                  <div className="text-center py-4">
                    <div className="inline-block animate-pulse-slow">
                      <Heart className="h-10 w-10 text-primary" />
                    </div>
                    <p className="text-gray-600 mt-2">Waiting for your partner to join...</p>
                    {partnerCheckAttempts > 5 && (
                      <p className="text-sm text-gray-500 mt-2">This might take a few moments. Please be patient.</p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <div className="bg-green-100 text-green-600 rounded-lg p-3 mb-4">
                      <span>Partner has joined! Ready to start the challenge.</span>
                    </div>
                    
                    <Button 
                      onClick={startGame}
                      className="bg-[#8e2c8e] hover:bg-[#742374] text-white font-semibold py-3 px-8 rounded-full shadow-lg"
                      disabled={checkingStatus}
                    >
                      {checkingStatus ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Checking...
                        </>
                      ) : "Start Challenge"}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <Footer />
    </div>
  );
}
