import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useGameSession } from "@/hooks/use-game-session";
import { fetchGameResults, GameSessionResult } from "@/lib/game-questions";
import { generateVoucherPDF } from "@/lib/voucher-generator";
import { HeartPulse, Gift, Download } from "lucide-react";

export default function Results() {
  const params = useParams<{ code: string }>();
  const sessionCode = params.code;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { userId, clearUserSession } = useGameSession();
  
  const [isLoading, setIsLoading] = useState(true);
  const [results, setResults] = useState<GameSessionResult | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  
  useEffect(() => {
    const loadResults = async () => {
      if (!sessionCode || !userId) return;
      
      setIsLoading(true);
      try {
        const resultData = await fetchGameResults(sessionCode);
        setResults(resultData);
      } catch (error) {
        console.error("Error loading results:", error);
        toast({
          title: "Failed to Load Results",
          description: error instanceof Error ? error.message : "Something went wrong. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadResults();
  }, [sessionCode, userId, toast]);
  
  const handleDownloadVoucher = async () => {
    if (!results?.voucher) return;
    
    setIsDownloading(true);
    try {
      await generateVoucherPDF({
        voucherId: results.voucher.voucherId,
        voucherCode: results.voucher.voucherCode,
        discount: results.voucher.discount,
        validUntil: results.voucher.validUntil,
        matchPercentage: results.matchPercentage
      });
      
      toast({
        title: "Voucher Downloaded",
        description: "Your voucher has been downloaded successfully.",
      });
    } catch (error) {
      console.error("Error downloading voucher:", error);
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : "Failed to download the voucher. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };
  
  const handlePlayAgain = () => {
    clearUserSession();
    navigate("/");
  };
  
  return (
    <div className="animate-fade-in">
      <Header />
      
      <div className="max-w-md mx-auto">
        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-pulse">
                  <HeartPulse className="h-12 w-12 text-primary" />
                </div>
                <p className="text-gray-600 mt-4">Calculating your compatibility score...</p>
              </div>
            ) : (
              <div>
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary text-white text-3xl font-bold">
                    <span>{results?.matchPercentage || 0}</span><span>%</span>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800 mt-4">Compatibility Score</h2>
                  <p className="text-gray-600 mt-1">
                    {results?.matchPercentage ? results.matchPercentage >= 80 
                      ? "You and your partner are a perfect match!"
                      : results.matchPercentage >= 60
                        ? "You and your partner are a great match!"
                        : results.matchPercentage >= 40
                          ? "You and your partner have potential!"
                          : "You and your partner have room to grow together!"
                      : "No matching answers found"
                    }
                  </p>
                </div>
                
                {results?.matchingAnswers && results.matchingAnswers.length > 0 && (
                  <div className="bg-primary/10 rounded-lg p-4 mb-6">
                    <h3 className="font-semibold text-primary mb-2">Matching Answers:</h3>
                    <ul className="list-disc list-inside text-gray-700 space-y-1">
                      {results.matchingAnswers.map((match, index) => (
                        <li key={index}>You both {match.question.toLowerCase().includes("favorite") ? "love" : "chose"} {match.answer.toLowerCase()}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {results?.voucher && (
                  <div className="border-2 border-dashed border-primary/30 rounded-lg p-4 text-center">
                    <div className="flex justify-between items-center mb-4">
                      <div className="w-16 h-16 bg-primary/20 flex items-center justify-center rounded-full">
                        <Gift className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 text-left pl-4">
                        <h3 className="font-bold text-gray-800">Congratulations!</h3>
                        <p className="text-gray-600 text-sm">You've earned a special voucher</p>
                      </div>
                    </div>
                    
                    <div className="p-3 bg-primary/5 rounded-lg mb-4">
                      <p className="text-primary font-bold">{results.voucher.discount} COUPLE'S DINNER</p>
                      <p className="text-gray-600 text-sm">
                        Valid until: {new Date(results.voucher.validUntil).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                      <p className="bg-white text-primary font-mono font-bold px-4 py-2 rounded mt-2">
                        {results.voucher.voucherCode}
                      </p>
                    </div>
                    
                    <Button 
                      onClick={handleDownloadVoucher}
                      className="bg-primary hover:bg-primary/90 text-white font-medium py-2 px-4 rounded-lg w-full flex items-center justify-center"
                      disabled={isDownloading}
                    >
                      <Download className="h-4 w-4 mr-2" /> 
                      {isDownloading ? "Downloading..." : "Download Voucher"}
                    </Button>
                  </div>
                )}
                
                <div className="text-center mt-8">
                  <Button 
                    onClick={handlePlayAgain}
                    className="bg-accent hover:bg-accent/80 text-white font-semibold py-3 px-8 rounded-full shadow-lg"
                  >
                    Play Again
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <Footer />
    </div>
  );
}
