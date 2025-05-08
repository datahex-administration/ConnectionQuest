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
                  <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-primary text-white font-bold shadow-lg relative" style={{ boxShadow: '0 0 20px rgba(142, 44, 142, 0.5)' }}>
                    <div className="absolute inset-0 rounded-full bg-white opacity-10"></div>
                    <div className="absolute inset-2 rounded-full border-4 border-white/20"></div>
                    <span className="text-5xl">{results?.matchPercentage || 0}<span className="text-2xl align-top">%</span></span>
                  </div>
                  <h2 className="text-2xl font-bold text-primary mt-5">Compatibility Score</h2>
                  <p className="text-gray-900 mt-2 font-medium">
                    {results?.matchPercentage ? 
                      results.matchPercentage >= 80 
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
                    <ul className="list-disc list-inside text-gray-700 space-y-2">
                      {results.matchingAnswers.map((match, index) => (
                        <li key={index} className="leading-relaxed">
                          <span className="font-medium text-gray-800">{match.question}:</span> 
                          <br className="md:hidden" />
                          <span className="ml-0 md:ml-1">You both chose </span>
                          <span className="text-primary font-medium">{match.answer}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {results?.nonMatchingAnswers && results.nonMatchingAnswers.length > 0 && (
                  <div className="bg-accent/10 rounded-lg p-4 mb-6">
                    <h3 className="font-semibold text-accent mb-2">Different Answers:</h3>
                    <ul className="list-none text-gray-700 space-y-4">
                      {results.nonMatchingAnswers.map((item, index) => (
                        <li key={index} className="border-b border-accent/10 pb-3 last:border-0 last:pb-0">
                          <p className="font-medium text-gray-800 mb-2">{item.question}</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
                            <div className="bg-primary/5 p-2 rounded">
                              <span className="text-primary font-medium block mb-1">You chose:</span> 
                              <span className="text-gray-700">{item.yourAnswer}</span>
                            </div>
                            <div className="bg-accent/5 p-2 rounded">
                              <span className="text-accent font-medium block mb-1">Partner chose:</span> 
                              <span className="text-gray-700">{item.partnerAnswer}</span>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {results?.voucher && (
                  <div className="mt-10">
                    <div className="relative bg-gradient-to-br from-primary via-[#a235a2] to-[#8e2c8e] p-7 rounded-lg shadow-xl max-w-md mx-auto transform transition-all duration-300 hover:scale-105 overflow-hidden border border-white/20">
                      {/* Improved decorative elements - larger and more vibrant */}
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/15 rounded-full -mt-10 -mr-10 blur-md"></div>
                      <div className="absolute bottom-0 left-0 w-28 h-28 bg-white/15 rounded-full -mb-10 -ml-10 blur-md"></div>
                      <div className="absolute bottom-24 right-6 w-16 h-16 bg-white/10 rounded-full blur-md"></div>
                      <div className="absolute top-24 left-6 w-20 h-20 bg-white/10 rounded-full blur-md"></div>
                      <div className="absolute top-1/2 right-1/3 w-10 h-10 bg-white/5 rounded-full blur-sm"></div>
                      <div className="absolute bottom-1/3 left-1/4 w-12 h-12 bg-white/5 rounded-full blur-sm"></div>
                      
                      {/* Enhanced corner decorations */}
                      <div className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-white/80"></div>
                      <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-white/80"></div>
                      <div className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-white/80"></div>
                      <div className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-white/80"></div>
                      
                      {/* Diamond shape decoration - similar to the Mawadha logo */}
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rotate-45 w-full h-full border-4 border-white/5 rounded-xl"></div>
                      
                      <div className="relative z-10">
                        <div className="text-center">
                          <div className="bg-white/20 backdrop-blur-sm text-white inline-block px-4 py-1.5 rounded-full text-sm font-medium mb-3 shadow-lg">
                            <Gift className="inline-block w-4 h-4 mr-1" /> 
                            Congratulations!
                          </div>
                          
                          <h3 className="text-xl font-bold text-white mb-1 text-shadow">You've Earned a Voucher!</h3>
                          <div className="flex items-center justify-center gap-2 mb-4">
                            <div className="bg-white/20 rounded-full h-5 w-5 flex items-center justify-center">
                              <HeartPulse className="h-3 w-3 text-primary" />
                            </div>
                            <p className="text-primary text-sm">
                              Match percentage: <span className="font-bold">{results.matchPercentage}%</span>
                            </p>
                            <div className="bg-white/20 rounded-full h-5 w-5 flex items-center justify-center">
                              <HeartPulse className="h-3 w-3 text-primary" />
                            </div>
                          </div>
                          
                          <div className="my-5 py-4 border-t border-b border-primary/40 bg-white/20 backdrop-blur-sm rounded-md shadow-inner">
                            <p className="text-primary font-bold text-4xl tracking-wide drop-shadow-md">
                              {results.voucher.discount}
                            </p>
                            <p className="text-primary uppercase tracking-widest text-xs font-medium mt-1 letter-spacing-wide">
                              {results.voucher.discount.includes('%') ? 'DISCOUNT VOUCHER' : 'CASH VOUCHER'}
                            </p>
                          </div>
                          
                          <div className="bg-white/20 backdrop-blur-md rounded-lg p-3.5 mb-3 border border-primary/20 shadow-inner">
                            <p className="text-xs text-primary mb-1 uppercase tracking-wider font-medium">VOUCHER CODE</p>
                            <p className="text-primary font-mono font-bold tracking-[0.2em] text-lg">
                              {results.voucher.voucherCode}
                            </p>
                          </div>
                          
                          <p className="text-primary text-xs mb-4 bg-white/20 rounded-full py-1.5 px-4 inline-block shadow-sm">
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
