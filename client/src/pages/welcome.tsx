import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { Loader2, Instagram, Youtube, Globe } from "lucide-react";

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
      <div className="bg-gradient-to-b from-primary/10 to-secondary py-6 md:py-10">
        <div className="container px-3 mx-auto max-w-4xl">
          <div className="flex flex-col items-center justify-center text-center">
            {/* Mawadha logo - Larger and more readable */}
            <div className="mb-8 flex flex-col items-center">
              <img src="/images/mawadha-logo.png" alt="Mawadha Logo" className="h-32 md:h-40 w-auto" />
              <img src="/images/mawadha-letter.png" alt="Mawadha Text" className="h-12 md:h-16 w-auto mt-3" />
            </div>

            {/* Main content */}
            <div className="max-w-lg">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary mb-4 animate-fade-in">
                Compatibility Challenge
              </h1>
              <p className="text-lg md:text-xl text-gray-700 mb-8 animate-slide-up">
                Discover how well you know your partner and win exclusive
                vouchers together!
              </p>

              <div className="mt-6 animate-fade-in">
                <Link href="/register">
                  <Button
                    size="lg"
                    className="font-semibold py-4 px-8 rounded-full shadow-lg text-lg md:text-xl bg-[#8e2c8e] hover:bg-[#742374] text-white"
                  >
                    Start Now
                  </Button>
                </Link>
              </div>

              {/* Social Media Links */}
              <div className="mt-10 flex justify-center items-center space-x-5">
                <a
                  href="https://www.instagram.com/mawadhaofficial?utm_source=qr&igsh=bmgxNGl0MmpjYm92"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 transition-colors duration-200 flex flex-col items-center"
                >
                  <Instagram className="w-6 h-6 mb-1" />
                  <span className="text-xs">Instagram</span>
                </a>
                <a
                  href="https://youtube.com/@mawadhaofficial?si=TGKKepllEntj_gSy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 transition-colors duration-200 flex flex-col items-center"
                >
                  <Youtube className="w-6 h-6 mb-1" />
                  <span className="text-xs">YouTube</span>
                </a>
                <a
                  href="https://www.mawadha.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 transition-colors duration-200 flex flex-col items-center"
                >
                  <Globe className="w-6 h-6 mb-1" />
                  <span className="text-xs">Website</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
