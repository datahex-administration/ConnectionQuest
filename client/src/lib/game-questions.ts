export interface GameQuestion {
  id: number;
  text: string;
  options: string[];
  type: "common" | "individual";
}

export interface QuestionOption {
  id: string;
  label: string;
  value: string;
}

export interface UserAnswer {
  questionId: number;
  optionId: number;
  answer: string;
}

export interface GameSessionResult {
  matchPercentage: number;
  matchingAnswers: {
    question: string;
    answer: string;
  }[];
  nonMatchingAnswers: {
    question: string;
    yourAnswer: string;
    partnerAnswer: string;
  }[];
  sessionId: number;
  voucher?: {
    voucherId: number;
    voucherCode: string;
    discount: string;
    validUntil: string;
  };
}

import { apiRequest } from "./queryClient";

// Fetch questions for a game session
export async function fetchGameQuestions(sessionCode: string): Promise<{
  commonQuestions: GameQuestion[];
  individualQuestions: GameQuestion[];
}> {
  try {
    const response = await apiRequest("GET", `/api/sessions/${sessionCode}/questions`);
    return await response.json();
  } catch (error) {
    console.error("Error fetching game questions:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to fetch questions");
  }
}

// Submit user's answers
export async function submitAnswers(
  sessionCode: string, 
  answers: { questionId: number; optionId: number }[]
): Promise<void> {
  try {
    await apiRequest("POST", `/api/sessions/${sessionCode}/answers`, { answers });
  } catch (error) {
    console.error("Error submitting answers:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to submit answers");
  }
}

// Get results for a game session
export async function fetchGameResults(sessionCode: string): Promise<GameSessionResult> {
  try {
    const response = await apiRequest("GET", `/api/sessions/${sessionCode}/results`);
    return await response.json();
  } catch (error) {
    console.error("Error loading results:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to fetch results");
  }
}
