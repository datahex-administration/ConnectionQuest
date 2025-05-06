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
import { HeartPulse, Gift, Download, ArrowLeft } from "lucide-react";

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
                  <div className="bg-primary/10 rounded-lg p-4 mb-4">
                    <h3 className="font-semibold text-primary mb-2">Matching Answers:</h3>
                    <ul className="list-disc list-inside text-gray-700 space-y-1">
                      {results.matchingAnswers.map((match, index) => (
                        <li key={index}><span className="font-medium">{match.question}:</span> You both chose <span className="text-primary font-medium">{match.answer}</span></li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {results?.nonMatchingAnswers && results.nonMatchingAnswers.length > 0 && (
                  <div className="bg-accent/10 rounded-lg p-4 mb-6">
                    <h3 className="font-semibold text-accent mb-2">Different Answers:</h3>
                    <ul className="list-none text-gray-700 space-y-3">
                      {results.nonMatchingAnswers.map((item, index) => (
                        <li key={index} className="border-b border-accent/10 pb-2 last:border-0 last:pb-0">
                          <p className="font-medium text-gray-800">{item.question}</p>
                          <div className="grid grid-cols-2 gap-2 mt-1 text-sm">
                            <div>
                              <span className="text-primary/80 font-medium">You:</span> {item.yourAnswer}
                            </div>
                            <div>
                              <span className="text-accent/80 font-medium">Partner:</span> {item.partnerAnswer}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {results?.voucher && (
                  <div className="mt-10">
                    <div className="relative bg-gradient-to-br from-primary via-[#a235a2] to-[#8e2c8e] p-6 rounded-lg shadow-xl max-w-md mx-auto transform transition-all duration-300 hover:scale-105 overflow-hidden">
                      {/* Decorative elements */}
                      <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mt-8 -mr-8 blur-sm"></div>
                      <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/10 rounded-full -mb-6 -ml-6 blur-sm"></div>
                      <div className="absolute bottom-20 right-4 w-12 h-12 bg-white/5 rounded-full blur-sm"></div>
                      <div className="absolute top-20 left-4 w-16 h-16 bg-white/5 rounded-full blur-sm"></div>
                      
                      {/* Corner decorations */}
                      <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-white/70"></div>
                      <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-white/70"></div>
                      <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-white/70"></div>
                      <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-white/70"></div>
                      
                      <div className="relative z-10">
                        <div className="text-center">
                          <div className="bg-white/20 backdrop-blur-sm text-white inline-block px-4 py-1 rounded-full text-sm font-medium mb-3">
                            <Gift className="inline-block w-4 h-4 mr-1" /> Congratulations!
                          </div>
                          
                          <h3 className="text-xl font-bold text-white mb-1">You've Earned a Voucher!</h3>
                          <p className="text-white/90 text-sm mb-2">Match percentage: {results.matchPercentage}%</p>
                          
                          <div className="my-5 py-3 border-t border-b border-white/30 bg-white/5 backdrop-blur-sm rounded-md">
                            <p className="text-white font-bold text-3xl tracking-wide">
                              {results.voucher.discount}
                            </p>
                            <p className="text-white/90 uppercase tracking-widest text-sm font-medium mt-1">
                              {results.voucher.discount.includes('%') ? 'DISCOUNT VOUCHER' : 'CASH VOUCHER'}
                            </p>
                          </div>
                          
                          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 mb-3 border border-white/10">
                            <p className="text-xs text-white/80 mb-1">VOUCHER CODE</p>
                            <p className="text-white font-mono font-bold tracking-wider">
                              {results.voucher.voucherCode}
                            </p>
                          </div>
                          
                          <p className="text-white/90 text-xs mb-4 bg-white/10 rounded-full py-1 px-3 inline-block">
                            Valid until: {new Date(results.voucher.validUntil).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                        
                        <Button 
                          onClick={handleDownloadVoucher}
                          className="bg-white hover:bg-white/90 text-primary font-semibold py-3 px-4 rounded-lg w-full flex items-center justify-center shadow-lg"
                          disabled={isDownloading}
                        >
                          <Download className="h-5 w-5 mr-2" /> 
                          {isDownloading ? "Preparing PDF..." : "Download Voucher"}
                        </Button>
                      </div>
                    </div>
                    
                    <p className="text-center text-gray-500 text-xs mt-3">
                      ↑ Click to download and save your voucher ↑
                    </p>
                  </div>
                )}
                
                <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-8">
                  <Button 
                    onClick={handlePlayAgain}
                    className="bg-accent hover:bg-accent/80 text-white font-semibold py-3 px-8 rounded-full shadow-lg"
                  >
                    Play Again
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 py-3 px-5 rounded-full"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Welcome
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
