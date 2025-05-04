import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export default function Welcome() {
  return (
    <div className="animate-fade-in">
      <Header />
      
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-primary mb-4">
            Compatibility Challenge
          </h2>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Discover how well you know your partner through our fun compatibility
            game and win exclusive vouchers together!
          </p>
          
          <div className="relative rounded-lg shadow-lg max-w-sm mx-auto mb-8 overflow-hidden">
            <img 
              src="https://images.unsplash.com/photo-1525879000488-bff3b1c387cf" 
              alt="Couple Compatibility" 
              className="w-full h-auto rounded-lg"
            />
          </div>
        </div>
        
        <Link href="/register">
          <Button size="lg" className="btn-primary text-white font-semibold py-3 px-8 rounded-full shadow-lg">
            Let's Get Started
          </Button>
        </Link>
      </div>
      
      <Footer />
    </div>
  );
}
