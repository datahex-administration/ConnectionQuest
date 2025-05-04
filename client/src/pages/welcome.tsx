import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function Welcome() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  
  // Redirect to code session if user is already logged in
  useEffect(() => {
    if (user) {
      navigate("/code-session");
    }
  }, [user, navigate]);

  // If loading, show loading spinner
  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <Header />
        
        <div className="container mx-auto flex items-center justify-center min-h-[300px]">
          <div className="text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
        
        <Footer />
      </div>
    );
  }
  
  // If logged in, redirect (handled by useEffect)
  if (user) return null;
  return (
    <div className="animate-fade-in">
      <Header />
      
      <div className="container px-4 py-8 md:py-12 mx-auto max-w-4xl">
        <div className="flex flex-col lg:flex-row items-center gap-8">
          {/* Left side content */}
          <div className="text-center lg:text-left flex-1">
            <h1 className="text-3xl md:text-4xl font-bold text-primary mb-4">
              Compatibility Challenge
            </h1>
            <p className="text-lg text-gray-600 mb-6">
              Discover how well you know your partner through our fun compatibility
              game and win exclusive vouchers together!
            </p>
            
            <Link href="/register">
              <Button 
                size="lg" 
                className="btn-primary text-white font-semibold py-4 px-8 rounded-full shadow-lg text-lg"
              >
                Let's Get Started
              </Button>
            </Link>
          </div>
          
          {/* Right side image - only shown on larger screens or after content on mobile */}
          <div className="lg:flex-1 w-full max-w-md mx-auto lg:mx-0 mt-8 lg:mt-0">
            <div className="relative rounded-lg shadow-xl overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1525879000488-bff3b1c387cf" 
                alt="Couple Compatibility" 
                className="w-full h-auto rounded-lg hover:scale-105 transition-transform duration-300"
              />
            </div>
          </div>
        </div>
        
        {/* Mobile-only CTA button for immediate visibility without scrolling */}
        <div className="fixed bottom-8 left-0 right-0 text-center z-10 lg:hidden px-4">
          <Link href="/register">
            <Button 
              size="lg" 
              className="w-full btn-primary text-white font-semibold py-4 px-8 rounded-full shadow-lg text-lg animate-pulse-slow"
            >
              Start Now!
            </Button>
          </Link>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
