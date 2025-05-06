import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useGameSession } from "@/hooks/use-game-session";
import { GameQuestion, fetchGameQuestions, submitAnswers } from "@/lib/game-questions";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

export default function Game() {
  const params = useParams<{ code: string }>();
  const sessionCode = params.code;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { userId, checkUserSessionStatus } = useGameSession();
  
  const [isLoading, setIsLoading] = useState(true);
  const [commonQuestions, setCommonQuestions] = useState<GameQuestion[]>([]);
  const [individualQuestions, setIndividualQuestions] = useState<GameQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<number, { optionId: number, answer: string }>>(new Map());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isCheckingSubmissionStatus, setIsCheckingSubmissionStatus] = useState(true);
  const [questionsLoadAttempts, setQuestionsLoadAttempts] = useState(0);

  // Combined questions array for navigation
  const allQuestions = [...commonQuestions, ...individualQuestions];
  const currentQuestion = allQuestions[currentQuestionIndex];
  
  useEffect(() => {
    const loadQuestions = async () => {
      if (!sessionCode || !userId) return;
      
      setIsLoading(true);
      try {
        const questions = await fetchGameQuestions(sessionCode);
        
        // Check if questions were loaded properly
        if (questions.commonQuestions.length > 0 || questions.individualQuestions.length > 0) {
          setCommonQuestions(questions.commonQuestions);
          setIndividualQuestions(questions.individualQuestions);
          // Reset attempt counter since we succeeded
          setQuestionsLoadAttempts(0);
        } else if (questionsLoadAttempts < 3) {
          // Increment attempts counter if questions are empty
          setQuestionsLoadAttempts(prev => prev + 1);
          // Wait a second before retrying to avoid hammering the server
          setTimeout(() => {
            console.log('Retrying question load, attempt:', questionsLoadAttempts + 1);
            loadQuestions();
          }, 1500);
          return; // Skip setting isLoading to false since we're retrying
        } else {
          // After 3 attempts, show error
          throw new Error('Could not load questions after multiple attempts. Please refresh the page.');
        }
      } catch (error) {
        console.error("Error loading questions:", error);
        toast({
          title: "Failed to Load Questions",
          description: error instanceof Error ? error.message : "Something went wrong. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadQuestions();
  }, [sessionCode, userId, toast, questionsLoadAttempts]);
  
  // Check if the user has already submitted answers for this session
  useEffect(() => {
    async function checkSubmissionStatus() {
      if (!sessionCode || !userId) return;
      
      try {
        setIsCheckingSubmissionStatus(true);
        const hasAlreadySubmitted = await checkUserSessionStatus(sessionCode);
        
        if (hasAlreadySubmitted) {
          // If user has already submitted, set hasSubmitted to true and check if results are ready
          setHasSubmitted(true);
          
          // Check if both users have submitted and results are ready
          const response = await fetch(`/api/sessions/${sessionCode}/results-status`);
          const data = await response.json();
          
          if (data.ready) {
            // If results are ready, navigate to results page
            toast({
              title: "Results Ready",
              description: "You've already submitted answers for this session. Redirecting to results.",
            });
            navigate(`/results/${sessionCode}`);
          }
        }
      } catch (error) {
        console.error("Error checking submission status:", error);
        // If there's an error checking status, continue with the game
      } finally {
        setIsCheckingSubmissionStatus(false);
      }
    }
    
    checkSubmissionStatus();
  }, [sessionCode, userId, navigate, toast, checkUserSessionStatus]);
  
  const handleAnswerSelect = (questionId: number, optionIndex: number, answerText: string) => {
    // Create a copy of the answers map and update it
    const newAnswers = new Map(answers);
    newAnswers.set(questionId, { 
      optionId: optionIndex + 1, // Assuming option IDs start from 1
      answer: answerText 
    });
    setAnswers(newAnswers);
  };
  
  const goToNextQuestion = () => {
    if (currentQuestionIndex < allQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };
  
  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };
  
  // Poll for partner's submission status
  useEffect(() => {
    if (!hasSubmitted || !sessionCode) return;
    
    const checkResultsReady = async () => {
      try {
        // Check if results are ready (meaning both partners have submitted)
        const response = await fetch(`/api/sessions/${sessionCode}/results-status`);
        const data = await response.json();
        
        if (data.ready) {
          // If ready, navigate to results page
          navigate(`/results/${sessionCode}`);
        }
      } catch (error) {
        console.error("Error checking results status:", error);
      }
    };
    
    // Initial check
    checkResultsReady();
    
    // Set up polling interval with longer delay to reduce load
    const intervalId = setInterval(checkResultsReady, 8000);
    
    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, [hasSubmitted, sessionCode, navigate]);

  const handleSubmit = async () => {
    if (answers.size < allQuestions.length) {
      toast({
        title: "Incomplete Answers",
        description: "Please answer all questions before submitting.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    // Convert the answers Map to the format expected by the API
    const answerArray = Array.from(answers.entries()).map(([questionId, data]) => ({
      questionId,
      optionId: data.optionId
    }));
    
    try {
      await submitAnswers(sessionCode, answerArray);
      
      toast({
        title: "Answers Submitted",
        description: "Your answers have been submitted successfully.",
      });
      
      // Set hasSubmitted to true to start polling for partner's submission
      setHasSubmitted(true);
    } catch (error) {
      console.error("Error submitting answers:", error);
      toast({
        title: "Submission Failed",
        description: error instanceof Error ? error.message : "Failed to submit your answers. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isLoading || isCheckingSubmissionStatus) {
    return (
      <div className="animate-fade-in">
        <Header />
        <div className="max-w-md mx-auto text-center py-10">
          <div className="animate-pulse">
            <div className="h-4 bg-primary/20 rounded w-3/4 mx-auto mb-4"></div>
            <div className="h-24 bg-primary/10 rounded mb-4"></div>
            <div className="h-12 bg-primary/20 rounded w-1/2 mx-auto"></div>
          </div>
          <div className="mt-6 text-gray-600">
            <p className="mb-2">
              {isCheckingSubmissionStatus 
                ? "Checking submission status..." 
                : questionsLoadAttempts > 0 
                  ? `Loading questions (attempt ${questionsLoadAttempts} of 3)...` 
                  : "Loading questions..."}
            </p>
            {questionsLoadAttempts > 0 && (
              <p className="text-sm text-gray-500">Taking longer than expected, please wait...</p>
            )}
          </div>
        </div>
        <Footer />
      </div>
    );
  }
  
  return (
    <div className="animate-fade-in">
      <Header />
      
      <div className="max-w-md mx-auto">
        <Card>
          <CardContent className="pt-6">
            {hasSubmitted ? (
              <div className="text-center py-8">
                <div className="flex justify-center">
                  <div className="rounded-full bg-primary/10 p-3 mb-4">
                    <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full"></div>
                  </div>
                </div>
                <h2 className="text-xl font-semibold text-primary mb-2">Answers Submitted!</h2>
                <p className="text-gray-600 mb-6">Waiting for your partner to complete the questionnaire...</p>
                <p className="text-sm text-gray-500">You'll automatically be redirected to see your results once your partner submits their answers.</p>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-primary">Compatibility Quiz</h2>
                  <div className="bg-primary/10 text-primary rounded-full px-3 py-1 text-sm">
                    Question <span id="current-question">{currentQuestionIndex + 1}</span>/<span id="total-questions">{allQuestions.length}</span>
                  </div>
                </div>
                
                {currentQuestion && (
                  <div className="animate-slide-up">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">{currentQuestion.text}</h3>
                    
                    <RadioGroup 
                      value={answers.get(currentQuestion.id)?.answer || ""}
                      className="space-y-3"
                      onValueChange={(value) => {
                        const optionIndex = currentQuestion.options.findIndex(opt => opt === value);
                        handleAnswerSelect(currentQuestion.id, optionIndex, value);
                      }}
                    >
                      {currentQuestion.options.map((option, i) => (
                        <div key={i} className="option-container">
                          <div className="flex items-center space-x-2 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-primary/5 transition-all">
                            <RadioGroupItem value={option} id={`q${currentQuestion.id}-option${i+1}`} />
                            <Label htmlFor={`q${currentQuestion.id}-option${i+1}`} className="flex-1 cursor-pointer">
                              <span className="text-gray-700">{option}</span>
                            </Label>
                          </div>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                )}
                
                <div className="flex justify-between mt-8">
                  <Button 
                    onClick={goToPreviousQuestion}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg"
                    disabled={currentQuestionIndex === 0}
                  >
                    Previous
                  </Button>
                  
                  {currentQuestionIndex < allQuestions.length - 1 ? (
                    <Button 
                      onClick={goToNextQuestion}
                      className="btn-primary text-white font-medium py-2 px-4 rounded-lg"
                      disabled={!answers.has(currentQuestion?.id)}
                    >
                      Next
                    </Button>
                  ) : (
                    <Button 
                      onClick={handleSubmit}
                      className="btn-primary text-white font-medium py-2 px-4 rounded-lg"
                      disabled={isSubmitting || !answers.has(currentQuestion?.id)}
                    >
                      {isSubmitting ? "Submitting..." : "Submit Answers"}
                    </Button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      
      <Footer />
    </div>
  );
}
