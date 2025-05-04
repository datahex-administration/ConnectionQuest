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
      
      {/* Hero section with background gradient */}
      <div className="bg-gradient-to-b from-primary/10 to-secondary py-6 md:py-12">
        <div className="container px-3 mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-8">
            {/* Left side content */}
            <div className="text-center md:text-left md:max-w-md lg:max-w-xl">
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-primary mb-3">
                Compatibility Challenge
              </h1>
              <p className="text-base md:text-lg text-gray-700 mb-4">
                Discover how well you know your partner through our fun compatibility
                game and win exclusive vouchers together!
              </p>
              
              <div className="hidden md:block">
                <Link href="/register">
                  <Button 
                    size="lg" 
                    className="font-semibold py-3 px-6 rounded-full shadow-lg text-base md:text-lg bg-[#8e2c8e] hover:bg-[#742374] text-white"
                  >
                    Let's Get Started
                  </Button>
                </Link>
              </div>
            </div>
            
            {/* Right side banner - responsive for mobile and desktop */}
            <div className="w-full md:w-1/2 lg:w-2/5 mt-4 md:mt-0">
              <div className="relative rounded-lg shadow-xl overflow-hidden">
                <img 
                  src="https://images.unsplash.com/photo-1515169067868-5387ec356754?q=80&w=1000" 
                  alt="Compatibility Challenge" 
                  className="w-full h-auto rounded-lg object-cover hover:scale-105 transition-transform duration-300"
                  style={{aspectRatio: "16/9"}}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile-only centered button for small screens */}
      <div className="md:hidden text-center py-4">
        <Link href="/register">
          <Button 
            className="font-semibold py-3 px-6 rounded-full shadow-lg text-base bg-[#8e2c8e] hover:bg-[#742374] text-white"
          >
            Let's Get Started
          </Button>
        </Link>
      </div>
      
      {/* Mobile-only CTA button for immediate visibility without scrolling */}
      <div className="fixed bottom-4 left-0 right-0 text-center z-10 md:hidden px-4">
        <Link href="/register">
          <Button 
            className="w-auto px-5 py-2 rounded-full shadow-lg text-base animate-pulse-slow bg-[#8e2c8e] hover:bg-[#742374] text-white"
          >
            Start Now!
          </Button>
        </Link>
      </div>
      
      <Footer />
    </div>
  );
}
